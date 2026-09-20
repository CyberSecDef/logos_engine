import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createWorld} from '../packages/worldgen/src/index.js';
import {advance} from '../packages/engine/src/index.js';
import {DEFAULT_SETTLEMENT_SETTINGS} from '../packages/contracts/src/settlement-defaults.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';
import {startServer} from '../apps/server/src/index.js';
import {combinedWorld,edit,measuredStep} from './fixtures/phase5.js';

// Isolated control: defaults should grow slowly with reserves, decline during
// prolonged crop failure, and recover without spontaneous replacement people.
test('default demographic balance separates surplus, drought and resupplied recovery',()=>{
 let w=createWorld({id:'balance',name:'Balance',seed:'balance',frequency:2});
 w.tiles.forEach(t=>t.elevationM=0);w.tiles[0].elevationM=1000;
 w=edit(w,[{kind:'settlement-create',tileId:0,label:'Control',population:100,foodRations:1000,settings:DEFAULT_SETTLEMENT_SETTINGS},{kind:'rainfall',tileId:0,mmPerDay:5},{kind:'temperature',tileId:0,mode:'sustained',celsius:20}]);
 for(let day=0;day<60;day++)w=advance(w);
 assert.equal(w.tiles[0].population,102);assert.ok(w.tiles[0].settlement!.foodRations>1000);
 w=edit(w,[{kind:'settlement-food',tileId:0,deltaRations:-w.tiles[0].settlement!.foodRations},{kind:'rainfall',tileId:0,mmPerDay:0},{kind:'temperature',tileId:0,mode:'sustained',celsius:60}]);
 let losses=0;
 for(let day=0;day<28;day++){w=advance(w);const d=w.tiles[0].settlement!.lastDay!;assert.equal(d.produced,0);assert.equal(d.births,0);losses+=d.losses;}
 assert.ok(losses>0);assert.equal(w.tiles[0].population,102-losses);const survivors=w.tiles[0].population;
 w=edit(w,[{kind:'settlement-food',tileId:0,deltaRations:2000},{kind:'rainfall',tileId:0,mmPerDay:5},{kind:'temperature',tileId:0,mode:'sustained',celsius:20}]);
 for(let day=0;day<29;day++){w=advance(w);assert.equal(w.tiles[0].population,survivors);assert.equal(w.tiles[0].settlement!.lastDay!.losses,0);}
 w=advance(w);assert.equal(w.tiles[0].population,survivors+1);
});

test('combined active systems conserve demographic changes through a saved restart without offline advancement',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-simulation-restart-')),store=new WorldStore(root);let app:Awaited<ReturnType<typeof startServer>>|undefined,calls=0;
 try{
  let w=combinedWorld();await store.save(w);await store.selectWorld(w.id);
  for(let day=0;day<60;day++)w=measuredStep(w).world;
  await store.save(w,{kind:'step',days:60});const path=join(root,w.id,'state.json'),bytes=await readFile(path,'utf8');
  const provider={name:'No simulation model',async generate():Promise<never>{calls++;throw Error('Unexpected model call');}};
  for(let restart=0;restart<2;restart++){
   app=await startServer({root,port:0,host:'127.0.0.1',provider});
   const base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;
   const {token}=await(await fetch(base+'/api/session')).json();
   const response=await fetch(base+'/api/world',{headers:{authorization:`Bearer ${token}`}});assert.equal(response.status,200);assert.equal(stateHash(await response.json()),stateHash(w));
   await app.close();app=undefined;assert.equal(await readFile(path,'utf8'),bytes);
  }
  let resumed=await new WorldStore(root).load(w.id);
  for(let day=0;day<60;day++){w=measuredStep(w).world;resumed=measuredStep(resumed).world;}
  assert.equal(stateHash(resumed),stateHash(w));await store.save(resumed,{kind:'step',days:60});
  assert.equal((await store.verifyHistory(w.id)).hash,stateHash(w));assert.equal(calls,0);
 }finally{await app?.close();await rm(root,{recursive:true,force:true});}
});
