import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir,readdir,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal} from '../packages/engine/src/index.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';import {ReplayJournal} from '../apps/server/src/journal.js';import {copyWorld,archiveWorld,unpackWorld} from '../apps/server/src/world-management.js';
import {startServer} from '../apps/server/src/index.js';
const make=()=>createWorld({id:'first-world',name:'Replay',seed:'journal',frequency:2});
const fixture=async()=>{const root=await mkdtemp(join(tmpdir(),'logos-journal-'));return {root,store:new WorldStore(root),path:join(root,'first-world','state.json')};};

test('compact steps and proposals replay to every recorded hash without modifying the world',async()=>{
 const {root,store,path}=await fixture();let world=make();
 try{
  await store.save(world);const proposal={id:'rain',worldId:world.id,expectedRevision:0,summary:'More rain',operations:[{kind:'rainfall' as const,tileId:0,mmPerDay:90}]};world=applyProposal(world,proposal);await store.save(world,{kind:'proposal',proposal});
  for(let i=0;i<5;i++)world=advance(world);await store.save(world,{kind:'step',days:5});
  const source=await readFile(path,'utf8'),result=await store.verifyHistory(world.id);
  assert.equal(result.days,5);assert.equal(result.proposals,1);assert.equal(result.snapshots,1);assert.equal(result.records,3);assert.equal(result.hash,stateHash(world));assert.equal(await readFile(path,'utf8'),source);
  const history=await store.history(world.id);assert.deepEqual(history.entries.map(e=>e.kind),['step','proposal','snapshot']);assert.equal(history.hasMore,false);
  const envelope=JSON.parse(source),record=JSON.parse(await readFile(join(root,world.id,'journal',envelope.journalHead+'.json'),'utf8'));assert.equal(record.days,5);assert.equal(Object.hasOwn(record,'world'),false);
  await assert.rejects(()=>store.verifyHistory(world.id,4),/day limit/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('legacy worlds adopt on save; restore boundaries retain abandoned history and branches start independently',async()=>{
 const {root,store,path}=await fixture(),initial=make();initial.tick=100;initial.revision=100;
 try{
  await mkdir(join(root,initial.id));const source=JSON.stringify({hash:stateHash(initial),world:initial});await writeFile(path,source);
  assert.deepEqual((await store.history(initial.id)).entries,[]);assert.equal(await readFile(path,'utf8'),source);
  await assert.rejects(()=>store.verifyHistory(initial.id),/No replay history/);
  const next=advance(initial);await store.save(next,{kind:'step',days:1});assert.equal((await store.verifyHistory(initial.id)).startTick,100);
  const restored={...initial,revision:next.revision+1};await store.save(restored,{kind:'snapshot',reason:'restore'});const final=advance(restored);await store.save(final,{kind:'step',days:1});
  const result=await store.verifyHistory(initial.id);assert.equal(result.days,2);assert.equal(result.snapshots,2);assert.equal(result.endTick,101);
  const branch=copyWorld(unpackWorld(archiveWorld(final)),'branch','Independent');await store.createNew(branch);assert.equal((await store.verifyHistory(branch.id)).records,1);
  assert.deepEqual((await store.history(initial.id)).entries.map(e=>e.summary),['Advanced 1 day','restore snapshot','Advanced 1 day','adopted snapshot']);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('unpublished orphan records are ignored and failed metadata leaves the committed head intact',async()=>{
 const {root,store,path}=await fixture(),world=make();
 try{
  await store.save(world);const source=await readFile(path,'utf8'),head=JSON.parse(source).journalHead,dir=join(root,world.id,'journal');
  const journal=new ReplayJournal({read:async h=>JSON.parse(await readFile(join(dir,h+'.json'),'utf8')),write:async(h,v)=>{await writeFile(join(dir,h+'.json'),JSON.stringify(v),{flag:'wx'});}});
  await journal.append(advance(world),world,head,{kind:'step',days:1});
  assert.equal((await store.history(world.id)).entries.length,1);assert.equal((await store.verifyHistory(world.id)).days,0);
  await assert.rejects(()=>store.save(advance(world),{kind:'step',days:2}),/metadata/);assert.equal(await readFile(path,'utf8'),source);
  await store.save(advance(world),{kind:'step',days:1});assert.equal((await store.verifyHistory(world.id)).days,1);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('corrupt journal ancestors fail replay and symlinked artifact storage rejects saves atomically',async()=>{
 const {root,store,path}=await fixture(),world=make();
 try{
  await store.save(world);const oldHead=JSON.parse(await readFile(path,'utf8')).journalHead;await store.save(advance(world),{kind:'step',days:1});
  await writeFile(join(root,world.id,'journal',oldHead+'.json'),'{}');await assert.rejects(()=>store.verifyHistory(world.id),/integrity/);
  const other=copyWorld(world,'other','Other');await store.createNew(other);const saved=await readFile(join(root,'other','state.json'),'utf8');await rm(join(root,'other','journal'),{recursive:true});await symlink(join(root,world.id,'journal'),join(root,'other','journal'));
  await assert.rejects(()=>store.save(advance(other),{kind:'step',days:1}),/symlink/);assert.equal(await readFile(join(root,'other','state.json'),'utf8'),saved);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('replay detects a valid saved state whose recorded step does not reproduce it',async()=>{
 const {root,store}=await fixture(),world=make();
 try{
  await store.save(world);const next=advance(world);next.tiles[0].elevationM+=100;
  await store.save(next,{kind:'step',days:1});await assert.rejects(()=>store.verifyHistory(world.id),/differs/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('HTTP apply, step and restore record actions while preview and checkpoints do not',async()=>{
 const {root,store}=await fixture(),world=make();await store.save(world);const app=await startServer({root,port:0});
 try{
  const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`,{token}=await(await fetch(base+'session')).json() as {token:string};const headers={authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  assert.equal((await fetch(base+'history')).status,401);
  const post=async(path:string,data:unknown)=>{const res=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(data)});assert.equal(res.status,200);return res.json();};
  const point=await post('checkpoints',{label:'Before rain',expectedRevision:0});const proposal={id:'rain',worldId:world.id,expectedRevision:0,summary:'Rain now',operations:[{kind:'rainfall',tileId:0,mmPerDay:40}]};
  await post('proposals/preview',proposal);assert.equal((await store.history(world.id)).entries.length,1);
  await post('proposals/apply',proposal);await post('step',{expectedRevision:1,days:3});await post('checkpoints/restore',{id:point.id,expectedRevision:4});
  assert.deepEqual((await store.history(world.id)).entries.map(e=>e.kind),['snapshot','step','proposal','snapshot']);assert.equal((await store.verifyHistory(world.id)).proposals,1);
 }finally{await app.close();await rm(root,{recursive:true,force:true});}
});

test('recent history is bounded and CLI verification operates on an isolated saved world',async()=>{
 const {spawnSync}=await import('node:child_process');const {resolve}=await import('node:path');
 const root=await mkdtemp(join(tmpdir(),'logos-journal-cli-')),store=new WorldStore(join(root,'worlds'));let world=make();
 try{
  await store.save(world);
  for(let i=0;i<51;i++){world=advance(world);await store.save(world,{kind:'step',days:1});}
  const recent=await store.history(world.id);assert.equal(recent.entries.length,50);assert.equal(recent.hasMore,true);assert.equal(recent.entries[0].tick,51);
  const older=await store.history(world.id,recent.entries.at(-1)!.id);assert.deepEqual(older.entries.map(e=>e.tick),[1,0]);assert.equal(older.hasMore,false);
  await assert.rejects(()=>store.history(world.id,'0'.repeat(64)),/not committed/);
  const path=join(root,'worlds',world.id,'state.json'),before=await readFile(path,'utf8');
  const good=spawnSync(process.execPath,[resolve('dist/apps/server/src/cli.js'),'verify-history',world.id,'51'],{cwd:root,encoding:'utf8'});assert.equal(good.status,0,good.stderr);assert.match(good.stdout,/verified: true/);assert.match(good.stdout,/days: 51/);
  const limited=spawnSync(process.execPath,[resolve('dist/apps/server/src/cli.js'),'verify-history',world.id,'1'],{cwd:root,encoding:'utf8'});assert.notEqual(limited.status,0);assert.match(limited.stderr,/day limit/);assert.equal(await readFile(path,'utf8'),before);
 }finally{await rm(root,{recursive:true,force:true});}
});
