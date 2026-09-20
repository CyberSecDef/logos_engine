import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';
import {applyProposal,advance,validateWorld} from '../packages/engine/src/index.js';
import type {World,Operation} from '../packages/contracts/src/index.js';
import type {AppearanceRule} from '../packages/contracts/src/extensions.js';
import {appearance,textureReveals,terrainPack} from '../packages/globe/src/appearance.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';
import {archiveWorld,unpackWorld,copyWorld} from '../apps/server/src/world-management.js';
import {PromptService,forecast} from '../apps/server/src/prompts.js';
import {ModelReplySchema,modelReplyJsonSchema} from '../packages/contracts/src/prompts.js';
const make=()=>createWorld({id:'first-world',name:'Crystal landscape',seed:'styles',frequency:2});
const rule:AppearanceRule={id:'crystal-land',version:1,label:'Crystal landscape',tileId:0,scope:'world',enabled:true,priority:20,conditions:[{read:{source:'custom',fieldId:'crystal',sample:'self'},comparison:'gte',value:5}],style:{label:'Crystal grove',color:'#a18ae0',asset:'alpine'}};
const field:Operation={kind:'field-define',tileId:0,migration:'preserve',definition:{id:'crystal',version:1,label:'Crystal',unit:'shards',quantity:'stock',description:'',min:0,max:1000,defaultValue:0}};
const edit=(w:World,operations:Operation[])=>({id:`style-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:'Crystal appearance',operations});
const initialized=()=>{const w=make();return applyProposal(w,edit(w,[field,{kind:'appearance-define',tileId:0,rule}]));};

test('world appearance responds to state with stable priorities, scope, fallback and reveal timing',()=>{
 let w=initialized();const before=appearance(w,w.tiles[1],'terrain',1);
 w=applyProposal(w,edit(w,[{kind:'field-set',tileId:1,fieldId:'crystal',value:5}]));
 assert.equal(appearance(w,w.tiles[1]).label,'Crystal grove');assert.equal(appearance(w,w.tiles[1]).assetId,'alpine');
 assert.equal(textureReveals(w)[2],0);
 w.tiles[2].properties.crystal=5;assert.equal(appearance(w,w.tiles[2]).color,'#a18ae0');assert.equal(appearance(w,w.tiles[2]).assetId,undefined);
 const higher={...rule,id:'a-style',priority:20,scope:'tile' as const,tileId:1,style:{label:'Violet dunes',color:'#8060aa',asset:'none' as const}};
 w=applyProposal(w,edit(w,[{kind:'appearance-define',tileId:1,rule:higher}]));assert.equal(appearance(w,w.tiles[1]).label,'Violet dunes');assert.equal(appearance(w,w.tiles[1]).assetId,undefined);
 w=applyProposal(w,edit(w,[{kind:'appearance-remove',tileId:1,ruleId:'a-style'}]));assert.equal(appearance(w,w.tiles[1]).label,'Crystal grove');
 w.tiles[1].properties.crystal=0;assert.equal(appearance(w,w.tiles[1],'terrain',1).label,before.label);
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'appearance-define',tileId:1,rule:higher}])),/version must be 2/);
});

test('appearance stays cosmetic, overlays retain colors, and styles do not change deterministic physics',()=>{
 const w=initialized(),plain=structuredClone(w);delete plain.definitions.appearance;
 w.tiles[0].properties.crystal=10;plain.tiles[0].properties.crystal=10;
 const hash=stateHash(w);
 for(const overlay of ['rain','water','temperature','communication','custom:crystal'] as const){assert.equal(appearance(w,w.tiles[0],overlay).color,appearance(plain,plain.tiles[0],overlay).color);assert.equal(appearance(w,w.tiles[0],overlay).textureOpacity,0);}
 assert.equal(stateHash(w),hash);
 let a=w,b=plain;for(let i=0;i<10;i++){a=advance(a);b=advance(b);assert.deepEqual(a.tiles,b.tiles);assert.deepEqual(a.accounting,b.accounting);}
 const old=make();assert.equal(stateHash(validateWorld(old)),stateHash(old));assert.equal(Object.hasOwn(old.definitions,'appearance'),false);
});

test('invalid appearance references, colors, assets and origins reject atomically',()=>{
 const w=initialized(),hash=stateHash(w);
 const invalid:unknown[]=[{...rule,version:2,style:{...rule.style,color:'url(example)'}},{...rule,version:2,style:{...rule.style,asset:'https://example.org/image.png'}},{...rule,version:2,tileId:1},{...rule,version:2,conditions:[{read:{source:'custom',fieldId:'missing',sample:'self'},comparison:'gt',value:1}]}];
 for(const bad of invalid)assert.throws(()=>applyProposal(w,{...edit(w,[]),operations:[{kind:'appearance-define',tileId:0,rule:bad}]}));
 assert.throws(()=>applyProposal(w,edit(w,[{kind:'field-remove',tileId:0,fieldId:'crystal'}])),/appearance property/);
 const conversion:Operation={...field,definition:{...field.definition,version:2,max:10},transform:{scale:.01,offset:0,precision:'exact'}};
 assert.throws(()=>applyProposal(w,edit(w,[conversion])),/appearance rule/);
 assert.equal(stateHash(w),hash);
 const large=createWorld({id:'big',name:'Budget',seed:'big',frequency:26});large.definitions.fields=w.definitions.fields;large.definitions.appearance=Array.from({length:16},(_,i)=>({...rule,id:`style-${i}`}));assert.throws(()=>validateWorld(large),/appearance evaluation budget/);
});

test('scoped model appearance updates cannot widen or shrink away existing authority',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-style-scope-')),store=new WorldStore(root),w=initialized(),service=new PromptService(store,{name:'Unused',async generate(){throw Error('unused');}});
 const reply={kind:'proposal',message:'Appearance',assumptions:[],operations:[{kind:'appearance-define',tileId:0,rule:{...rule,version:2,scope:'tile'}}]};
 try{
  const request={id:'local',worldId:w.id,expectedRevision:w.revision,tileId:0,mode:'propose',scope:'tile',message:'Narrow visual rule'};
  await service.export(w,request);await assert.rejects(()=>service.import(w,{requestId:'local',reply}),/outside/);
  await service.export(w,{...request,id:'global',scope:'world'});const job=await service.import(w,{requestId:'global',reply});assert.ok(job.proposal);
  ModelReplySchema.parse(reply);assert.ok(JSON.stringify(modelReplyJsonSchema).includes('appearance-define'));
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
});

test('appearance rules survive saves, snapshots and portable worlds; previews show changes without writing',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-style-save-')),store=new WorldStore(root),w=initialized();
 const proposal=edit(w,[{kind:'field-set',tileId:0,fieldId:'crystal',value:10}]);const hash=stateHash(w),preview=forecast(w,proposal);assert.equal(preview.appearanceChanges.total,1);assert.equal(preview.appearanceChanges.tiles[0].after.label,'Crystal grove');assert.equal(stateHash(w),hash);
 const changed=applyProposal(w,proposal);
 try{await store.save(changed);assert.equal(stateHash(await store.load(w.id)),stateHash(changed));const point=await store.checkpoint(changed,'Crystal terrain');assert.deepEqual((await store.readCheckpoint(w.id,point.id)).world.definitions,changed.definitions);const branch=copyWorld(unpackWorld(archiveWorld(changed)),'copy','Copy');assert.deepEqual(appearance(branch,branch.tiles[0]),appearance(changed,changed.tiles[0]));}finally{await rm(root,{recursive:true,force:true});}
 assert.deepEqual(terrainPack.entries.map(e=>e.id).sort(),['ocean','city','alpine','forest','meadow','dry'].sort());
});
