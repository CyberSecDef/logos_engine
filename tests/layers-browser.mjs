import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {deflateSync} from 'node:zlib';
import {startServer} from '../dist/apps/server/src/index.js';import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';import {createWorld} from '../dist/packages/worldgen/src/index.js';import {pngInfo} from '../dist/apps/server/src/artwork.js';
// Tiny synthetic RGBA fixtures test compositing, not production artwork.
const crc=data=>{let n=0xffffffff;for(const b of data){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;};
const chunk=(type,data)=>{const name=Buffer.from(type),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([size,name,data,sum]);};
const png=rgba=>{const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,...rgba]))),chunk('IEND',Buffer.alloc(0))]);};
const red=png([255,0,0,128]),blue=png([0,0,255,128]),clear=png([255,0,0,0]),root=await mkdtemp(join(tmpdir(),'logos-layers-browser-')),store=new WorldStore(root),original=new Map();
const definitions={plain:[],one:[{asset:'settlement',opacity:1}],two:[{asset:'settlement',opacity:1},{asset:'condition',opacity:1}],reverse:[{asset:'condition',opacity:1},{asset:'settlement',opacity:1}],zero:[{asset:'settlement',opacity:0}],clear:[{asset:'settlement',opacity:1}],missing:[{asset:'settlement',opacity:1}],birth:[{asset:'settlement',opacity:1}]};
for(const [id,layers] of Object.entries(definitions)){
 const w=createWorld({id:id==='plain'?'first-world':id,name:id,seed:'layers',frequency:2});w.tick=id==='birth'?0:1000;w.revision=w.tick;
 for(const t of w.tiles){t.elevationM=500;t.vegetation=.8;}
 w.definitions.appearance=[{id:'layers',version:1,label:'Layers',tileId:0,scope:'world',enabled:true,priority:1,conditions:[],style:{label:'Layered forest',color:'#778866',asset:'terrain',layers}}];
 const image=id==='clear'?clear:red;w.artwork={id:'layers',version:1,label:'Layer fixtures',credit:'Synthetic test pixels',images:[{slot:'settlement',hash:pngInfo(image).hash},{slot:'condition',hash:pngInfo(blue).hash}]};await store.save(w);if(id!=='missing')await store.saveArtwork(w.id,[image,blue]);original.set(w.id,stateHash(await store.load(w.id)));
}
const app=await startServer({root,port:0}),base=`http://127.0.0.1:${app.server.address().port}`,browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pixels=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const gl=document.querySelector('#globe').getContext('webgl2'),data=new Uint8Array(200*200*4);gl.readPixels(Math.floor(gl.drawingBufferWidth/2)-100,Math.floor(gl.drawingBufferHeight/2)-100,200,200,gl.RGBA,gl.UNSIGNED_BYTE,data);let n=2166136261;for(const b of data)n=Math.imul(n^b,16777619);resolve(n>>>0);})));
try{
 await mkdir('.local/screenshots',{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
 await page.goto(base);const ready=()=>page.waitForFunction(()=>{const text=document.querySelector('#art-status').textContent;return text.includes('places illustrated')&&!text.includes('Loading');});await ready();const baseline=await pixels(page);
 const select=async id=>{await page.locator('#worlds-toggle').click();await page.getByRole('button',{name:`${id} · day ${id==='birth'?0:1000}`,exact:true}).click();await page.waitForFunction(name=>document.querySelector('#world-name').textContent===name,id);await ready();};
 await select('one');const one=await pixels(page);assert.notEqual(one,baseline);await select('two');const two=await pixels(page);assert.notEqual(two,one);await page.screenshot({path:'.local/screenshots/layers-composition.png'});await page.reload();await ready();assert.equal(await pixels(page),two);
 await page.getByRole('button',{name:'Temperature',exact:true}).click();const overlay=await pixels(page);await page.locator('#texture-mode').selectOption('colors');assert.equal(await pixels(page),overlay);await page.getByRole('button',{name:'Terrain',exact:true}).click();const colors=await pixels(page);await page.locator('#texture-mode').selectOption('artwork');assert.equal(await pixels(page),two);
 await select('reverse');assert.notEqual(await pixels(page),two);
 for(const id of ['zero','clear','missing']){await select(id);assert.equal(await pixels(page),baseline,`${id} must leave terrain visible`);}
 await select('birth');const birth=await pixels(page);await page.locator('#texture-mode').selectOption('colors');assert.equal(await pixels(page),birth);assert.equal(birth,colors);await page.locator('#texture-mode').selectOption('artwork');
 await select('two');assert.equal(await pixels(page),two);await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/screenshots/layers-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const [id,hash] of original)assert.equal(stateHash(await store.load(id)),hash);assert.deepEqual(errors,[]);
 console.log('Layer browser passed: actual GPU composition/order, alpha/zero/missing fallbacks, reload/world switching, overlays/colors, birth, mobile, unchanged world hashes and no shader errors.');
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
