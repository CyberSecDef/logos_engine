import assert from 'node:assert/strict';
import {createWorld} from '../../packages/worldgen/src/index.js';
import {advance,applyProposal} from '../../packages/engine/src/index.js';
import type {World,Operation} from '../../packages/contracts/src/index.js';
import {DEFAULT_SETTLEMENT_SETTINGS} from '../../packages/contracts/src/settlement-defaults.js';
import {DEFAULT_CONFLICT_SETTINGS} from '../../packages/contracts/src/conflict.js';
import {DEFAULT_DISEASE_SETTINGS} from '../../packages/contracts/src/disease-defaults.js';
import {DEFAULT_MIGRATION_SETTINGS} from '../../packages/contracts/src/migration-defaults.js';
import {DEFAULT_AIR_SETTINGS} from '../../packages/contracts/src/air-defaults.js';
import {DEFAULT_WATER_QUALITY_SETTINGS} from '../../packages/contracts/src/water-quality-defaults.js';
import {DEFAULT_RESEARCH_SETTINGS,CULTIVATION_TECHNOLOGY,FILTRATION_TECHNOLOGY} from '../../packages/contracts/src/technology.js';
import {DEFAULT_VISIT_SETTINGS} from '../../packages/contracts/src/neighbor-visit-defaults.js';
import {DEFAULT_FOOD_TRADE_SETTINGS} from '../../packages/contracts/src/food-trade-defaults.js';
import {ecologySetup} from '../../packages/engine/src/ecology-setup.js';
import {journeyTotals} from '../../packages/engine/src/journeys.js';
import {healthTotals} from '../../packages/engine/src/disease.js';

export function edit(w:World,operations:Operation[]):World {
 return applyProposal(w,{id:`scenario-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:'Phase 5 acceptance fixture',operations});
}

// Intentionally synthetic: a connected cluster with supplied garrisons, farms,
// installed sanitation and normal growth/starvation settings. Never a live world.
export function combinedWorld(frequency=3,seed='phase5-scale'):World {
 let w=createWorld({id:'phase5-scenario',name:'Phase 5 scenario',seed,frequency});
 const ids=[0],seen=new Set(ids);
 for(let i=0;ids.length<24;i++)for(const id of w.cells[ids[i]].neighbors){if(seen.has(id))continue;seen.add(id);ids.push(id);if(ids.length===24)break;}
 for(const id of ids)w.tiles[id].elevationM=1000+id;
 w=edit(w,[{kind:'faction-define',tileId:0,expectedVersion:0,faction:{id:'oak',label:'Oak',color:'#336633'}},{kind:'faction-define',tileId:0,expectedVersion:1,faction:{id:'moon',label:'Moon',color:'#665599'}},{kind:'faction-relation',tileId:0,expectedVersion:2,factionId:'oak',otherFactionId:'moon',relationship:'hostile'}]);
 for(const [i,tileId] of ids.entries())w=edit(w,[
  {kind:'settlement-create',tileId,label:`Village ${tileId}`,population:i%2?100:200,foodRations:10000,settings:{...DEFAULT_SETTLEMENT_SETTINGS,farmRationsPerDay:600}},
  {kind:'rainfall',tileId,mmPerDay:5},{kind:'temperature',tileId,mode:'sustained',celsius:20},
  {kind:'faction-claim',tileId,factionId:i%2?'moon':'oak'},
  {kind:'garrison-configure',tileId,expectedVersion:0,target:i%2?15:120,reserveDays:7}
 ]);
 w=edit(w,[...ecologySetup(w,0),
  {kind:'faction-borders-configure',tileId:0,expectedVersion:3,enabled:true,travel:true,trade:true,knowledge:true},
  {kind:'conflict-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_CONFLICT_SETTINGS},
  {kind:'water-quality-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_WATER_QUALITY_SETTINGS},
  {kind:'air-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_AIR_SETTINGS},
  {kind:'air-source',tileId:0,unitsPerDay:100},
  {kind:'disease-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_DISEASE_SETTINGS},
  {kind:'disease-contact-configure',tileId:0,expectedVersion:1,enabled:true,ratePermille:200},
  {kind:'disease-introduce',tileId:ids[1],count:15},
  {kind:'neighbor-visits-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_VISIT_SETTINGS},
  {kind:'migration-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_MIGRATION_SETTINGS},
  {kind:'food-trade-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_FOOD_TRADE_SETTINGS},
  {kind:'technology-configure',tileId:0,expectedVersion:0,enabled:true,settings:DEFAULT_RESEARCH_SETTINGS},
  {kind:'technology-define',tileId:0,expectedVersion:1,definition:CULTIVATION_TECHNOLOGY},
  {kind:'technology-define',tileId:0,expectedVersion:2,definition:FILTRATION_TECHNOLOGY},
  {kind:'knowledge-configure',tileId:0,expectedVersion:3,enabled:true,bonusPermille:1000}
 ]);
 w=edit(w,ids.map(tileId=>({kind:'sanitation-configure',tileId,capacityPerDay:500,conditionPermille:1000})));
 return w;
}

export function measuredStep(w:World){
 const before=journeyTotals(w).population,started=performance.now(),next=advance(w),elapsedMs=performance.now()-started;
 // Settlement reports can be invalidated by later departures. Population events
 // survive those edits. This fixture has 24 settlements and <=16 fronts, so all
 // demographic events fit the 200-event ring after the earlier hydrology phase.
 const events=next.events.filter(e=>e.tick===next.tick&&e.kind==='population');
 let births=0,starvation=0;
 for(const e of events){if(e.message.includes('inhabitants added after'))births+=e.amount!;else{assert.match(e.message,/inhabitants lost after/);starvation+=e.amount!;}}
 const transitLosses=next.journeys?.lastDay?.entries.reduce((n,e)=>n+e.losses,0)??0;
 const battles=next.conflict!.lastDay!.battles;
 const combatLosses=battles.reduce((n,e)=>n+e.attackerLosses+e.defenderLosses,0);
 assert.equal(journeyTotals(next).population,before+births-starvation-transitLosses-combatLosses,`population day ${next.tick}`);
 const health=healthTotals(next);assert.equal(health.population,journeyTotals(next).population);assert.ok(health.susceptible>=0&&health.ill>=0&&health.immune>=0);
 const air=next.air!.lastDay!,water=next.waterQuality!.lastDay!;
 assert.equal(air.before+air.emitted-air.removed,air.after);assert.equal(water.before+water.emitted+water.waste-water.treated-water.oceanExport-water.decayed,water.after);
 const waterBefore=w.tiles.reduce((n,t)=>n+t.waterL,0),waterAfter=next.tiles.reduce((n,t)=>n+t.waterL,0);
 assert.equal(waterAfter,waterBefore+(next.accounting.rainL-w.accounting.rainL)-(next.accounting.evaporationL-w.accounting.evaporationL)-(next.accounting.oceanDrainL-w.accounting.oceanDrainL));
 assert.ok((next.journeys?.active.length??0)<=64);assert.ok(next.conflict!.lastDay!.launches.length<=DEFAULT_CONFLICT_SETTINGS.maxDeparturesPerDay);
 return {world:next,elapsedMs,births,starvation,transitLosses,combatLosses,battles:battles.filter(b=>b.outcome!=='cancelled').length};
}
