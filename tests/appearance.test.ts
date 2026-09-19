import test from 'node:test';
import { Color } from 'three';
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

test('temperature and rainfall overlay colors parse in Three.js and distinguish extremes',()=>{
 const w=createWorld({id:'overlay',name:'Overlay',seed:'colors',frequency:2}),t=w.tiles[0];
 for(const [overlay,key,values] of [['temperature','temperatureC',[-100,-30,10,35,100,200]],['rain','rainMm',[0,50,100]]] as const) {
  const colors=values.map(value=>{t[key]=value;return new Color(appearance(w,t,overlay).color).getHexString();});
  assert.equal(new Set(colors).size,values.length);assert.ok(!colors.includes('ffffff'));
 }
});
