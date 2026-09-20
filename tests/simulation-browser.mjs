import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {combinedWorld} from '../dist/tests/fixtures/phase5.js';
import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';
import {startServer} from '../dist/apps/server/src/index.js';

const root=await mkdtemp(join(tmpdir(),'logos-simulation-browser-')),store=new WorldStore(root);
const world=combinedWorld(12);await store.save(world);await store.selectWorld(world.id);
let calls=0;
const app=await startServer({root,host:'127.0.0.1',port:0,provider:{name:'No autonomous model',async generate(){calls++;throw Error('Unexpected model call');}}});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${app.server.address().port}`);
 await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saved locally'));
 await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 for(let day=1;day<=5;day++){await page.locator('#step').click();await page.waitForFunction(n=>document.querySelector('#day').textContent===`DAY ${n}`,day);}
 const saved=await store.load(world.id),hash=stateHash(saved);assert.equal(saved.tick,5);assert.ok(saved.events.some(e=>e.kind==='conflict'));assert.equal((await store.verifyHistory(world.id)).hash,hash);
 const buttons=page.locator('#layer-buttons button');
 for(let i=0;i<await buttons.count();i++){const button=buttons.nth(i);await button.click();assert.match(await button.getAttribute('class'),/active/);assert.ok((await page.locator('#legend').textContent()).length>10);}
 await page.locator('#layer-buttons button').filter({hasText:'Territory'}).click();
 for(const section of ['conflict','garrison','technology','water-quality','air','migration']){
  const control=page.locator(`#${section}-controls`);await control.locator('summary').click();
  assert.ok((await page.locator(`#${section}-status`).textContent()).trim().length>0);await control.locator('summary').click();
 }
 await page.locator('#temperature').fill('40');await page.locator('#temperature-change').click();await page.locator('#proposal').waitFor({state:'visible'});
 assert.equal(stateHash(await store.load(world.id)),hash);await page.locator('#cancel-proposal').click();
 await page.reload();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 5');assert.equal(stateHash(await store.load(world.id)),hash);
 await mkdir('.local/screenshots',{recursive:true});await page.screenshot({path:'.local/screenshots/simulation-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'.local/screenshots/simulation-mobile.png'});
 assert.equal(stateHash(await store.load(world.id)),hash);assert.deepEqual(errors,[]);assert.equal(calls,0);
 console.log('Standard-size combined browser passed stepping/saving/replay, all built-in overlays, active-system inspectors, forecast cancellation, reload, mobile layout and zero autonomous model calls.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
