import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal,validateWorld} from '../packages/engine/src/index.js';import {advanceFoodTrade} from '../packages/engine/src/food-trade.js';
import {DEFAULT_FOOD_TRADE_SETTINGS as defaults} from '../packages/contracts/src/food-trade-defaults.js';import {DEFAULT_SETTLEMENT_SETTINGS} from '../packages/contracts/src/settlement-defaults.js';import {ProposalSchema,type World,type Operation} from '../packages/contracts/src/index.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';import {PromptService,forecast} from '../apps/server/src/prompts.js';import {copyWorld} from '../apps/server/src/world-management.js';import {unpackBundle} from '../apps/server/src/portable.js';
const make=()=>{const w=createWorld({id:'food-trade',name:'Food trade',seed:'trade',frequency:2});w.tiles.forEach(t=>t.elevationM=1000);return w;};
const proposal=(w:World,operations:Operation[])=>ProposalSchema.parse({id:`edit-${w.history.length}`,worldId:w.id,expectedRevision:w.revision,summary:'Food sharing',operations});
const edit=(w:World,operations:Operation[])=>applyProposal(w,proposal(w,operations));
const place=(tileId:number,population:number,foodRations:number):Operation=>({kind:'settlement-create',tileId,label:`Village ${tileId}`,population,foodRations,settings:{...DEFAULT_SETTLEMENT_SETTINGS,capacity:1000000,farmRationsPerDay:0}});
const config=(w:World,settings:NonNullable<World['foodTrade']>['settings']={...defaults}):Operation=>({kind:'food-trade-configure',tileId:0,expectedVersion:w.foodTrade?.version??0,enabled:true,settings});
function setup(){let w=make();const neighbor=w.cells[0].neighbors.slice().sort((a,b)=>a-b)[0];w=edit(w,[place(0,100,1000),place(neighbor,100,0),config(w)]);return {w,neighbor};}
test('adjacent food is conserved, feeds the recipient today and protects current meal plus donor reserves',()=>{
 const {w,neighbor}=setup(),hash=stateHash(w),next=advance(w),d=next.foodTrade!.lastDay!;
 assert.deepEqual(d.transfers,[{from:0,to:neighbor,rations:200}]);assert.equal(d.beforeFood,1000);assert.equal(d.afterFood,1000);assert.equal(next.tiles[0].settlement!.foodRations,700);assert.equal(next.tiles[neighbor].settlement!.foodRations,100);assert.equal(next.tiles[neighbor].settlement!.lastDay!.unmet,0);assert.equal(stateHash(w),hash);
 const f=forecast(w,proposal(w,[{kind:'food-trade-permission',tileId:0,allowed:false}]));assert.equal(f.foodTradePreview!.transferred,0);assert.equal(stateHash(w),hash);
});
test('daily donor, recipient and edge limits resolve competition by stable IDs without forwarding',()=>{
 let w=make();const targets=w.cells[0].neighbors.slice().sort((a,b)=>a-b);w=edit(w,[place(0,1,10000),...targets.slice(0,3).map(id=>place(id,100,0)),config(w,{...defaults,exportPerDay:450,importPerDay:300,edgePerDay:200})]);const copy=structuredClone(w);advanceFoodTrade(copy);assert.deepEqual(copy.foodTrade!.lastDay!.transfers,[{from:0,to:targets[0],rations:200},{from:0,to:targets[1],rations:200},{from:0,to:targets[2],rations:50}]);
 const middle=targets[0],end=w.cells[middle].neighbors.find(id=>id!==0&&!w.cells[0].neighbors.includes(id))!;assert.ok(end!==undefined);let chain=make();chain=edit(chain,[place(0,100,10000),place(middle,100,0),place(end,100,0),config(chain)]);advanceFoodTrade(chain);assert.equal(chain.tiles[end].settlement!.foodRations,0);assert.ok(chain.foodTrade!.lastDay!.transfers.every(t=>t.from===0));
 let competing=make();const donors=competing.cells[0].neighbors.slice().sort((a,b)=>a-b).slice(0,2);competing=edit(competing,[place(0,100,0),...donors.map(id=>place(id,100,10000)),config(competing,{...defaults,importPerDay:250,edgePerDay:200})]);advanceFoodTrade(competing);assert.deepEqual(competing.foodTrade!.lastDay!.transfers,[{from:donors[0],to:0,rations:200},{from:donors[1],to:0,rations:50}]);
 assert.equal(stateHash(advance(w)),stateHash(advance(structuredClone(w))));
});
test('permissions are independent of communication; empty, submerged and absent settlements do not trade',()=>{
 const {w,neighbor}=setup();const closed=edit(w,[{kind:'food-trade-permission',tileId:neighbor,allowed:false}]);assert.equal(advance(closed).foodTrade!.lastDay!.transferred,0);
 const silent=edit(w,[{kind:'communication',tileId:0,enabled:false},{kind:'communication',tileId:neighbor,enabled:false}]);assert.equal(advance(silent).foodTrade!.lastDay!.transferred,200);
 for(const modified of [edit(w,[{kind:'settlement-population',tileId:neighbor,population:0}]),edit(w,[{kind:'elevation',tileId:neighbor,deltaM:-1000}]),edit(w,[{kind:'settlement-remove',tileId:neighbor,discardPopulation:100,discardFoodRations:0}])])assert.equal(advance(modified).foodTrade!.lastDay!.transferred,0);
 const disabled=edit(w,[{...config(w),enabled:false} as Operation]);assert.equal(advance(disabled).tiles[neighbor].settlement!.foodRations,0);assert.equal(advance(disabled).foodTrade!.lastDay,undefined);
});
test('no food creation at bounds, zero limits or harvest; harvest becomes tradable tomorrow',()=>{
 const {w,neighbor}=setup();for(const key of ['exportPerDay','importPerDay','edgePerDay'] as const){const zero=edit(w,[config(w,{...defaults,[key]:0})]);assert.equal(advance(zero).foodTrade!.lastDay!.transferred,0);}
 let harvest=edit(w,[{kind:'settlement-food',tileId:0,deltaRations:-1000},{kind:'settlement-configure',tileId:0,expectedRulesVersion:1,settings:{farmRationsPerDay:10000,workerRationsPerDay:100}},{kind:'rainfall',tileId:0,mmPerDay:5},{kind:'temperature',tileId:0,celsius:20,mode:'sustained'}]);harvest=advance(harvest);assert.equal(harvest.foodTrade!.lastDay!.transferred,0);assert.equal(harvest.tiles[neighbor].settlement!.lastDay!.unmet,100);assert.ok(advance(harvest).foodTrade!.lastDay!.transferred>0);
 const huge=edit(w,[{kind:'settlement-food',tileId:0,deltaRations:999999000},{kind:'settlement-food',tileId:neighbor,deltaRations:1000000000}]);assert.equal(advance(huge).foodTrade!.lastDay!.transferred,0);
});
test('invalid or stale settings and corrupted ledgers reject atomically; legacy is inactive',()=>{
 const {w}=setup(),hash=stateHash(w);assert.throws(()=>edit(w,[{...config(w),expectedVersion:0} as Operation]),/Stale/);assert.throws(()=>edit(w,[config(w,{...defaults,targetDays:8})]),/target days/);assert.equal(stateHash(w),hash);
 const broken=advance(w);broken.foodTrade!.lastDay!.transferred++;assert.throws(()=>validateWorld(broken),/accounting/);
 assert.equal(advance(make()).foodTrade,undefined);assert.equal(advance(make()).tiles[0].foodTradeAllowed,undefined);
});
test('food trade saves, checkpoints, portable copies and intervention replay preserve accounting',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-food-trade-')),store=new WorldStore(root);let w=make();try{await store.save(w);const to=w.cells[0].neighbors[0],p=proposal(w,[place(0,100,10000),place(to,100,0),config(w)]);w=applyProposal(w,p);await store.save(w,{kind:'proposal',proposal:p});const cp=await store.checkpoint(w,'Food sharing');for(let i=0;i<30;i++)w=advance(w);await store.save(w,{kind:'step',days:30});assert.equal((await store.verifyHistory(w.id)).hash,stateHash(w));assert.equal((await store.readCheckpoint(w.id,cp.id)).world.foodTrade!.enabled,true);const bundle=await unpackBundle(await store.exportBundle(w.id)),copy=copyWorld(bundle.world,'trade-copy','Trade copy');await store.createNew(copy,undefined,bundle);assert.deepEqual(advance(await store.load(copy.id)).tiles,advance(w).tiles);}finally{await rm(root,{recursive:true,force:true});}
});
test('global settings require world scope; tile permissions stay local and Discuss cannot write',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-food-prompt-')),store=new WorldStore(root),{w}=setup();try{await store.save(w);for(const [mode,scope,local,status] of [['propose','tile',false,'failed'],['discuss','world',false,'failed'],['propose','world',false,'complete'],['propose','tile',true,'complete']] as const){const service=new PromptService(store,{name:'Food fixture',async generate(){return {kind:'proposal',message:'Change food sharing',assumptions:[],operations:[local?{kind:'food-trade-permission',tileId:0,allowed:false}:config(w)]};}});try{const id=`${mode}-${scope}-${local}`;await service.start(w,{id,worldId:w.id,expectedRevision:w.revision,tileId:0,mode,scope,message:'Change food sharing'});while(service.busy)await new Promise(r=>setTimeout(r,5));assert.equal((await service.get(w,id)).status,status);assert.equal(stateHash(await store.load(w.id)),stateHash(w));}finally{await service.close();}}}finally{await rm(root,{recursive:true,force:true});}
});
