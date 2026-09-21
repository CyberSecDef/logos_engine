import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {startServer} from '../dist/apps/server/src/index.js';
import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';
const root=await mkdtemp(join(tmpdir(),'logos-delivery-'));
const app=await startServer({root,host:'127.0.0.1',port:0,provider:{name:'No model',async generate(){throw Error('Unexpected model call');}}});
const base=`http://127.0.0.1:${app.server.address().port}`;
// A temporary persistent profile models normal browser disk caching; the full
// artwork pack exceeds Chromium's small incognito in-memory cache.
const browser=await chromium.launchPersistentContext(join(root,'browser-profile'),{viewport:{width:1280,height:800},reducedMotion:'reduce',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const session=await fetch(base+'/api/session');assert.equal(session.headers.get('cache-control'),'no-store');
 const {token}=await session.json(),headers={authorization:`Bearer ${token}`};
 const response=await fetch(base+'/api/world',{headers});assert.equal(response.headers.get('cache-control'),'no-store');
 const world=await response.json(),before=stateHash(await new WorldStore(root).load(world.id));
 const envelope=await readFile(join(root,world.id,'state.json'),'utf8');
 const html=await fetch(base);assert.equal(html.headers.get('cache-control'),'no-cache');
 const assets=[];
 for(const file of await readdir('dist/web/assets')){
  if(!/\.(js|css)$/.test(file))continue;
  const bytes=await readFile('dist/web/assets/'+file),response=await fetch(base+'/assets/'+file);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  assets.push({file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length});
 }
 assert.ok(assets.some(a=>a.file.startsWith('three-')&&a.file.endsWith('.js')));
 const total=assets.filter(a=>a.file.endsWith('.js')).reduce((n,a)=>n+a.bytes,0);
 assert.ok(total<700000,'Browser JS should remain below 700 kB after removing schema initialization');
 const context=browser,errors=[];
 const visit=async()=>{
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saved locally'));
  await page.waitForFunction(()=>!document.querySelector('#art-status').textContent.includes('Loading'));
  const entries=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/\/assets\/.*\.(js|css)$/.test(e.name)).map(e=>({file:e.name.split('/').pop(),transferSize:e.transferSize,decodedBodySize:e.decodedBodySize})));
  await page.close();return entries;
 };
 const cold=await visit(),warm=await visit();
 assert.equal(cold.length,assets.length);assert.equal(warm.length,assets.length);
 assert.ok(cold.every(a=>a.transferSize>0),'Fresh browser must download build assets');
 assert.ok(warm.every(a=>a.transferSize===0),`Repeat navigation must reuse hashed build assets: ${JSON.stringify(warm)}`);
 assert.deepEqual(errors,[]);
 assert.equal(stateHash(await new WorldStore(root).load(world.id)),before);
 assert.equal(await readFile(join(root,world.id,'state.json'),'utf8'),envelope);
 console.log(JSON.stringify({assets,cold,warm,totalJavaScriptBytes:total,notes:'Production server; isolated temporary Chromium profile, first and repeat navigation. Gzip sizes are estimates; HTTP uses identity encoding. No world writes or model calls.'},null,2));
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
