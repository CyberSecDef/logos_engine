import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createWorld } from '../packages/worldgen/src/index.js';
import { advance, applyProposal, validateWorld } from '../packages/engine/src/index.js';
import { fieldValue } from '../packages/engine/src/extensions.js';
import { resourceTotals } from '../packages/engine/src/resources.js';
import { ProposalSchema, type World, type Operation } from '../packages/contracts/src/index.js';
import { WorldStore, stateHash } from '../apps/server/src/store.js';
import { PromptService, forecast } from '../apps/server/src/prompts.js';
const example=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/mana-sharing.json','utf8')));
const make=()=>createWorld({id:'first-world',name:'Mana test',seed:'mana',frequency:2});
const proposal=(w:World,operations:Operation[])=>({...example,id:`edit-${w.revision}`,expectedRevision:w.revision,operations});
const initialized=()=>{const w=make();return applyProposal(w,proposal(w,example.operations));};
const amount=(w:World,id:number)=>fieldValue(w,id,'mana');
const total=(w:World)=>resourceTotals(w)[0].totalMilli;

test('mana sharing conserves integer units, leaves source unchanged, and travels one hop each day',()=>{
 const w=initialized(),before=stateHash(w),next=advance(w),neighbors=w.cells[0].neighbors;
 assert.equal(total(next),120000);assert.equal(amount(next,0),108);assert.equal(stateHash(w),before);
 assert.equal(next.resourceLedger.entries[0].transferredMilli,12000);
 for(const id of neighbors)assert.ok(amount(next,id)>0);
 for(const tile of next.tiles)if(tile.id!==0&&!neighbors.includes(tile.id))assert.equal(amount(next,tile.id),0);
 let global=structuredClone(w);global.definitions.rules[0].scope='world';const first=advance(global);
 for(const tile of first.tiles)if(tile.id!==0&&!neighbors.includes(tile.id))assert.equal(amount(first,tile.id),0);
 const second=advance(first);assert.ok(second.tiles.some(t=>t.id!==0&&!neighbors.includes(t.id)&&amount(second,t.id)>0));assert.equal(total(second),120000);
 let a=global,b=structuredClone(global);for(let n=0;n<100;n++){a=advance(a);b=advance(b);assert.equal(total(a),120000);}assert.equal(stateHash(a),stateHash(b));
});

test('source competition, full destinations, tiny quantities, and adjacency ordering cannot lose stock',()=>{
 const w=initialized(),first=w.definitions.rules[0];w.tiles[0].properties.mana=0.007;
 w.definitions.rules=[{...first,id:'a-share'},{...first,id:'b-share'}];
 const next=advance(w);assert.equal(total(next),7);assert.equal(amount(next,0),0);assert.ok(next.tiles.every(t=>amount(next,t.id)>=0));
 const received=w.cells[0].neighbors.map(id=>Math.round(amount(next,id)*1000));assert.ok(Math.max(...received)-Math.min(...received)<=1);
 const reordered=structuredClone(w);reordered.definitions.rules.reverse();for(const cell of reordered.cells)cell.neighbors.reverse();assert.deepEqual(advance(reordered).tiles,next.tiles);
 const full=initialized();for(const id of full.cells[0].neighbors)full.tiles[id].properties.mana=1000;
 assert.equal(amount(advance(full),0),120);assert.equal(advance(full).resourceLedger.entries[0].transferredMilli,0);
 const space=structuredClone(full),dest=space.cells[0].neighbors[0];space.tiles[dest].properties.mana=999.999;
 const moved=advance(space);assert.equal(amount(moved,dest),1000);assert.equal(amount(moved,0),119.999);assert.equal(total(moved),total(space));
 // Many senders compete for the same destination's last 0.001 units of capacity.
 const competing=initialized();competing.definitions.rules[0].scope='world';for(const tile of competing.tiles)tile.properties.mana=1000;competing.tiles[0].properties.mana=999.999;
 const after=advance(competing);assert.equal(total(after),total(competing));assert.equal(after.resourceLedger.entries[0].transferredMilli,1);
});

test('lower-neighbor sharing respects terrain, not communication, and formulas clamp bounded neighbor reads',()=>{
 const w=initialized();for(const tile of w.tiles)tile.elevationM=100;
 const low=w.cells[0].neighbors[0];w.tiles[low].elevationM=50;w.tiles[0].communication=false;
 const effect=w.definitions.rules[0].effects[0];effect.destination='lower-neighbors';
 effect.value={constant:20,min:0,max:7,terms:[{coefficient:1,read:{source:'elevationM',sample:'neighbors-min'}}]};
 const next=advance(w);assert.equal(amount(next,low),7);assert.equal(amount(next,0),113);
 for(const id of w.cells[0].neighbors.filter(id=>id!==low))assert.equal(amount(next,id),0);
 const max=structuredClone(w);max.definitions.rules[0].effects[0].value={constant:-100,terms:[{coefficient:1,read:{source:'elevationM',sample:'neighbors-max'}}]};assert.equal(amount(advance(max),0),120);
});

