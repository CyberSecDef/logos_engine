import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorld } from '../packages/worldgen/src/index.js';
import { advance, applyProposal, validateWorld } from '../packages/engine/src/index.js';
import { climateTemperatureC } from '../packages/engine/src/temperature.js';
import type { World, Operation } from '../packages/contracts/src/index.js';
import { WorldStore, stateHash } from '../apps/server/src/store.js';
import { PromptService, forecast } from '../apps/server/src/prompts.js';

const make=()=>createWorld({id:'thermal',name:'Thermal',seed:'asteroid',frequency:3});
const change=(w:World,operations:Operation[])=>({id:`edit-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:'Temperature intervention',operations});
const weightedAnomaly=(w:World)=>w.tiles.reduce((sum,t)=>sum+(t.temperatureAnomalyC??0)*w.cells[t.id].areaM2,0);

test('heat and cold pulses spread one hop simultaneously, dissipate, and ignore communication',()=>{
 for(const celsius of [-80,160]) {
  const world=make(),source=0,neighbors=world.cells[source].neighbors;
  const modified=applyProposal(world,change(world,[{kind:'temperature',tileId:source,celsius,mode:'pulse'},{kind:'communication',tileId:source,enabled:false}]));
  const sign=Math.sign(celsius-climateTemperatureC(world,source));
  const next=advance(modified);
  assert.equal(modified.tiles[source].temperatureC,celsius);
  for(const id of neighbors)assert.ok(sign*next.tiles[id].temperatureAnomalyC!>0);
  for(const tile of next.tiles)if(tile.id!==source&&!neighbors.includes(tile.id))assert.equal(tile.temperatureAnomalyC,0);
  assert.ok(Math.abs(next.tiles[source].temperatureAnomalyC!)<Math.abs(modified.tiles[source].temperatureAnomalyC!));
  // Exchange conserves area-weighted anomaly; damping removes 10%, modulo millidegree rounding.
  const roundingBound=world.cells.reduce((sum,c)=>sum+c.areaM2,0)*0.00051;
  assert.ok(Math.abs(weightedAnomaly(next)-weightedAnomaly(modified)*0.9)<roundingBound);
  const reordered=structuredClone(modified);for(const cell of reordered.cells)cell.neighbors.reverse();
  assert.deepEqual(advance(reordered).tiles,next.tiles);
  let cooled=modified,replay=structuredClone(modified);
  for(let day=0;day<120;day++){cooled=advance(cooled);replay=advance(replay);}
  assert.equal(stateHash(cooled),stateHash(replay));
  assert.ok(Math.max(...cooled.tiles.map(t=>Math.abs(t.temperatureAnomalyC!)))<0.01);
 }
});

test('sustained sources coexist with rainfall, keep targets, and can be stopped or replaced by a pulse',()=>{
 const w=make();let current=applyProposal(w,change(w,[{kind:'rainfall',tileId:0,mmPerDay:80},{kind:'temperature',tileId:0,celsius:100,mode:'sustained'}]));
 current=applyProposal(current,change(current,[{kind:'rainfall',tileId:0,mmPerDay:5}]));
 assert.equal(current.rules.length,2);
 for(let i=0;i<5;i++){current=advance(current);assert.equal(current.tiles[0].temperatureC,100);assert.equal(current.tiles[0].rainMm,5);}
 assert.ok(current.cells[0].neighbors.every(id=>current.tiles[id].temperatureAnomalyC!>0));
 const stopped=applyProposal(current,change(current,[{kind:'temperature-reset',tileId:0}]));
 assert.equal(stopped.tiles[0].temperatureC,100);assert.deepEqual(stopped.rules.map(r=>r.kind),['rainfall']);
 assert.ok(advance(stopped).tiles[0].temperatureC<100);
 const pulse=applyProposal(current,change(current,[{kind:'temperature',tileId:0,celsius:-50,mode:'pulse'}]));
 assert.deepEqual(pulse.rules.map(r=>r.kind),['rainfall']);assert.ok(pulse.tiles[0].temperatureAnomalyC!<0);
 const operations:Operation[]=[{kind:'temperature',tileId:0,celsius:120,mode:'pulse'},{kind:'elevation',tileId:0,deltaM:-500}];
 assert.deepEqual(applyProposal(w,change(w,operations)).tiles,applyProposal(w,change(w,[...operations].reverse())).tiles);
});

test('heat affects neighbor evaporation and vegetation; temperature previews preserve source and water accounting',()=>{
 const w=make();for(const tile of w.tiles){tile.elevationM=100;tile.vegetation=0.6;}
 const source=w.tiles.reduce((best,t)=>climateTemperatureC(w,t.id)>climateTemperatureC(w,best)?t.id:best,0);
 const selected=w.cells[source].neighbors[0];
 const wet=applyProposal(w,change(w,[{kind:'rainfall',tileId:source,mmPerDay:10},{kind:'rainfall',tileId:selected,mmPerDay:10}]));
 const proposal=change(wet,[{kind:'temperature',tileId:source,celsius:200,mode:'sustained'}]);
 const hash=stateHash(wet),predicted=forecast(wet,proposal);assert.equal(stateHash(wet),hash);
 const neighbor=predicted.tiles.find(t=>t.id===selected)!;
 assert.ok(neighbor.after.temperatureC>neighbor.baseline.temperatureC);
 assert.ok(neighbor.waterMm<neighbor.baselineWaterMm);
 const target=predicted.tiles.find(t=>t.id===source)!;assert.ok(target.after.vegetation<target.baseline.vegetation);
 let hot=applyProposal(wet,proposal);for(let i=0;i<5;i++)hot=advance(hot);
 assert.equal(hot.tiles.reduce((sum,t)=>sum+t.waterL,0),hot.accounting.rainL-hot.accounting.evaporationL-hot.accounting.oceanDrainL);
});

test('temperature bounds reject atomically and old saves load without checksum changes',async()=>{
 const w=make(),hash=stateHash(w);
 for(const op of [{kind:'temperature',tileId:0,celsius:201,mode:'pulse'},{kind:'temperature',tileId:0,celsius:-101,mode:'sustained'},{kind:'temperature',tileId:0,celsius:50,mode:'unknown'},{kind:'temperature',tileId:999,celsius:50,mode:'pulse'}])assert.throws(()=>applyProposal(w,{...change(w,[]),operations:[{kind:'rainfall',tileId:0,mmPerDay:99},op]}));
 assert.equal(stateHash(w),hash);assert.equal(stateHash(validateWorld(w)),hash);
 const dir=await mkdtemp(join(tmpdir(),'logos-thermal-')),store=new WorldStore(dir);
 try {
  // Generated legacy-shaped tiles omit the optional anomaly field.
  assert.equal(Object.hasOwn(w.tiles[0],'temperatureAnomalyC'),false);
  await store.save(w);assert.equal(stateHash(await store.load(w.id)),hash);
  const originalTick=advance(w);for(const tile of originalTick.tiles)assert.equal(tile.temperatureC,climateTemperatureC(originalTick,tile.id));
  const warm=advance(applyProposal(w,change(w,[{kind:'temperature',tileId:0,celsius:150,mode:'sustained'}])));
  await store.save(warm);const loaded=await store.load(w.id);assert.deepEqual(loaded,warm);assert.deepEqual(advance(loaded),advance(warm));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('model temperature proposal exposes capability, validates scope, previews neighbors, and applies only on review',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'logos-thermal-prompts-')),store=new WorldStore(dir),w=make();await store.save(w);
 let calls=0;const service=new PromptService(store,{name:'Temperature test',async generate(context){
  calls++;assert.ok(context.capabilities.operations.temperature);assert.ok(context.capabilities.operations['temperature-reset']);assert.deepEqual(context.allowedTileIds,[0]);
  return {kind:'proposal',message:'One-time heating to 150 C.',assumptions:[],operations:[{kind:'temperature',tileId:0,celsius:150,mode:'pulse'}]};
 }});
 try {
  await service.start(w,{id:'heat-request',worldId:w.id,expectedRevision:w.revision,tileId:0,mode:'propose',scope:'tile',message:'Asteroid impact: set this zone to 150 C once.'});
  let job=await service.get(w,'heat-request');for(let i=0;job.status==='running'&&i<100;i++){await new Promise(r=>setTimeout(r,5));job=await service.get(w,'heat-request');}
  assert.equal(job.status,'complete');assert.ok(job.proposal);assert.equal(calls,1);
  const preview=forecast(w,job.proposal);assert.ok(preview.tiles.some(t=>t.id!==0&&t.after.temperatureC>t.baseline.temperatureC));
  assert.equal(stateHash(await store.load(w.id)),stateHash(w));
  assert.equal(applyProposal(w,job.proposal).tiles[0].temperatureC,150);
  assert.equal(calls,1);
 }finally{await service.close();await rm(dir,{recursive:true,force:true});}
});
