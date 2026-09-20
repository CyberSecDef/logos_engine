import type {World,WorldEvent} from '../../contracts/src/index.js';
import type {WaterTransportReport} from '../../contracts/src/transport.js';
import {random} from '../../worldgen/src/index.js';
const depthMm=(world:World,id:number)=>world.tiles[id].waterL/world.cells[id].areaM2;

// Mutates only the step's private candidate. All transfer amounts read the same
// post-rain/evaporation snapshot; reports observe that exact calculation.
export function advanceHydrology(world:World,next:World,event:(world:World,event:WorldEvent)=>void,report?:WaterTransportReport):void {
  const rainRules=new Map(next.rules.filter(r=>r.kind==='rainfall').map(r=>[r.tileId,r.mmPerDay]));
  // 1 L per square metre = 1 mm. Integer volumes account for unequal tile areas.
  for(const tile of next.tiles) {
    const cell=next.cells[tile.id];
    tile.rainMm=rainRules.get(tile.id) ?? Math.floor(random(next.seed,'rain',next.tick,tile.id)*9);
    const rain=tile.rainMm*cell.areaM2;
    tile.waterL+=rain; next.accounting.rainL+=rain;
    if(report)report.tiles[tile.id].rainL=rain;
    const evaporation=Math.min(tile.waterL,cell.areaM2*Math.max(0,Math.floor(tile.temperatureC/12)));
    tile.waterL-=evaporation; next.accounting.evaporationL+=evaporation;
    if(report){report.tiles[tile.id].evaporationL=evaporation;report.tiles[tile.id].mixingWaterL=tile.waterL;}
  }
  // Simultaneous one-hop flow reads the phase snapshot and cannot overspend water.
  const waterDelta=next.tiles.map(()=>0), sedimentDelta=next.tiles.map(()=>0);
  for(const tile of next.tiles) {
    if(tile.elevationM<=0) continue;
    const cell=next.cells[tile.id];
    const available=Math.max(0,tile.waterL-cell.areaM2*20);
    const destinations=cell.neighbors.filter(id=>next.tiles[id].elevationM<tile.elevationM);
    if(!destinations.length || !available) continue;
    const weights=destinations.map(id=>tile.elevationM-next.tiles[id].elevationM);
    const weight=weights.reduce((a,b)=>a+b,0);
    const budget=Math.floor(available/2);
    let total=0;
    for(const [i,id] of destinations.entries()) {
      const volume=Math.floor(budget*(weights[i]/weight));
      const sediment=Math.floor(tile.sedimentKg*(volume/Math.max(1,tile.waterL)));
      waterDelta[tile.id]-=volume; waterDelta[id]+=volume;
      sedimentDelta[tile.id]-=sediment; sedimentDelta[id]+=sediment;
      total+=volume;
      if(report&&volume>0){
        report.transfers.push({fromTileId:tile.id,toTileId:id,waterL:volume,sedimentKg:sediment});
        report.tiles[tile.id].outgoingWaterL+=volume;report.tiles[id].incomingWaterL+=volume;
        report.tiles[tile.id].outgoingSedimentKg+=sediment;report.tiles[id].incomingSedimentKg+=sediment;
      }
    }
    if(total>0 && rainRules.has(tile.id)) event(next,{tick:next.tick,kind:'flow',tileId:tile.id,amount:total,message:`Runoff reached ${destinations.length} lower neighbors.`});
  }
  for(const tile of next.tiles) {
    tile.waterL+=waterDelta[tile.id]; tile.sedimentKg+=sedimentDelta[tile.id];
    if(tile.elevationM<=0) {if(report)report.tiles[tile.id].oceanDrainL=tile.waterL;next.accounting.oceanDrainL+=tile.waterL; tile.waterL=0;}
    const flooded=depthMm(next,tile.id)>100;
    if(flooded && depthMm(world,tile.id)<=100) event(next,{tick:next.tick,kind:'flood',tileId:tile.id,message:'Standing water exceeded 100 mm.'});
    if(tile.elevationM>0) tile.vegetation=Math.max(0,Math.min(1,Math.round((tile.vegetation+(flooded ? -0.005 : tile.temperatureC>45 ? -0.005 : tile.rainMm>2 && tile.temperatureC>0 ? 0.001:-0.001))*1000)/1000));
    else tile.vegetation=0;
    if(report){report.tiles[tile.id].afterWaterL=tile.waterL;report.tiles[tile.id].afterSedimentKg=tile.sedimentKg;}
  }
}
