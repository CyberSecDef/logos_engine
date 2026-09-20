import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createWorld} from '../packages/worldgen/src/index.js';
import {advance,advanceWithWaterReport,applyProposal,previewWater} from '../packages/engine/src/index.js';
import {stateHash} from '../apps/server/src/store.js';import {startServer} from '../apps/server/src/index.js';
const make=()=>createWorld({id:'transport',name:'Transport',seed:'water-report',frequency:2});
test('water phase refactor preserves pre-Phase-5 100-day hashes',()=>{
 for(const [seed,expected] of [['amber','ae7e2447e5e58de0e1f612c38b1a17d75467fb2497be41c3846f26688803187a'],['transport-baseline','c7a53e0718f04604ccb35d4fac20b755fd066ae09696c4252fb8a6309923912c']]){
  let w=createWorld({id:'baseline',name:'Baseline',seed,frequency:3});
  w=applyProposal(w,{id:'weather',worldId:w.id,expectedRevision:0,summary:'Weather baseline',operations:[{kind:'rainfall',tileId:0,mmPerDay:150},{kind:'temperature',tileId:1,celsius:80,mode:'sustained'}]});
  for(let i=0;i<100;i++)w=advance(w);assert.equal(stateHash(w),expected);
 }
});
test('each zone balances exact water/sediment sources and sinks; observed steps equal ordinary steps',()=>{
 let w=make();w.tiles[0].sedimentKg=100000;
 for(let day=0;day<40;day++){
  const before=stateHash(w),{world:next,report}=advanceWithWaterReport(w);assert.equal(stateHash(w),before);assert.deepEqual(next,advance(w));
  assert.equal(report.tick,w.tick+1);assert.equal(report.sourceRevision,w.revision);
  for(const b of report.tiles){
   assert.equal(b.beforeWaterL+b.rainL-b.evaporationL+b.incomingWaterL-b.outgoingWaterL-b.oceanDrainL,b.afterWaterL);
   assert.equal(b.beforeSedimentKg+b.incomingSedimentKg-b.outgoingSedimentKg,b.afterSedimentKg);
   assert.equal(b.afterWaterL,next.tiles[b.tileId].waterL);assert.equal(b.afterSedimentKg,next.tiles[b.tileId].sedimentKg);
   assert.equal(b.mixingWaterL,b.beforeWaterL+b.rainL-b.evaporationL);
   assert.equal(report.transfers.filter(f=>f.toTileId===b.tileId).reduce((n,f)=>n+f.waterL,0),b.incomingWaterL);
   assert.equal(report.transfers.filter(f=>f.fromTileId===b.tileId).reduce((n,f)=>n+f.waterL,0),b.outgoingWaterL);
  }
  for(const f of report.transfers){assert.ok(w.cells[f.fromTileId].neighbors.includes(f.toTileId));assert.ok(w.tiles[f.fromTileId].elevationM>w.tiles[f.toTileId].elevationM);assert.ok(f.waterL>0);}
  assert.equal(report.tiles.reduce((n,b)=>n+b.rainL,0),next.accounting.rainL-w.accounting.rainL);
  assert.equal(report.tiles.reduce((n,b)=>n+b.oceanDrainL,0),next.accounting.oceanDrainL-w.accounting.oceanDrainL);
  w=next;
 }
});
test('incoming water is not retransmitted today; communication does not close a water route; oceans export only water',()=>{
 const w=make(),a=0,b=w.cells[a].neighbors[0],c=w.cells[b].neighbors.find(id=>id!==a&&!w.cells[a].neighbors.includes(id))!;
 assert.ok(Number.isInteger(c));
 for(const tile of w.tiles){tile.elevationM=3000;tile.waterL=0;tile.communication=false;w.rules.push({kind:'rainfall',id:`rain-${tile.id}`,tileId:tile.id,mmPerDay:0});}
 w.tiles[a].elevationM=2000;w.tiles[b].elevationM=1000;w.tiles[c].elevationM=0;
 w.tiles[a].waterL=w.cells[a].areaM2*200;w.tiles[a].sedimentKg=1000;
 const first=advanceWithWaterReport(w);assert.ok(first.report.transfers.some(f=>f.fromTileId===a&&f.toTileId===b));assert.equal(first.report.transfers.some(f=>f.fromTileId===b),false);
 const second=advanceWithWaterReport(first.world);assert.ok(second.report.transfers.some(f=>f.fromTileId===b&&f.toTileId===c));assert.ok(second.report.tiles[c].oceanDrainL>0);assert.equal(second.world.tiles[c].waterL,0);assert.ok(second.world.tiles[c].sedimentKg>0);
 const raised=structuredClone(w);raised.tiles[b].elevationM=3000;assert.equal(advanceWithWaterReport(raised).report.transfers.some(f=>f.fromTileId===a),false);
});
test('single-zone preview is bounded and fails atomically when a deterministic plugin fails',()=>{
 const w=make(),before=stateHash(w),p=previewWater(w,0);assert.ok(p.incoming.length<=6&&p.outgoing.length<=6);assert.equal(stateHash(w),before);assert.throws(()=>previewWater(w,-1),/Unknown tile/);
 const broken=applyProposal(w,{id:'broken',worldId:w.id,expectedRevision:0,summary:'Invalid at runtime',operations:[{kind:'plugin-define',tileId:0,migration:'preserve',definition:{id:'divide-zero',version:1,abi:'logos-stack-v1',label:'Test',description:'',scope:'tile',tileId:0,enabled:true,everyDays:1,stateFields:[],program:[{op:'constant',value:1},{op:'constant',value:0},{op:'divide'},{op:'drop'}]}}]});
 const hash=stateHash(broken);assert.throws(()=>previewWater(broken,0),/zero/);assert.equal(stateHash(broken),hash);
});
test('water preview API validates identity/revision, persists nothing, and invokes no models',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-water-api-'));let calls=0;
 const app=await startServer({root,port:0,provider:{name:'Never',async generate(){calls++;throw Error('Unexpected model call');}}});
 try{const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`;const {token}=await (await fetch(base+'session')).json() as {token:string};const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const w=await (await fetch(base+'world',{headers})).json() as ReturnType<typeof make>;const path=join(root,w.id,'state.json'),before=await readFile(path,'utf8'),history=await (await fetch(base+'history',{headers})).text();
  const body={worldId:w.id,expectedRevision:w.revision,tileId:0};const post=(input:unknown,auth=true)=>fetch(base+'transport/preview',{method:'POST',headers:auth?headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  assert.equal((await post(body,false)).status,401);assert.equal((await post({...body,worldId:'other'})).status,400);assert.equal((await post({...body,expectedRevision:999})).status,400);assert.equal((await post({...body,tileId:99999})).status,400);
  const response=await post(body);assert.equal(response.status,200);assert.deepEqual(await response.json(),previewWater(w,0));assert.equal(await readFile(path,'utf8'),before);assert.equal(await (await fetch(base+'history',{headers})).text(),history);assert.equal(calls,0);
 }finally{await app.close();await rm(root,{recursive:true,force:true});}
});
