import type {World,Operation} from '../../contracts/src/index.js';
import {garrisonWorkers,garrisonAvailability} from './garrisons.js';
import {takeHealthyHealth} from './armies.js';
const hostile=(w:World,a:string|undefined,b:string|undefined)=>!!a&&!!b&&a!==b&&!!w.factions?.relations.some(r=>r.relationship==='hostile'&&(r.a===a&&r.b===b||r.a===b&&r.b===a));
function homeHealthy(w:World,id:number):number {const t=w.tiles[id];let people=t.population,ill=t.health?.ill??0;if(w.neighborVisits?.enabled&&w.neighborVisits.lastDay?.tick===w.tick)for(const e of w.neighborVisits.lastDay.entries)if(e.from===id){people-=e.visitors;ill-=e.health?.ill??0;}return Math.max(0,people-ill);}
export function validateConflict(w:World):void {
 const c=w.conflict;if(!c){if(w.journeys?.active.some(j=>j.military?.mission))throw Error('Campaigns require conflict policy');return;}
 if(!w.factions)throw Error('Conflict requires faction registry');if(c.settings.provisionDays<2*c.settings.daysPerHop+1)throw Error('Conflict provisions must cover outward and return travel plus one day');
 const seen=new Set<number>();for(const a of c.lastActions){if(!w.tiles[a.tileId]||a.tick>w.tick||seen.has(a.tileId))throw Error('Invalid conflict cooldown');seen.add(a.tileId);}
 const fronts=new Set<number>();for(const j of w.journeys?.active??[]){if(!j.military?.mission)continue;if(j.path.length!==2||j.index!==0)throw Error('Campaigns require one adjacent leg');if(j.military.mission==='assault'){for(const id of j.path){if(fronts.has(id))throw Error('Overlapping active conflict fronts');fronts.add(id);}}}
 const d=c.lastDay;if(d){if(d.tick>w.tick)throw Error('Conflict report is from the future');const ids=new Set<string>();for(const b of d.battles){if(ids.has(b.journeyId)||!w.cells[b.from]?.neighbors.includes(b.to)||b.attackerBefore-b.attackerLosses!==b.attackerAfter||b.defenderBefore-b.defenderLosses!==b.defenderAfter||b.outcome==='cancelled'&&(b.attackerLosses||b.defenderLosses))throw Error('Invalid battle accounting');ids.add(b.journeyId);}for(const l of d.launches)if(!w.cells[l.from]?.neighbors.includes(l.to))throw Error('Invalid conflict departure');}
}
export function applyConflict(w:World,op:Operation):void {
 if(op.kind!=='conflict-configure')return;if(!w.factions)throw Error('Define factions before conflict');if(op.expectedVersion!==(w.conflict?.version??0))throw Error('Stale conflict policy version');const old=w.conflict;
 w.conflict={model:'adjacent-conflict-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings},nextSequence:old?.nextSequence??1,lastActions:old?.lastActions??[]};
}
function stamp(w:World,ids:number[]){const c=w.conflict!,map=new Map(c.lastActions.map(a=>[a.tileId,a.tick]));for(const id of ids)map.set(id,w.tick);c.lastActions=[...map].sort((a,b)=>a[0]-b[0]).map(([tileId,tick])=>({tileId,tick}));}
// Disjoint fronts ensure no tile defends or attacks twice in this phase. Losses
// use frozen healthy strengths; only home garrison combatants can be casualties.
export function resolveConflict(w:World):void {
 const c=w.conflict;if(!c)return;c.lastDay={tick:w.tick,battles:[],launches:[]};
 for(const j of [...(w.journeys?.active??[])].sort((a,b)=>a.id<b.id?-1:1)){
  if(j.military?.mission!=='assault')continue;const from=j.path[0],to=j.path[1],target=w.tiles[to],faction=j.military.factionId;
  const cancelled=!c.enabled||!hostile(w,faction,target.factionId)||!target.settlement||w.tiles[from].elevationM<=0||target.elevationM<=0||!j.population;
  if(!cancelled&&j.remainingDays>0)continue;
  const attackerBefore=j.population,defenderBefore=Math.min(garrisonWorkers(w,to),homeHealthy(w,to));let attackerLosses=0,defenderLosses=0,outcome:'captured'|'repelled'|'cancelled'='cancelled';const defenderFaction=target.factionId;
  if(cancelled){j.military.mission='cancelled';}
  else{
   const attack=j.population-(j.health?.ill??0),defense=defenderBefore,rate=c.settings.lossPermille;
   attackerLosses=Math.min(attack,Math.ceil(attack*rate/1000),Math.ceil(defense*rate/1000));defenderLosses=Math.min(defense,Math.ceil(defense*rate/1000),Math.ceil(attack*rate/1000));
   if(w.disease){takeHealthyHealth(j.health!,j.population,attackerLosses);if(defenderLosses){const home={...target.health!};let people=target.population;for(const e of w.neighborVisits?.enabled&&w.neighborVisits.lastDay?.tick===w.tick?w.neighborVisits.lastDay.entries:[]){if(e.from!==to)continue;people-=e.visitors;home.ill-=e.health!.ill;home.immune-=e.health!.immune;}const removed=takeHealthyHealth(home,people,defenderLosses);target.health!.immune-=removed.immune;}}
   j.population-=attackerLosses;target.population-=defenderLosses;
   const g=target.garrison;if(g&&defenderLosses){g.target=Math.max(0,g.target-defenderLosses);g.version++;if(g.lastDay){g.lastDay.reserved-=defenderLosses;g.lastDay.workers-=defenderLosses;g.lastDay.reason=g.lastDay.workers?'serving':g.lastDay.reserved?'illness':'demobilized';}}
   if(attack-attackerLosses>defense-defenderLosses){outcome='captured';target.factionId=faction;if(g){g.target=0;g.version++;delete g.lastDay;}}else outcome='repelled';
   // Survivors spend a full return leg; never add occupiers into civilian housing.
   j.path=[to,from];j.index=0;j.remainingDays=j.daysPerHop;j.military.mission='return';
   w.events.push({tick:w.tick,kind:'conflict',tileId:to,amount:attackerLosses+defenderLosses,message:`${faction} ${outcome==='captured'?'captured':'was repelled at'} zone ${to}; ${attackerLosses} attacking and ${defenderLosses} defending combatants lost. Civilians and infrastructure preserved.`});if(w.events.length>200)w.events.shift();
  }
  stamp(w,[from,to]);c.lastDay.battles.push({journeyId:j.id,from,to,attackerFaction:faction,...(defenderFaction?{defenderFaction}:{}),outcome,attackerBefore,attackerAfter:j.population,attackerLosses,defenderBefore,defenderAfter:defenderBefore-defenderLosses,defenderLosses});
 }
}
// Launch after resident meals. Selection uses a frozen garrison/food snapshot,
// ascending origin then target IDs, disjoint fronts, cooldowns and hard daily caps.
export function launchConflict(w:World):void {
 const c=w.conflict;if(!c?.enabled)return;const r=c.settings;if(!r.deploymentPermille||!r.maxDeparturesPerDay)return;
 const busy=new Set<number>();for(const j of w.journeys?.active??[])if(j.military?.mission)for(const id of j.path)busy.add(id);
 const cooldown=new Map(c.lastActions.map(a=>[a.tileId,a.tick])),snap=w.tiles.map(t=>({id:t.id,faction:t.factionId,workers:Math.min(garrisonWorkers(w,t.id),t.population-(t.health?.ill??0)),food:t.settlement?.foodRations??0,eligible:!!t.settlement&&t.elevationM>0&&t.waterL/w.cells[t.id].areaM2<=100}));
 const ids=new Set([...(w.journeys?.active.map(j=>j.id)??[]),...w.history.flatMap(p=>p.operations.flatMap(o=>o.kind==='army-depart'||o.kind==='journey-depart'?[o.journeyId]:[]))]);
 for(const a of snap){if(c.lastDay!.launches.length>=r.maxDeparturesPerDay||(w.journeys?.active.length??0)>=64)break;if(!a.eligible||!a.faction||busy.has(a.id)||w.tick-(cooldown.get(a.id)??-r.cooldownDays)<r.cooldownDays)continue;const source=w.tiles[a.id],s=source.settlement!,g=source.garrison;
  if(!g||!garrisonAvailability(w,a.id).reserved)continue;const population=Math.floor(a.workers*r.deploymentPermille/1000),foodRations=population*r.provisionDays;if(population<r.minimumTroops||foodRations>1e9||a.food-foodRations<(source.population-population)*(g.reserveDays+1))continue;
  const to=[...w.cells[a.id].neighbors].sort((x,y)=>x-y).find(id=>{const b=snap[id];return b.eligible&&!busy.has(id)&&hostile(w,a.faction,b.faction)&&w.tick-(cooldown.get(id)??-r.cooldownDays)>=r.cooldownDays&&population*1000>=b.workers*r.requiredAdvantagePermille;});if(to===undefined)continue;
  let journeyId=`conflict-${c.nextSequence}`;while(ids.has(journeyId)&&c.nextSequence<Number.MAX_SAFE_INTEGER){c.nextSequence++;journeyId=`conflict-${c.nextSequence}`;}if(c.nextSequence>=Number.MAX_SAFE_INTEGER)break;c.nextSequence++;ids.add(journeyId);
  const health=w.disease?takeHealthyHealth(source.health!,source.population,population):undefined;
  source.population-=population;s.foodRations-=foodRations;s.shortageDays=0;s.surplusDays=0;delete s.lastDay;g.target-=population;g.version++;
  // Keep the remaining home guard reserved for migration later this same day.
  // The daily population records the original staffing snapshot; only the
  // departing reserved slots/workers leave it. Recomputing would staff twice.
  if(g.lastDay){g.lastDay.reserved-=population;g.lastDay.workers-=population;g.lastDay.reason=g.lastDay.workers?'serving':g.lastDay.reserved?'illness':'demobilized';}
  w.journeys??={model:'land-journeys-v1',active:[]};w.journeys.active.push({id:journeyId,label:`${a.faction} expedition`,path:[a.id,to],daysPerHop:r.daysPerHop,index:0,remainingDays:r.daysPerHop,population,foodRations,cargo:[],departedTick:w.tick,shortageDays:0,shortageIntervalDays:s.settings.shortageIntervalDays,lossPermille:s.settings.lossPermille,...(health?{health}:{}),military:{factionId:a.faction,homeTileId:a.id,reserveDays:g.reserveDays,mission:'assault'}});w.journeys.active.sort((a,b)=>a.id<b.id?-1:1);
  busy.add(a.id);busy.add(to);stamp(w,[a.id,to]);c.lastDay!.launches.push({journeyId,from:a.id,to,factionId:a.faction,population,foodRations});
 }
}
