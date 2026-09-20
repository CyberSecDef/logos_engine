import type {World,Operation} from '../../contracts/src/index.js';
import {SETTLEMENT_LIMITS} from '../../contracts/src/settlement-defaults.js';
export function validateFoodTrade(w:World):void {
 const trade=w.foodTrade;if(!trade)return;
 if(trade.settings.targetDays>trade.settings.reserveDays)throw Error('Food trade target days cannot exceed protected reserve days');
 const d=trade.lastDay;if(!d)return;
 if(d.tick>w.tick||d.transferred>d.beforeFood||d.beforeFood!==d.afterFood||d.transferred!==d.transfers.reduce((n,t)=>n+t.rations,0))throw Error('Invalid food trade accounting');
 const exports=new Map<number,number>(),imports=new Map<number,number>();
 const edges=new Set<string>(),sources=new Set<number>(),destinations=new Set<number>();
 for(const t of d.transfers){const key=`${t.from}:${t.to}`;if(!w.cells[t.from]?.neighbors.includes(t.to)||edges.has(key))throw Error('Invalid food trade edge');edges.add(key);sources.add(t.from);destinations.add(t.to);exports.set(t.from,(exports.get(t.from)??0)+t.rations);imports.set(t.to,(imports.get(t.to)??0)+t.rations);if(t.rations>trade.settings.edgePerDay)throw Error('Food trade edge limit exceeded');}
 if([...exports.values()].some(n=>n>trade.settings.exportPerDay)||[...imports.values()].some(n=>n>trade.settings.importPerDay))throw Error('Food trade zone limit exceeded');
 if([...sources].some(id=>destinations.has(id)))throw Error('Food cannot be received and forwarded on the same day');
}
export function applyFoodTrade(w:World,op:Operation):void {
 if(op.kind==='food-trade-configure'){
  if(op.expectedVersion!==(w.foodTrade?.version??0))throw Error('Stale food trade version');
  w.foodTrade={model:'adjacent-food-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings}};
 }
 if(op.kind==='food-trade-permission')w.tiles[op.tileId].foodTradeAllowed=op.allowed;
}
// Start-of-day reserves only: weather/soil are finished, today's harvest has not begun.
export function advanceFoodTrade(w:World):void {
 const trade=w.foodTrade;if(!trade?.enabled)return;const r=trade.settings;
 const stocks=w.tiles.map(t=>t.settlement?.foodRations??0),balances=[...stocks];
 const eligible=w.tiles.map(t=>!!t.settlement&&t.population>0&&t.elevationM>0&&t.foodTradeAllowed!==false);
 const supply=w.tiles.map((t,i)=>eligible[i]?Math.min(r.exportPerDay,Math.max(0,stocks[i]-t.population*(r.reserveDays+1))):0);
 const demand=w.tiles.map((t,i)=>eligible[i]?Math.min(r.importPerDay,Math.max(0,t.population*(r.targetDays+1)-stocks[i]),SETTLEMENT_LIMITS.food-stocks[i]):0);
 const transfers:{from:number;to:number;rations:number}[]=[];
 // Stable donor ID then recipient ID priority. Reserve original supplies/demands;
 // no cascading of deliveries or reuse of a freed slot during this phase.
 for(const tile of w.tiles){const from=tile.id;if(!supply[from])continue;
  for(const to of [...w.cells[from].neighbors].sort((a,b)=>a-b)){
   const amount=Math.min(supply[from],demand[to],r.edgePerDay);if(amount<=0)continue;
   supply[from]-=amount;demand[to]-=amount;balances[from]-=amount;balances[to]+=amount;
   transfers.push({from,to,rations:amount});
  }
 }
 for(const tile of w.tiles)if(tile.settlement)tile.settlement.foodRations=balances[tile.id];
 const beforeFood=stocks.reduce((a,b)=>a+b,0),afterFood=balances.reduce((a,b)=>a+b,0);
 if(beforeFood!==afterFood)throw Error('Food trade conservation failed');
 trade.lastDay={tick:w.tick,beforeFood,afterFood,transferred:transfers.reduce((sum,t)=>sum+t.rations,0),transfers};
}
