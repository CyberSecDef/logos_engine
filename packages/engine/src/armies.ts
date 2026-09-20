import {factionBorderOpen} from './factions.js';
import type {World} from '../../contracts/src/index.js';
import type {Health} from '../../contracts/src/disease.js';
import type {Journey} from '../../contracts/src/journeys.js';
// Military allegiance persists while in transit; civilian journeys remain territorial.
export function militaryAccess(w:World,factionId:string,id:number):boolean {
 const owner=w.tiles[id]?.factionId;if(!owner)return false;if(owner===factionId)return true;
 return !!w.factions?.relations.some(r=>r.relationship==='allied'&&(r.a===owner&&r.b===factionId||r.b===owner&&r.a===factionId));
}
// Largest-remainder allocation from susceptible and immune only; no ill recruitment.
export function takeHealthyHealth(h:Health,population:number,count:number):Health {
 const healthy=population-h.ill;if(count>healthy||count<0)throw Error('Insufficient healthy troops');
 const susceptible=healthy-h.immune,den=BigInt(healthy),immuneProduct=BigInt(h.immune)*BigInt(count),susceptibleProduct=BigInt(susceptible)*BigInt(count);
 if(!count)return {ill:0,immune:0};let immune=Number(immuneProduct/den);const remainder=count-immune-Number(susceptibleProduct/den);
 if(remainder&&immuneProduct%den>susceptibleProduct%den)immune++;h.immune-=immune;return {ill:0,immune};
}
export function reinforceGarrison(w:World,id:number,j:Journey):void {
 if(!j.military||!j.population)return;const t=w.tiles[id],g=t.garrison;
 t.garrison={model:'resident-garrison-v1',version:(g?.version??0)+1,target:Math.min(t.population,(g?.target??0)+j.population),reserveDays:g?.reserveDays??j.military.reserveDays};
}
// The UI searches only friendly land; engine departure validation remains authoritative.
export function armyJourneyPath(w:World,from:number,to:number):number[]{
 const faction=w.tiles[from]?.factionId;if(!faction||w.tiles[to]?.factionId!==faction||from===to)throw Error('Choose a different settlement owned by this faction');
 const open=(id:number)=>w.tiles[id].elevationM>0&&w.tiles[id].travelAllowed!==false&&militaryAccess(w,faction,id);
 if(!open(from)||!open(to))throw Error('Army endpoints must allow travel and be land');
 const queue=[from],parent=new Map<number,number>([[from,-1]]);
 for(let i=0;i<queue.length;i++)for(const next of [...w.cells[queue[i]].neighbors].sort((a,b)=>a-b)){if(parent.has(next)||!open(next)||!factionBorderOpen(w,queue[i],next,'travel'))continue;parent.set(next,queue[i]);if(next===to){const path=[to];while(path.at(-1)!==from)path.push(parent.get(path.at(-1)!)!);path.reverse();if(path.length>65)throw Error('Army journey exceeds 64 legs');return path;}queue.push(next);}throw Error('No friendly open land path to destination');
}
