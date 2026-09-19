import { ProposalSchema, WorldSchema, type World, type Proposal, type WorldEvent } from '../../contracts/src/index.js';
import { random } from '../../worldgen/src/index.js';
import {validatePlugins,applyPlugin,advancePlugins} from './plugins.js';
import { advanceTemperature, climateTemperatureC } from './temperature.js';
import { validateExtensions, applyExtension, advanceExtensions } from './extensions.js';

export function validateWorld(input:unknown):World {
  const w=WorldSchema.parse(input);
  if(w.cells.length!==10*w.frequency*w.frequency+2 || w.tiles.length!==w.cells.length) throw Error('Topology size mismatch');
  for(const [i,c] of w.cells.entries()) {
    if(c.id!==i || w.tiles[i].id!==i || c.corners.length!==c.neighbors.length || new Set(c.neighbors).size!==c.neighbors.length) throw Error('Invalid tile identity');
    for(const n of c.neighbors) if(n===i || !w.cells[n]?.neighbors.includes(i)) throw Error('Invalid adjacency');
  }
  if(w.cells.filter(c=>c.corners.length===5).length!==12) throw Error('Expected twelve pentagons');
  const ids=new Set<string>();
  for(const r of w.rules) {
    if(!w.tiles[r.tileId] || ids.has(r.id) || r.id!==`${r.kind==='rainfall'?'rain':'temperature'}-${r.tileId}`) throw Error('Invalid rule reference');
    ids.add(r.id);
  }
  const commands=new Set<string>();
  for(const p of w.history) {
    if(p.worldId!==w.id || commands.has(p.id) || p.operations.some(o=>!w.tiles[o.tileId]||(o.kind==='field-transfer'&&!w.tiles[o.toTileId]))) throw Error('Invalid command history');
    commands.add(p.id);
  }
  validateExtensions(w);validatePlugins(w);
  return w;
}
function event(w:World,e:WorldEvent) { w.events.push(e); if(w.events.length>200) w.events.shift(); }
export function applyProposal(world:World,input:unknown):World {
  const p=ProposalSchema.parse(input);
  if(p.worldId!==world.id) throw Error('Proposal belongs to another world');
  if(world.history.some(h=>h.id===p.id)) throw Error('Proposal has already been applied');
  if(p.expectedRevision!==world.revision) throw Error('Stale proposal: refresh and review again');
  const next=structuredClone(world);
  for(const op of p.operations) {
    const tile=next.tiles[op.tileId];
    if(!tile) throw Error('Unknown tile');
    applyExtension(next,op);applyPlugin(next,op);
    if(op.kind==='elevation') tile.elevationM+=op.deltaM;
    if(op.kind==='communication') tile.communication=op.enabled;
    if(op.kind==='rainfall') {
      next.rules=next.rules.filter(r=>r.tileId!==op.tileId||r.kind!=='rainfall');
      next.rules.push({id:`rain-${op.tileId}`,kind:'rainfall',tileId:op.tileId,mmPerDay:op.mmPerDay});
    }
    if(op.kind==='temperature'||op.kind==='temperature-reset') {
      next.rules=next.rules.filter(r=>r.tileId!==op.tileId||r.kind!=='temperature');
      if(op.kind==='temperature') {
        tile.temperatureC=op.celsius;
        tile.temperatureAnomalyC=op.celsius-climateTemperatureC(next,op.tileId);
        if(op.mode==='sustained')next.rules.push({id:`temperature-${op.tileId}`,kind:'temperature',tileId:op.tileId,celsius:op.celsius});
      }
    }
    event(next,{tick:next.tick,kind:'intervention',tileId:op.tileId,message:p.summary});
    if(op.kind==='field-transfer')event(next,{tick:next.tick,kind:'intervention',tileId:op.toTileId,message:p.summary});
  }
  // A combined terrain/temperature proposal is independent of operation order:
  // requested absolute temperature is anchored to the final elevation.
  for(const op of p.operations)if(op.kind==='temperature')next.tiles[op.tileId].temperatureAnomalyC=next.tiles[op.tileId].temperatureC-climateTemperatureC(next,op.tileId);
  next.rules.sort((a,b)=>a.tileId-b.tileId||(a.kind<b.kind?-1:a.kind>b.kind?1:0));
  next.history.push(p); next.revision++;
  return validateWorld(next);
}
export function depthMm(w:World,id:number):number { return w.tiles[id].waterL/w.cells[id].areaM2; }
export function advance(world:World):World {
  const next=structuredClone(world); next.tick++; next.revision++;
  const rainRules=new Map(next.rules.filter(r=>r.kind==='rainfall').map(r=>[r.tileId,r.mmPerDay]));
  advanceTemperature(world,next);
  // 1 L per square metre = 1 mm. Integer volumes account for unequal tile areas.
  for(const tile of next.tiles) {
    const cell=next.cells[tile.id];
    tile.rainMm=rainRules.get(tile.id) ?? Math.floor(random(next.seed,'rain',next.tick,tile.id)*9);
    const rain=tile.rainMm*cell.areaM2;
    tile.waterL+=rain; next.accounting.rainL+=rain;
    const evaporation=Math.min(tile.waterL,cell.areaM2*Math.max(0,Math.floor(tile.temperatureC/12)));
    tile.waterL-=evaporation; next.accounting.evaporationL+=evaporation;
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
    }
    if(total>0 && rainRules.has(tile.id)) event(next,{tick:next.tick,kind:'flow',tileId:tile.id,amount:total,message:`Runoff reached ${destinations.length} lower neighbors.`});
  }
  for(const tile of next.tiles) {
    tile.waterL+=waterDelta[tile.id]; tile.sedimentKg+=sedimentDelta[tile.id];
    if(tile.elevationM<=0) {next.accounting.oceanDrainL+=tile.waterL; tile.waterL=0;}
    const flooded=depthMm(next,tile.id)>100;
    if(flooded && depthMm(world,tile.id)<=100) event(next,{tick:next.tick,kind:'flood',tileId:tile.id,message:'Standing water exceeded 100 mm.'});
    if(tile.elevationM>0) tile.vegetation=Math.max(0,Math.min(1,Math.round((tile.vegetation+(flooded ? -0.005 : tile.temperatureC>45 ? -0.005 : tile.rainMm>2 && tile.temperatureC>0 ? 0.001:-0.001))*1000)/1000));
    else tile.vegetation=0;
  }
  advanceExtensions(next,advancePlugins(next));
  return validateWorld(next);
}
export function preview(world:World,p:Proposal,ticks=5):World {
  if(!Number.isInteger(ticks)||ticks<0||ticks>30) throw Error('Preview must be 0–30 ticks');
  let copy=applyProposal(world,p); for(let i=0;i<ticks;i++) copy=advance(copy); return copy;
}
