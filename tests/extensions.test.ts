import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createWorld } from '../packages/worldgen/src/index.js';
import { advance, applyProposal, validateWorld } from '../packages/engine/src/index.js';
import { fieldValue } from '../packages/engine/src/extensions.js';
import { migrateWorld, ProposalSchema, type World, type Operation } from '../packages/contracts/src/index.js';
import { ModelReplySchema, modelReplyJsonSchema, type PromptRequest } from '../packages/contracts/src/prompts.js';
import { WorldStore, stateHash } from '../apps/server/src/store.js';
import { PromptService, forecast } from '../apps/server/src/prompts.js';
import { appearance } from '../packages/globe/src/appearance.js';
const example=ProposalSchema.parse(JSON.parse(await readFile('docs/examples/soil-fertility.json','utf8')));
const make=()=>createWorld({id:'first-world',name:'Soil',seed:'fertility',frequency:2});
const proposal=(w:World,operations:Operation[]=example.operations)=>({...example,id:`edit-${w.revision}`,worldId:w.id,expectedRevision:w.revision,operations});
const defined=()=>applyProposal(make(),proposal(make()));

test('new properties and weather rules evolve deterministically without changing built-in physics',()=>{
 const w=make();for(const t of w.tiles){t.elevationM=100;t.temperatureC=20;}
 const modified=applyProposal(w,proposal(w,[...example.operations,{kind:'rainfall',tileId:0,mmPerDay:5},{kind:'temperature',tileId:0,celsius:50,mode:'sustained'}]));
 const hash=stateHash(modified),next=advance(modified);
 assert.equal(fieldValue(next,0,'soil-fertility'),49);assert.equal(stateHash(modified),hash);
 const noRules=structuredClone(modified);noRules.definitions.rules=[];
 const baseline=advance(noRules);assert.deepEqual(next.accounting,baseline.accounting);
 assert.equal(next.tiles[0].vegetation,baseline.tiles[0].vegetation);
 let a=modified,b=structuredClone(modified);for(let i=0;i<40;i++){a=advance(a);b=advance(b);}
 assert.equal(stateHash(a),stateHash(b));
 const reordered=structuredClone(modified);reordered.definitions.rules.reverse();assert.deepEqual(advance(reordered).tiles,next.tiles);
});

test('custom formulas read neighbor snapshots and clamp simultaneous additions once',()=>{
 let w=defined();w.definitions.rules=[];const template=example.operations.find(o=>o.kind==='rule-define')!;
 assert.equal(template.kind,'rule-define');if(template.kind!=='rule-define')return;
 const rule={...template.rule,id:'neighbor-learning',scope:'tile' as const,conditions:[],effects:[{fieldId:'soil-fertility',kind:'set' as const,value:{constant:0,terms:[{coefficient:1,read:{source:'custom' as const,fieldId:'soil-fertility',sample:'neighbors-average' as const}}]}}]};
 const neighbor=w.cells[0].neighbors[0];
 w=applyProposal(w,proposal(w,[{kind:'field-set',tileId:neighbor,fieldId:'soil-fertility',value:80},{kind:'rule-define',tileId:0,rule}]));
 assert.equal(fieldValue(advance(w),0,'soil-fertility'),Math.round((50+30/w.cells[0].neighbors.length)*1000)/1000);
 const result=forecast(w,proposal(w,[{kind:'field-set',tileId:neighbor,fieldId:'soil-fertility',value:10}]));
 assert.ok(result.tiles.find(t=>t.id===0)!.properties[0].after<result.tiles.find(t=>t.id===0)!.properties[0].baseline!);
});

test('definition updates preserve defaults, reject lossy migration, and clamp only explicitly',()=>{
 const w=defined(),field=w.definitions.fields[0],before=stateHash(w);
 const update={kind:'field-define' as const,tileId:0,definition:{...field,version:2,max:40,defaultValue:10},migration:'preserve' as const};
 assert.throws(()=>applyProposal(w,proposal(w,[update])),/discard/);assert.equal(stateHash(w),before);
 const clamped=applyProposal(w,proposal(w,[{...update,migration:'clamp'}]));assert.equal(fieldValue(clamped,0,field.id),40);
 const changedDefault=applyProposal(w,proposal(w,[{...update,definition:{...field,version:2,defaultValue:10}}]));assert.equal(fieldValue(changedDefault,0,field.id),50);
 assert.throws(()=>applyProposal(w,proposal(w,[{...update,definition:{...field,version:9}}])),/version/);
 assert.throws(()=>applyProposal(w,proposal(w,[{kind:'field-remove',tileId:0,fieldId:field.id}])),/dependent/);
 const removed=applyProposal(w,proposal(w,[...w.definitions.rules.map(r=>({kind:'rule-remove' as const,tileId:r.tileId,ruleId:r.id})),{kind:'field-remove',tileId:0,fieldId:field.id}]));
 assert.equal(removed.definitions.fields.length,0);assert.ok(removed.tiles.every(t=>Object.keys(t.properties).length===0));
 assert.throws(()=>applyProposal(removed,proposal(removed,[{kind:'field-define',tileId:0,definition:field,migration:'preserve'}])),/version/);
 assert.equal(applyProposal(removed,proposal(removed,[{kind:'field-define',tileId:0,definition:{...field,version:2},migration:'preserve'}])).definitions.fields[0].version,2);
});

