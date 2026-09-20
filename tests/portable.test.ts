import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,readdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {WorldStore,stateHash} from '../apps/server/src/store.js';import {createWorld} from '../packages/worldgen/src/index.js';import {applyProposal,advance} from '../packages/engine/src/index.js';
import type {Proposal} from '../packages/contracts/src/index.js';
import {copyWorld,archiveWorld,digest} from '../apps/server/src/world-management.js';import {unpackBundle,memoryJournal} from '../apps/server/src/portable.js';import {pngInfo} from '../apps/server/src/artwork.js';import {startServer} from '../apps/server/src/index.js';
const png=await readFile('packages/tile-packs/public/painterly-v1/alpine.png'),hash=pngInfo(png).hash;
async function fixture(root:string){
 const store=new WorldStore(root);let w=createWorld({id:'first-world',name:'Source',seed:'portable',frequency:2});await store.save(w);await store.saveArtwork(w.id,[png]);
 const example=JSON.parse(await readFile('docs/examples/crystal-bloom.json','utf8')) as Proposal;
 const proposal:Proposal={id:'art',worldId:w.id,expectedRevision:w.revision,summary:'Imported snow',operations:[...example.operations,{kind:'artwork-activate' as const,tileId:0,pack:{id:'snow',version:1,label:'Snow',credit:'Original',images:[{slot:'condition' as const,hash}]}}]};
 w=applyProposal(w,proposal);await store.save(w,{kind:'proposal',proposal:w.history.at(-1)!});w=advance(w);await store.save(w,{kind:'step',days:1});
 const reset={id:'reset',worldId:w.id,expectedRevision:w.revision,summary:'Reset art',operations:[{kind:'artwork-reset' as const,tileId:0}]};w=applyProposal(w,reset);await store.save(w,{kind:'proposal',proposal:reset});
 await writeFile(join(root,w.id,'private-conversation.txt'),'DO NOT EXPORT ME');return {store,w};
}

test('complete bundle opens in an isolated directory with historical artwork and original replay intact',async()=>{
 const sourceRoot=await mkdtemp(join(tmpdir(),'logos-source-')),destRoot=await mkdtemp(join(tmpdir(),'logos-dest-'));
 try{
  const {store,w}=await fixture(sourceRoot),before=stateHash(w),archive=await store.exportBundle(w.id);assert.equal(archive.version,2);assert.equal(archive.payload.images.length,1);assert.equal(JSON.stringify(archive).includes('DO NOT EXPORT ME'),false);
  const parsed=await unpackBundle(archive),dest=new WorldStore(destRoot),next=copyWorld(parsed.world,'imported','Imported');await dest.createNew(next,undefined,parsed);
  assert.deepEqual((await dest.load(next.id)).tiles,w.tiles);assert.deepEqual(next.definitions,w.definitions);assert.deepEqual(next.plugins,w.plugins);assert.deepEqual(advance(next).tiles,advance(w).tiles);assert.ok((await dest.readArtwork(next.id,hash)).equals(png));assert.equal((await dest.verifyHistory(next.id)).records,1);
  const origins=await dest.readOrigins(next.id);assert.equal(origins.length,1);assert.equal(stateHash(origins[0].world as typeof w),before);
  assert.equal((await memoryJournal(origins[0].history).verify(origins[0].history.head!,w)).records,4);
  const entries=await dest.sourceHistory(next.id,0);assert.ok('entries' in entries);assert.equal(entries.entries.length,4);
  const stepped=advance(next);await dest.save(stepped,{kind:'step',days:1});assert.deepEqual(await dest.readOrigins(next.id),origins);
  const exported=await dest.exportBundle(next.id),again=await unpackBundle(exported);assert.equal(again.origins.length,2);assert.equal(again.images.length,1);
  await dest.createNew(copyWorld(stepped,'branch','Branch'),next.id);assert.deepEqual(await dest.readOrigins('branch'),origins);assert.ok((await dest.readArtwork('branch',hash)).equals(png));
  assert.equal(stateHash(await store.load(w.id)),before);
  // An isolated import still exports after the original world directory is gone.
  await rm(sourceRoot,{recursive:true,force:true});assert.deepEqual((await dest.exportBundle(next.id)).payload,exported.payload);
 }finally{await rm(sourceRoot,{recursive:true,force:true});await rm(destRoot,{recursive:true,force:true});}
});

