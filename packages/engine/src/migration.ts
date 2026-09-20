import {garrisonReserved} from './garrisons.js';
import {factionBorderOpen} from './factions.js';
import {takeHealth} from './disease.js';
import type {World,Operation} from '../../contracts/src/index.js';
export function validateMigration(w:World):void {
 const m=w.migration;if(!m)return;const seen=new Set<number>();for(const d of m.lastDepartures){if(!w.tiles[d.tileId]||d.tick>w.tick||seen.has(d.tileId))throw Error('Invalid migration cooldown');seen.add(d.tileId);}
 if(m.lastDay){if(m.lastDay.tick>w.tick)throw Error('Invalid migration report tick');const ids=new Set<string>();for(const e of m.lastDay.entries){if(!w.cells[e.from]?.neighbors.includes(e.to)||ids.has(e.journeyId))throw Error('Invalid automatic migration report');ids.add(e.journeyId);}}
}
export function applyMigration(w:World,op:Operation):void {
 if(op.kind!=='migration-configure')return;const prior=w.migration;if(op.expectedVersion!==(prior?.version??0))throw Error('Stale migration version');
 w.migration={model:'neighbor-migration-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings},nextSequence:prior?.nextSequence??1,lastDepartures:prior?.lastDepartures??[]};
}
// After meals: today's migrants already ate at home, and start moving tomorrow.
// Decisions use one frozen snapshot. Reserve inbound people/food without promising
// arrival capacity: later creator changes, births, or manual trips may still block.
export function advanceMigration(w:World):void {
 const m=w.migration;if(!m?.enabled)return;const r=m.settings;m.lastDay={tick:w.tick,entries:[]};if(!r.departurePermille)return;
 const snap=w.tiles.map(t=>({population:t.population,food:t.settlement?.foodRations??0,capacity:t.settlement?.settings.capacity??0,eligible:!!t.settlement&&t.elevationM>0&&t.travelAllowed!==false,shortage:t.settlement?.shortageDays??0}));
 const incoming=w.tiles.map(()=>0),carried=w.tiles.map(()=>0);for(const j of w.journeys?.active??[]){incoming[j.path.at(-1)!]+=j.population;carried[j.path.at(-1)!]+=j.foodRations;}
 const used=new Set([...(w.journeys?.active.map(j=>j.id)??[]),...w.history.flatMap(p=>p.operations.flatMap(o=>(o.kind==='journey-depart'||o.kind==='army-depart')?[o.journeyId]:[]))]);
 const cooldown=new Map(m.lastDepartures.map(d=>[d.tileId,d.tick]));const receiving=new Set<number>(),departing=new Set<number>();
 for(const t of w.tiles){if((w.journeys?.active.length??0)>=64)break;const a=snap[t.id];if(!a.eligible||!a.population||receiving.has(t.id)||incoming[t.id]>0||w.tick-(cooldown.get(t.id)??-r.cooldownDays)<r.cooldownDays)continue;
  const pressure=a.shortage>=r.shortageDays||a.food<a.population,crowded=a.population*1000>=a.capacity*r.crowdingPermille;
  const candidates=w.cells[t.id].neighbors.filter(id=>{const b=snap[id];return b.eligible&&factionBorderOpen(w,t.id,id,'travel')&&!departing.has(id)&&b.capacity>b.population+incoming[id]&&b.food>=(b.population+incoming[id]+1)*r.destinationReserveDays;}).sort((x,y)=>{const a=snap[x],b=snap[y];return b.food/Math.max(1,b.population+incoming[y])-a.food/Math.max(1,a.population+incoming[x])||x-y;});
  for(const to of candidates){const b=snap[to],budget=Math.min(Math.max(0,a.population-garrisonReserved(w,t.id)),Math.max(1,Math.floor(a.population*r.departurePermille/1000))),housing=b.capacity-b.population-incoming[to],foodSpace=Math.floor(b.food/r.destinationReserveDays)-b.population-incoming[to];const population=Math.min(budget,housing,foodSpace);if(population<=0)continue;
   const destinationPopulation=b.population+incoming[to]+population;
   const betterFood=b.food/destinationPopulation>=a.food/a.population+r.reserveImprovementDays;
   const lessCrowded=destinationPopulation*1000<b.capacity*r.crowdingPermille&&destinationPopulation/b.capacity<a.population/a.capacity;
   if(!betterFood&&!(crowded&&lessCrowded))continue;
   const reason=pressure&&betterFood?'food-pressure':crowded&&lessCrowded?'crowding':'better-reserves';
   const foodRations=Math.min(a.food,population*r.provisionDays,Math.max(0,1e9-b.food-carried[to]));
   let id=`auto-migration-${m.nextSequence}`;while(used.has(id)&&m.nextSequence<Number.MAX_SAFE_INTEGER){m.nextSequence++;id=`auto-migration-${m.nextSequence}`;}if(m.nextSequence>=Number.MAX_SAFE_INTEGER)return;m.nextSequence++;used.add(id);
   const health=w.disease?takeHealth(t.health!,t.population,population):undefined;
   const s=t.settlement!;t.population-=population;s.foodRations-=foodRations;s.surplusDays=0;delete s.lastDay;
   w.journeys??={model:'land-journeys-v1',active:[]};w.journeys.active.push({...(health?{health}:{}),id,label:`Moving from zone ${t.id}`,path:[t.id,to],daysPerHop:r.daysPerHop,index:0,remainingDays:r.daysPerHop,population,foodRations,cargo:[],departedTick:w.tick,shortageDays:0,shortageIntervalDays:s.settings.shortageIntervalDays,lossPermille:s.settings.lossPermille});
   incoming[to]+=population;carried[to]+=foodRations;receiving.add(to);departing.add(t.id);cooldown.set(t.id,w.tick);m.lastDay.entries.push({from:t.id,to,journeyId:id,population,foodRations,reason});break;
  }
 }
 if(w.journeys)w.journeys.active.sort((a,b)=>a.id<b.id?-1:1);m.lastDepartures=[...cooldown].sort((a,b)=>a[0]-b[0]).map(([tileId,tick])=>({tileId,tick}));
}