test('invalid definitions, unknown reads, conflicting writes and invalid values are rejected atomically',()=>{
 const w=defined(),before=stateHash(w),rule=w.definitions.rules[0];
 const invalid:unknown[]=[
  {kind:'field-set',tileId:0,fieldId:'soil-fertility',value:101},
  {kind:'field-set',tileId:0,fieldId:'soil-fertility',value:1.0001},
  {kind:'field-define',tileId:0,migration:'preserve',definition:{...w.definitions.fields[0],id:'constructor'}},
  {kind:'rule-define',tileId:0,rule:{...rule,id:'bad-read',conditions:[{read:{source:'custom',fieldId:'missing',sample:'self'},comparison:'gt',value:0}]}},
  {kind:'rule-define',tileId:0,rule:{...rule,id:'overwrite',effects:[{...rule.effects[0],kind:'set'}]}},
 ];
 for(const operation of invalid)assert.throws(()=>applyProposal(w,{...proposal(w),operations:[operation]}));
 assert.equal(stateHash(w),before);
 const invalidState=structuredClone(w);invalidState.tiles[0].properties.unknown=10;assert.throws(()=>validateWorld(invalidState));
});

test('legacy save migration verifies original hash, preserves disk on read, and backs up on first commit',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-migration-')),store=new WorldStore(root),w=make();
 const {definitions:_,...base}=w;
 const legacy={...base,schemaVersion:1,engineVersion:'0.1.0',tiles:w.tiles.map(({properties,...tile})=>tile)};
 const dir=join(root,w.id),path=join(dir,'state.json');await mkdir(dir);
 const hash=createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),source=JSON.stringify({hash,world:legacy});await writeFile(path,source);
 try {
  const migrated=await store.load(w.id);assert.equal(migrated.schemaVersion,2);assert.deepEqual(migrated.definitions,{fields:[],rules:[]});assert.equal(await readFile(path,'utf8'),source);
  assert.deepEqual(migrateWorld(migrated),migrated);
  await store.save(advance(migrated));assert.equal(await readFile(join(dir,'state.v1.backup.json'),'utf8'),source);
  assert.equal((await store.load(w.id)).tick,1);
  await writeFile(path,JSON.stringify({hash,world:{...legacy,tick:100}}));await assert.rejects(()=>store.load(w.id),/integrity/);
  assert.throws(()=>migrateWorld({...legacy,schemaVersion:999}));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('world scope is required for definitions and all affected existing/new rule targets',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-rule-scope-')),store=new WorldStore(root),w=make();await store.save(w);
 const service=new PromptService(store,{name:'Unused',async generate(){throw Error('Not called');}});
 const request=(id:string,scope:PromptRequest['scope']):PromptRequest=>({id,worldId:w.id,expectedRevision:w.revision,tileId:0,scope,mode:'propose',message:'Create soil fertility.'});
 const reply={kind:'proposal',message:example.summary,assumptions:[],operations:example.operations};
 try {
  await service.export(w,request('local','tile'));await assert.rejects(()=>service.import(w,{requestId:'local',reply}),/Entire world/);
  const exported=await service.export(w,request('global','world'));assert.equal(exported.context.allowedTileIds.length,w.tiles.length);
  const job=await service.import(w,{requestId:'global',reply});assert.ok(job.proposal);assert.equal(w.definitions.fields.length,0);
  const changed=applyProposal(w,job.proposal);const narrow={...request('remove-global','tile'),expectedRevision:changed.revision};
  await service.export(changed,narrow);await assert.rejects(()=>service.import(changed,{requestId:narrow.id,reply:{...reply,operations:[{kind:'rule-remove',tileId:0,ruleId:changed.definitions.rules[0].id}]}}),/outside/);
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
});

test('extension schema reaches models, previews show bounded global results, and custom overlays preserve state',()=>{
 assert.ok(JSON.stringify(modelReplyJsonSchema).includes('field-define'));ModelReplySchema.parse({kind:'proposal',message:'Fertility',assumptions:[],operations:example.operations});
 const w=make(),hash=stateHash(w),result=forecast(w,proposal(w));assert.equal(result.totalTiles,w.tiles.length);assert.equal(result.tiles.length,24);assert.equal(stateHash(w),hash);
 assert.equal(result.tiles[0].properties[0].baseline,null);
 const modified=applyProposal(w,proposal(w)),before=stateHash(modified);
 const color=appearance(modified,modified.tiles[0],'custom:soil-fertility').color;assert.ok(color.startsWith('hsl('));assert.equal(stateHash(modified),before);
 const updated=applyProposal(modified,proposal(modified,[{kind:'field-set',tileId:0,fieldId:'soil-fertility',value:99}]));assert.notEqual(appearance(updated,updated.tiles[0],'custom:soil-fertility').color,color);
});

test('additions clamp once, cadence is explicit, and disabled rules do not write',()=>{
 const w=defined();w.definitions.rules=[];w.tiles[0].properties['soil-fertility']=90;
 const template=example.operations.find(o=>o.kind==='rule-define')!;if(template.kind!=='rule-define')throw Error('Missing rule fixture');
 const rule=(id:string,value:number)=>({...template.rule,id,scope:'tile' as const,everyDays:2,conditions:[],effects:[{fieldId:'soil-fertility',kind:'add' as const,value:{constant:value,terms:[]}}]});
 const changed=applyProposal(w,proposal(w,[{kind:'rule-define',tileId:0,rule:rule('increase',20)},{kind:'rule-define',tileId:0,rule:rule('decrease',-20)},{kind:'rule-define',tileId:0,rule:{...rule('disabled',100),enabled:false}}]));
 assert.equal(fieldValue(advance(changed),0,'soil-fertility'),90);
 assert.equal(fieldValue(advance(advance(changed)),0,'soil-fertility'),90);
 const oversized=structuredClone(changed);oversized.definitions.rules=Array.from({length:65},(_,i)=>rule(`rule-${i}`,1));assert.throws(()=>validateWorld(oversized));
});
