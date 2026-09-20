import {routeRequests} from './routes.js';
import type { World } from '../../contracts/src/index.js';
import type { FieldDefinition } from '../../contracts/src/extensions.js';

export type TransferRequest={ruleId:string;effectIndex:number;from:number;destinations:number[];fieldId:string;amountMilli:number;routeId?:string;reserveMilli?:number;targetMilli?:number};
export function stockUnits(world:World,tileId:number,field:FieldDefinition):number {
 const properties=world.tiles[tileId].properties;
 return Math.round((Object.hasOwn(properties,field.id)?properties[field.id]:field.defaultValue)*1000);
}
export function resourceTotals(world:World) {
 return world.definitions.fields.filter(f=>f.quantity==='stock').map(f=>({fieldId:f.id,label:f.label,unit:f.unit,totalMilli:world.tiles.reduce((sum,t)=>sum+stockUnits(world,t.id,f),0)+(world.journeys?.active.reduce((sum,j)=>sum+j.cargo.filter(c=>c.fieldId===f.id).reduce((n,c)=>n+Math.round(c.amount*1000),0),0)??0)}));
}
export function transferOnce(world:World,from:number,to:number,fieldId:string,amount:number):void {
 const field=world.definitions.fields.find(f=>f.id===fieldId);
 if(!field||field.quantity!=='stock')throw Error('Transfers require an explicit stock property');
 if(!world.cells[from].neighbors.includes(to))throw Error('Transfers require distinct adjacent zones');
 const units=Math.round(amount*1000);
 if(units/1000!==amount)throw Error('Transfers support at most three decimal places');
 const source=stockUnits(world,from,field),destination=stockUnits(world,to,field);
 if(units>source)throw Error('Insufficient source stock for this exact transfer');
 if(units>Math.round(field.max*1000)-destination)throw Error('Destination lacks capacity for this exact transfer');
 world.tiles[from].properties[fieldId]=(source-units)/1000;
 world.tiles[to].properties[fieldId]=(destination+units)/1000;
}
export function settleTransfers(world:World,requests:TransferRequest[],before:Map<string,number[]>):void {
 requests.push(...routeRequests(world));
 const stocks=world.definitions.fields.filter(f=>f.quantity==='stock');
 const balances=new Map(stocks.map(f=>[f.id,world.tiles.map(t=>stockUnits(world,t.id,f))]));
 const outgoing=new Map(stocks.map(f=>[f.id,[...balances.get(f.id)!]]));
 const space=new Map(stocks.map(f=>[f.id,balances.get(f.id)!.map(value=>Math.round(f.max*1000)-value)]));
 const entries=stocks.map(f=>{
  const initial=before.get(f.id)!,current=balances.get(f.id)!;
  return {fieldId:f.id,label:f.label,unit:f.unit,beforeMilli:initial.reduce((a,b)=>a+b,0),
   createdMilli:current.reduce((sum,v,i)=>sum+Math.max(0,v-initial[i]),0),
   removedMilli:current.reduce((sum,v,i)=>sum+Math.max(0,initial[i]-v),0),transferredMilli:0,afterMilli:0};
 });
 // Fixed rule/effect/source/destination priority resolves competition. Reservations
 // read post-production stocks/capacities; incoming stock cannot travel twice.
 requests.sort((a,b)=>Number(!!a.routeId)-Number(!!b.routeId)||(a.ruleId<b.ruleId?-1:a.ruleId>b.ruleId?1:0)||a.effectIndex-b.effectIndex||a.from-b.from);
 for(const request of requests) {
  const available=outgoing.get(request.fieldId)!,headroom=space.get(request.fieldId)!,balance=balances.get(request.fieldId)!;
  const budget=Math.min(request.amountMilli,Math.max(0,available[request.from]-(request.reserveMilli??0))),count=request.destinations.length;
  const share=Math.floor(budget/count),remainder=budget%count;
  for(const [i,to] of request.destinations.entries()) {
   const field=stocks.find(f=>f.id===request.fieldId)!;
   const targetRoom=request.targetMilli===undefined?headroom[to]:Math.max(0,request.targetMilli-(Math.round(field.max*1000)-headroom[to]));
   const amount=Math.min(share+(i<remainder?1:0),headroom[to],targetRoom);
   available[request.from]-=amount;headroom[to]-=amount;
   balance[request.from]-=amount;balance[to]+=amount;
   entries.find(e=>e.fieldId===request.fieldId)!.transferredMilli+=amount;
   if(request.routeId&&amount>0){const entry=world.resourceRoutes!.lastDay!.entries.find(e=>e.routeId===request.routeId)!;entry.amountMilli+=amount;entry.status='moved';}
  }
 }
 for(const field of stocks) {
  const values=balances.get(field.id)!;
  for(const tile of world.tiles)if(stockUnits(world,tile.id,field)!==values[tile.id])tile.properties[field.id]=values[tile.id]/1000;
  const entry=entries.find(e=>e.fieldId===field.id)!;entry.afterMilli=values.reduce((sum,v)=>sum+v,0);
  if(entry.afterMilli-entry.beforeMilli!==entry.createdMilli-entry.removedMilli)throw Error('Resource conservation failed');
 }
 world.resourceLedger={tick:world.tick,revision:world.revision,entries};
}
