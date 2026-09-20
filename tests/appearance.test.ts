import test from 'node:test';
import { Color } from 'three';
import assert from 'node:assert/strict';
import { createWorld } from '../packages/worldgen/src/index.js';
import { appearance } from '../packages/globe/src/appearance.js';
import { stateHash } from '../apps/server/src/store.js';
test('appearance starts as colors, reveals by day 1000, and never changes simulation',()=>{
 const w=createWorld({id:'art',name:'Art',seed:'green',frequency:2});
 const t=w.tiles[0];t.elevationM=500;t.vegetation=0.8;
 assert.equal(appearance(w,t).assetId,undefined);
 w.tick=1000;assert.equal(appearance(w,t).assetId,'forest');
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

test('staggered reveals finish at day 1000; Apply reveals targets immediately and copies agree',async()=>{
 const {textureReveals}=await import('../packages/globe/src/appearance.js');
 const {applyProposal}=await import('../packages/engine/src/index.js');
 const {copyWorld,archiveWorld,unpackWorld}=await import('../apps/server/src/world-management.js');
 const w=createWorld({id:'reveals',name:'Reveals',seed:'reveal-seed',frequency:12});
 assert.ok(textureReveals(w).every(x=>x===0));
 let previous=textureReveals(w);
 for(const day of [1,2,100,500,999,1000]){const next={...w,tick:day},values=textureReveals(next);assert.ok(values.every((value,i)=>value>=previous[i]&&value<=1));assert.ok(Math.abs(values.reduce((a,b)=>a+b,0)-day*w.tiles.length/1000)<1e-8);previous=values;}
 assert.ok(previous.every(x=>x===1));
 const p={id:'reveal-edit',worldId:w.id,expectedRevision:0,summary:'Raise this place',operations:[{kind:'elevation' as const,tileId:0,deltaM:100}]};
 const before=stateHash(w),changed=applyProposal(w,p);assert.equal(changed.tick,0);assert.equal(textureReveals(changed)[0],1);assert.equal(textureReveals(changed).filter(x=>x>0).length,1);assert.equal(stateHash(w),before);
 assert.deepEqual(textureReveals(copyWorld(changed,'branch','Branch')),textureReveals(changed));assert.deepEqual(textureReveals(unpackWorld(archiveWorld(changed))),textureReveals(changed));
 for(const overlay of ['rain','water','temperature','communication','custom:test'] as const)assert.equal(appearance(changed,changed.tiles[0],overlay).textureOpacity,0);
});

test('atlas coordinates stay within padded slots for hexagons, pentagons and rotations',async()=>{
 const {ATLAS,atlasRect,atlasUV}=await import('../packages/globe/src/texture-layout.js');
 for(let slot=0;slot<8;slot++)for(let rotation=0;rotation<4;rotation++)for(const sides of [5,6])for(let k=0;k<sides;k++){
  const angle=k*2*Math.PI/sides,[u,v]=atlasUV(slot,.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5,rotation),r=atlasRect(slot);
  assert.ok(u>r.x/r.width&&u<(r.x+r.size)/r.width);assert.ok(v>1-(r.y+r.size)/r.height&&v<1-r.y/r.height);
 }
 assert.equal(ATLAS.slot*ATLAS.columns,2048);assert.throws(()=>atlasUV(8,0,0));
});

test('pack catalog and PNG assets are complete, local, and bounded',async()=>{
 const {terrainPack}=await import('../packages/globe/src/appearance.js');const {readFile}=await import('node:fs/promises');
 assert.equal(terrainPack.version,1);assert.equal(new Set(terrainPack.entries.map(e=>e.id)).size,terrainPack.entries.length);assert.ok(terrainPack.entries.length<=8);
 for(const entry of terrainPack.entries){assert.match(entry.image,/^\/painterly-v1\/[a-z-]+\.png$/);const png=await readFile('packages/tile-packs/public'+entry.image);assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(16)<=4096&&png.readUInt32BE(20)<=4096);}
});
