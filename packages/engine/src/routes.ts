import {factionBorderOpen} from './factions.js';
import type {World,Operation} from '../../contracts/src/index.js';
import type {TransferRequest} from './resources.js';
export function validateRoutes(w:World):void {
 const data=w.resourceRoutes;if(!data)return;const ids=new Set<string>();
 for(const r of data.routes){
  if(ids.has(r.id))throw Error('Duplicate resource route');ids.add(r.id);
  const f=w.definitions.fields.find(f=>f.id===r.fieldId);
  if(!f||f.quantity!=='stock')throw Error('Resource routes require an existing stock property');
  if(!w.cells[r.tileId]?.neighbors.includes(r.toTileId))throw Error('Resource routes require adjacent distinct zones');
  if([r.amount,r.reserve,r.target].some(n=>Math.round(n*1000)/1000!==n))throw Error('Route quantities support at most three decimal places');
  if(r.reserve>f.max||r.target>f.max)throw Error('Route reserve/target exceed stock capacity');
 }
 if(data.lastDay){if(data.lastDay.tick>w.tick||data.lastDay.entries.length!==data.routes.length)throw Error('Invalid route report day or count');const seen=new Set<string>();
  for(const e of data.lastDay.entries){const route=data.routes.find(r=>r.id===e.routeId);if(!route||route.tileId!==e.from||route.toTileId!==e.to||route.fieldId!==e.fieldId||e.amountMilli>Math.round(route.amount*1000))throw Error('Invalid route report reference or capacity');if(seen.has(e.routeId)||!w.cells[e.from]?.neighbors.includes(e.to)||(e.status==='moved')!==(e.amountMilli>0))throw Error('Invalid route report');seen.add(e.routeId);}
 }
}
export function applyRoute(w:World,op:Operation):void {
 if(op.kind==='travel-permission'){w.tiles[op.tileId].travelAllowed=op.allowed;return;}
 if(op.kind!=='resource-route-define'&&op.kind!=='resource-route-remove')return;
 w.resourceRoutes??={model:'adjacent-resources-v1',routes:[]};const data=w.resourceRoutes;
 if(op.kind==='resource-route-define'){
  const r=op.route,old=data.routes.find(r=>r.id===op.route.id);
  if(r.tileId!==op.tileId||old&&old.tileId!==op.tileId)throw Error('Resource route origin cannot move');
  const version=w.history.flatMap(p=>p.operations).reduce((v,o)=>o.kind==='resource-route-define'&&o.route.id===r.id?Math.max(v,o.route.version):v,old?.version??0);
  if(r.version!==version+1)throw Error(`Resource route version must be ${version+1}`);
  data.routes=[...data.routes.filter(x=>x.id!==r.id),r].sort((a,b)=>a.id<b.id?-1:1);
 }else{const old=data.routes.find(r=>r.id===op.routeId);if(!old||old.tileId!==op.tileId)throw Error('Unknown route or mismatched origin');data.routes=data.routes.filter(r=>r.id!==op.routeId);}
 delete data.lastDay;
}
export function routeRequests(w:World):TransferRequest[] {
 const data=w.resourceRoutes;if(!data)return [];data.lastDay={tick:w.tick,entries:[]};const requests:TransferRequest[]=[];
 for(const r of data.routes){const from=w.tiles[r.tileId],to=w.tiles[r.toTileId],field=w.definitions.fields.find(f=>f.id===r.fieldId)!;
  const status=!r.enabled?'paused':w.tick%r.everyDays!==0?'not-due':from.travelAllowed===false||to.travelAllowed===false?'closed':!factionBorderOpen(w,r.tileId,r.toTileId,'travel')||!factionBorderOpen(w,r.tileId,r.toTileId,'trade')?'border-closed':from.elevationM<=0||to.elevationM<=0?'submerged':'limited';
  data.lastDay.entries.push({routeId:r.id,from:r.tileId,to:r.toTileId,fieldId:r.fieldId,label:r.label,unit:field.unit,amountMilli:0,status});
  if(status==='limited')requests.push({ruleId:r.id,routeId:r.id,effectIndex:0,from:r.tileId,destinations:[r.toTileId],fieldId:r.fieldId,amountMilli:Math.round(r.amount*1000),reserveMilli:Math.round(r.reserve*1000),targetMilli:Math.round(r.target*1000)});
 }
 return requests;
}
