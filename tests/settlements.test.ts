import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal,validateWorld} from '../packages/engine/src/index.js';
import {DEFAULT_SETTLEMENT_SETTINGS as defaults,SETTLEMENT_LIMITS,type Settlement} from '../packages/contracts/src/settlements.js';import {ModelReplySchema,modelReplyJsonSchema} from '../packages/contracts/src/prompts.js';
import type {World,Operation,Proposal} from '../packages/contracts/src/index.js';import {WorldStore,stateHash} from '../apps/server/src/store.js';import {PromptService,forecast} from '../apps/server/src/prompts.js';import {unpackBundle} from '../apps/server/src/portable.js';import {copyWorld} from '../apps/server/src/world-management.js';import {buildContext,capabilities} from '../packages/agent-bridge/src/context.js';import {readValue} from '../packages/engine/src/extensions.js';import {appearance} from '../packages/globe/src/appearance.js';
const make=()=>{const w=createWorld({id:'settlements',name:'Settlements',seed:'food',frequency:2});w.tiles[0].elevationM=1000;return w;};
const edit=(w:World,operations:Operation[]):Proposal=>({id:`change-${w.history.length}`,worldId:w.id,expectedRevision:w.revision,summary:'Settlement change',operations});
const create=(population=100,foodRations=700,settings:Settlement['settings']={...defaults}):Operation=>({kind:'settlement-create',tileId:0,label:'Greenhaven',population,foodRations,settings});
const initialized=(population=100,food=700,settings:Settlement['settings']={...defaults})=>applyProposal(make(),edit(make(),[create(population,food,settings)]));
const step=(w:World,n:number)=>{for(let i=0;i<n;i++)w=advance(w);return w;};
const warm=(w:World)=>applyProposal(w,edit(w,[{kind:'temperature',tileId:0,celsius:20,mode:'sustained'},{kind:'rainfall',tileId:0,mmPerDay:5}]));
test('explicit placement, harvest and consumption balance; previews leave source unchanged',()=>{
 const w=make(),before=stateHash(w),p=edit(w,[create()]);const f=forecast(w,p);assert.equal(stateHash(w),before);assert.match(f.settlementChanges.rows[0].after,/100 inhabitants, 700 rations/);assert.equal(f.settlementChanges.rows[0].before,'No settlement');
 const active=warm(applyProposal(w,p)),next=advance(active),s=next.tiles[0].settlement!,d=s.lastDay!;
 assert.equal(d.produced,200);assert.equal(d.consumed,100);assert.equal(s.foodRations,800);assert.equal(next.tiles[0].population,100);assert.equal(s.surplusDays,1);assert.equal(d.beforeFood+d.produced-d.overflow-d.consumed,d.afterFood);assert.equal(stateHash(active),stateHash(warm(applyProposal(w,p))));
 assert.equal(appearance(next,next.tiles[0],'terrain',1).assetId,'city');assert.notEqual(appearance(next,next.tiles[0],'food').color,appearance(next,next.tiles[1],'food').color);
});
test('sustained shortage/surplus intervals, food aid, capacity, zero rates and empty settlements',()=>{
 let w=initialized(100,0,{...defaults,farmRationsPerDay:0});w=step(w,6);assert.equal(w.tiles[0].population,100);assert.equal(w.tiles[0].settlement!.shortageDays,6);
 w=advance(w);assert.equal(w.tiles[0].population,99);assert.equal(w.tiles[0].settlement!.lastDay!.losses,1);assert.equal(w.tiles[0].settlement!.shortageDays,0);
 w=advance(w);w=applyProposal(w,edit(w,[{kind:'settlement-food',tileId:0,deltaRations:1000}]));assert.equal(w.tiles[0].settlement!.shortageDays,1);w=advance(w);assert.equal(w.tiles[0].settlement!.shortageDays,0);
 let growing=initialized(10,10000,{...defaults,capacity:11,farmRationsPerDay:0});growing=step(growing,29);assert.equal(growing.tiles[0].population,10);growing=advance(growing);assert.equal(growing.tiles[0].population,11);assert.equal(growing.tiles[0].settlement!.lastDay!.consumed,10);assert.equal(step(growing,40).tiles[0].population,11);
 const none=step(initialized(0,1000),50);assert.equal(none.tiles[0].population,0);assert.equal(none.tiles[0].settlement!.foodRations,1000);
 const stopped=step(initialized(100,0,{...defaults,farmRationsPerDay:0,lossPermille:0,growthPermille:0}),30);assert.equal(stopped.tiles[0].population,100);
 const extinct=step(initialized(1,0,{...defaults,farmRationsPerDay:0}),7);assert.equal(extinct.tiles[0].population,0);assert.equal(step(extinct,20).tiles[0].population,0);
});
test('weather, flooding, submersion, workers and food overflow have explicit bounded effects',()=>{
 for(const temp of [-20,0,45,100]){let w=initialized();w=applyProposal(w,edit(w,[{kind:'temperature',tileId:0,celsius:temp,mode:'sustained'},{kind:'rainfall',tileId:0,mmPerDay:5}]));assert.equal(advance(w).tiles[0].settlement!.lastDay!.produced,0);}
 let dry=initialized();dry=applyProposal(dry,edit(dry,[{kind:'temperature',tileId:0,celsius:20,mode:'sustained'},{kind:'rainfall',tileId:0,mmPerDay:0}]));assert.equal(advance(dry).tiles[0].settlement!.lastDay!.produced,0);
 const flooded=warm(initialized());for(const t of flooded.tiles)t.elevationM=1000;flooded.tiles[0].waterL=flooded.cells[0].areaM2*200;assert.equal(advance(flooded).tiles[0].settlement!.lastDay!.produced,0);
 const submerged=applyProposal(warm(initialized()),edit(warm(initialized()),[{kind:'elevation',tileId:0,deltaM:-1000}]));assert.equal(advance(submerged).tiles[0].settlement!.lastDay!.land,false);
 const workers=advance(warm(initialized(1,100,{...defaults,farmRationsPerDay:10000})));assert.equal(workers.tiles[0].settlement!.lastDay!.produced,2);
 const overflow=advance(warm(initialized(100,SETTLEMENT_LIMITS.food)));const d=overflow.tiles[0].settlement!.lastDay!;assert.equal(d.overflow,200);assert.equal(d.afterFood,SETTLEMENT_LIMITS.food-100);
});
test('invalid operations, exact destructive discards and rule revisions reject atomically',()=>{
 const w=initialized(),hash=stateHash(w);
 for(const operations of [[create()],[{kind:'settlement-food',tileId:0,deltaRations:-701}],[{kind:'settlement-population',tileId:0,population:1001}],[{kind:'settlement-configure',tileId:0,expectedRulesVersion:2,settings:{capacity:2000}}],[{kind:'settlement-configure',tileId:0,expectedRulesVersion:1,settings:{capacity:99}}],[{kind:'settlement-configure',tileId:0,expectedRulesVersion:1,settings:{}}],[{kind:'settlement-remove',tileId:0,discardPopulation:0,discardFoodRations:700}]] as Operation[][]){assert.throws(()=>applyProposal(w,edit(w,operations)));assert.equal(stateHash(w),hash);}
 const changed=applyProposal(w,edit(w,[{kind:'settlement-configure',tileId:0,expectedRulesVersion:1,settings:{capacity:2000,lossPermille:0}}]));assert.equal(changed.tiles[0].settlement!.rulesVersion,2);assert.equal(changed.tiles[0].settlement!.settings.lossPermille,0);
 const removed=applyProposal(w,edit(w,[{kind:'settlement-remove',tileId:0,discardPopulation:100,discardFoodRations:700}]));assert.equal(removed.tiles[0].settlement,undefined);assert.equal(removed.tiles[0].population,0);
 const sea=make();sea.tiles[0].elevationM=0;assert.throws(()=>applyProposal(sea,edit(sea,[create()])),/land/);
 const corrupt=advance(warm(w));corrupt.tiles[0].settlement!.lastDay!.afterFood++;assert.throws(()=>validateWorld(corrupt),/accounting/);
});
test('population, food and progress are generic reads after the settlement phase, with no built-in write bypass',()=>{
 const w=warm(initialized());const withRule=applyProposal(w,edit(w,[{kind:'field-define',tileId:0,migration:'preserve',definition:{id:'food-observed',version:1,label:'Food observed',unit:'rations',description:'',min:0,max:1e9,defaultValue:0}},{kind:'rule-define',tileId:0,rule:{id:'watch-food',version:1,label:'Observe food',tileId:0,scope:'tile',enabled:true,everyDays:1,conditions:[],effects:[{kind:'set',fieldId:'food-observed',value:{constant:0,terms:[{coefficient:1,read:{source:'foodRations',sample:'self'}}]}}]}}]));
 const next=advance(withRule);assert.equal(next.tiles[0].properties['food-observed'],next.tiles[0].settlement!.foodRations);assert.equal(readValue(next,1,{source:'foodRations',sample:'self'}),0);assert.equal(readValue(next,0,{source:'surplusDays',sample:'self'}),1);assert.equal(readValue(next,0,{source:'shortageDays',sample:'self'}),0);
 assert.equal(stateHash(step(next,60)),stateHash(step(structuredClone(next),60)));
});
test('settlements survive checkpoints, portable sources, replay and selective dependency failures',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-settlements-')),store=new WorldStore(root);let w=make();
 try{await store.save(w);const p=edit(w,[create(10,10000,{...defaults,farmRationsPerDay:0})]);w=applyProposal(w,p);await store.save(w,{kind:'proposal',proposal:p});const target=(await store.history(w.id)).entries[0].id;const checkpoint=await store.checkpoint(w,'Established');
  w=step(w,30);await store.save(w,{kind:'step',days:30});assert.equal(w.tiles[0].population,11);assert.equal((await store.verifyHistory(w.id)).hash,stateHash(w));assert.equal(stateHash(await store.load(w.id)),stateHash(w));assert.equal((await store.readCheckpoint(w.id,checkpoint.id)).world.tiles[0].population,10);
  const p2=edit(w,[{kind:'settlement-food',tileId:0,deltaRations:25}]);w=applyProposal(w,p2);await store.save(w,{kind:'proposal',proposal:p2});await assert.rejects(()=>store.selectiveState(w.id,target,{mode:'omit'},{id:'without-settlement',name:'Without'}),/No settlement/);
  const parsed=await unpackBundle(await store.exportBundle(w.id));const copy=copyWorld(parsed.world,'imported-food','Imported food');await store.createNew(copy,undefined,parsed);const imported=await store.load(copy.id);assert.deepEqual(imported.tiles,w.tiles);assert.deepEqual(advance(imported).tiles,advance(w).tiles);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('settlement prompt context/schema, scoped proposal and Discuss rejection use the shared contract',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-settlement-prompts-')),store=new WorldStore(root),w=make();await store.save(w);
 const reply={kind:'proposal',message:'Place Greenhaven: 100 inhabitants, 700 food, default settings.',assumptions:[],operations:[create()]};assert.ok(ModelReplySchema.safeParse(reply).success);assert.match(JSON.stringify(modelReplyJsonSchema),/settlement-create/);assert.equal(capabilities.settlements.model,'food-population-v1');
 try{for(const [id,mode,tileId,ok] of [['propose','propose',0,true],['discuss','discuss',0,false],['outside','propose',1,false]] as const){const service=new PromptService(store,{name:'Test',async generate(){return {...reply,operations:[{...create(),tileId}]};}});try{const request={id,worldId:w.id,expectedRevision:0,tileId:0,scope:'tile' as const,mode,message:'Create settlement'};await service.start(w,request);while(service.busy)await new Promise(r=>setTimeout(r,5));const job=await service.get(w,id);assert.equal(job.status,ok?'complete':'failed');assert.equal(w.tiles[0].settlement,undefined);assert.equal((await store.load(w.id)).tiles[0].population,0);if(ok){assert.ok(job.proposal);const created=applyProposal(w,job.proposal);assert.ok(buildContext(created,{...request,expectedRevision:created.revision},[]).tiles[0].settlement);}}finally{await service.close();}}
 }finally{await rm(root,{recursive:true,force:true});}
});
