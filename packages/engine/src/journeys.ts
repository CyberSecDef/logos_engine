import {takeHealth} from './disease.js';
import type {World,Operation} from '../../contracts/src/index.js';
import type {Journey,JourneyStatus} from '../../contracts/src/journeys.js';
import {fieldValue} from './extensions.js';
const units=(n:number)=>Math.round(n*1000);
export function checkJourneyPath(w:World,path:number[],origin:number):void {
 if(path[0]!==origin||new Set(path).size!==path.length||path.some((id,i)=>!w.tiles[id]||i>0&&!w.cells[path[i-1]].neighbors.includes(id)))throw Error('Journey needs a simple adjacent path starting at its current zone');
}
export function validateJourneys(w:World):void {
 if(!w.journeys)return;const ids=new Set<string>();
 for(const j of w.journeys.active){if(ids.has(j.id))throw Error('Duplicate journey');ids.add(j.id);checkJourneyPath(w,j.path,j.path[0]);
  if(j.index>=j.path.length-1||j.remainingDays>j.daysPerHop||j.departedTick>w.tick||j.shortageDays>=j.shortageIntervalDays)throw Error('Invalid journey progress');
  const fields=new Set<string>();for(const c of j.cargo){const f=w.definitions.fields.find(f=>f.id===c.fieldId);if(fields.has(c.fieldId)||!f||f.quantity!=='stock'||units(c.amount)/1000!==c.amount||c.amount>f.max)throw Error('Invalid journey cargo');fields.add(c.fieldId);}
 }
 if(w.journeys.lastDay){if(w.journeys.lastDay.tick>w.tick)throw Error('Journey report is from the future');const ids=new Set<string>();for(const r of w.journeys.lastDay.entries){if(ids.has(r.journeyId)||r.beforePopulation-r.losses!==r.afterPopulation||r.beforeFood-r.consumed!==r.afterFood||r.status!=='arrived'&&r.consumed+r.unmet!==r.beforePopulation)throw Error('Invalid journey accounting');ids.add(r.journeyId);}}
}
function arrivalBlock(w:World,j:Journey,id:number):JourneyStatus|null {
 const t=w.tiles[id];if(t.travelAllowed===false)return 'closed';if(t.elevationM<=0)return 'submerged';const s=t.settlement;if(!s)return 'no-settlement';
 if(t.population+j.population>s.settings.capacity)return 'population-capacity';if(s.foodRations+j.foodRations>1e9)return 'food-capacity';
 if(j.cargo.some(c=>units(fieldValue(w,id,c.fieldId))+units(c.amount)>units(w.definitions.fields.find(f=>f.id===c.fieldId)!.max)))return 'cargo-capacity';return null;
}
function unload(w:World,j:Journey,id:number):void {
 const t=w.tiles[id],s=t.settlement!;if(w.disease){t.health!.ill+=j.health!.ill;t.health!.immune+=j.health!.immune;}t.population+=j.population;s.foodRations+=j.foodRations;s.shortageDays=0;s.surplusDays=0;delete s.lastDay;
 for(const c of j.cargo)t.properties[c.fieldId]=(units(fieldValue(w,id,c.fieldId))+units(c.amount))/1000;
}
export function applyJourney(w:World,op:Operation):void {
 if(!op.kind.startsWith('journey-'))return;
 if(op.kind==='journey-depart'){
  if(w.journeys?.active.some(j=>j.id===op.journeyId)||w.history.some(p=>p.operations.some(o=>o.kind==='journey-depart'&&o.journeyId===op.journeyId)))throw Error('Journey ID has already been used');
  checkJourneyPath(w,op.path,op.tileId);if(op.path.some(id=>w.tiles[id].elevationM<=0||w.tiles[id].travelAllowed===false))throw Error('Departure path must be open land');
  const source=w.tiles[op.tileId],s=source.settlement;if(!s||!w.tiles[op.path.at(-1)!].settlement)throw Error('Journeys require existing source and destination settlements');
  if(op.population>source.population||op.foodRations>s.foodRations)throw Error('Insufficient departure population or food');
  const j:Journey={id:op.journeyId,label:op.label,path:op.path,daysPerHop:op.daysPerHop,index:0,remainingDays:op.daysPerHop,population:op.population,foodRations:op.foodRations,cargo:op.cargo,departedTick:w.tick,shortageDays:0,shortageIntervalDays:s.settings.shortageIntervalDays,lossPermille:s.settings.lossPermille};
  for(const c of op.cargo){const f=w.definitions.fields.find(f=>f.id===c.fieldId);if(!f||f.quantity!=='stock'||fieldValue(w,op.tileId,c.fieldId)<c.amount)throw Error('Insufficient or invalid departure cargo');source.properties[c.fieldId]=(units(fieldValue(w,op.tileId,c.fieldId))-units(c.amount))/1000;}
  if(w.disease)j.health=takeHealth(source.health!,source.population,op.population);
  source.population-=op.population;s.foodRations-=op.foodRations;s.shortageDays=0;s.surplusDays=0;delete s.lastDay;
  w.journeys??={model:'land-journeys-v1',active:[]};w.journeys.active.push(j);w.journeys.active.sort((a,b)=>a.id<b.id?-1:1);
 }else if(op.kind==='journey-redirect'||op.kind==='journey-provision'||op.kind==='journey-dock'){
  const j=w.journeys?.active.find(j=>j.id===op.journeyId);if(!j||j.path[j.index]!==op.tileId)throw Error('Unknown journey or wrong current zone');
  if(op.kind==='journey-redirect'){checkJourneyPath(w,op.path,op.tileId);if(!w.tiles[op.path.at(-1)!].settlement)throw Error('Redirect to an existing settlement');j.path=op.path;j.index=0;j.daysPerHop=op.daysPerHop;j.remainingDays=op.daysPerHop;}
  if(op.kind==='journey-provision'){const s=w.tiles[op.tileId].settlement;if(!s||s.foodRations<op.foodRations||j.foodRations+op.foodRations>1e9)throw Error('Invalid journey provisioning balance');s.foodRations-=op.foodRations;j.foodRations+=op.foodRations;delete s.lastDay;}
  if(op.kind==='journey-dock'){const blocked=arrivalBlock(w,j,op.tileId);if(blocked)throw Error(`Cannot unload journey: ${blocked}`);unload(w,j,op.tileId);w.journeys!.active=w.journeys!.active.filter(x=>x.id!==j.id);}
 }
 if(w.journeys)delete w.journeys.lastDay;
}
export function advanceJourneys(w:World):void {
 const data=w.journeys;if(!data)return;data.lastDay={tick:w.tick,entries:[]};const remaining:Journey[]=[];
 for(const j of [...data.active].sort((a,b)=>a.id<b.id?-1:1)){
  const beforePopulation=j.population,beforeFood=j.foodRations;let status:JourneyStatus='moving',consumed=0,unmet=0,losses=0,arrived=false;
  const from=w.tiles[j.path[j.index]],to=w.tiles[j.path[j.index+1]];
  if(!j.population)status='no-travelers';else if(from.travelAllowed===false||to.travelAllowed===false)status='closed';else if(from.elevationM<=0||to.elevationM<=0)status='submerged';else{
   j.remainingDays=Math.max(0,j.remainingDays-1);
   if(j.remainingDays===0){if(j.index===j.path.length-2){const blocked=arrivalBlock(w,j,to.id);if(blocked)status=blocked;else{unload(w,j,to.id);status='arrived';arrived=true;}}
    else{j.index++;j.remainingDays=j.daysPerHop;}}
  }
  if(!arrived){consumed=Math.min(j.population,j.foodRations);unmet=j.population-consumed;j.foodRations-=consumed;
   if(unmet){j.shortageDays++;if(j.shortageDays>=j.shortageIntervalDays){losses=j.lossPermille?Math.min(j.population,Math.max(1,Math.ceil(j.population*j.lossPermille/1000))):0;if(w.disease)takeHealth(j.health!,j.population,losses);j.population-=losses;j.shortageDays=0;}}else j.shortageDays=0;
   if(!j.population)status='no-travelers';remaining.push(j);
  }
  data.lastDay.entries.push({journeyId:j.id,label:j.label,origin:j.path[0],tileId:arrived?j.path.at(-1)!:j.path[j.index],destination:j.path.at(-1)!,status,beforePopulation,afterPopulation:j.population,beforeFood,afterFood:j.foodRations,consumed,unmet,losses});
 }
 data.active=remaining;
}
export function journeyTotals(w:World){return {foodRationsTotal:w.tiles.reduce((n,t)=>n+(t.settlement?.foodRations??0),0)+(w.journeys?.active.reduce((n,j)=>n+j.foodRations,0)??0),population:w.tiles.reduce((n,t)=>n+t.population,0)+(w.journeys?.active.reduce((n,j)=>n+j.population,0)??0),travelers:w.journeys?.active.reduce((n,j)=>n+j.population,0)??0,foodInTransit:w.journeys?.active.reduce((n,j)=>n+j.foodRations,0)??0};}
