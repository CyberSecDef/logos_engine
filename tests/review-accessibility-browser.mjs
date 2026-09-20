import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createWorld} from '../dist/packages/worldgen/src/index.js';
import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';
import {startServer} from '../dist/apps/server/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-review-accessibility-')),store=new WorldStore(root);
const initial=createWorld({id:'first-world',name:'Keyboard world',seed:'review-focus',frequency:2});await store.save(initial);await store.checkpoint(initial,'Original');
const example=JSON.parse(await readFile('docs/examples/crystal-bloom.json','utf8'));let calls=0;
const app=await startServer({root,host:'127.0.0.1',port:0,provider:{name:'Review fixture',async generate(context){calls++;return {kind:'proposal',message:example.summary,assumptions:[],operations:example.operations.map(op=>({...op,tileId:context.selectedTileId,...(op.kind==='plugin-define'?{definition:{...op.definition,tileId:context.selectedTileId}}:{})}))};}}});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${app.server.address().port}`);await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saved locally'));
 await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');
 const focus=()=>page.evaluate(()=>document.activeElement?.id);
 const contained=async(id)=>assert.equal(await page.evaluate(id=>!!document.activeElement?.closest('#'+id),id),true);
 const idle=()=>page.waitForFunction(()=>!document.body.classList.contains('busy'));
 await page.locator('#temperature-change').click();await page.locator('#proposal').waitFor({state:'visible'});await idle();
 assert.equal(await focus(),'proposal-title');assert.equal(await page.locator('#proposal').evaluate(e=>e.matches(':modal')),true);
 await page.locator('#step').evaluate(e=>e.focus());await contained('proposal');
 for(let i=0;i<8;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');await contained('proposal');}
 let release,intercepted;const gate=new Promise(r=>release=r),requestSeen=new Promise(r=>intercepted=r);
 await page.route('**/api/proposals/apply',async route=>{intercepted();await gate;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Test failure: proposal was not applied.'})});});
 await page.locator('#apply-proposal').click();await requestSeen;await page.keyboard.press('Escape');assert.equal(await page.locator('#proposal').evaluate(e=>e.open),true);release();
 await page.locator('#proposal .review-error').waitFor({state:'visible'});await idle();assert.match(await page.locator('#proposal .review-error').textContent(),/not applied/);assert.equal(stateHash(await store.load(initial.id)),stateHash(initial));
 await page.keyboard.press('Escape');assert.equal(await focus(),'temperature-change');await page.unroute('**/api/proposals/apply');
 await page.locator('#rain-change').click();await page.locator('#proposal').waitFor({state:'visible'});assert.equal(await page.locator('#proposal .review-error').isVisible(),false);await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});assert.equal(await focus(),'rain-change');
 await page.locator('#worlds-toggle').click();const restore=page.locator('.checkpoint-row').filter({hasText:'Original'}).getByRole('button',{name:'Review restore'});await restore.click();await page.locator('#world-review').waitFor({state:'visible'});await idle();assert.equal(await focus(),'world-review-title');
 for(let i=0;i<7;i++){await page.keyboard.press('Tab');await contained('world-review');}
 await page.keyboard.press('Escape');assert.equal(await restore.evaluate(e=>e===document.activeElement),true);
 await restore.click();await page.locator('#apply-world-review').click();await page.locator('#world-review').waitFor({state:'hidden'});assert.equal(await focus(),'worlds-toggle');
 await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');await page.locator('#chat-open').click();await page.locator('#chat-scope').selectOption('world');await page.locator('#chat-message').fill('Create the crystal bloom example.');await page.locator('#chat-propose').click();await page.locator('#chat-progress').waitFor({state:'hidden'});
 const review=page.getByRole('button',{name:'Review five-day preview'});await review.waitFor();await review.click();await page.locator('#proposal').waitFor({state:'visible'});await idle();
 const hash=stateHash(await store.load(initial.id));let reached=false;
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');await contained('proposal');if(await page.evaluate(()=>document.activeElement?.textContent==='Inspect plugin program')){reached=true;await page.keyboard.press('Enter');break;}}
 assert.ok(reached,'Plugin details must be reachable in normal keyboard order');assert.equal(await page.locator('#preview-results details').evaluate(e=>e.open),true);
 await mkdir('.local/screenshots',{recursive:true});await page.screenshot({path:'.local/screenshots/review-keyboard-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('#cancel-proposal').scrollIntoViewIfNeeded();const box=await page.locator('#proposal').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);
 await page.screenshot({path:'.local/screenshots/review-keyboard-mobile.png'});await page.keyboard.press('Escape');await page.locator('#proposal').waitFor({state:'hidden'});assert.equal(await review.evaluate(e=>e===document.activeElement),true,await page.evaluate(()=>document.activeElement?.outerHTML.slice(0,500)));assert.equal(stateHash(await store.load(initial.id)),hash);
 assert.equal(calls,1);assert.deepEqual(errors,[]);console.log('Review accessibility passed native modality, title focus, background isolation, dynamic keyboard details, both review focus returns, in-flight Escape protection, inline failure, successful apply/restore, cancellation save preservation and narrow layout.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
