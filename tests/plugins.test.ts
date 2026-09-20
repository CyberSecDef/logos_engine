import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile,mkdir,readdir} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal,validateWorld} from '../packages/engine/src/index.js';
import {ProposalSchema,type World,type Operation} from '../packages/contracts/src/index.js';
import {executePlugin} from '../packages/plugin-host/src/index.js';import {PLUGIN_LIMITS,type Instruction} from '../packages/contracts/src/plugins.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';import {archiveWorld,unpackWorld,copyWorld,digest} from '../apps/server/src/world-management.js';import {forecast,PromptService} from '../apps/server/src/prompts.js';
const example=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/crystal-bloom.json','utf8')));
const make=()=>createWorld({id:'first-world',name:'Plugin test',seed:'crystals',frequency:2});
const edit=(w:World,operations:Operation[])=>({...example,id:`edit-${w.revision}`,expectedRevision:w.revision,operations});
const initialized=()=>{const w=make();return applyProposal(w,edit(w,[...example.operations,{kind:'temperature',tileId:0,celsius:20,mode:'sustained'}]));};
const plugin=(w:World)=>w.plugins[0].definition;

test('plugin warm-day state survives ticks and deterministically produces accounted stock',()=>{
 const w=initialized(),before=stateHash(w);let a=w,b=structuredClone(w);
 for(let i=1;i<=12;i++){a=advance(a);b=advance(b);assert.deepEqual(a,b);assert.equal(a.plugins[0].state[0].values[0],i%3);assert.equal(a.tiles[0].properties.crystal??0,Math.floor(i/3)*5);assert.equal(a.resourceLedger.entries[0].createdMilli,i%3===0?5000:0);}
 assert.equal(stateHash(w),before);
 const cold=applyProposal(advance(w),edit(advance(w),[{kind:'temperature',tileId:0,celsius:0,mode:'sustained'}]));assert.equal(advance(cold).plugins[0].state[0].values[0],0);
});

test('instruction/stack/state/numeric bounds fail atomically without executing host capabilities',()=>{
 const w=initialized(),definition=plugin(w),run=(program:Instruction[])=>executePlugin({...definition,program},{tick:1,state:[0],read:()=>20},{remaining:10000});
 assert.throws(()=>run([{op:'jump',target:0}]),/instruction budget/);
 assert.throws(()=>run([{op:'constant',value:1},{op:'jump',target:0}]),/stack limit/);
 assert.throws(()=>run([{op:'add'}]),/underflow/);
 assert.throws(()=>run([{op:'constant',value:1},{op:'constant',value:0},{op:'divide'}]),/zero/);
 assert.throws(()=>run([{op:'constant',value:1e9},{op:'constant',value:2},{op:'multiply'}]),/numeric/);
 assert.throws(()=>run([{op:'constant',value:4},{op:'state-set',key:'warm-days'}]),/bounds/);
 assert.throws(()=>run([{op:'constant',value:1},{op:'emit',fieldId:'crystal',mode:'add'},{op:'jump',target:0}]),/effect limit/);
 assert.throws(()=>ProposalSchema.parse({...example,operations:[{kind:'plugin-define',tileId:0,migration:'preserve',definition:{...definition,program:[{op:'eval',source:'1+1'}]}}]}));
 const broken=structuredClone(w);plugin(broken).program=[{op:'constant',value:1},{op:'state-set',key:'warm-days'},{op:'jump',target:2}];const before=stateHash(broken);assert.throws(()=>advance(broken),/Tick was not saved/);assert.equal(stateHash(broken),before);
 const disabled=edit(broken,[{kind:'plugin-toggle',tileId:0,pluginId:definition.id,enabled:false}]);const preview=forecast(broken,disabled);assert.match(preview.baselineError!,/instruction budget/);assert.equal(preview.tick,broken.tick+5);assert.equal(stateHash(broken),before);assert.doesNotThrow(()=>advance(applyProposal(broken,disabled)));
});

test('static validation rejects bad dependencies, branches, conflicting outputs and world budgets',()=>{
 const w=initialized();for(const program of [[{op:'jump',target:127}],[{op:'state-get',key:'missing'}],[{op:'emit',fieldId:'missing',mode:'add'}],[{op:'read',read:{source:'custom',fieldId:'missing',sample:'self'}}]]){const copy=structuredClone(w);plugin(copy).program=program as Instruction[];assert.throws(()=>validateWorld(copy));}
 const conflict=structuredClone(w);conflict.plugins.push({definition:{...plugin(w),id:'other',program:[{op:'constant',value:2},{op:'emit',fieldId:'crystal',mode:'set'}]},state:[]});assert.throws(()=>validateWorld(conflict),/Conflicting/);
 const many=createWorld({id:'first-world',name:'Budget',seed:'budget',frequency:12});many.definitions=w.definitions;many.plugins=Array.from({length:8},(_,i)=>({definition:{...plugin(w),id:`plugin-${i}`,scope:'world'},state:[]}));assert.throws(()=>validateWorld(many),/budget/);
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'field-remove',tileId:0,fieldId:'crystal'}])),/Unknown plugin/);
});

