import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startServer} from '../dist/apps/server/src/index.js';import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';import {createWorld} from '../dist/packages/worldgen/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-texture-browser-')),store=new WorldStore(root);
const birth=createWorld({id:'first-world',name:'Color birth',seed:'painted',frequency:4});await store.save(birth);
const mature=createWorld({id:'mature',name:'Painted world',seed:'painted',frequency:4});mature.tick=1000;mature.revision=1000;
for(const t of mature.tiles){t.elevationM=500;t.vegetation=.8;const kind=t.id%6;if(kind===0)t.elevationM=-200;if(kind===1)t.population=300;if(kind===2)t.elevationM=1600;if(kind===4)t.vegetation=.5;if(kind===5)t.vegetation=.1;}
await store.save(mature);const before=stateHash(mature);
const app=await startServer({root,port:0}),base=`http://127.0.0.1:${app.server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pixels=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
 const gl=document.querySelector('#globe').getContext('webgl2'),data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);let hash=2166136261,bright=0;
 for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+1],16777619);hash=Math.imul(hash^data[i+2],16777619);if(data[i]+data[i+1]+data[i+2]>80)bright++;}resolve({hash:hash>>>0,bright});
})));
try {
 await mkdir('.local/screenshots',{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGLProgram|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#art-status').textContent.includes('0 / 162'));
 const initial=await pixels(page);assert.ok(initial.bright>1000);
 await page.locator('#texture-mode').selectOption('colors');assert.deepEqual(await pixels(page),initial);await page.locator('#texture-mode').selectOption('artwork');
 await page.locator('#globe').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#tile-details').textContent(),/Not revealed yet/);
 await page.locator('#elevation-change').click();await page.locator('#proposal').waitFor({state:'visible'});assert.match(await page.locator('#art-status').textContent(),/0 \/ 162/);await page.locator('#apply-proposal').click();await page.locator('#proposal').waitFor({state:'hidden'});assert.match(await page.locator('#art-status').textContent(),/1 \/ 162/);assert.match(await page.locator('#tile-details').textContent(),/Revealed/);assert.equal(await page.locator('#day').textContent(),'DAY 0');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#art-status').textContent.includes('1 / 162'));
 await page.locator('#worlds-toggle').click();await page.getByRole('button',{name:'Painted world · day 1000',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#art-status').textContent.includes('162 / 162'));
 const textured=await pixels(page);await page.screenshot({path:'.local/screenshots/textures-desktop.png'});await page.locator('#texture-mode').selectOption('colors');const colored=await pixels(page);assert.notEqual(textured.hash,colored.hash);
 await page.locator('#texture-mode').selectOption('artwork');await page.getByRole('button',{name:'Temperature',exact:true}).click();const overlay=await pixels(page);await page.locator('#texture-mode').selectOption('colors');assert.deepEqual(await pixels(page),overlay);
 await page.getByRole('button',{name:'Terrain',exact:true}).click();await page.locator('#texture-mode').selectOption('artwork');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/screenshots/textures-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(stateHash(await store.load('mature')),before);assert.deepEqual(errors,[]);
 const fallback=await browser.newPage({reducedMotion:'reduce'});await fallback.route('**/painterly-v1/forest.png',route=>route.abort());await fallback.goto(base);await fallback.waitForFunction(()=>document.querySelector('#art-status').textContent.includes('1 color fallbacks'));assert.match(await fallback.locator('#save-status').textContent(),/Saved locally/);await fallback.screenshot({path:'.local/screenshots/textures-fallback.png'});
 console.log('Texture browser passed: GPU pixel comparison, color-only birth, Apply-only immediate reveal, reload, all six biomes, overlays unchanged, desktop/mobile, missing-image fallback, simulation hash unchanged.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
