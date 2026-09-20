import type {World,Operation,Vec} from '../../contracts/src/index.js';import type {AirDay} from '../../contracts/src/air.js';import {AIR_LOAD_MAX} from '../../contracts/src/air-defaults.js';import {random} from '../../worldgen/src/index.js';
export function validateAir(w:World):void {
 if(!w.air){if(w.tiles.some(t=>t.air))throw Error('Air tile state requires the air model');return;}
 if(w.tiles.some(t=>!t.air))throw Error('Air model requires every tile wind/load state');const d=w.air.lastDay;if(!d)return;
 if(d.tick>w.tick||d.tiles.length!==w.tiles.length||d.before+d.emitted-d.removed!==d.after)throw Error('Invalid air budget');
 const incoming=w.tiles.map(()=>0),outgoing=w.tiles.map(()=>0),seen=new Set<string>();
 for(const e of d.transfers){const key=`${e.from}:${e.to}`;if(!w.cells[e.from]?.neighbors.includes(e.to)||seen.has(key)||e.wind+e.mixing!==e.amount)throw Error('Invalid air transfer');seen.add(key);incoming[e.to]+=e.amount;outgoing[e.from]+=e.amount;}
 for(const [i,b] of d.tiles.entries())if(b.tileId!==i||b.before+b.emitted+b.incoming-b.outgoing-b.removed!==b.after||b.incoming!==incoming[i]||b.outgoing!==outgoing[i]||b.outgoing>b.before+b.emitted)throw Error('Invalid local air budget');
 for(const key of ['before','emitted','rejectedEmission','removed','after'] as const)if(d[key]!==d.tiles.reduce((n,t)=>n+t[key],0))throw Error('Invalid air totals');
 if(d.transferred!==d.transfers.reduce((n,e)=>n+e.amount,0))throw Error('Invalid air transfer total');
}
export function applyAir(w:World,op:Operation):void {
 if(op.kind==='air-configure'){
  if(op.expectedVersion!==(w.air?.version??0))throw Error('Stale air model version');
  if(!w.air)for(const t of w.tiles){const y=w.cells[t.id].center[1];t.air={load:0,emissionPerDay:0,windBearingDeg:(Math.abs(y)<0.5?270:90)+Math.floor(random(w.seed,'air-bearing-v1',t.id)*41)-20,windPermille:100+Math.floor(random(w.seed,'air-speed-v1',t.id)*201)};}
  w.air={model:'air-transport-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings}};return;
 }
 if(op.kind!=='air-release'&&op.kind!=='air-source'&&op.kind!=='air-wind')return;
 if(!w.air)throw Error('Activate the world air model before editing pollution or wind');const a=w.tiles[op.tileId].air!;
 if(op.kind==='air-release'){if(a.load+op.delta<0||a.load+op.delta>AIR_LOAD_MAX)throw Error('Air load adjustment exceeds available load or capacity');a.load+=op.delta;}
 if(op.kind==='air-source')a.emissionPerDay=op.unitsPerDay;
 if(op.kind==='air-wind'){a.windBearingDeg=op.bearingDeg;a.windPermille=op.transportPermille;}
 delete w.air.lastDay;
}
// Bearing is where air travels TOWARD: north=0, east=90. Project neighbor centers
// into the origin tangent plane; deterministic reference east at exact poles.
export function airNeighborBearings(w:World,id:number):{to:number;bearingDeg:number}[] {
 const [x,y,z]=w.cells[id].center,h=Math.hypot(x,z),east:Vec=h>1e-12?[-z/h,0,x/h]:[0,0,1],north:Vec=[y*east[2]-z*east[1],z*east[0]-x*east[2],x*east[1]-y*east[0]].map(n=>-n) as Vec;
 return [...w.cells[id].neighbors].sort((a,b)=>a-b).map(to=>{const v=w.cells[to].center,e=v.reduce((n,c,i)=>n+c*east[i],0),n=v.reduce((sum,c,i)=>sum+c*north[i],0);return {to,bearingDeg:(Math.atan2(e,n)*180/Math.PI+360)%360};});
}
function split(total:number,weights:number[]):number[]{const sum=weights.reduce((a,b)=>a+b,0);if(!sum)return weights.map(()=>0);const amounts=weights.map(n=>Math.floor(total*n/sum));let remainder=total-amounts.reduce((a,b)=>a+b,0);for(let i=0;remainder>0;i=(i+1)%weights.length)if(weights[i]){amounts[i]++;remainder--;}return amounts;}
export function advanceAir(w:World):void {
 const model=w.air;if(!model?.enabled)return;const d:AirDay={tick:w.tick,before:0,emitted:0,rejectedEmission:0,removed:0,after:0,transferred:0,tiles:[],transfers:[]};
 const stock=w.tiles.map(t=>{const a=t.air!,emitted=Math.min(a.emissionPerDay,AIR_LOAD_MAX-a.load);d.tiles.push({tileId:t.id,before:a.load,emitted,rejectedEmission:a.emissionPerDay-emitted,incoming:0,outgoing:0,removed:0,after:0});return a.load+emitted;});
 const balances=[...stock],capacity=stock.map(n=>AIR_LOAD_MAX-n);
 for(const t of w.tiles){if(!stock[t.id])continue;const a=t.air!,edges=airNeighborBearings(w,t.id),weights=edges.map(e=>Math.max(0,Math.round(Math.cos((e.bearingDeg-a.windBearingDeg)*Math.PI/180)*1e6)));
  const wind=split(Math.floor(stock[t.id]*a.windPermille/1000),weights),mixing=split(Math.floor(stock[t.id]*model.settings.mixingPermille/1000),edges.map(()=>1));
  for(const [i,e] of edges.entries()){const actualWind=Math.min(capacity[e.to],wind[i]),actualMix=Math.min(capacity[e.to]-actualWind,mixing[i]),amount=actualWind+actualMix;if(!amount)continue;
   capacity[e.to]-=amount;balances[t.id]-=amount;balances[e.to]+=amount;d.tiles[t.id].outgoing+=amount;d.tiles[e.to].incoming+=amount;d.transfers.push({from:t.id,to:e.to,wind:actualWind,mixing:actualMix,amount});d.transferred+=amount;
  }
 }
 for(const t of w.tiles){const b=d.tiles[t.id];b.removed=Math.floor(balances[t.id]*model.settings.removalPermille/1000);b.after=balances[t.id]-b.removed;t.air!.load=b.after;for(const key of ['before','emitted','rejectedEmission','removed','after'] as const)d[key]+=b[key];}
 model.lastDay=d;
}
export function airTotals(w:World){return {load:w.tiles.reduce((n,t)=>n+(t.air?.load??0),0),emissionPerDay:w.tiles.reduce((n,t)=>n+(t.air?.emissionPerDay??0),0)};}
export function previewAir(w:World,id:number){if(!w.tiles[id])throw Error('Unknown tile');if(!w.air?.enabled)throw Error('Enable the air model to preview transport');const next=structuredClone(w);next.tick++;advanceAir(next);const d=next.air!.lastDay!;return {worldId:w.id,sourceRevision:w.revision,tick:d.tick,tileId:id,budget:d.tiles[id],incoming:d.transfers.filter(e=>e.to===id),outgoing:d.transfers.filter(e=>e.from===id),totals:{before:d.before,emitted:d.emitted,rejectedEmission:d.rejectedEmission,removed:d.removed,after:d.after}};}
