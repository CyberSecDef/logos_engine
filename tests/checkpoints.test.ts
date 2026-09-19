import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WorldStore,stateHash} from '../apps/server/src/store.js';
import {archiveWorld,unpackWorld,copyWorld,digest} from '../apps/server/src/world-management.js';
import {createWorld} from '../packages/worldgen/src/index.js';
import {advance,applyProposal} from '../packages/engine/src/index.js';
import {ProposalSchema,type World} from '../packages/contracts/src/index.js';
import {startServer} from '../apps/server/src/index.js';
const make=()=>createWorld({id:'first-world',name:'Checkpoint test',seed:'checkpoints',frequency:2});
const initialized=async()=>{const w=make(),p=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/mana-sharing.json','utf8')));return advance(applyProposal(w,{...p,worldId:w.id,expectedRevision:w.revision}));};

test('immutable snapshots deduplicate, preserve custom rules/ledger, reject corruption and symlinks',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-checkpoints-')),store=new WorldStore(root),world=await initialized();
 try {
  await store.save(world);const a=await store.checkpoint(world,'Before experiment'),b=await store.checkpoint(world,'Same state');
  assert.notEqual(a.id,b.id);assert.equal(a.hash,b.hash);assert.deepEqual((await store.readCheckpoint(world.id,a.id)).world,world);
  assert.equal((await readdir(join(root,world.id,'snapshots'))).length,1);assert.equal((await readdir(join(root,world.id,'definitions'))).length,1);
  await store.checkpoint(advance(world),'Next day');assert.equal((await readdir(join(root,world.id,'definitions'))).length,1);
  assert.equal((await store.checkpoints(world.id)).length,3);
  await assert.rejects(store.readCheckpoint(world.id,'../escape'));
  const path=join(root,world.id,'snapshots',a.hash+'.json');await writeFile(path,'{}');await assert.rejects(store.readCheckpoint(world.id,a.id),/integrity/);
  assert.equal((await store.checkpoints(world.id)).length,1);await assert.rejects(store.checkpoint(world,'Cannot overwrite'),/Immutable/);
  await rm(path);await symlink(join(root,world.id,'state.json'),path);await assert.rejects(store.readCheckpoint(world.id,a.id),/symlink/);
  assert.deepEqual(await store.load(world.id),world);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('automatic cadence is 100 days, ten retained; named and restore backups keep shared artifacts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-retention-')),store=new WorldStore(root),world=make();
 try {
  await store.save(world);const named=await store.checkpoint(world,'Keep initial'),backup=await store.checkpoint(world,'Restore backup','before-restore');
  await store.automaticCheckpoint(world,{...world,tick:1,revision:1});
  await store.automaticCheckpoint({...world,tick:98,revision:98},{...world,tick:99,revision:99});
  assert.equal((await store.checkpoints(world.id)).filter(r=>r.kind==='automatic').length,1);
  for(let n=1;n<=12;n++)await store.automaticCheckpoint({...world,tick:n*100-1,revision:n*100-1},{...world,tick:n*100,revision:n*100});
  const records=await store.checkpoints(world.id),autos=records.filter(r=>r.kind==='automatic');assert.equal(autos.length,10);assert.deepEqual(autos.map(r=>r.tick).sort((a,b)=>a-b),[300,400,500,600,700,800,900,1000,1100,1200]);
  assert.equal(records.length,12);assert.equal((await store.readCheckpoint(world.id,named.id)).world.tick,0);await store.readCheckpoint(world.id,backup.id);
  assert.equal((await readdir(join(root,world.id,'snapshots'))).length,11);
  const reopened=new WorldStore(root);await reopened.automaticCheckpoint({...world,tick:1200,revision:1200},{...world,tick:1201,revision:1201});assert.equal((await reopened.checkpoints(world.id)).length,12);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('portable archives verify data and clone history with deterministic independent state',async()=>{
 const world=await initialized(),before=stateHash(world),archive=archiveWorld(world);assert.deepEqual(unpackWorld(archive),world);
 const copy=copyWorld(unpackWorld(archive),'independent','Independent');assert.equal(copy.history[0].worldId,'independent');assert.deepEqual(advance(copy).tiles,advance(world).tiles);assert.deepEqual(copy.resourceLedger,world.resourceLedger);
 copy.tiles[0].properties.mana=5;assert.equal(stateHash(world),before);
 assert.throws(()=>unpackWorld({...archive,hash:'0'.repeat(64)}),/integrity/);
 const broken={...archive.world,id:'../escape'};assert.throws(()=>unpackWorld({...archive,hash:digest(broken),world:broken}));
 assert.throws(()=>unpackWorld({...archive,conversations:[]}));assert.throws(()=>copyWorld(world,'../escape','No'));
});

test('HTTP checkpoint review/restore, branches, export/import and restart preserve independent worlds without model calls',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-world-api-')),store=new WorldStore(root),initial=await initialized();await store.save(initial);let calls=0;
 const provider={name:'No calls',async generate(){calls++;throw Error('Unexpected model call');}};
 let app=await startServer({root,port:0,provider});
 async function client(){const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`,{token}=await (await fetch(base+'session')).json() as {token:string},headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 return {get:async(path:string)=>await (await fetch(base+path,{headers})).json(),post:(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)})};}
 try {
  let {get,post}=await client();const checkpoint=await (await post('checkpoints',{label:'Mana birth',expectedRevision:initial.revision})).json() as {id:string};
  await post('step',{expectedRevision:initial.revision,days:2});const changed=await get('world') as World;
  assert.equal((await post('checkpoints/restore',{id:checkpoint.id,expectedRevision:initial.revision})).status,400);
  const args={id:checkpoint.id,expectedRevision:changed.revision};assert.equal((await post('checkpoints/preview',args)).status,200);assert.deepEqual(await get('world'),changed);
  const obstructed=join(root,initial.id,'snapshots',stateHash(changed)+'.json');await writeFile(obstructed,'{}');
  assert.equal((await post('checkpoints/restore',args)).status,400);assert.deepEqual(await get('world'),changed);assert.deepEqual(await store.load(initial.id),changed);await rm(obstructed);
  assert.equal((await post('checkpoints/restore',args)).status,200);const restored=await get('world') as World;assert.equal(restored.revision,changed.revision+1);assert.deepEqual({...restored,revision:initial.revision},initial);
  const backups=(await store.checkpoints(initial.id)).filter(r=>r.kind==='before-restore');assert.equal(backups.length,1);assert.deepEqual((await store.readCheckpoint(initial.id,backups[0].id)).world,changed);
  assert.equal((await post('step',{expectedRevision:changed.revision})).status,400);
  assert.equal((await post('worlds/branch',{id:'branch',name:'Branch',checkpointId:checkpoint.id,expectedRevision:restored.revision})).status,200);
  const branch=await get('world') as World;assert.equal(branch.id,'branch');assert.deepEqual(branch.tiles,initial.tiles);assert.equal(branch.history[0].worldId,'branch');
  await post('step',{expectedRevision:branch.revision});assert.deepEqual(await store.load(initial.id),restored);
  const archive=await get('worlds/export'),body={archive,id:'imported',name:'Imported'};assert.equal((await post('worlds/import/preview',body)).status,200);assert.equal(await store.exists('imported'),false);
  assert.equal((await post('worlds/import',body)).status,200);const imported=await get('world') as World;assert.deepEqual(imported.tiles,(await store.load('branch')).tiles);
  assert.equal((await post('worlds/import',body)).status,400);assert.equal((await post('worlds/import',{...body,id:'bad',archive:{...archive,hash:'0'.repeat(64)}})).status,400);assert.equal(await store.exists('bad'),false);
  await app.close();app=await startServer({root,port:0,provider});({get,post}=await client());assert.deepEqual(await get('world'),imported);assert.equal(calls,0);
 }finally{await app.close();await rm(root,{recursive:true,force:true});}
});
