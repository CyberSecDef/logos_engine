import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startServer} from '../dist/apps/server/src/index.js';
import {WorldStore} from '../dist/apps/server/src/store.js';
import {createWorld} from '../dist/packages/worldgen/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-mana-browser-')),example=JSON.parse(await readFile('docs/examples/mana-sharing.json','utf8'));let calls=0;
await new WorldStore(root).save(createWorld({id:'first-world',name:'Mana sharing',seed:'mana',frequency:2}));
const app=await startServer({root,port:0,provider:{name:'Resource test',async generate(context){calls++;assert.equal(context.scope,'world');return {kind:'proposal',message:example.summary,assumptions:[],operations:example.operations.map(op=>({...op,tileId:context.selectedTileId,...(op.kind==='rule-define'?{rule:{...op.rule,tileId:context.selectedTileId}}:{})}))};}}});
const base=`http://127.0.0.1:${app.server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent?.includes('Saved locally'));await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');await page.locator('#chat-open').click();
 await page.locator('#chat-scope').selectOption('world');await page.locator('#chat-message').fill('Create mana stock, put 120 motes here, share 12 total daily with neighbors.');await page.locator('#chat-propose').click();
 await page.getByRole('button',{name:'Review five-day preview'}).waitFor();await page.locator('#chat-progress').waitFor({state:'hidden'});await page.getByRole('button',{name:'Review five-day preview'}).click();await page.locator('#proposal').waitFor({state:'visible'});
 assert.match(await page.locator('.resource-preview').textContent(),/World total · Mana: 120 motes/);assert.match(await page.locator('#preview-results').textContent(),/stock resource/);assert.match(await page.locator('#preview-results').textContent(),/among neighbors/);
 await page.screenshot({path:'.local/screenshots/mana-preview.png'});await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});await page.locator('#chat-close').click();
 await page.locator('#custom-layer').selectOption('custom:mana');await page.locator('#step').click();await page.waitForFunction(()=>document.querySelector('#day')?.textContent==='DAY 1');
 assert.match(await page.locator('#tile-details').textContent(),/108 \/ 1000 motes/);assert.match(await page.locator('.resource-note').textContent(),/120 motes/);assert.match(await page.locator('.resource-note').textContent(),/transferred 12/);assert.equal(calls,1);
 await page.locator('#inspector').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'.local/screenshots/mana-desktop.png'});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#day')?.textContent==='DAY 1');await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('.resource-note').textContent(),/transferred 12/);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/screenshots/mana-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.equal(calls,1);
 const w=await new WorldStore(root).load('first-world');assert.equal(w.resourceLedger.entries[0].afterMilli,120000);
 console.log('Resource browser passed: scoped mana proposal, global total preview, capacity display, daily ledger, overlay, tick/reload, no autonomous model calls.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
