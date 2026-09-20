import {validateAir,applyAir,advanceAir} from './air.js';
import {validateMigration,applyMigration,advanceMigration} from './migration.js';
import {validateNeighborVisits,applyNeighborVisits,advanceNeighborVisits} from './neighbor-visits.js';
import {validateJourneys,applyJourney,advanceJourneys} from './journeys.js';
import {validateRoutes,applyRoute} from './routes.js';
import {validateFoodTrade,applyFoodTrade,advanceFoodTrade} from './food-trade.js';
import {validateEcology,applyEcology,advanceEcology} from './ecology.js';
import {validateSettlements,applySettlement,advanceSettlements} from './settlements.js';
import {validateEntities,validateEntityMigrations,applyEntity,invalidateEntityReads} from './entities.js';
import { ProposalSchema, WorldSchema, type World, type Proposal, type WorldEvent } from '../../contracts/src/index.js';
import {advanceHydrology} from './hydrology.js';
import type {WaterTransportReport,WaterPreview} from '../../contracts/src/transport.js';
import {validatePlugins,validateStateMappings,applyPlugin,advancePlugins} from './plugins.js';
import { advanceTemperature, climateTemperatureC } from './temperature.js';
import { validateExtensions, validateConversions, applyExtension, advanceExtensions } from './extensions.js';

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
  if(w.artwork&&new Set(w.artwork.images.map(i=>i.slot)).size!==w.artwork.images.length)throw Error('Duplicate artwork slot');
  validateAir(w);validateMigration(w);validateNeighborVisits(w);validateJourneys(w);validateRoutes(w);validateFoodTrade(w);validateEcology(w);validateSettlements(w);validateEntities(w);validateExtensions(w);validatePlugins(w);
  return w;
}
function event(w:World,e:WorldEvent) { w.events.push(e); if(w.events.length>200) w.events.shift(); }
export function applyProposal(world:World,input:unknown):World {
  const p=ProposalSchema.parse(input);
  if(p.worldId!==world.id) throw Error('Proposal belongs to another world');
  if(world.history.some(h=>h.id===p.id)) throw Error('Proposal has already been applied');
  if(p.expectedRevision!==world.revision) throw Error('Stale proposal: refresh and review again');
  const departureIds=p.operations.flatMap(op=>op.kind==='journey-depart'?[op.journeyId]:[]);if(new Set(departureIds).size!==departureIds.length)throw Error('Journey IDs cannot be reused within a proposal');
  validateEntityMigrations(world,p.operations);validateConversions(world,p.operations);validateStateMappings(world,p.operations);
  const next=structuredClone(world);
  for(const op of p.operations) {
    const tile=next.tiles[op.tileId];
    if(!tile) throw Error('Unknown tile');
    if(op.kind==='artwork-activate'){
      const packs=[...(next.artwork?[next.artwork]:[]),...next.history.flatMap(p=>p.operations.flatMap(o=>o.kind==='artwork-activate'?[o.pack]:[]))];
      if(packs.some(pack=>pack.id===op.pack.id&&pack.version===op.pack.version&&JSON.stringify(pack)!==JSON.stringify(op.pack)))throw Error('Artwork pack version is immutable; use a new version');
      next.artwork=op.pack;
    }
    if(op.kind==='artwork-reset')delete next.artwork;
    applyAir(next,op);applyMigration(next,op);applyNeighborVisits(next,op);applyJourney(next,op);applyRoute(next,op);applyFoodTrade(next,op);applyEcology(next,op);applySettlement(next,op);applyEntity(next,op);invalidateEntityReads(next);applyExtension(next,op);applyPlugin(next,op);
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
function advanceDay(world:World,report?:WaterTransportReport):World {
  const next=structuredClone(world); next.tick++; next.revision++;
  advanceTemperature(world,next);
  advanceHydrology(world,next,event,report);
  advanceAir(next);
  advanceJourneys(next);
  advanceEcology(next);
  advanceFoodTrade(next);
  advanceNeighborVisits(next);
  advanceSettlements(next);
  advanceMigration(next);
  advanceExtensions(next,advancePlugins(next));
  return validateWorld(next);
}
export function advance(world:World):World {return advanceDay(world);}
export function advanceWithWaterReport(world:World):{world:World;report:WaterTransportReport} {
 const report:WaterTransportReport={worldId:world.id,sourceRevision:world.revision,sourceTick:world.tick,tick:world.tick+1,
  tiles:world.tiles.map(tile=>({tileId:tile.id,beforeWaterL:tile.waterL,rainL:0,evaporationL:0,mixingWaterL:0,incomingWaterL:0,outgoingWaterL:0,oceanDrainL:0,afterWaterL:0,beforeSedimentKg:tile.sedimentKg,incomingSedimentKg:0,outgoingSedimentKg:0,afterSedimentKg:0})),transfers:[]};
 return {world:advanceDay(world,report),report};
}
export function previewWater(world:World,tileId:number):WaterPreview {
 if(!Number.isInteger(tileId)||!world.tiles[tileId])throw Error('Unknown tile');
 const {report}=advanceWithWaterReport(world);
 return {worldId:report.worldId,sourceRevision:report.sourceRevision,sourceTick:report.sourceTick,tick:report.tick,
  tileId,areaM2:world.cells[tileId].areaM2,budget:report.tiles[tileId],
  incoming:report.transfers.filter(t=>t.toTileId===tileId),outgoing:report.transfers.filter(t=>t.fromTileId===tileId)};
}
export function preview(world:World,p:Proposal,ticks=5):World {
  if(!Number.isInteger(ticks)||ticks<0||ticks>30) throw Error('Preview must be 0–30 ticks');
  let copy=applyProposal(world,p); for(let i=0;i<ticks;i++) copy=advance(copy); return copy;
}
