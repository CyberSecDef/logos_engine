import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir,cpus} from 'node:os';
import {createWorld} from '../dist/packages/worldgen/src/index.js';import {terrainPack} from '../dist/packages/globe/src/appearance.js';import {startServer} from '../dist/apps/server/src/index.js';
const root=await mkdtemp(join(tmpdir(),'logos-render-bench-'));
const app=await startServer({root,host:'127.0.0.1',port:0,dev:true,provider:{name:'No model',async generate(){throw Error('Unexpected model call');}}});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const reports=[];
 for(const frequency of [2,12,26]){
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  await page.route('**/render-bench',route=>route.fulfill({contentType:'text/html',body:'<style>body{margin:0}canvas{width:100vw;height:100vh}</style><canvas id="bench"></canvas>'}));
  await page.goto(`http://127.0.0.1:${app.server.address().port}/render-bench`);
  const world=createWorld({id:'render-reference',name:'Rendering reference',seed:'render-reference',frequency});world.tick=1000;
  const result=await page.evaluate(async({world,slots,capture})=>{
   const {WorldGlobe}=await import('/src/globe.ts');const g=new WorldGlobe(document.querySelector('#bench'),()=>{});g.spinning=false;
   // Fixed available slots isolate buffer construction from image I/O/decoding.
   g.textures.load=async()=>{};for(const [id,index] of slots)g.textures.slots.set(id,index);
   const land=world.tiles.find(t=>t.elevationM>0).id;
   const start=performance.now();g.setWorld(world);const firstMs=performance.now()-start;
   const signature=async()=>{const attributes={};for(const name of ['position','normal','color','uv','aTexture','aLayer0','aLayer1']){const bytes=g.geometry.getAttribute(name).array;const hash=await crypto.subtle.digest('SHA-256',bytes);attributes[name]=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}return {attributes,bounds:g.geometry.boundingSphere.toArray?.()??{center:g.geometry.boundingSphere.center.toArray(),radius:g.geometry.boundingSphere.radius}};};
   const signatures={initial:await signature()},timings={};
   const versions=()=>Object.fromEntries(Object.entries(g.geometry.attributes).map(([name,attribute])=>[name,attribute.version]));
   const initialVersions=versions();
   const run=(name,change)=>{const samples=[];for(let i=0;i<8;i++){change(i);const start=performance.now();g.update();samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);timings[name]={medianMs:Math.round(samples[4]*100)/100,maxMs:Math.round(samples[7]*100)/100};};
   run('unchanged',()=>{});signatures.unchanged=await signature();
   if(!capture && JSON.stringify(versions())!==JSON.stringify(initialVersions))throw Error('Unchanged world triggered buffer uploads');
   run('overlays',i=>{g.overlay=i%2?'water':'temperature';});signatures.water=await signature();
   g.overlay='terrain';g.texturesEnabled=false;g.update();signatures.colors=await signature();
   g.texturesEnabled=true;world.tiles[land].elevationM+=200;g.update();signatures.raised=await signature();
   run('oneElevation',i=>{world.tiles[land].elevationM+=i%2?-10:10;});signatures.elevation=await signature();
   // Loaded-slot changes and same-sized world switches.
   g.textures.slots.delete(slots[0][0]);g.update();signatures.missing=await signature();
   const other=structuredClone(world);other.id='other-world';other.tiles[1].elevationM-=100;g.setWorld(other);signatures.switched=await signature();
   return {zones:world.tiles.length,firstMs:Math.round(firstMs*100)/100,timings,signatures};
  },{world,capture:!!process.env.LOGOS_CAPTURE_RENDER_REFERENCE,slots:terrainPack.entries.map((e,i)=>[e.id,i])});
  reports.push({frequency,...result});console.error(`Measured ${result.zones} zones: ${JSON.stringify(result.timings)}`);await page.close();
 }
 if(!process.env.LOGOS_CAPTURE_RENDER_REFERENCE){const reference=JSON.parse(await readFile('docs/phase-6-render-baseline.json','utf8'));for(let i=0;i<reports.length;i++)assert.deepEqual(reports[i].signatures,reference.reports[i].signatures,'Rendered buffer parity with pre-cache renderer');}
 console.log(JSON.stringify({node:process.version,cpu:cpus()[0]?.model,measuredAt:new Date().toISOString(),notes:'Chromium/SwiftShader; Vite module in isolated page. CPU update timings exclude animation rendering, GPU submission, asset I/O and production delivery. Eight warm samples; first construction separate.',reports},null,2));
}finally{await browser.close();await app.close();await rm(root,{recursive:true,force:true});}