test('updates preserve state deliberately; reset and removal require explicit operations',()=>{
 const w=advance(initialized()),p=plugin(w);
 const updated=applyProposal(w,edit(w,[{kind:'plugin-define',tileId:0,migration:'preserve',definition:{...p,version:2}}]));assert.deepEqual(updated.plugins[0].state,w.plugins[0].state);
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'plugin-define',tileId:0,migration:'preserve',definition:{...p,version:2,stateFields:[]}}])),/reset/);
 const reset=applyProposal(w,edit(w,[{kind:'plugin-define',tileId:0,migration:'reset',definition:{...p,version:2}}]));assert.deepEqual(reset.plugins[0].state,[]);
 const initial=initialized(),changedDefaults=applyProposal(initial,edit(initial,[{kind:'plugin-define',tileId:0,migration:'preserve',definition:{...plugin(initial),version:2,stateFields:[{...p.stateFields[0],initial:2}]}}]));assert.equal(changedDefaults.plugins[0].state[0].values[0],0);
 const paused=applyProposal(w,edit(w,[{kind:'plugin-toggle',tileId:0,pluginId:p.id,enabled:false}]));assert.deepEqual(advance(paused).plugins[0].state,w.plugins[0].state);
 const removed=applyProposal(w,edit(w,[{kind:'plugin-remove',tileId:0,pluginId:p.id}]));assert.equal(removed.plugins.length,0);assert.throws(()=>applyProposal(removed,edit(removed,[{kind:'plugin-define',tileId:0,migration:'reset',definition:p}])),/version must be 2/);
});

