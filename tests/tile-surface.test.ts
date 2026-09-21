import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createWorld} from '../packages/worldgen/src/index.js';
import {tileSurface,TRIANGLES_PER_EDGE} from '../packages/globe/src/tile-surface.js';
test('pentagon and hexagon caps, bevels and walls form continuous textured surfaces',()=>{
 const w=createWorld({id:'surface-test',name:'Surface test',seed:'surface',frequency:2});
 for(const corners of [5,6])for(const radius of [1.004,1.012,1.2]){
  const cell=w.cells.find(c=>c.corners.length===corners)!;
  const {positions,projection,depth}=tileSurface(cell,radius);
  assert.equal(positions.length,corners*TRIANGLES_PER_EDGE*9);
  assert.ok(depth>0&&depth<(radius-.993));
  const p=(i:number)=>new Vector3().fromArray(positions,i*3);
  const uv=(i:number)=>Array.from(projection.slice(i*3,i*3+2));
  for(let edge=0;edge<corners;edge++){
   const offset=edge*15;
   assert.ok(Math.abs(p(offset+1).length()-radius)<1e-12);
   assert.ok(Math.abs(p(offset+4).length()-(radius-depth))<1e-12);
   assert.ok(Math.abs(p(offset+10).length()-.993)<1e-12);
   for(const [a,b] of [[1,3],[2,5],[4,7],[4,9],[8,11],[8,12],[10,13]]){
    assert.ok(p(offset+a).distanceTo(p(offset+b))<1e-12);
    assert.deepEqual(uv(offset+a),uv(offset+b));
   }
   const next=((edge+1)%corners)*15;
   assert.ok(p(offset+14).distanceTo(p(next+10))<1e-12);
   assert.deepEqual(uv(offset+14),uv(next+10));
  }
  for(let i=0;i<positions.length/3;i+=3){
   const normal=p(i+1).sub(p(i)).cross(p(i+2).sub(p(i)));
   assert.ok(normal.length()>1e-9,'No degenerate triangles');
  }
  for(let i=0;i<projection.length;i+=3)for(const value of projection.slice(i,i+2))assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
 }
});
