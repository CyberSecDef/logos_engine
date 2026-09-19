import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../packages/worldgen/src/index.js';
import { appearance } from '../packages/globe/src/appearance.js';
import { stateHash } from '../apps/server/src/store.js';
test('appearance starts as colors, reserves stable art IDs, and never changes simulation',()=>{
 const w=createWorld({id:'art',name:'Art',seed:'green',frequency:2});
 const t=w.tiles[0];t.elevationM=500;t.vegetation=0.8;
 assert.equal(appearance(w,t).assetId,undefined);
 w.tick=1;assert.equal(appearance(w,t).assetId,'forest');
 const hash=stateHash(w);
 for(const overlay of ['terrain','rain','water','temperature','communication'] as const) appearance(w,t,overlay);
 assert.equal(stateHash(w),hash);
 assert.deepEqual(appearance(w,t),appearance(structuredClone(w),structuredClone(t)));
 t.population=500;assert.equal(appearance(w,t).assetId,'city');
});
