import type { World } from '../../contracts/src/index.js';

// Gameplay climate, not a thermodynamic model. Unmodified worlds retain their
// previous seasonal climate. Only introduced heat/cold spreads between zones.
export function climateTemperatureC(world:World,id:number,tick=world.tick):number {
  const cell=world.cells[id],tile=world.tiles[id];
  const seasonal=Math.sin(tick/120*Math.PI*2)*(cell.center[1]>0?1:-1)*8;
  return Math.round(28-Math.abs(cell.center[1])*45-Math.max(tile.elevationM,0)*0.005+seasonal);
}
const rounded=(n:number)=>Math.round(n*1000)/1000;
export function advanceTemperature(world:World,next:World):void {
  const sources=new Map(next.rules.filter(r=>r.kind==='temperature').map(r=>[r.tileId,r.celsius]));
  const climate=next.tiles.map(t=>climateTemperatureC(next,t.id));
  const anomaly=world.tiles.map(t=>sources.has(t.id)?sources.get(t.id)!-climate[t.id]:(t.temperatureAnomalyC??0));
  const delta=anomaly.map(()=>0);
  // Pairwise exchange reads a single snapshot. Area weighting preserves the
  // integrated anomaly during exchange and bounds a zone's daily mixing to 20%.
  for(const cell of next.cells)for(const id of cell.neighbors) {
    if(id<=cell.id)continue;
    const other=next.cells[id];
    const exchange=(anomaly[cell.id]-anomaly[id])*0.2*
      Math.min(cell.areaM2,other.areaM2)/Math.max(cell.neighbors.length,other.neighbors.length);
    delta[cell.id]-=exchange/cell.areaM2;
    delta[id]+=exchange/other.areaM2;
  }
  for(const tile of next.tiles) {
    // Background climate dissipates 10% of remaining anomaly per day. Sources
    // replenish their own heat/cold after exchange and maintain the exact target.
    tile.temperatureAnomalyC=sources.has(tile.id)?rounded(sources.get(tile.id)!-climate[tile.id]):rounded((anomaly[tile.id]+delta[tile.id])*0.9);
    tile.temperatureC=sources.get(tile.id)??rounded(climate[tile.id]+tile.temperatureAnomalyC);
  }
}
