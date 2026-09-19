import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorld } from '../packages/worldgen/src/index.js';
import { advance, applyProposal, preview, validateWorld } from '../packages/engine/src/index.js';
import { WorldStore, stateHash } from '../apps/server/src/store.js';
import type { Proposal } from '../packages/contracts/src/index.js';
const make=()=>createWorld({id:'test',name:'Test',seed:'amber',frequency:3});
const proposal=(w=make()):Proposal=>({id:'change-1',worldId:w.id,expectedRevision:w.revision,summary:'Rain in this zone',operations:[{kind:'rainfall',tileId:0,mmPerDay:80}]});

test('spherical topology is connected, reciprocal, stable, and covers the globe',()=>{
 const w=validateWorld(make()); assert.equal(w.cells.length,92);
 assert.equal(w.cells.filter(c=>c.neighbors.length===5).length,12);
 const seen=new Set([0]),queue=[0]; for(const id of queue) for(const n of w.cells[id].neighbors) if(!seen.has(n)){seen.add(n);queue.push(n);}
 assert.equal(seen.size,w.cells.length);
 const area=w.cells.reduce((s,c)=>s+c.areaM2,0); assert.ok(Math.abs(area-4*Math.PI*100000**2)/(4*Math.PI*100000**2)<1e-6);
 assert.deepEqual(make(),w);
});
test('100 ticks replay identically with conserved water accounting',()=>{
 let a=make(), b=make();
 for(let i=0;i<100;i++) {a=advance(a); b=advance(b);}
 assert.equal(stateHash(a),stateHash(b));
 const stored=a.tiles.reduce((n,t)=>n+t.waterL,0);
 assert.equal(stored,a.accounting.rainL-a.accounting.evaporationL-a.accounting.oceanDrainL);
});
test('transactions and previews leave source unchanged; stale and duplicate inputs fail',()=>{
 const w=make(), before=stateHash(w), p=proposal(w), next=applyProposal(w,p);
 assert.equal(next.rules.find(r=>r.kind==='rainfall')?.mmPerDay,80); assert.equal(next.revision,1);
 preview(w,p,3); assert.equal(stateHash(w),before);
 assert.throws(()=>applyProposal(next,p),/already/);
 assert.throws(()=>applyProposal(next,{...p,id:'new'}),/Stale/);
 assert.throws(()=>applyProposal(w,{...p,worldId:'other'}),/another world/);
 assert.throws(()=>applyProposal(w,{...p,operations:[...p.operations,{kind:'elevation',tileId:0,deltaM:999999}]}));
 assert.equal(stateHash(w),before);
});
test('rain flows downhill despite communication isolation and carries sediment',()=>{
 const w=make(); for(const t of w.tiles){t.elevationM=1000;t.waterL=0;}
 const from=w.cells[0], dest=from.neighbors[0]; w.tiles[dest].elevationM=100;
 w.tiles[0].sedimentKg=10000;
 const p=proposal(w);p.operations.push({kind:'communication',tileId:0,enabled:false});
 const after=advance(applyProposal(w,p));
 assert.equal(after.tiles[0].communication,false);
 assert.ok(after.tiles[dest].waterL>9*w.cells[dest].areaM2);
 assert.ok(after.tiles[dest].sedimentKg>0);
 assert.equal(after.tiles.reduce((n,t)=>n+t.sedimentKg,0),10000);
 // Raising the destination blocks that downhill route.
 const raised=structuredClone(w); raised.tiles[dest].elevationM=2000;
 assert.ok(advance(applyProposal(raised,p)).tiles[dest].waterL<after.tiles[dest].waterL);
});
test('save/load preserves replay state; corruption and unsafe paths fail',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'logos-test-')); const store=new WorldStore(dir);
 try {
  const w=advance(applyProposal(make(),proposal())); await store.save(w);
  assert.deepEqual(await store.load('test'),w);
  assert.equal(stateHash(advance(await store.load('test'))),stateHash(advance(w)));
  await assert.rejects(()=>store.load('../escape'));
  const path=join(dir,'test','state.json');const saved=JSON.parse(await readFile(path,'utf8'));saved.world.tick++;
  await writeFile(path,JSON.stringify(saved));await assert.rejects(()=>store.load('test'),/integrity/);
  await symlink(tmpdir(),join(dir,'linked'));await assert.rejects(()=>store.load('linked'),/escapes/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
