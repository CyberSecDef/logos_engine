import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {applyProposal,advance,validateWorld} from '../packages/engine/src/index.js';import type {World,Operation,Proposal} from '../packages/contracts/src/index.js';
import {readValue} from '../packages/engine/src/extensions.js';import {WorldStore,stateHash} from '../apps/server/src/store.js';import {copyWorld} from '../apps/server/src/world-management.js';import {unpackBundle} from '../apps/server/src/portable.js';import {forecast,PromptService} from '../apps/server/src/prompts.js';import {textureReveals} from '../packages/globe/src/appearance.js';import {ModelReplySchema,modelReplyJsonSchema} from '../packages/contracts/src/prompts.js';
const make=()=>createWorld({id:'first-world',name:'Cisterns',seed:'entities',frequency:2});
const definition:Extract<Operation,{kind:'entity-type-define'}>={kind:'entity-type-define',tileId:0,migration:'preserve',discardProperties:[],definition:{id:'cistern',version:1,label:'Rain cistern',description:'Abstract collected rainfall',properties:[{id:'stored',label:'Stored rain',unit:'rain units',min:0,max:100,defaultValue:0}]}};
const create=(id='cistern-one',tileId=0):Operation=>({kind:'entity-create',tileId,entity:{id,typeId:'cistern',tileId,label:'Rain cistern',properties:{}}});
const rule:Extract<Operation,{kind:'rule-define'}>={kind:'rule-define',tileId:0,rule:{id:'collect-rain',version:1,label:'Collect rain',tileId:0,scope:'world',enabled:true,everyDays:1,conditions:[],effects:[{entityTypeId:'cistern',fieldId:'stored',kind:'add',value:{constant:0,terms:[{read:{source:'rainMm',sample:'self'},coefficient:1}]}}]}};
const edit=(w:World,operations:Operation[]):Proposal=>({id:`entity-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:'Cistern experiment',operations});
const initialized=()=>{const w=make();return applyProposal(w,edit(w,[definition,create(),{kind:'rainfall',tileId:0,mmPerDay:10},rule]));};

test('entities collect deterministically, clamp per instance and read common pre-output snapshots',()=>{
 let w=initialized();w=applyProposal(w,edit(w,[create('cistern-two'),{kind:'field-define',tileId:0,migration:'preserve',definition:{id:'supply',version:1,label:'Water supply',description:'Abstract cistern total',unit:'units',min:0,max:1000,defaultValue:0}},{kind:'rule-define',tileId:0,rule:{...rule.rule,id:'supply-total',effects:[{fieldId:'supply',kind:'set',value:{constant:0,terms:[{read:{source:'entity-sum',entityTypeId:'cistern',fieldId:'stored',sample:'self'},coefficient:1}]}}]}}]));
 const hash=stateHash(w),a=advance(w),b=advance(a);assert.deepEqual(advance(w),a);assert.equal(stateHash(w),hash);assert.equal(a.entities!.instances[0].properties.stored,10);assert.equal(a.tiles[0].properties.supply,0);assert.equal(b.tiles[0].properties.supply,20);assert.equal(readValue(b,0,{source:'entity-count',entityTypeId:'cistern',sample:'self'}),2);
 const neighbor=w.cells[0].neighbors[0];assert.equal(readValue(b,neighbor,{source:'entity-sum',entityTypeId:'cistern',fieldId:'stored',sample:'neighbors-max'}),40);
 let full=b;for(let i=0;i<12;i++)full=advance(full);assert.equal(full.entities!.instances[0].properties.stored,100);
 const preview=forecast(w,edit(w,[{kind:'entity-update',tileId:0,entityId:'cistern-one',properties:{stored:50}}]));assert.equal(preview.entityChanges.total,1);assert.equal(preview.entityChanges.rows[0].after!.properties.stored,50);assert.equal(stateHash(w),hash);
});

test('entity lifecycle enforces identity, bounds, per-tile limits, moves and type dependencies',()=>{
 let w=initialized();const toTileId=w.cells[0].neighbors[0];w=applyProposal(w,edit(w,[{kind:'entity-update',tileId:0,entityId:'cistern-one',toTileId}]));assert.equal(w.entities!.instances[0].tileId,toTileId);assert.equal(textureReveals(w)[toTileId],1);
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'entity-update',tileId:0,entityId:'cistern-one',properties:{stored:10}}])),/location/);
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'entity-update',tileId:toTileId,entityId:'cistern-one',properties:{stored:101}}])),/property value/);
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'entity-type-remove',tileId:0,typeId:'cistern'}])),/instances/);
 w=applyProposal(w,edit(w,[{kind:'entity-remove',tileId:toTileId,entityId:'cistern-one'}]));assert.throws(()=>applyProposal(w,edit(w,[create()])),/already used/);assert.throws(()=>applyProposal(w,edit(w,[{kind:'entity-type-remove',tileId:0,typeId:'cistern'}])),/output property/);
 const crowded=Array.from({length:17},(_,i)=>create(`cistern-${i}`));assert.throws(()=>applyProposal(w,edit(w,crowded)),/16 entities/);
 assert.throws(()=>applyProposal(w,edit(w,[create('repeat'),{kind:'entity-remove',tileId:0,entityId:'repeat'},create('repeat')])),/Duplicate entity creation/);
});

test('type migrations require coordinated dependencies, explicit discards and valid preservation',()=>{
 let w=initialized();w=applyProposal(w,edit(w,[{kind:'entity-update',tileId:0,entityId:'cistern-one',properties:{stored:80}}]));const hash=stateHash(w),narrow={...definition,definition:{...definition.definition,version:2,properties:[{...definition.definition.properties[0],max:50}]}};
 assert.throws(()=>applyProposal(w,edit(w,[narrow])),/updating or removing rule/);
 const updated={...rule,rule:{...rule.rule,version:2}};assert.throws(()=>applyProposal(w,edit(w,[narrow,updated])),/choose clamp/);assert.equal(stateHash(w),hash);
 w=applyProposal(w,edit(w,[{...narrow,migration:'clamp'},updated]));assert.equal(w.entities!.instances[0].properties.stored,50);
 const remove:Operation={...definition,definition:{...definition.definition,version:3,properties:[]}};assert.throws(()=>applyProposal(w,edit(w,[remove,{kind:'rule-remove',tileId:0,ruleId:rule.rule.id}])),/discardProperties/);
 w=applyProposal(w,edit(w,[{...remove,discardProperties:['stored']},{kind:'rule-remove',tileId:0,ruleId:rule.rule.id}]));assert.deepEqual(w.entities!.instances[0].properties,{});
});

test('plugins can read and emit entity state with shared writer conflict detection',()=>{
 const original=initialized();let w=applyProposal(original,edit(original,[{kind:'rule-remove',tileId:0,ruleId:rule.rule.id}]));
 const op:Extract<Operation,{kind:'plugin-define'}>={kind:'plugin-define',tileId:0,migration:'preserve',definition:{id:'fill',version:1,abi:'logos-stack-v1',label:'Fill cisterns',description:'',tileId:0,scope:'tile',enabled:true,everyDays:1,stateFields:[],program:[{op:'read',read:{source:'entity-count',entityTypeId:'cistern',sample:'self'}},{op:'emit',entityTypeId:'cistern',fieldId:'stored',mode:'add'}]}};
 w=applyProposal(w,edit(w,[op]));const next=advance(w);assert.equal(next.entities!.instances[0].properties.stored,1);
 const conflict={...rule,rule:{...rule.rule,version:2,effects:rule.rule.effects.map(e=>({...e,kind:'set' as const}))}};assert.throws(()=>applyProposal(w,edit(w,[conflict])),/Conflicting plugin/);
 assert.throws(()=>applyProposal(w,edit(w,[{...definition,definition:{...definition.definition,version:2}}])),/updating or removing plugin/);
});

test('entity states survive checkpoints, replay, branch copies and isolated portable imports',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-entities-')),destRoot=await mkdtemp(join(tmpdir(),'logos-entities-copy-'));
 try{const store=new WorldStore(root),w=initialized();await store.save(w);const next=advance(w);await store.save(next,{kind:'step',days:1});assert.equal((await store.verifyHistory(w.id)).days,1);const point=await store.checkpoint(next,'Cisterns');assert.deepEqual((await store.readCheckpoint(w.id,point.id)).world.entities,next.entities);
 const parsed=await unpackBundle(await store.exportBundle(w.id)),copy=copyWorld(parsed.world,'copy','Copy'),dest=new WorldStore(destRoot);await dest.createNew(copy,undefined,parsed);assert.deepEqual((await dest.load('copy')).entities,next.entities);assert.deepEqual(advance(copy).entities,advance(next).entities);
 const old=make();assert.equal(Object.hasOwn(validateWorld(old),'entities'),false);assert.equal(stateHash(validateWorld(old)),stateHash(old));
 }finally{await rm(root,{recursive:true,force:true});await rm(destRoot,{recursive:true,force:true});}
});

test('model entity changes enforce world-definition and movement scopes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-entity-scope-')),store=new WorldStore(root),w=initialized(),service=new PromptService(store,{name:'fixture',async generate(){throw Error('No call');}});
 try{const request={id:'scope',worldId:w.id,expectedRevision:w.revision,tileId:0,mode:'propose',scope:'tile',message:'Move cistern'};await service.export(w,request);const reply={kind:'proposal',message:'Move',assumptions:[],operations:[{kind:'entity-update',tileId:0,entityId:'cistern-one',toTileId:1}]};await assert.rejects(()=>service.import(w,{requestId:'scope',reply}),/outside/);
 await service.export(w,{...request,id:'define'});await assert.rejects(()=>service.import(w,{requestId:'define',reply:{...reply,operations:[{...definition,definition:{...definition.definition,id:'tower'}}]}}),/Entire world/);
 await service.export(w,{...request,id:'allowed',scope:'world'});assert.ok((await service.import(w,{requestId:'allowed',reply})).proposal);ModelReplySchema.parse(reply);assert.ok(JSON.stringify(modelReplyJsonSchema).includes('entity-create'));
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
});

test('entity appearance, effective defaults and removal dependencies stay validated',()=>{
 const w=make();let next=applyProposal(w,edit(w,[{...definition,definition:{...definition.definition,properties:[{...definition.definition.properties[0],defaultValue:7}]}},create(),{kind:'appearance-define',tileId:0,rule:{id:'cistern-look',version:1,label:'Cistern village',tileId:0,scope:'world',enabled:false,priority:10,conditions:[{read:{source:'entity-count',entityTypeId:'cistern',sample:'self'},comparison:'gt',value:0}],style:{label:'Cistern land',color:'#88aa88',asset:'terrain',layers:[{asset:'city',opacity:.35}]}}}]));
 assert.equal(readValue(next,0,{source:'entity-sum',entityTypeId:'cistern',fieldId:'stored',sample:'self'}),7);
 const update:Operation={...definition,definition:{...definition.definition,version:2,properties:[{...definition.definition.properties[0],defaultValue:9}]}};
 assert.throws(()=>applyProposal(next,edit(next,[update])),/appearance/);
 next=applyProposal(next,edit(next,[update,{kind:'appearance-remove',tileId:0,ruleId:'cistern-look'}]));assert.equal(next.entities!.instances[0].properties.stored,7);
 const broken=structuredClone(next);broken.entities!.instances=Array.from({length:257},(_,i)=>({...broken.entities!.instances[0],id:`object-${i}`,tileId:i%broken.tiles.length}));assert.throws(()=>validateWorld(broken));
 const read={source:'entity-count' as const,entityTypeId:'missing',sample:'self' as const};assert.throws(()=>applyProposal(next,edit(next,[{...rule,rule:{...rule.rule,conditions:[{read,comparison:'gt',value:0}]}}])),/property reference/);
});
