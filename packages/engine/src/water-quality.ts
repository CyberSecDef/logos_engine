import {treatmentTechnologyPermille} from './technology.js';
import type {World,Operation} from '../../contracts/src/index.js';import type {WaterTransportReport} from '../../contracts/src/transport.js';import type {WaterQualityDay} from '../../contracts/src/water-quality.js';import {WATER_POLLUTION_MAX} from '../../contracts/src/water-quality-defaults.js';
// Exact integer ratios: load*water can exceed Number's safe multiplication range.
const portion=(load:number,numerator:number,denominator:number)=>denominator?Number(BigInt(load)*BigInt(numerator)/BigInt(denominator)):0;
export function validateWaterQuality(w:World):void {
 if(!w.waterQuality){if(w.tiles.some(t=>t.waterQuality))throw Error('Water pollution state requires its model');return;}
 if(w.tiles.some(t=>!t.waterQuality||t.waterQuality.dissolved+t.waterQuality.surface>WATER_POLLUTION_MAX))throw Error('Invalid water pollution tile capacity');
 const d=w.waterQuality.lastDay;if(!d)return;
 if(d.tick>w.tick||d.tiles.length!==w.tiles.length||d.before+d.emitted+d.waste-d.treated-d.oceanExport-d.decayed!==d.after)throw Error('Invalid water pollution totals');
 const incoming=w.tiles.map(()=>0),outgoing=w.tiles.map(()=>0),seen=new Set<string>();for(const e of d.transfers){const key=`${e.from}:${e.to}`;if(!w.cells[e.from]?.neighbors.includes(e.to)||seen.has(key))throw Error('Invalid pollution transport edge');seen.add(key);incoming[e.to]+=e.load;outgoing[e.from]+=e.load;}
 for(const [i,b] of d.tiles.entries()){
  if(b.tileId!==i||b.incoming!==incoming[i]||b.outgoing!==outgoing[i]||b.treatedDissolved+b.treatedSurface>b.effectiveTreatmentCapacity||b.beforeDissolved-b.treatedDissolved-b.dried+b.washed-b.settled+b.incoming-b.outgoing-b.oceanExport-b.decayedDissolved!==b.afterDissolved||b.beforeSurface+b.emitted+b.waste-b.treatedSurface+b.dried-b.washed+b.settled-b.decayedSurface!==b.afterSurface)throw Error('Invalid local water pollution budget');
 }
 const sum=(fn:(b:WaterQualityDay['tiles'][number])=>number)=>d.tiles.reduce((n,b)=>n+fn(b),0);
 if(d.before!==sum(b=>b.beforeDissolved+b.beforeSurface)||d.after!==sum(b=>b.afterDissolved+b.afterSurface)||d.treated!==sum(b=>b.treatedDissolved+b.treatedSurface)||d.decayed!==sum(b=>b.decayedDissolved+b.decayedSurface)||d.transferred!==sum(b=>b.outgoing))throw Error('Invalid aggregate water pollution budget');
 for(const key of ['emitted','waste','rejectedEmission','rejectedWaste','oceanExport'] as const)if(d[key]!==sum(b=>b[key]))throw Error('Invalid water pollution source/sink totals');
}
export function applyWaterQuality(w:World,op:Operation):void {
 if(op.kind==='water-quality-configure'){
  if(op.expectedVersion!==(w.waterQuality?.version??0))throw Error('Stale water quality version');
  if(!w.waterQuality)for(const t of w.tiles)t.waterQuality={dissolved:0,surface:0,emissionPerDay:0,sanitationCapacity:0,sanitationCondition:1000};
  w.waterQuality={model:'runoff-pollution-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings}};return;
 }
 if(op.kind!=='water-pollution-release'&&op.kind!=='water-pollution-cleanup'&&op.kind!=='water-pollution-source'&&op.kind!=='sanitation-configure')return;
 if(!w.waterQuality)throw Error('Activate water quality before editing pollution or sanitation');const t=w.tiles[op.tileId],a=t.waterQuality!;
 if(op.kind==='water-pollution-release'){if(a.dissolved+a.surface+op.amount>WATER_POLLUTION_MAX)throw Error('Water pollution release exceeds tile capacity');if(op.pool==='water'&&t.waterL>0)a.dissolved+=op.amount;else a.surface+=op.amount;}
 if(op.kind==='water-pollution-cleanup'){if(op.amount>a.dissolved+a.surface)throw Error('Cleanup exceeds available pollution');const removed=Math.min(a.dissolved,op.amount);a.dissolved-=removed;a.surface-=op.amount-removed;}
 if(op.kind==='water-pollution-source')a.emissionPerDay=op.unitsPerDay;
 if(op.kind==='sanitation-configure'){a.sanitationCapacity=op.capacityPerDay;a.sanitationCondition=op.conditionPermille;}
 delete w.waterQuality.lastDay;
}
export function advanceWaterQuality(w:World,water:WaterTransportReport):void {
 const model=w.waterQuality;if(!model?.enabled)return;
 if(water.tick!==w.tick||water.worldId!==w.id)throw Error('Water pollution requires the current hydrology report');const r=model.settings;
 const d:WaterQualityDay={tick:w.tick,before:0,emitted:0,waste:0,rejectedEmission:0,rejectedWaste:0,treated:0,oceanExport:0,decayed:0,after:0,transferred:0,tiles:[],transfers:[]};
 for(const t of w.tiles){const a=t.waterQuality!,volume=water.tiles[t.id].mixingWaterL,treatmentFactor=treatmentTechnologyPermille(w,t.id);
  const b:WaterQualityDay['tiles'][number]={...(treatmentFactor>1000?{treatmentTechnologyPermille:treatmentFactor}:{}),tileId:t.id,beforeDissolved:a.dissolved,beforeSurface:a.surface,emitted:0,waste:0,rejectedEmission:0,rejectedWaste:0,treatedDissolved:0,treatedSurface:0,dried:0,washed:0,settled:0,incoming:0,outgoing:0,oceanExport:0,decayedDissolved:0,decayedSurface:0,afterDissolved:0,afterSurface:0,effectiveTreatmentCapacity:t.settlement&&t.population>0&&t.elevationM>0?Math.min(WATER_POLLUTION_MAX,portion(a.sanitationCapacity,a.sanitationCondition*treatmentFactor,1_000_000)):0};d.tiles.push(b);
  b.emitted=Math.min(a.emissionPerDay,WATER_POLLUTION_MAX-a.dissolved-a.surface);b.rejectedEmission=a.emissionPerDay-b.emitted;a.surface+=b.emitted;
  const waste=r.settlementWasteEnabled&&t.settlement?t.population*r.wastePerPerson:0;b.waste=Math.min(waste,WATER_POLLUTION_MAX-a.dissolved-a.surface);b.rejectedWaste=waste-b.waste;a.surface+=b.waste;
  b.treatedSurface=Math.min(a.surface,b.effectiveTreatmentCapacity);a.surface-=b.treatedSurface;b.treatedDissolved=Math.min(a.dissolved,b.effectiveTreatmentCapacity-b.treatedSurface);a.dissolved-=b.treatedDissolved;
  if(!volume){b.dried=a.dissolved;a.surface+=a.dissolved;a.dissolved=0;}
  else{b.washed=portion(a.surface,r.washoffPermille,1000);a.surface-=b.washed;a.dissolved+=b.washed;}
 }
 const dissolved=w.tiles.map(t=>t.waterQuality!.dissolved),capacity=w.tiles.map(t=>WATER_POLLUTION_MAX-t.waterQuality!.dissolved-t.waterQuality!.surface);
 for(const e of [...water.transfers].sort((a,b)=>a.fromTileId-b.fromTileId||a.toTileId-b.toTileId)){
  const load=Math.min(capacity[e.toTileId],portion(dissolved[e.fromTileId],e.waterL,water.tiles[e.fromTileId].mixingWaterL));if(!load)continue;
  w.tiles[e.fromTileId].waterQuality!.dissolved-=load;w.tiles[e.toTileId].waterQuality!.dissolved+=load;capacity[e.toTileId]-=load;d.tiles[e.fromTileId].outgoing+=load;d.tiles[e.toTileId].incoming+=load;d.transfers.push({from:e.fromTileId,to:e.toTileId,waterL:e.waterL,load});d.transferred+=load;
 }
 for(const t of w.tiles){const a=t.waterQuality!,b=d.tiles[t.id],v=water.tiles[t.id];
  if(!v.mixingWaterL&&(v.afterWaterL>0||v.oceanDrainL>0)){const washed=portion(a.surface,r.washoffPermille,1000);a.surface-=washed;a.dissolved+=washed;b.washed+=washed;}
  if(v.oceanDrainL>0){b.oceanExport=a.dissolved;a.dissolved=0;}
  if(!v.afterWaterL&&a.dissolved){b.dried+=a.dissolved;a.surface+=a.dissolved;a.dissolved=0;}
  b.settled=portion(a.dissolved,r.settlingPermille,1000);a.dissolved-=b.settled;a.surface+=b.settled;
  b.decayedDissolved=portion(a.dissolved,r.decayPermille,1000);b.decayedSurface=portion(a.surface,r.decayPermille,1000);a.dissolved-=b.decayedDissolved;a.surface-=b.decayedSurface;
  b.afterDissolved=a.dissolved;b.afterSurface=a.surface;d.before+=b.beforeDissolved+b.beforeSurface;d.after+=b.afterDissolved+b.afterSurface;d.treated+=b.treatedSurface+b.treatedDissolved;d.decayed+=b.decayedDissolved+b.decayedSurface;for(const key of ['emitted','waste','rejectedEmission','rejectedWaste','oceanExport'] as const)d[key]+=b[key];
 }
 model.lastDay=d;
}
// Today's meals affect tomorrow's treatment; migration has not cleared meal ledgers.
export function advanceSanitation(w:World):void {
 const model=w.waterQuality;if(!model?.enabled)return;const r=model.settings;
 for(const t of w.tiles){const meal=t.settlement?.lastDay;if(!meal||meal.tick!==w.tick||!meal.beforePopulation)continue;const a=t.waterQuality!;a.sanitationCondition=meal.unmet>0?Math.max(0,a.sanitationCondition-r.shortageLossPermille):Math.min(1000,a.sanitationCondition+r.recoveryPermille);}
}
export function waterQualityTotals(w:World){return {dissolved:w.tiles.reduce((n,t)=>n+(t.waterQuality?.dissolved??0),0),surface:w.tiles.reduce((n,t)=>n+(t.waterQuality?.surface??0),0)};}
export function waterQualityMetrics(w:World,id:number){const t=w.tiles[id],a=t.waterQuality;if(!w.waterQuality||!a)return null;const concentration=t.waterL>0?a.dissolved*1e6/t.waterL:null,qualityPercent=concentration===null?null:Math.max(0,100*(1-concentration/w.waterQuality.settings.qualityLimitPerMillionL));return {concentration,qualityPercent,usableWaterL:qualityPercent===null?0:Math.floor(t.waterL*qualityPercent/100)};}

export function waterFarmingPermille(w:World,id:number):number {
 if(!w.waterQuality?.enabled)return 1000;const metrics=waterQualityMetrics(w,id);
 return metrics?.qualityPercent===null||metrics?.qualityPercent===undefined?1000:Math.floor(metrics.qualityPercent*10);
}
