import {webkit} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';
import {createWorld} from '../dist/packages/worldgen/src/index.js';
import {startServer} from '../dist/apps/server/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-raised-webkit-')),store=new WorldStore(root);
const w=createWorld({id:'first-world',name:'Raised terrain',seed:'surface',frequency:8});w.tick=1000;
const id=w.tiles.find(t=>t.elevationM>0&&t.vegetation>.4).id;w.tiles[id].elevationM=4000;
for(const n of w.cells[id].neighbors)w.tiles[n].elevationM=200;
await store.save(w);const before=stateHash(await store.load(w.id));let calls=0;
const app=await startServer({root,host:'127.0.0.1',port:0,provider:{name:'No model',async generate(){calls++;throw Error('Unexpected model');}}});
let browser;
try{
 browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:850},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+app.server.address().port);
 await page.waitForFunction(()=>document.querySelector('#art-status').textContent.includes('642 / 642 places illustrated'));
 await page.locator('#zone-number').fill(String(id));await page.locator('#zone-navigation button').click();
 assert.match(await page.locator('#tile-subtitle').textContent(),new RegExp('ZONE '+String(id).padStart(4,'0')));
 await page.locator('#zoom-in').click();await mkdir('.local/screenshots',{recursive:true});
 await page.screenshot({path:'.local/screenshots/tile-bevel-webkit-production.png'});
 assert.deepEqual(errors,[]);assert.equal(calls,0);assert.equal(stateHash(await store.load(w.id)),before);
 console.log('Raised production WebKit passed: mature artwork, elevated terrain, selection, zoom, no shader errors and unchanged save.');
}finally{await browser?.close();await app.close();await rm(root,{recursive:true,force:true});}