test('plugin snapshots, immutable artifacts, branches and archives preserve replay; v3 saves migrate read-only',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-plugin-save-')),store=new WorldStore(root),w=advance(initialized());
 try {
  await store.save(w);const saved=await store.load(w.id);assert.deepEqual(advance(saved),advance(w));
  const files=await readdir(join(root,w.id,'plugins','crystal-bloom','1'));assert.ok(files.includes(digest(plugin(w))+'.json'));
  const point=await store.checkpoint(w,'Crystal state');assert.deepEqual((await store.readCheckpoint(w.id,point.id)).world,w);
  const imported=copyWorld(unpackWorld(archiveWorld(w)),'branch','Branch');assert.deepEqual(advance(imported).tiles,advance(w).tiles);assert.deepEqual(advance(imported).plugins,advance(w).plugins);
  const old=make(),{plugins:_,...data}=old,legacy={...data,schemaVersion:3,engineVersion:'0.3.0'};const path=join(root,'legacy');await mkdir(path);legacy.id='legacy';const source=JSON.stringify({hash:digest(legacy),world:legacy});await writeFile(join(path,'state.json'),source);const migrated=await store.load('legacy');assert.equal(migrated.schemaVersion,4);assert.deepEqual(migrated.plugins,[]);assert.equal(await readFile(join(path,'state.json'),'utf8'),source);await store.save(migrated);assert.equal(await readFile(join(path,'state.v3.backup.json'),'utf8'),source);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('model plugins require world authority, and execute only through explicit proposal/apply/ticks',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-plugin-prompts-')),w=make(),store=new WorldStore(root);let calls=0;const service=new PromptService(store,{name:'Fixture',async generate(){calls++;return {kind:'proposal',message:example.summary,assumptions:[],operations:example.operations};}});
 try {
  await store.save(w);const request={id:'limited',worldId:w.id,expectedRevision:w.revision,tileId:0,mode:'propose',scope:'tile',message:'Create crystal bloom'};
  await service.start(w,request);while(service.busy)await new Promise(r=>setTimeout(r,5));assert.equal((await service.get(w,'limited')).status,'failed');
  await service.start(w,{...request,id:'allowed',scope:'world'});while(service.busy)await new Promise(r=>setTimeout(r,5));const job=await service.get(w,'allowed');assert.equal(job.status,'complete');assert.ok(job.proposal);assert.deepEqual(await store.load(w.id),w);
  const next=applyProposal(w,job.proposal);forecast(w,job.proposal);advance(next);assert.equal(calls,2);
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
});

const mappedUpdate=(w:World):Extract<Operation,{kind:'plugin-define'}>=>({
 kind:'plugin-define',tileId:0,migration:'map',
 definition:{...plugin(w),version:plugin(w).version+1,stateFields:[{id:'warm-hours',min:0,max:72,initial:0}],program:plugin(w).program.map(i=>i.op==='state-get'||i.op==='state-set'?{...i,key:'warm-hours'}:i.op==='constant'&&i.value===1?{...i,value:24}:i.op==='constant'&&i.value===3?{...i,value:72}:i)},
 stateMap:[{key:'warm-hours',from:'warm-days',scale:24,offset:0,precision:'exact'}],discardStateKeys:[],
});

test('explicit plugin state mappings rename and convert memory without changing crystal production',()=>{
 let original=advance(initialized()),converted=applyProposal(original,edit(original,[mappedUpdate(original)]));
 assert.equal(converted.plugins[0].state[0].values[0],24);
 const hash=stateHash(original),preview=forecast(original,edit(original,[mappedUpdate(original)]));
 assert.deepEqual(preview.pluginMigrations[0].tiles[0],{tileId:0,before:{'warm-days':1},after:{'warm-hours':24}});assert.equal(stateHash(original),hash);
 for(let i=0;i<12;i++){original=advance(original);converted=advance(converted);assert.deepEqual(converted.tiles,original.tiles);assert.equal(converted.plugins[0].state[0].values[0],original.plugins[0].state[0].values[0]*24);}
});

test('state mappings read old defaults simultaneously, cover new keys, and explicitly discard retired memory',()=>{
 const w=initialized();plugin(w).scope='neighbors';plugin(w).enabled=false;plugin(w).stateFields.push({id:'retired',min:0,max:10,initial:7});w.plugins[0].state=[{tileId:0,values:[2,9]}];
 const op=mappedUpdate(w);op.definition.stateFields.push({id:'new-counter',min:0,max:10,initial:5});op.stateMap!.push({key:'new-counter',initial:true});
 assert.throws(()=>applyProposal(w,edit(w,[op])),/discardStateKeys/);op.discardStateKeys=['retired'];
 const converted=applyProposal(w,edit(w,[op]));assert.deepEqual(converted.plugins[0].state.find(s=>s.tileId===0)!.values,[48,5]);assert.deepEqual(converted.plugins[0].state.find(s=>s.tileId!==0)!.values,[0,5]);
 assert.deepEqual(advance(converted).plugins,converted.plugins);
 const swap={...op,definition:{...op.definition,program:[{op:'stop' as const}],stateFields:[{id:'retired',min:0,max:10,initial:0},{id:'warm-days',min:0,max:10,initial:0}]},stateMap:[{key:'retired',from:'warm-days',scale:1,offset:0,precision:'exact' as const},{key:'warm-days',from:'retired',scale:1,offset:0,precision:'exact' as const}],discardStateKeys:[]};
 assert.deepEqual(applyProposal(w,edit(w,[swap])).plugins[0].state.find(s=>s.tileId===0)!.values,[2,9]);
});

test('invalid state mappings reject the whole proposal without changing saved state',()=>{
 const w=advance(initialized()),op=mappedUpdate(w),hash=stateHash(w);
 assert.throws(()=>applyProposal(w,edit(w,[op,op])),/defined once/);
 assert.throws(()=>forecast(w,edit(w,[op,{kind:'plugin-remove',tileId:0,pluginId:op.definition.id}])),/cannot be removed/);
 const invalid:Operation[]=[
  {...op,stateMap:undefined}, {...op,stateMap:[]}, {...op,stateMap:[op.stateMap![0],op.stateMap![0]]},
  {...op,stateMap:[{key:'warm-hours',from:'missing',scale:1,offset:0,precision:'exact'}]},
  {...op,discardStateKeys:['warm-days']}, {...op,definition:{...op.definition,scope:'world'}},
  {...op,migration:'preserve'}, {...op,definition:{...op.definition,stateFields:[{id:'warm-hours',min:0,max:10,initial:0}]}},
  {...op,stateMap:[{key:'warm-hours',from:'warm-days',scale:.0001,offset:0,precision:'exact'}]},
 ];
 for(const bad of invalid){assert.throws(()=>applyProposal(w,edit(w,[bad])));assert.equal(stateHash(w),hash);}
 assert.throws(()=>applyProposal(make(),edit(make(),[{...op,definition:{...op.definition,version:1}}])),/existing plugin/);
 const rounded=applyProposal(w,edit(w,[{...op,stateMap:[{key:'warm-hours',from:'warm-days',scale:.0015,offset:0,precision:'round'}]}]));assert.equal(rounded.plugins[0].state[0].values[0],.002);
});

test('mapped state and migration instructions survive checkpoints, archives and replay',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-state-map-')),store=new WorldStore(root),w=advance(initialized());
 const converted=applyProposal(w,edit(w,[mappedUpdate(w)]));
 try{
  await store.save(converted);assert.deepEqual(await store.load(w.id),converted);
  const point=await store.checkpoint(converted,'Mapped state');assert.deepEqual((await store.readCheckpoint(w.id,point.id)).world,converted);
  const restored=unpackWorld(archiveWorld(converted));assert.deepEqual(advance(restored),advance(converted));
 }finally{await rm(root,{recursive:true,force:true});}
});


test('model contract exposes both strict state-mapping forms',async()=>{
 const {ModelReplySchema,modelReplyJsonSchema}=await import('../packages/contracts/src/prompts.js');
 const w=advance(initialized()),op=mappedUpdate(w);
 ModelReplySchema.parse({kind:'proposal',message:'Retain warmth in hours',assumptions:[],operations:[op]});
 const serialized=JSON.stringify(modelReplyJsonSchema);assert.ok(serialized.includes('stateMap'));assert.ok(serialized.includes('discardStateKeys'));
 assert.throws(()=>ModelReplySchema.parse({kind:'proposal',message:'Invalid mixed mapping',assumptions:[],operations:[{...op,stateMap:[{...op.stateMap![0],initial:true}]}]}));
});