test('bundle validation rejects missing, corrupt, duplicate and incompatible data without accepting partial history',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-bad-bundle-'));
 try{const {store,w}=await fixture(root),original=await store.exportBundle(w.id);
  await assert.rejects(()=>unpackBundle({...original,hash:'0'.repeat(64)}),/integrity/);
  const mutate=async(change:(a:typeof original)=>void,match:RegExp)=>{const archive=structuredClone(original);change(archive);archive.hash=digest(archive.payload);await assert.rejects(()=>unpackBundle(archive),match);};
  await mutate(a=>{a.payload.images=[];},/missing referenced artwork/);
  await mutate(a=>{a.payload.images[0].data='AAAA';},/PNG|integrity/);
  await mutate(a=>{a.payload.images.push(a.payload.images[0]);},/Duplicate/);
  await mutate(a=>{a.payload.source.history.records.pop();},/missing journal/);
  await mutate(a=>{a.payload.source.history.snapshots=[];},/missing journal/);
  await mutate(a=>{a.payload.source.history.records.push(a.payload.source.history.records[0]);},/Duplicate/);
  await mutate(a=>{a.payload.source.history.head=null;},/unreferenced/);
  const incompatible=structuredClone(original) as unknown as {payload:{engineVersion:string};hash:string};incompatible.payload.engineVersion='99.0';incompatible.hash=digest(incompatible.payload);await assert.rejects(()=>unpackBundle(incompatible));
  // Checksums alone cannot legitimize false deterministic transitions.
  const dishonest=structuredClone(original);const record=dishonest.payload.source.history.records[0].record as {proposal:{operations:unknown[]}};record.proposal.operations=[{kind:"communication",tileId:0,enabled:false}];dishonest.payload.source.history.records[0].id=digest(record);dishonest.payload.source.history.head=digest(record);dishonest.hash=digest(dishonest.payload);await assert.rejects(()=>unpackBundle(dishonest),/Replay result differs/);
  await rm(join(root,w.id,'assets',`${hash}.png`));await assert.rejects(()=>store.exportBundle(w.id),/required artwork/);
  const legacy=await unpackBundle(archiveWorld(w));assert.equal(legacy.legacy,true);assert.equal(legacy.images.length,0);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('bundle API reviews without writes, imports independently and retains authenticated source history after restart',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-bundle-api-'));let app:Awaited<ReturnType<typeof startServer>>|undefined;
 try{const {store,w}=await fixture(root);app=await startServer({root,port:0});
  const client=async()=>{const address=app!.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`,{token}=await(await fetch(base+'session')).json() as {token:string},headers={authorization:`Bearer ${token}`,'content-type':'application/json'};return {base,get:(path:string)=>fetch(base+path,{headers}),post:(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)})};};
  let c=await client();const archive=await(await c.get('worlds/export')).json(),body={archive,id:'portable-copy',name:'Copy'},files=await readdir(root);
  const preview=await c.post('worlds/import/preview',body);assert.equal(preview.status,200);const details=await preview.json() as {bundle:{records:number;images:number}};assert.equal(details.bundle.records,4);assert.equal(details.bundle.images,1);assert.deepEqual(await readdir(root),files);assert.equal(stateHash(await store.load(w.id)),stateHash(w));
  assert.equal((await c.post('worlds/import',body)).status,200);assert.equal((await c.post('worlds/import',body)).status,400);assert.equal((await fetch(c.base+'worlds/sources')).status,401);
  const list=await(await c.get('worlds/sources')).json() as {id:string;records:number}[];assert.equal(list[0].id,w.id);assert.equal(list[0].records,4);assert.equal((await c.get('worlds/sources?index=999')).status,400);
  await app.close();app=await startServer({root,port:0});c=await client();const page=await(await c.get('worlds/sources?index=0')).json() as {entries:unknown[]};assert.equal(page.entries.length,4);assert.equal((await store.load('portable-copy')).name,'Copy');
  const bad={...body,id:'broken',archive:{...archive,hash:'0'.repeat(64)}};assert.equal((await c.post('worlds/import',bad)).status,400);assert.equal(await store.exists('broken'),false);
 }finally{await app?.close();await rm(root,{recursive:true,force:true});}
});


test('failed import writes remove the incomplete destination and never overwrite existing worlds',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-import-failure-'));
 try{const {store,w}=await fixture(root),parsed=await unpackBundle(await store.exportBundle(w.id));
  class FailingStore extends WorldStore{override async save(){throw Error('Simulated publication failure');}}
  const failing=new FailingStore(root);await assert.rejects(()=>failing.createNew(copyWorld(parsed.world,'failed-copy','Failed'),undefined,parsed),/publication failure/);assert.equal(await store.exists('failed-copy'),false);
  await assert.rejects(()=>failing.createNew(w,undefined,parsed),/EEXIST/);assert.equal(stateHash(await store.load(w.id)),stateHash(w));
 }finally{await rm(root,{recursive:true,force:true});}
});
