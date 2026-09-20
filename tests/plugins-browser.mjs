import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startServer} from '../dist/apps/server/src/index.js';import {WorldStore} from '../dist/apps/server/src/store.js';import {createWorld} from '../dist/packages/worldgen/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-plugin-browser-')),example=JSON.parse(await readFile('docs/examples/crystal-bloom.json','utf8'));let calls=0;
await new WorldStore(root).save(createWorld({id:'first-world',name:'Crystal grove',seed:'crystals',frequency:2}));
const app=await startServer({root,port:0,provider:{name:'Plugin fixture',async generate(context){calls++;
 if(calls===2){const world=await new WorldStore(root).load('first-world'),definition=world.plugins[0].definition;
 const converted=JSON.parse(await readFile('docs/examples/crystal-hours.json','utf8')).operations[0];
 return {kind:'proposal',message:'Retain crystal memory in hours',assumptions:[],operations:[{...converted,tileId:definition.tileId,definition:{...converted.definition,tileId:definition.tileId,version:definition.version+1}}]};}
 return {kind:'proposal',message:example.summary,assumptions:[],operations:[...example.operations.map(op=>({...op,tileId:context.selectedTileId,...(op.kind==='plugin-define'?{definition:{...op.definition,tileId:context.selectedTileId}}:{})})),{kind:'temperature',tileId:context.selectedTileId,celsius:20,mode:'sustained'}]};}}});
const base=`http://127.0.0.1:${app.server.address().port}`,browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saved locally'));
 await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');await page.locator('#chat-open').click();await page.locator('#chat-scope').selectOption('world');await page.locator('#chat-message').fill('Make a crystal bloom plugin.');await page.locator('#chat-propose').click();await page.getByRole('button',{name:'Review five-day preview'}).waitFor();await page.locator('#chat-progress').waitFor({state:'hidden'});await page.getByRole('button',{name:'Review five-day preview'}).click();await page.locator('#proposal').waitFor({state:'visible'});
 assert.match(await page.locator('#preview-results').textContent(),/World plugin: Crystal bloom/);assert.match(await page.locator('.resource-preview').textContent(),/Crystal: 5 shards/);await page.screenshot({path:'.local/screenshots/plugin-preview.png'});await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});await page.locator('#chat-close').click();
 for(let i=1;i<=3;i++){await page.locator('#step').click();await page.waitForFunction(day=>document.querySelector('#day').textContent===`DAY ${day}`,i);}
 assert.match(await page.locator('.plugin-note').textContent(),/warm-days: 0/);assert.match(await page.locator('.resource-note').textContent(),/net added 5/);
 await page.getByRole('button',{name:'Review disable plugin'}).click();await page.locator('#proposal').waitFor({state:'visible'});await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});assert.match(await page.locator('.plugin-note').textContent(),/paused/);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 3');await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('.plugin-note').textContent(),/paused/);
 await page.getByRole('button',{name:'Review enable plugin'}).click();await page.locator('#proposal').waitFor({state:'visible'});await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});await page.locator('#step').click();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 4');assert.match(await page.locator('.plugin-note').textContent(),/warm-days: 1/);
 await page.locator('#inspector').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:'.local/screenshots/plugin-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/screenshots/plugin-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.equal(calls,1);
 await page.setViewportSize({width:1440,height:1000});
 const before=await new WorldStore(root).load('first-world');
 await page.locator('#chat-open').click();await page.locator('#chat-scope').selectOption('world');await page.locator('#chat-message').fill('Convert the warm-day memory to hours, preserving accumulated warmth.');await page.locator('#chat-propose').click();await page.locator('#chat-progress').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Review five-day preview'}).last().click();await page.locator('#proposal').waitFor({state:'visible'});
 assert.match(await page.locator('#preview-results').textContent(),/warm-hours: old warm-days × 24/);
 await page.locator('.state-migration-preview summary').click();assert.match(await page.locator('.state-migration-preview').textContent(),/before: warm-days: 1 → on Apply: warm-hours: 24/);
 assert.equal((await new WorldStore(root).load('first-world')).revision,before.revision);
 await page.screenshot({path:'.local/screenshots/state-map-preview.png'});
 await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});await page.locator('#chat-close').click();
 assert.match(await page.locator('.plugin-note').textContent(),/warm-hours: 24/);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 4');await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('.plugin-note').textContent(),/warm-hours: 24/);
 for(let i=5;i<=6;i++){await page.locator('#step').click();await page.waitForFunction(day=>document.querySelector('#day').textContent===`DAY ${day}`,i);}
 assert.match(await page.locator('.plugin-note').textContent(),/warm-hours: 0/);assert.match(await page.locator('.resource-note').textContent(),/net added 5/);assert.equal(calls,2);assert.deepEqual(errors,[]);
 console.log('Plugin browser passed: reviewed memory migration with before/after values, persistence and unchanged bloom behavior; scoped proposal, forecast, apply, saved counters, accounted crystal, disable/re-enable, reload, desktop/mobile, no autonomous calls.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
