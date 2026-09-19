import * as THREE from 'three';
import { GlobeScene } from '../../../packages/globe/src/scene.js';
import { appearance, type Overlay } from '../../../packages/globe/src/appearance.js';
import type { World } from '../../../packages/contracts/src/index.js';

export class WorldGlobe {
  scene:GlobeScene;
  geometry=new THREE.BufferGeometry();
  mesh:THREE.Mesh|null=null;
  ids:number[]=[];
  world:World|null=null;
  overlay:Overlay='terrain';
  spinning=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  selected=-1;
  private marker=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#d3f3d4',transparent:true,opacity:0.95,depthTest:false}));
  private pointer=new THREE.Vector2();
  private ray=new THREE.Raycaster();
  constructor(canvas:HTMLCanvasElement,onSelect:(id:number)=>void) {
    this.scene=new GlobeScene(canvas);
    this.scene.setAxialTilt(15);this.scene.setSun({azimuth:30,elevation:35});
    this.scene.camera.position.set(2.6,1.2,2.8);
    const fit=()=>this.scene.camera.position.setLength(innerWidth<=760?6.2:4.7);
    fit();window.addEventListener('resize',fit);
    this.scene.atmosphere.material.uniforms.uStrength.value=0.3;
    this.scene.ambient.intensity=0.9;this.scene.fill.intensity=1;
    this.scene.spin.add(this.marker);this.marker.visible=false;this.marker.renderOrder=4;
    let down=[0,0];
    canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
    canvas.addEventListener('pointerup',e=>{
      if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5 || !this.mesh) return;
      const r=canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      this.scene.scene.updateMatrixWorld(true);this.ray.setFromCamera(this.pointer,this.scene.camera);
      const hit=this.ray.intersectObject(this.mesh)[0];
      if(hit?.faceIndex!=null) onSelect(this.ids[hit.faceIndex]);
    });
    canvas.addEventListener('keydown',e=>{
      if(!this.world)return;
      if(e.key==='ArrowRight'||e.key==='ArrowLeft') {e.preventDefault();onSelect((Math.max(this.selected,0)+(e.key==='ArrowRight'?1:-1)+this.world.tiles.length)%this.world.tiles.length);}
    });
    let previous=performance.now();
    const draw=(now:number)=>{
      if(this.spinning&&!document.hidden)this.scene.spin.rotation.y+=Math.min(now-previous,100)/1000*0.025;
      previous=now;this.scene.resize();this.scene.render();requestAnimationFrame(draw);
    };requestAnimationFrame(draw);
  }
  setWorld(world:World) {
    const rebuild=this.world?.id!==world.id || this.world.cells.length!==world.cells.length;
    this.world=world;
    if(rebuild) {
      const triangles=world.cells.reduce((n,c)=>n+c.corners.length*3,0);
      this.geometry=new THREE.BufferGeometry();
      for(const key of ['position','color'])this.geometry.setAttribute(key,new THREE.BufferAttribute(new Float32Array(triangles*9),3));
      this.geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(triangles*6),2));
      this.ids=[];for(const c of world.cells)for(let i=0;i<c.corners.length*3;i++)this.ids.push(c.id);
      this.mesh=this.scene.setTiles({geometry:this.geometry},new Float32Array(triangles*3).fill(0.9),new Float32Array(triangles*3));
    }
    this.update();
  }
  radius(id:number) {return 1.012+Math.max(-0.008,this.world!.tiles[id].elevationM/35000);}
  update() {
    if(!this.world)return;
    const pos=this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors=this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const uv=this.geometry.getAttribute('uv') as THREE.BufferAttribute;
    let vertex=0;
    for(const cell of this.world.cells) {
      const tile=this.world.tiles[cell.id], base=new THREE.Color(appearance(this.world,tile,this.overlay).color);
      const center=new THREE.Vector3(...cell.center),radius=this.radius(cell.id),n=cell.corners.length;
      const top=cell.corners.map(c=>new THREE.Vector3(...c).lerp(center,0.065).normalize().multiplyScalar(radius));
      const bottom=top.map(v=>v.clone().normalize().multiplyScalar(0.993));
      const tangent=new THREE.Vector3().crossVectors(Math.abs(center.y)<0.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),center).normalize();
      const bitangent=new THREE.Vector3().crossVectors(center,tangent);
      const scale=Math.max(...top.map(p=>p.clone().sub(center.clone().multiplyScalar(radius)).length()))*2;
      const add=(p:THREE.Vector3,shade:number)=>{
        pos.setXYZ(vertex,p.x,p.y,p.z); colors.setXYZ(vertex,base.r*shade,base.g*shade,base.b*shade);
        const delta=p.clone().sub(center.clone().multiplyScalar(radius));uv.setXY(vertex,0.5+delta.dot(tangent)/scale,0.5+delta.dot(bitangent)/scale);vertex++;
      };
      for(let i=0;i<n;i++) {
        const j=(i+1)%n;
        add(center.clone().multiplyScalar(radius),1);add(top[i],1);add(top[j],1);
        add(top[i],0.48);add(bottom[i],0.48);add(top[j],0.48);
        add(top[j],0.48);add(bottom[i],0.48);add(bottom[j],0.48);
      }
    }
    pos.needsUpdate=true;colors.needsUpdate=true;uv.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();this.select(this.selected);
  }
  select(id:number) {
    this.selected=id;this.marker.visible=id>=0&&!!this.world?.cells[id];
    if(!this.marker.visible)return;
    const cell=this.world!.cells[id],center=new THREE.Vector3(...cell.center);
    const points=cell.corners.map(c=>new THREE.Vector3(...c).lerp(center,0.05).normalize().multiplyScalar(this.radius(id)+0.004));
    this.marker.geometry.dispose();this.marker.geometry=new THREE.BufferGeometry().setFromPoints(points);
  }
}
