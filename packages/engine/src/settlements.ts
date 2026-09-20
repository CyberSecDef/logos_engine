import {visitLabor} from './neighbor-visits.js';
import {farmConditions} from './farm-conditions.js';
import type {World,Operation} from '../../contracts/src/index.js';
import {DEFAULT_SETTLEMENT_SETTINGS,SETTLEMENT_LIMITS} from '../../contracts/src/settlements.js';
export function validateSettlements(world:World):void {
 for(const tile of world.tiles){const s=tile.settlement;if(!s)continue;
  if(tile.population>s.settings.capacity)throw Error('Settlement population exceeds capacity');
  const d=s.lastDay;if(d&&(d.tick>world.tick||d.produced>d.potential||(d.births>0&&d.losses>0)||d.beforeFood+d.produced-d.overflow-d.consumed!==d.afterFood||d.consumed+d.unmet!==d.beforePopulation||d.beforePopulation+d.births-d.losses!==d.afterPopulation||d.afterFood!==s.foodRations||d.afterPopulation!==tile.population))throw Error('Invalid settlement daily accounting');
 }
}
export function applySettlement(world:World,op:Operation):void {
 if(!op.kind.startsWith('settlement-'))return;
 const tile=world.tiles[op.tileId];if(!tile)throw Error('Unknown settlement tile');
 if(op.kind==='settlement-create'){
  if(tile.settlement)throw Error('A settlement already exists here');
  if(tile.elevationM<=0)throw Error('Create settlements on land above sea level');
  if(tile.population!==0)throw Error('Existing unassigned inhabitants cannot be overwritten by settlement creation');
  tile.settlement={model:'food-population-v1',label:op.label,rulesVersion:1,settings:{...(op.settings??DEFAULT_SETTLEMENT_SETTINGS)},foodRations:op.foodRations,shortageDays:0,surplusDays:0};tile.population=op.population;return;
 }
 const s=tile.settlement;if(!s)throw Error('No settlement on this tile');
 if(op.kind==='settlement-configure'){
  if(op.expectedRulesVersion!==s.rulesVersion)throw Error('Stale settlement rules version');
  if(!Object.keys(op.settings).length&&op.label===undefined)throw Error('Settlement configuration has no changes');
  s.settings={...s.settings,...op.settings};if(op.label!==undefined)s.label=op.label;s.rulesVersion++;
 }
 if(op.kind==='settlement-food')s.foodRations+=op.deltaRations;
 if(op.kind==='settlement-population'){tile.population=op.population;s.shortageDays=0;s.surplusDays=0;}
 if(op.kind==='settlement-remove'){
  if(op.discardPopulation!==tile.population||op.discardFoodRations!==s.foodRations)throw Error('Settlement removal must explicitly discard the exact current inhabitants and food');
  delete tile.settlement;tile.population=0;return;
 }
 delete s.lastDay;
}
// Pure integer stock/population accounting after weather, before custom rules.
// Only explicitly activated tiles participate; legacy ticks remain byte-identical.
export function advanceSettlements(world:World):void {
 const visitors=visitLabor(world);
 for(const tile of world.tiles){const s=tile.settlement;if(!s)continue;const r=s.settings,pop=tile.population,before=s.foodRations;
  const {land,flooded,temperaturePermille,moisturePermille,fertility}=farmConditions(world,tile.id);
  const labor=visitors.get(tile.id),workers=pop-(labor?.away??0)+(labor?.incoming??0);
  const potential=Math.min(r.farmRationsPerDay,workers*r.workerRationsPerDay);
  const produced=land&&!flooded?Math.floor((potential*temperaturePermille*moisturePermille/1_000_000)*(world.soilEcology?.enabled?fertility/1000:1)):0;
  const overflow=Math.max(0,before+produced-SETTLEMENT_LIMITS.food),available=before+produced-overflow,consumed=Math.min(pop,available),unmet=pop-consumed;
  s.foodRations=available-consumed;let births=0,losses=0;
  if(pop===0){s.shortageDays=0;s.surplusDays=0;}
  else if(unmet>0){s.shortageDays++;s.surplusDays=0;
   if(s.shortageDays>=r.shortageIntervalDays){losses=r.lossPermille?Math.min(pop,Math.max(1,Math.ceil(pop*r.lossPermille/1000))):0;s.shortageDays=0;}
  }else{
   s.shortageDays=0;
   if(pop<r.capacity&&s.foodRations>=pop*r.reserveDays&&r.growthPermille>0){s.surplusDays++;
    if(s.surplusDays>=r.growthIntervalDays){births=Math.min(r.capacity-pop,Math.max(1,Math.floor(pop*r.growthPermille/1000)));s.surplusDays=0;}
   }else s.surplusDays=0;
  }
  tile.population=pop+births-losses;
  s.lastDay={...(world.neighborVisits?.enabled?{workers,visitorsAway:labor?.away??0,visitingWorkers:labor?.incoming??0}:{}),...(world.soilEcology?.enabled?{fertilityPermille:fertility}:{}),tick:world.tick,beforeFood:before,produced,overflow,consumed,unmet,afterFood:s.foodRations,beforePopulation:pop,births,losses,afterPopulation:tile.population,potential,temperaturePermille,moisturePermille,land,flooded};
  if(births||losses){world.events.push({tick:world.tick,kind:'population',tileId:tile.id,amount:births||losses,message:births?`${s.label}: ${births} inhabitants added after sustained food reserves.`:`${s.label}: ${losses} inhabitants lost after sustained food shortage.`});if(world.events.length>200)world.events.shift();}
 }
}
export function settlementSummary(world:World,tileId:number):string {
 const tile=world.tiles[tileId],s=tile.settlement;return s?`${s.label}: ${tile.population} inhabitants, ${s.foodRations} rations; shortage ${s.shortageDays}/${s.settings.shortageIntervalDays} days, surplus ${s.surplusDays}/${s.settings.growthIntervalDays} days`:'No settlement';
}
