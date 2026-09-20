import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startServer} from '../dist/apps/server/src/index.js';import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';import {createWorld} from '../dist/packages/worldgen/src/index.js';import {advance,previewWater} from '../dist/packages/engine/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-transport-browser-')),store=new WorldStore(root),world=createWorld({id:'first-world',name:'Water garden',seed:'transport-browser',frequency:2});
for(const tile of world.tiles){tile.elevationM=500;world.rules.push({kind:'rainfall',id:`rain-${tile.id}`,tileId:tile.id,mmPerDay:0});}
world.tiles[0].elevationM=1000;world.tiles[0].sedimentKg=10000;world.rules[0].mmPerDay=150;await store.save(world);
let calls=0;const saved=await readFile(join(root,world.id,'state.json'),'utf8'),app=await startServer({root,port:0,provider:{name:'Never',async generate(){calls++;throw Error('Unexpected model call');}}}),base=`http://127.0.0.1:${app.server.address().port}`,browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 await mkdir('.local/screenshots',{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent?.includes('Saved locally'));await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 await page.evaluate(()=>{document.querySelector('#play').click();document.querySelector('#water-explain').click();});await page.locator('#water-preview').waitFor({state:'visible'});
 assert.match(await page.locator('#play').textContent(),/Let time flow/);assert.match(await page.locator('#water-preview').textContent(),/Day 0 → 1 · Preview only/);assert.equal(await page.locator('#water-preview .stat').count(),7);assert.ok(await page.locator('.water-route').count()>0);
 assert.equal(await page.locator('#day').textContent(),'DAY 0');assert.equal(await readFile(join(root,world.id,'state.json'),'utf8'),saved);
 await page.locator('#water-preview').scrollIntoViewIfNeeded();await page.screenshot({path:'.local/screenshots/transport-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('#water-preview').scrollIntoViewIfNeeded();await page.screenshot({path:'.local/screenshots/transport-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#water-preview').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
 await page.getByRole('button',{name:'Close water preview',exact:true}).click();await page.locator('#water-preview').waitFor({state:'hidden'});
 await page.setViewportSize({width:1440,height:1000});
 // A delayed response for a previous selection must not appear on a new tile.
 let release,started;const gate=new Promise(r=>release=r),seen=new Promise(r=>started=r);
 await page.route('**/api/transport/preview',async route=>{const response=await route.fetch();started();await gate;await route.fulfill({response});});
 await page.locator('#water-explain').click();await seen;await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');release();await page.waitForFunction(()=>!document.body.classList.contains('busy'));assert.equal(await page.locator('#water-preview').isVisible(),false);await page.unroute('**/api/transport/preview');
 await page.locator('#globe').focus();await page.keyboard.press('ArrowLeft');await page.locator('#water-explain').click();await page.locator('#water-preview').waitFor({state:'visible'});
 const predicted=previewWater(world,0);await page.locator('#step').click();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 1');assert.equal(await page.locator('#water-preview').isVisible(),false);const next=await store.load(world.id);assert.equal(next.tiles[0].waterL,predicted.budget.afterWaterL);assert.equal(stateHash(next),stateHash(advance(world)));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 1');assert.equal(await page.locator('#water-preview').isVisible(),false);assert.deepEqual(errors,[]);assert.equal(calls,0);
 console.log('Water transport browser passed: paused read-only budget, exact predicted next tick, routes, no save/model calls, stale-selection rejection, close/reload and desktop/mobile layout.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
