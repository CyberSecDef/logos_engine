import {Vector3} from 'three';
import type {World} from '../../contracts/src/index.js';

// Per edge: top fan, two bevel triangles, two wall triangles.
export const TRIANGLES_PER_EDGE=5;
export const TOP_INSET=0.13;
const OUTER_INSET=0.065,BASE_RADIUS=0.993;
export function tileSurface(cell:World['cells'][number],radius:number){
 const center=new Vector3(...cell.center),cap=center.clone().multiplyScalar(radius);
 const outerDirections=cell.corners.map(c=>new Vector3(...c).lerp(center,OUTER_INSET).normalize());
 const top=cell.corners.map(c=>new Vector3(...c).lerp(center,TOP_INSET).normalize().multiplyScalar(radius));
 // Match bevel drop to its width, bounded so even low ocean tiles retain a wall.
 const depth=Math.min((radius-BASE_RADIUS)*0.4,...top.map((p,i)=>p.distanceTo(outerDirections[i].clone().multiplyScalar(radius))));
 const shoulder=outerDirections.map(v=>v.clone().multiplyScalar(radius-depth));
 const bottom=outerDirections.map(v=>v.clone().multiplyScalar(BASE_RADIUS));
 const tangent=new Vector3().crossVectors(Math.abs(center.y)<0.9?new Vector3(0,1,0):new Vector3(1,0,0),center).normalize();
 const bitangent=new Vector3().crossVectors(center,tangent);
 const scale=Math.max(...top.map(p=>p.distanceTo(cap)))*2;
 const uv=(p:Vector3):[number,number]=>{const delta=p.clone().sub(cap);return [0.5+delta.dot(tangent)/scale,0.5+delta.dot(bitangent)/scale];};
 const topUV=top.map(uv);
 // Fold the artwork inward as it descends; shared corners stay seamless.
 const shoulderUV=topUV.map(([u,v])=>[0.5+(u-0.5)*0.94,0.5+(v-0.5)*0.94] as [number,number]);
 const bottomUV=topUV.map(([u,v])=>[0.5+(u-0.5)*0.2,0.5+(v-0.5)*0.2] as [number,number]);
 const count=cell.corners.length*TRIANGLES_PER_EDGE*3,positions=new Float64Array(count*3),projection=new Float64Array(count*3);
 let vertex=0;
 const add=(p:Vector3,coords:[number,number],shade:number)=>{
  positions.set(p.toArray(),vertex*3);projection.set([...coords,shade],vertex*3);vertex++;
 };
 for(let i=0;i<top.length;i++){
  const j=(i+1)%top.length;
  add(cap,[0.5,0.5],1);add(top[i],topUV[i],1);add(top[j],topUV[j],1);
  add(top[i],topUV[i],1);add(shoulder[i],shoulderUV[i],0.8);add(top[j],topUV[j],1);
  add(top[j],topUV[j],1);add(shoulder[i],shoulderUV[i],0.8);add(shoulder[j],shoulderUV[j],0.8);
  add(shoulder[i],shoulderUV[i],0.8);add(bottom[i],bottomUV[i],0.65);add(shoulder[j],shoulderUV[j],0.8);
  add(shoulder[j],shoulderUV[j],0.8);add(bottom[i],bottomUV[i],0.65);add(bottom[j],bottomUV[j],0.65);
 }
 return {positions,projection,depth};
}
