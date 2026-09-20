import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {applyProposal,advance} from '../packages/engine/src/index.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';import {ReplayJournal} from '../apps/server/src/journal.js';import {startServer} from '../apps/server/src/index.js';
import {ProposalSchema} from '../packages/contracts/src/index.js';
const fixture=async()=>{const root=await mkdtemp(join(tmpdir(),'logos-history-branch-')),store=new WorldStore(root),world=createWorld({id:'first-world',name:'Branches',seed:'history-branches',frequency:2});await store.save(world);return {root,store,world,path:join(root,world.id,'state.json')};};

test('historical reconstruction retains plugins, mapped memory and appearance without modifying current state',async()=>{
 const {root,store,world,path}=await fixture();
 try{
  const bloom=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/crystal-bloom.json','utf8'))),style=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/crystal-appearance.json','utf8')));
  const p={...bloom,operations:[...bloom.operations,...style.operations,{kind:'temperature' as const,tileId:0,celsius:20,mode:'sustained' as const}]};
  let w=applyProposal(world,p);await store.save(w,{kind:'proposal',proposal:p});w=advance(w);await store.save(w,{kind:'step',days:1});
  const mapping=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/crystal-hours.json','utf8')));mapping.expectedRevision=w.revision;w=applyProposal(w,mapping);await store.save(w,{kind:'proposal',proposal:mapping});
  const target=JSON.parse(await readFile(path,'utf8')).journalHead,expected=structuredClone(w);
  for(let i=0;i<3;i++)w=advance(w);await store.save(w,{kind:'step',days:3});const before=await readFile(path,'utf8');
  const rebuilt=await store.historicalState(world.id,target);assert.deepEqual(rebuilt.world,expected);assert.equal(rebuilt.days,1);assert.equal(rebuilt.baseKind,'journal');assert.equal(rebuilt.world.plugins[0].state[0].values[0],24);assert.equal(rebuilt.world.definitions.appearance?.length,1);assert.equal(await readFile(path,'utf8'),before);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('matching checkpoints accelerate reconstruction and abandoned paths remain branchable after restore',async()=>{
 const {root,store,world,path}=await fixture();
 try{
  let w=world;for(let i=0;i<3;i++)w=advance(w);await store.save(w,{kind:'step',days:3});const oldTarget=JSON.parse(await readFile(path,'utf8')).journalHead,oldState=structuredClone(w);await store.checkpoint(w,'Day three');
  w=advance(w);await store.save(w,{kind:'step',days:1});const target=JSON.parse(await readFile(path,'utf8')).journalHead;
  const rebuilt=await store.historicalState(world.id,target);assert.deepEqual(rebuilt.world,w);assert.equal(rebuilt.days,1);assert.equal(rebuilt.baseKind,'checkpoint');assert.equal(rebuilt.baseTick,3);
  const restored={...world,revision:w.revision+1};await store.save(restored,{kind:'snapshot',reason:'restore'});
  const abandoned=await store.historicalState(world.id,oldTarget);assert.deepEqual(abandoned.world,oldState);assert.equal(abandoned.days,0);assert.equal(abandoned.baseKind,'checkpoint');assert.equal((await store.load(world.id)).tick,0);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('reconstruction rejects orphan targets, bad anchors and budgets without publishing a state',async()=>{
 const {root,store,world,path}=await fixture();
 try{
  const dir=join(root,world.id,'journal'),read=async(h:string)=>JSON.parse(await readFile(join(dir,h+'.json'),'utf8')),journal=new ReplayJournal({read,write:async(h,v)=>{await writeFile(join(dir,h+'.json'),JSON.stringify(v));}});
  const initialHead=JSON.parse(await readFile(path,'utf8')).journalHead,orphan=await journal.append(advance(world),world,initialHead,{kind:'step',days:1});
  await assert.rejects(()=>store.historicalState(world.id,orphan),/committed history/);
  let next=advance(advance(world));await store.save(next,{kind:'step',days:2});const head=JSON.parse(await readFile(path,'utf8')).journalHead,before=await readFile(path,'utf8');
  await assert.rejects(()=>journal.reconstruct(head,next,head,{maxDays:1}),/more than 1 replay days/);
  await assert.rejects(()=>journal.reconstruct(head,next,initialHead,{maxRecords:1}),/search limit/);
  await assert.rejects(()=>journal.reconstruct(head,next,head,{checkpoint:async()=>world}),/Checkpoint does not match/);
  await assert.rejects(()=>journal.reconstruct(head,next,head,{maxDays:-1}),/budget/);
  assert.equal(await readFile(path,'utf8'),before);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('historical branching API previews, rejects stale/hash-mismatched reviews, and creates an independent verified branch',async()=>{
 const {root,store,world,path}=await fixture();let next=advance(world);await store.save(next,{kind:'step',days:1});const target=JSON.parse(await readFile(path,'utf8')).journalHead;next=advance(next);await store.save(next,{kind:'step',days:1});const app=await startServer({root,port:0});
 try{
  const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`,{token}=await(await fetch(base+'session')).json() as {token:string},headers={authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const post=(route:string,data:unknown)=>fetch(base+route,{method:'POST',headers,body:JSON.stringify(data)});
  const body={worldId:world.id,recordId:target,id:'historical-branch',name:'Day one path',expectedRevision:next.revision},before=await readFile(path,'utf8');
  assert.equal((await fetch(base+'history/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,401);
  const preview=await post('history/preview',body);assert.equal(preview.status,200);const result=await preview.json();assert.equal(result.summary.tick,1);assert.equal(await store.exists(body.id),false);assert.equal(await readFile(path,'utf8'),before);
  assert.equal((await post('history/branch',{...body,reviewedHash:'0'.repeat(64)})).status,400);assert.equal((await post('history/branch',body)).status,400);assert.equal((await post('history/branch',{...body,worldId:'wrong',reviewedHash:result.hash})).status,400);
  assert.equal((await post('step',{expectedRevision:next.revision,days:1})).status,200);assert.equal((await post('history/branch',{...body,reviewedHash:result.hash})).status,400);assert.equal(await store.exists(body.id),false);
  const fresh={...body,expectedRevision:next.revision+1};const freshPreview=await(await post('history/preview',fresh)).json();const source=await readFile(path,'utf8');
  const response=await post('history/branch',{...fresh,reviewedHash:freshPreview.hash});assert.equal(response.status,200);const branched=await response.json();assert.equal(branched.id,body.id);assert.equal(branched.tick,1);assert.equal(await readFile(path,'utf8'),source);assert.equal((await store.verifyHistory(body.id)).records,1);
  assert.equal((await post('step',{expectedRevision:branched.revision,days:1})).status,200);assert.equal((await store.load(world.id)).tick,3);assert.equal((await store.load(body.id)).tick,2);
 }finally{await app.close();await rm(root,{recursive:true,force:true});}
});
