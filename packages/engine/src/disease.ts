import {waterFarmingPermille} from './water-quality.js';
import type {World,Operation} from '../../contracts/src/index.js';import type {Health} from '../../contracts/src/disease.js';
export const healthyState=():Health=>({ill:0,immune:0});
export function validHealth(population:number,h:Health|undefined):boolean{return !!h&&h.ill+h.immune<=population;}
// Exact proportional partition with largest remainders. Ties: susceptible, ill,
// immune. Used for real movement and losses, never independent percentage copies.
export function takeHealth(h:Health,population:number,count:number):Health {
 if(count<0||count>population||!validHealth(population,h))throw Error('Invalid health partition');if(!count)return healthyState();
 const groups=[population-h.ill-h.immune,h.ill,h.immune],den=BigInt(population),products=groups.map(n=>BigInt(n)*BigInt(count)),parts=products.map(n=>Number(n/den));let remaining=count-parts.reduce((a,b)=>a+b,0);
 const order=products.map((n,i)=>({i,remainder:n%den})).sort((a,b)=>a.remainder===b.remainder?a.i-b.i:a.remainder>b.remainder?-1:1);for(const {i} of order){if(!remaining)break;parts[i]++;remaining--;}
 h.ill-=parts[1];h.immune-=parts[2];return {ill:parts[1],immune:parts[2]};
}
export function validateDisease(w:World):void {
 const states=[...w.tiles,...(w.journeys?.active??[])];if(!w.disease){if(states.some(t=>t.health))throw Error('Health state requires the disease model');return;}
 if(states.some(t=>!validHealth(t.population,t.health)))throw Error('Health compartments exceed population or are missing');
 if(w.disease.lastDay&&w.disease.lastDay.tick>w.tick)throw Error('Health report is from the future');
 const report=w.disease.lastDay;
 if(report&&(report.contactCases!==undefined)!==(report.contactEntries!==undefined))throw Error('Incomplete contact report');
 if(report?.contactEntries){
  if(!w.disease.contact||report.contactCases!==report.contactEntries.reduce((n,e)=>n+e.cases,0))throw Error('Contact report does not balance');
  for(const e of report.contactEntries){
   const invalidLocation=e.group==='transit'
    ? !e.journeyId||e.homeTileId!==undefined||e.atTileId!==undefined
    : e.journeyId!==undefined||e.homeTileId===undefined||e.atTileId===undefined||!w.tiles[e.homeTileId]||!w.tiles[e.atTileId];
   if(invalidLocation||e.cases>e.susceptible||e.susceptible>e.population||e.population>e.presentPopulation||e.exposedToIll>e.presentPopulation)throw Error('Invalid contact report');
  }
 }
 for(const e of w.neighborVisits?.lastDay?.entries??[])if(e.health&&!validHealth(e.visitors,e.health))throw Error('Invalid visit health accounting');
}
export function applyDisease(w:World,op:Operation):void {
 if(op.kind==='disease-contact-configure'){
  if(!w.disease)throw Error('Activate health tracking first');
  if(op.expectedVersion!==w.disease.version)throw Error('Stale disease version');
  w.disease.contact={model:'daily-contact-v1',enabled:op.enabled,ratePermille:op.ratePermille};w.disease.version++;delete w.disease.lastDay;return;
 }
 if(op.kind==='disease-configure'){
  if(op.expectedVersion!==(w.disease?.version??0))throw Error('Stale disease version');
  if(!w.disease)for(const t of [...w.tiles,...(w.journeys?.active??[])])t.health=healthyState();
  w.disease={model:'health-state-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings},...(w.disease?.contact?{contact:{...w.disease.contact}}:{})};return;
 }
 if(op.kind!=='disease-introduce'&&op.kind!=='disease-treat')return;if(!w.disease)throw Error('Activate health tracking first');const t=w.tiles[op.tileId],h=t.health!;
 if(op.kind==='disease-introduce'){if(op.count>t.population-h.ill-h.immune)throw Error('Not enough susceptible inhabitants');h.ill+=op.count;}
 else{if(op.count>h.ill)throw Error('Not enough ill inhabitants');h.ill-=op.count;h.immune+=op.count;}
 delete w.disease.lastDay;
}
export function advanceDisease(w:World):void {
 const d=w.disease;if(!d?.enabled)return;const daily=(n:number,r:number)=>r&&n?Math.min(n,Math.max(1,Math.floor(n*r/1000))):0;let recovered=0,immunityLost=0,waterCases=0;
 // Progress once, before journey arrivals. Newly recovered do not lose immunity
 // until a later day. People arriving today do not progress a second time.
 for(const t of [...w.tiles,...(w.journeys?.active??[])]){const h=t.health!,susceptible=t.population-h.ill-h.immune,exposure=typeof t.id==='number'?Math.floor(susceptible*d.settings.waterExposurePermille*(1000-waterFarmingPermille(w,t.id))/1_000_000):0,recover=daily(h.ill,d.settings.recoveryPermille),wane=daily(h.immune,d.settings.immunityLossPermille);h.ill+=exposure-recover;h.immune+=recover-wane;waterCases+=exposure;recovered+=recover;immunityLost+=wane;}
 d.lastDay={tick:w.tick,waterCases,recovered,immunityLost};
}
export function attachVisitHealth(w:World):void {
 if(!w.disease)return;const day=w.neighborVisits?.lastDay;if(day?.tick!==w.tick)return;
 const pools=w.tiles.map(t=>({population:t.population,health:{...t.health!}}));
 for(const e of day.entries){const p=pools[e.from];e.health=takeHealth(p.health,p.population,e.visitors);p.population-=e.visitors;}
}
export function illnessLabor(w:World):Map<number,number> {
 const result=new Map<number,number>();if(!w.disease?.enabled)return result;for(const t of w.tiles)result.set(t.id,t.health!.ill);
 if(w.neighborVisits?.enabled&&w.neighborVisits.lastDay?.tick===w.tick)for(const e of w.neighborVisits.lastDay.entries){result.set(e.from,result.get(e.from)!-(e.health?.ill??0));if(e.purpose==='work')result.set(e.to,result.get(e.to)!+(e.health?.ill??0));}
 return result;
}
export function healthTotals(w:World){let population=0,ill=0,immune=0;for(const t of [...w.tiles,...(w.journeys?.active??[])]){population+=t.population;ill+=t.health?.ill??0;immune+=t.health?.immune??0;}return {population,susceptible:population-ill-immune,ill,immune};}

// One frozen presence snapshot; people spend this contact phase either at home,
// at one visit destination, or inside their transit party. No same-day cascade.
export function advanceContacts(w:World):void {
 const d=w.disease,c=d?.contact;if(!d?.enabled||!c?.enabled)return;
 const pools=w.tiles.map(t=>({population:t.population,health:{...t.health!}}));
 const visits=w.neighborVisits?.enabled&&w.neighborVisits.lastDay?.tick===w.tick?w.neighborVisits.lastDay.entries:[];
 for(const e of visits){const p=pools[e.from];p.population-=e.visitors;p.health.ill-=e.health!.ill;p.health.immune-=e.health!.immune;}
 const presence=pools.map(p=>({population:p.population,ill:p.health.ill}));
 for(const e of visits){presence[e.to].population+=e.visitors;presence[e.to].ill+=e.health!.ill;}
 const entries:NonNullable<NonNullable<World['disease']>['lastDay']>['contactEntries']=[];
 const cases=(susceptible:number,ill:number,population:number)=>population?Number(BigInt(susceptible)*BigInt(c.ratePermille)*BigInt(ill)/(1000n*BigInt(population))):0;
 for(const t of w.tiles){const p=pools[t.id],at=presence[t.id],susceptible=p.population-p.health.ill-p.health.immune,n=cases(susceptible,at.ill,at.population);t.health!.ill+=n;if(n)entries.push({group:'resident',homeTileId:t.id,atTileId:t.id,population:p.population,susceptible,exposedToIll:at.ill,presentPopulation:at.population,cases:n});}
 for(const e of visits){const at=presence[e.to],susceptible=e.visitors-e.health!.ill-e.health!.immune,n=cases(susceptible,at.ill,at.population);w.tiles[e.from].health!.ill+=n;e.health!.ill+=n;if(n)entries.push({group:'visitor',homeTileId:e.from,atTileId:e.to,population:e.visitors,susceptible,exposedToIll:at.ill,presentPopulation:at.population,cases:n});}
 for(const j of w.journeys?.active??[]){const h=j.health!,susceptible=j.population-h.ill-h.immune,ill=h.ill,n=cases(susceptible,ill,j.population);h.ill+=n;if(n)entries.push({group:'transit',journeyId:j.id,population:j.population,susceptible,exposedToIll:ill,presentPopulation:j.population,cases:n});}
 d.lastDay={...(d.lastDay??{tick:w.tick,waterCases:0,recovered:0,immunityLost:0}),contactCases:entries.reduce((n,e)=>n+e.cases,0),contactEntries:entries};
}
