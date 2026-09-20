import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal,validateWorld} from '../packages/engine/src/index.js';import {ProposalSchema,type World,type Operation} from '../packages/contracts/src/index.js';import {DEFAULT_SETTLEMENT_SETTINGS} from '../packages/contracts/src/settlement-defaults.js';import {DEFAULT_CONFLICT_SETTINGS} from '../packages/contracts/src/conflict.js';import {DEFAULT_DISEASE_SETTINGS} from '../packages/contracts/src/disease-defaults.js';import {journeyTotals} from '../packages/engine/src/journeys.js';import {healthTotals} from '../packages/engine/src/disease.js';import {WorldStore,stateHash} from '../apps/server/src/store.js';import {forecast} from '../apps/server/src/prompts.js';import {unpackBundle} from '../apps/server/src/portable.js';
const prop=(w:World,operations:Operation[])=>ProposalSchema.parse({id:`conflict-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:'Conflict',operations}),edit=(w:World,ops:Operation[])=>applyProposal(w,prop(w,ops));
function setup(){let w=createWorld({id:'conflict',name:'Conflict',seed:'conflict',frequency:2});w.tiles.forEach(t=>t.elevationM=1000);const b=w.cells[0].neighbors[0];w=edit(w,[{kind:'faction-define',tileId:0,expectedVersion:0,faction:{id:'oak',label:'Oak',color:'#336633'}},{kind:'faction-define',tileId:0,expectedVersion:1,faction:{id:'moon',label:'Moon',color:'#665599'}},...[0,b].flatMap(tileId=>[{kind:'settlement-create' as const,tileId,label:'Village',population:tileId===0?200:100,foodRations:100000,settings:{...DEFAULT_SETTLEMENT_SETTINGS,farmRationsPerDay:1000,growthPermille:0,lossPermille:0}},{kind:'rainfall' as const,tileId,mmPerDay:5},{kind:'temperature' as const,tileId,celsius:20,mode:'sustained' as const},{kind:'faction-claim' as const,tileId,factionId:tileId===0?'oak':'moon'},{kind:'garrison-configure' as const,tileId,expectedVersion:0,target:tileId===0?120:30,reserveDays:7}]),{kind:'faction-relation',tileId:0,expectedVersion:2,factionId:'oak',otherFactionId:'moon',relationship:'hostile'}]);return {w,b};}
const configure=(w:World,enabled=true,settings:Partial<typeof DEFAULT_CONFLICT_SETTINGS>={}):Operation=>({kind:'conflict-configure',tileId:0,expectedVersion:w.conflict?.version??0,enabled,settings:{...DEFAULT_CONFLICT_SETTINGS,...settings}});


import {DEFAULT_MIGRATION_SETTINGS} from '../packages/contracts/src/migration-defaults.js';
import {DEFAULT_AIR_SETTINGS} from '../packages/contracts/src/air-defaults.js';
import {DEFAULT_WATER_QUALITY_SETTINGS} from '../packages/contracts/src/water-quality-defaults.js';
import {DEFAULT_RESEARCH_SETTINGS,CULTIVATION_TECHNOLOGY} from '../packages/contracts/src/technology.js';
import {DEFAULT_VISIT_SETTINGS} from '../packages/contracts/src/neighbor-visit-defaults.js';
import {DEFAULT_FOOD_TRADE_SETTINGS} from '../packages/contracts/src/food-trade-defaults.js';
import {ecologySetup} from '../packages/engine/src/ecology-setup.js';

test('expedition departure keeps remaining home guards reserved against same-day migration',()=>{
 let {w,b}=setup();const refuge=w.cells[0].neighbors.find(id=>id!==b)!;
 w=edit(w,[{kind:'settlement-create',tileId:refuge,label:'Refuge',population:100,foodRations:1000000,settings:{...DEFAULT_SETTLEMENT_SETTINGS,growthPermille:0,lossPermille:0}},
 {kind:'migration-configure',tileId:0,expectedVersion:0,enabled:true,settings:{...DEFAULT_MIGRATION_SETTINGS,departurePermille:1000}},configure(w)]);
 w=advance(w);assert.equal(w.conflict!.lastDay!.launches[0].population,60);
 const migrants=w.migration!.lastDay!.entries.find(e=>e.from===0)!;
 assert.ok(migrants,'Better supplied refuge should attract civilians');
 assert.equal(migrants.population,80,'The 60 remaining guards must stay home');
 assert.equal(w.tiles[0].population,60);assert.equal(w.tiles[0].garrison!.target,60);
 assert.equal(journeyTotals(w).population,400);validateWorld(w);
});

test('200-day conflict/environment/economy run reconciles losses and survives replay, checkpoints and export',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-conflict-integrated-')),store=new WorldStore(root);
 let {w,b}=setup();
 try{
 w=edit(w,[...ecologySetup(w,0),configure(w),
 {kind:'faction-borders-configure',tileId:0,expectedVersion:3,enabled:true,travel:true,trade:true,knowledge:true},
 {kind:'water-quality-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_WATER_QUALITY_SETTINGS},
 {kind:'air-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_AIR_SETTINGS},
 {kind:'air-source',tileId:0,unitsPerDay:100},
 {kind:'disease-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_DISEASE_SETTINGS},
 {kind:'disease-contact-configure',tileId:0,expectedVersion:1,enabled:true,ratePermille:200},
 {kind:'disease-introduce',tileId:b,count:20},
 {kind:'neighbor-visits-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_VISIT_SETTINGS},
 {kind:'migration-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_MIGRATION_SETTINGS},
 {kind:'food-trade-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_FOOD_TRADE_SETTINGS},
 {kind:'technology-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_RESEARCH_SETTINGS},
 {kind:'technology-define',tileId:0,expectedVersion:1,definition:CULTIVATION_TECHNOLOGY},
 {kind:'knowledge-configure',tileId:0,expectedVersion:2,enabled:true,bonusPermille:1000}]);
 await store.save(w);const initial=stateHash(w),preview=forecast(w,prop(w,[{kind:'temperature',tileId:b,mode:'pulse',celsius:40}]));
 assert.ok(preview);assert.equal(stateHash(w),initial);
 let copy=structuredClone(w),losses=0,battles=0,visits=0,airTransfers=0;
 for(let day=0;day<200;day++){
  w=advance(w);copy=advance(copy);
  for(const battle of w.conflict!.lastDay!.battles){losses+=battle.attackerLosses+battle.defenderLosses;if(battle.outcome!=='cancelled')battles++;}
  assert.equal(journeyTotals(w).population,300-losses,`population on day ${w.tick}`);
  assert.equal(healthTotals(w).population,300-losses);
  const water=w.waterQuality!.lastDay!,air=w.air!.lastDay!;
  assert.equal(water.before+water.emitted+water.waste-water.treated-water.oceanExport-water.decayed,water.after);
  assert.equal(air.before+air.emitted-air.removed,air.after);
  airTransfers+=air.transferred;visits+=w.neighborVisits!.lastDay!.entries.length;
  assert.equal(stateHash(w),stateHash(copy),`replay on day ${w.tick}`);
 }
 assert.ok(battles>0&&losses>0);assert.ok(airTransfers>0);assert.ok(visits>0);
 assert.ok(w.tiles.some(t=>t.research?.projects.some(p=>p.completedTick!==undefined)));
 assert.equal(w.tiles[b].factionId,'oak');assert.equal(w.tiles[b].settlement!.label,'Village');
 await store.save(w,{kind:'step',days:200});assert.equal((await store.verifyHistory(w.id)).hash,stateHash(w));
 const cp=await store.checkpoint(w,'Integrated conflict');assert.equal(stateHash((await store.readCheckpoint(w.id,cp.id)).world),stateHash(w));
 assert.equal(stateHash((await unpackBundle(await store.exportBundle(w.id))).world),stateHash(w));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('stranded survivors consume supplies, suffer only recorded starvation losses, and recover after terrain restoration',()=>{
 let {w,b}=setup();w=edit(w,[configure(w),
 {kind:'settlement-configure',tileId:0,expectedRulesVersion:1,settings:{shortageIntervalDays:1,lossPermille:100}},
 {kind:'disease-configure',tileId:0,expectedVersion:0,enabled:true,settings:{...DEFAULT_DISEASE_SETTINGS,waterExposurePermille:0}},
 {kind:'travel-permission',tileId:0,allowed:false}]);
 w=advance(advance(advance(w)));const battle=w.conflict!.lastDay!.battles[0];
 assert.equal(battle.outcome,'captured');let expected=300-battle.attackerLosses-battle.defenderLosses;
 w=edit(w,[{kind:'elevation',tileId:0,deltaM:-1500}]);
 let hungerLosses=0;
 for(let day=0;day<8;day++){
  const food=w.journeys!.active[0].foodRations;w=advance(w);
  const entry=w.journeys!.lastDay!.entries[0];hungerLosses+=entry.losses;expected-=entry.losses;
  assert.equal(w.journeys!.active[0].foodRations,food-entry.consumed);
  assert.equal(journeyTotals(w).population,expected);assert.equal(healthTotals(w).population,expected);
  assert.equal(w.journeys!.active[0].military!.factionId,'oak');
 }
 assert.ok(hungerLosses>0);const survivors=w.journeys!.active[0].population;assert.ok(survivors>0);
 const homePopulation=w.tiles[0].population,homeTarget=w.tiles[0].garrison!.target;
 const foodBefore=journeyTotals(w).foodRationsTotal;
 w=edit(w,[{kind:'journey-provision',tileId:b,journeyId:w.journeys!.active[0].id,foodRations:1000},{kind:'elevation',tileId:0,deltaM:1500}]);
 assert.equal(journeyTotals(w).foodRationsTotal,foodBefore);w=advance(advance(w));
 assert.equal(w.journeys!.active.length,0);assert.equal(w.tiles[0].population,homePopulation+survivors);
 assert.equal(w.tiles[0].garrison!.target,homeTarget+survivors);assert.equal(journeyTotals(w).population,expected);
 assert.equal(w.tiles[b].settlement!.label,'Village');validateWorld(w);
});