test('exact transfers reject unavailable amounts atomically and account for both ends',()=>{
 const w=initialized();w.definitions.rules=[];const to=w.cells[0].neighbors[0],hash=stateHash(w);
 const op:Operation={kind:'field-transfer',tileId:0,toTileId:to,fieldId:'mana',amount:5.123};
 const moved=applyProposal(w,proposal(w,[op]));assert.equal(amount(moved,0),114.877);assert.equal(amount(moved,to),5.123);assert.equal(total(moved),120000);assert.equal(stateHash(w),hash);
 for(const change of [{...op,amount:121},{...op,amount:.0001},{...op,toTileId:0},{...op,toTileId:999}])assert.throws(()=>applyProposal(w,proposal(w,[change])));
 const full=structuredClone(w);full.tiles[to].properties.mana=999;assert.throws(()=>applyProposal(full,proposal(full,[op])),/capacity/);
 const index=structuredClone(w);delete index.definitions.fields[0].quantity;assert.throws(()=>applyProposal(index,proposal(index,[op])),/stock/);
});

test('ledger accounts for net local creation/removal separately from conserved transfers',()=>{
 const w=initialized(),template=w.definitions.rules[0];w.definitions.rules.push({...template,id:'produce',effects:[{fieldId:'mana',kind:'add',value:{constant:10,terms:[]}}]});
 const next=advance(w),entry=next.resourceLedger.entries[0];assert.equal(entry.beforeMilli,120000);assert.equal(entry.createdMilli,10000);assert.equal(entry.removedMilli,0);assert.equal(entry.afterMilli,130000);assert.equal(entry.transferredMilli,12000);
 const consume=structuredClone(w);consume.definitions.rules.find(r=>r.id==='produce')!.effects[0].value.constant=-10;
 const after=advance(consume);assert.equal(after.resourceLedger.entries[0].removedMilli,10000);assert.equal(total(after),110000);
 const bad=structuredClone(next);bad.resourceLedger.entries[0].afterMilli++;assert.throws(()=>validateWorld(bad),/ledger/);
 const invalid=structuredClone(w);invalid.definitions.fields[0].min=-1;assert.throws(()=>validateWorld(invalid),/zero minimum/);
 const missing=structuredClone(w);delete missing.definitions.rules[0].effects[0].destination;assert.throws(()=>validateWorld(missing),/destination/);
});

test('schema-2 fertility saves migrate without mutation and preserve their own versioned backup',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-resource-migration-')),store=new WorldStore(root),world=make();
 const fertility=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/soil-fertility.json','utf8')));
 const current=applyProposal(world,proposal(world,fertility.operations)),{resourceLedger:_,...data}=current;
 const legacy={...data,schemaVersion:2,engineVersion:'0.2.0'},hash=createHash('sha256').update(JSON.stringify(legacy)).digest('hex');
 const dir=join(root,world.id),path=join(dir,'state.json'),source=JSON.stringify({hash,world:legacy});await mkdir(dir);await writeFile(path,source);
 try{const loaded=await store.load(world.id);assert.equal(loaded.schemaVersion,3);assert.deepEqual(loaded.definitions,current.definitions);assert.equal(await readFile(path,'utf8'),source);await store.save(advance(loaded));assert.equal(await readFile(join(dir,'state.v2.backup.json'),'utf8'),source);assert.deepEqual(advance(await store.load(world.id)),advance(advance(current)));}finally{await rm(root,{recursive:true,force:true});}
});

test('prompt authority covers transfer recipients and previews compare whole-world stock totals',async()=>{
 const w=initialized(),root=await mkdtemp(join(tmpdir(),'logos-transfer-scope-')),store=new WorldStore(root);await store.save(w);
 const service=new PromptService(store,{name:'Manual',async generate(){throw Error('No model call');}}),to=w.cells[0].neighbors[0];
 const request=(id:string,scope:'tile'|'neighbors')=>({id,worldId:w.id,expectedRevision:w.revision,tileId:0,scope,mode:'propose',message:'Share mana.'});
 const reply=(operations:Operation[])=>({kind:'proposal',message:'Share mana.',assumptions:[],operations});
 try {
  await service.export(w,request('narrow','tile'));
  await assert.rejects(()=>service.import(w,{requestId:'narrow',reply:reply([{kind:'field-transfer',tileId:0,toTileId:to,fieldId:'mana',amount:1}])}),/outside/);
  const rule={...w.definitions.rules[0],id:'new-share'};
  await assert.rejects(()=>service.import(w,{requestId:'narrow',reply:reply([{kind:'rule-define',tileId:0,rule}])}),/outside/);
  await service.export(w,request('wide','neighbors'));const job=await service.import(w,{requestId:'wide',reply:reply([{kind:'rule-define',tileId:0,rule}])});assert.ok(job.proposal);
  const result=forecast(w,job.proposal);assert.equal(result.resources[0].totalMilli,120000);assert.equal(result.resources[0].baselineMilli,120000);assert.equal(result.totalTiles,w.cells[0].neighbors.length+1);
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
});
