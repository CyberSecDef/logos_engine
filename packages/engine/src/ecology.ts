import type {World,Operation} from '../../contracts/src/index.js';
import {fieldValue} from './extensions.js';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function validateEcology(w:World):void {
 const e=w.soilEcology;if(!e)return;const s=e.settings;
 if(!(s.farmerPopulationMax<s.cityPopulationStart&&s.cityPopulationStart<s.cityPopulationFull))throw Error('Soil population thresholds must increase: farmers < city start < full city');
 const field=w.definitions.fields.find(f=>f.id===e.fieldId);
 if(!field||field.quantity==='stock')throw Error('Soil ecology requires an existing index property');
 if(!e.enabled)return;
 if(w.definitions.rules.some(r=>r.enabled&&r.effects.some(x=>!x.entityTypeId&&x.fieldId===e.fieldId)))throw Error('Disable custom rules writing the soil property before enabling soil ecology; weather must not be counted twice');
 if(w.plugins.some(p=>p.definition.enabled&&p.definition.program.some(i=>i.op==='emit'&&!i.entityTypeId&&i.fieldId===e.fieldId)))throw Error('Disable plugins writing the soil property before enabling soil ecology');
}
export function applyEcology(w:World,op:Operation):void {
 if(op.kind!=='soil-ecology-configure')return;
 if(op.expectedVersion!==(w.soilEcology?.version??0))throw Error('Stale soil ecology version');
 w.soilEcology={model:'soil-ecology-v1',version:op.expectedVersion+1,enabled:op.enabled,fieldId:op.fieldId,settings:{...op.settings}};
}
// After hydrology, before harvesting. Never alter legacy worlds without activation.
export function advanceEcology(w:World):void {
 const e=w.soilEcology;if(!e?.enabled)return;const r=e.settings,field=w.definitions.fields.find(f=>f.id===e.fieldId)!;
 for(const tile of w.tiles){
  const initial=fieldValue(w,tile.id,field.id),before=100*clamp((initial-field.min)/(field.max-field.min));
  const land=tile.elevationM>0,flooded=tile.waterL/w.cells[tile.id].areaM2>100,temp=tile.temperatureC,rain=tile.rainMm,pop=tile.population;
  let weatherPoints=0,stewardshipPoints=0,urbanPoints=0,vegetationLoss=0;
  if(land){
   if(rain<1)weatherPoints-=r.droughtLoss;
   else if(rain>50)weatherPoints-=r.excessRainLoss;
   else if(temp>=0&&temp<=35&&!flooded)weatherPoints+=r.rainRecovery;
   if(temp>35)weatherPoints-=r.heatLoss;
   if(temp<0)weatherPoints-=r.coldLoss;
   if(flooded)weatherPoints-=r.floodLoss;
   const farmers=pop<=r.farmerPopulationMax?pop/r.farmerPopulationMax:clamp((r.cityPopulationStart-pop)/(r.cityPopulationStart-r.farmerPopulationMax));
   const growingWeather=clamp(temp<10?temp/10:temp<=30?1:(45-temp)/15)*clamp((rain+Math.min(20,tile.waterL/w.cells[tile.id].areaM2))/5);
   stewardshipPoints=flooded?0:r.farmerGain*farmers*growingWeather;
   const urban=clamp((pop-r.cityPopulationStart)/(r.cityPopulationFull-r.cityPopulationStart));
   urbanPoints=r.cityLoss*urban;
   const vegetation=tile.vegetation;
   tile.vegetation=Math.round(Math.max(0,vegetation-r.cityVegetationLoss*urban)*1e6)/1e6;
   vegetationLoss=Math.max(0,vegetation-tile.vegetation);
   const desired=clamp((before+weatherPoints+stewardshipPoints-urbanPoints)/100);
   tile.properties[field.id]=Math.max(field.min,Math.min(field.max,Math.round((field.min+desired*(field.max-field.min))*1000)/1000));
  }
  const after=100*clamp((fieldValue(w,tile.id,field.id)-field.min)/(field.max-field.min));
  tile.soilDay={tick:w.tick,before,after,weatherPoints,stewardshipPoints,urbanPoints,vegetationLoss,fertilityPermille:Math.floor(after*10+1e-9)};
 }
}
export function fertilityPermille(w:World,id:number):number {
 const e=w.soilEcology;if(!e?.enabled)return 1000;const f=w.definitions.fields.find(f=>f.id===e.fieldId)!;
 return Math.floor(1000*clamp((fieldValue(w,id,f.id)-f.min)/(f.max-f.min))+1e-9);
}
