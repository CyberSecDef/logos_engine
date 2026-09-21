import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {combinedWorld} from '../dist/tests/fixtures/phase5.js';import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';import {startServer} from '../dist/apps/server/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-navigation-')),store=new WorldStore(root),world=combinedWorld(12);await store.save(world);await store.selectWorld(world.id);let calls=0;
const app=await startServer({root,host:'127.0.0.1',port:0,provider:{name:'No model expected',async generate(){calls++;throw Error('Unexpected model call');}}});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${app.server.address().port}`);await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saved locally'));
 const selected=async id=>assert.match(await page.locator('#tile-subtitle').textContent(),new RegExp(`ZONE ${String(id).padStart(4,'0')}`));
 const jump=async id=>{await page.locator('#zone-number').fill(String(id));await page.locator('#zone-navigation button').click();await selected(id);};
 await page.locator('#skip-inspector').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'zone-number');
 await jump(447);assert.equal(await page.evaluate(()=>document.activeElement.id),'tile-title');assert.match(await page.locator('#selection-status').textContent(),/Zone 447/);assert.equal(await page.locator('#spin').textContent(),'Resume rotation');
 await page.locator('#globe').click({position:{x:720,y:500}});await selected(447); // Jump actually brings the zone to the center ray.
 const neighbor=[...world.cells[447].neighbors].sort((a,b)=>a-b)[0];await page.getByRole('button',{name:`Go to neighboring zone ${neighbor}`,exact:true}).click();await selected(neighbor);
 await jump(444);await page.locator('#zone-number').fill('99999');await page.locator('#zone-navigation button').click();await selected(444);assert.equal(await page.locator('#zone-number').evaluate(e=>e.validity.rangeOverflow),true);
 await page.locator('#focus-globe').click();await page.keyboard.press('ArrowRight');await selected(445);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'tile-title');
 await page.getByRole('button',{name:'Water',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Water',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#layer-buttons [aria-pressed="true"]').count(),1);
 await page.locator('#custom-layer').selectOption('custom:soil-fertility');assert.equal(await page.locator('#layer-buttons [aria-pressed="true"]').count(),0);
 await page.locator('#skip-layers').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'custom-layer');
 assert.equal(stateHash(await store.load(world.id)),stateHash(world));
 const status=await page.locator('#selection-status').textContent();await page.locator('#step').click();await page.waitForFunction(()=>document.querySelector('#day').textContent==='DAY 1');assert.equal(await page.locator('#selection-status').textContent(),status);
 const savedHash=stateHash(await store.load(world.id));await mkdir('.local/screenshots',{recursive:true});
 for(const [width,height,name] of [[1440,1000,'desktop'],[1024,600,'short'],[390,844,'mobile'],[320,640,'narrow']]){
  await page.setViewportSize({width,height});await jump(447);await page.locator('#focus-globe').click();await page.keyboard.press('Enter');await selected(447);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`.local/screenshots/navigation-${name}.png`});
 }
 assert.equal(stateHash(await store.load(world.id)),savedHash);assert.equal(calls,0);assert.deepEqual(errors,[]);console.log('Navigation passed exact zone jump/centering, neighbors, input bounds, globe/inspector keyboard flow, layer states, quiet tick announcements, four viewport sizes and save preservation.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
