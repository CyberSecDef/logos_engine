import {garrisonReserved} from './garrisons.js';
import {factionBorderOpen} from './factions.js';
import type {World,Operation} from '../../contracts/src/index.js';
import {farmConditions} from './farm-conditions.js';
export function validateNeighborVisits(w:World):void {
 const v=w.neighborVisits;if(!v)return;if(v.settings.foodTargetDays>v.settings.foodReserveDays)throw Error('Visit food target cannot exceed protected reserve days');
 const d=v.lastDay;if(!d)return;if(d.tick>w.tick||d.beforeFood!==d.afterFood||d.entries.reduce((n,e)=>n+e.rations,0)>d.beforeFood)throw Error('Invalid visit accounting');
 const keys=new Set<string>();for(const e of d.entries){const key=`${e.from}:${e.to}:${e.purpose}`;if(!w.cells[e.from]?.neighbors.includes(e.to)||keys.has(key)||e.purpose!=='food'&&e.rations!==0||e.purpose==='food'&&(e.rations===0||e.rations>e.visitors*v.settings.carryRationsPerVisitor))throw Error('Invalid neighbor visit');keys.add(key);}
}
export function applyNeighborVisits(w:World,op:Operation):void {
 if(op.kind!=='neighbor-visits-configure')return;if(op.expectedVersion!==(w.neighborVisits?.version??0))throw Error('Stale neighbor visits version');
 w.neighborVisits={model:'neighbor-visits-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings}};
}
// Same-day round trips: residency and meals remain at home. No extra people exist.
// Food uses frozen start stocks; incoming food cannot be forwarded. Work reserves
// initially vacant farm slots, never slots vacated by today's other visitors.
export function advanceNeighborVisits(w:World):void {
 const v=w.neighborVisits;if(!v?.enabled)return;const r=v.settings;
 const open=w.tiles.map(t=>t.elevationM>0&&t.travelAllowed!==false);
 const stock=w.tiles.map(t=>t.settlement?.foodRations??0),balance=[...stock];
 const supply=w.tiles.map((t,i)=>open[i]&&t.settlement&&t.foodTradeAllowed!==false?Math.max(0,stock[i]-t.population*(r.foodReserveDays+1)):0);
 const demand=w.tiles.map((t,i)=>open[i]&&t.settlement&&t.foodTradeAllowed!==false?Math.min(1e9-stock[i],Math.max(0,t.population*(r.foodTargetDays+1)-stock[i])):0);
 const jobs=w.tiles.map(t=>{const s=t.settlement,c=farmConditions(w,t.id);return s&&open[t.id]&&c.land&&!c.flooded&&c.temperaturePermille>0&&c.moisturePermille>0&&c.fertility>0&&c.waterQualityPermille>0&&s.settings.workerRationsPerDay>0?Math.max(0,Math.ceil(s.settings.farmRationsPerDay/s.settings.workerRationsPerDay)-t.population+garrisonReserved(w,t.id)):0;});
 const entries:NonNullable<NonNullable<World['neighborVisits']>['lastDay']>['entries']=[];
 for(const t of w.tiles){if(!open[t.id]||!t.population||!r.dailyPermille)continue;
  let left=Math.min(t.population-garrisonReserved(w,t.id),Math.max(1,Math.floor(t.population*r.dailyPermille/1000)));
  const sorted=[...w.cells[t.id].neighbors].filter(id=>open[id]&&factionBorderOpen(w,t.id,id,'travel')).sort((a,b)=>a-b),offset=sorted.length?(w.tick+t.id)%sorted.length:0;
  const neighbors=[...sorted.slice(offset),...sorted.slice(0,offset)];
  for(const to of neighbors){if(!factionBorderOpen(w,t.id,to,'trade')||!left||!demand[t.id]||!supply[to]||!r.carryRationsPerVisitor)continue;
   const rations=Math.min(left*r.carryRationsPerVisitor,demand[t.id],supply[to]),visitors=Math.ceil(rations/r.carryRationsPerVisitor);
   left-=visitors;demand[t.id]-=rations;supply[to]-=rations;balance[t.id]+=rations;balance[to]-=rations;entries.push({from:t.id,to,purpose:'food',visitors,rations});
  }
  for(const to of neighbors){const visitors=Math.min(left,jobs[to]);if(!visitors)continue;left-=visitors;jobs[to]-=visitors;entries.push({from:t.id,to,purpose:'work',visitors,rations:0});}
  for(let i=0;i<neighbors.length&&left;i++){const visitors=Math.ceil(left/(neighbors.length-i));left-=visitors;entries.push({from:t.id,to:neighbors[i],purpose:'explore',visitors,rations:0});}
 }
 for(const t of w.tiles)if(t.settlement)t.settlement.foodRations=balance[t.id];
 v.lastDay={tick:w.tick,beforeFood:stock.reduce((a,b)=>a+b,0),afterFood:balance.reduce((a,b)=>a+b,0),entries};
}
export function visitLabor(w:World):Map<number,{away:number;incoming:number}> {
 const result=new Map<number,{away:number;incoming:number}>(),d=w.neighborVisits?.enabled?w.neighborVisits.lastDay:undefined;
 if(d?.tick!==w.tick)return result;
 for(const e of d.entries){const from=result.get(e.from)??{away:0,incoming:0};from.away+=e.visitors;result.set(e.from,from);if(e.purpose==='work'){const to=result.get(e.to)??{away:0,incoming:0};to.incoming+=e.visitors;result.set(e.to,to);}}
 return result;
}
