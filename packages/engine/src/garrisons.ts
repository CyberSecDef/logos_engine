import type {World,Operation} from '../../contracts/src/index.js';
// Garrisons reserve resident slots, not a second population/health/food ledger.
// Healthy home workers fill those slots after contact; illness never double-debits labor.
export function garrisonAvailability(w:World,id:number){
 const t=w.tiles[id],g=t.garrison;let reason:NonNullable<NonNullable<typeof g>['lastDay']>['reason']='demobilized',reserved=0;
 if(g?.target){if(!t.population||!t.settlement)reason='empty';else if(t.elevationM<=0||t.waterL/w.cells[id].areaM2>100)reason='terrain';else if(t.settlement.foodRations<t.population*(g.reserveDays+1))reason='food';else{reserved=Math.min(t.population,g.target);reason='serving';}}
 return {reserved,reason};
}
export function validateGarrisons(w:World):void {
 for(const t of w.tiles){const g=t.garrison;if(!g)continue;if(!t.settlement||g.target>0&&!t.factionId)throw Error('Garrison requires a settlement and claimed territory');const d=g.lastDay;if(d&&(d.tick>w.tick||d.reserved>d.population||d.workers>d.reserved||d.reserved>g.target||d.reason==='serving'&&d.workers===0||d.reason==='illness'&&(d.workers!==0||d.reserved===0)||['demobilized','empty','terrain','food'].includes(d.reason)&&(d.reserved!==0||d.workers!==0)))throw Error('Invalid garrison daily accounting');}
}
export function applyGarrison(w:World,op:Operation):void {
 if(op.kind!=='garrison-configure')return;const t=w.tiles[op.tileId];if(op.expectedVersion!==(t.garrison?.version??0))throw Error('Stale garrison version');
 if(!t.settlement)throw Error('Garrison requires an existing settlement');if(op.target>0&&(!t.factionId||t.elevationM<=0))throw Error('Mobilize only in claimed land settlements');if(op.target>t.population)throw Error('Garrison target exceeds existing inhabitants');
 t.garrison={model:'resident-garrison-v1',version:op.expectedVersion+1,target:op.target,reserveDays:op.reserveDays};
}
export function reserveGarrisons(w:World):void {
 for(const t of w.tiles)if(t.garrison)t.garrison.lastDay={tick:w.tick,population:t.population,...garrisonAvailability(w,t.id),workers:0};
}
export function garrisonReserved(w:World,id:number):number {const d=w.tiles[id].garrison?.lastDay;return d?.tick===w.tick?Math.min(w.tiles[id].population,d.reserved):0;}
export function staffGarrisons(w:World):void {
 const away=new Map<number,{people:number;ill:number}>();if(w.neighborVisits?.enabled&&w.neighborVisits.lastDay?.tick===w.tick)for(const e of w.neighborVisits.lastDay.entries){const n=away.get(e.from)??{people:0,ill:0};n.people+=e.visitors;n.ill+=e.health?.ill??0;away.set(e.from,n);}
 for(const t of w.tiles){const d=t.garrison?.lastDay;if(!d||d.tick!==w.tick||!d.reserved)continue;const a=away.get(t.id),ill=w.disease?.enabled?(t.health!.ill-(a?.ill??0)):0;d.workers=Math.min(d.reserved,Math.max(0,t.population-(a?.people??0)-ill));d.reason=d.workers?'serving':'illness';}
}
export function garrisonWorkers(w:World,id:number):number {const d=w.tiles[id].garrison?.lastDay;return d?.tick===w.tick?d.workers:0;}
