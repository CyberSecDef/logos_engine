import * as THREE from 'three';
import { GlobeScene } from '../../../packages/globe/src/scene.js';
import { appearance,textureReveals,terrainPack, type Overlay } from '../../../packages/globe/src/appearance.js';
import {TerrainTextures} from './terrain-textures.js';
import {atlasUV} from '../../../packages/globe/src/texture-layout.js';
import type { World } from '../../../packages/contracts/src/index.js';

export class WorldGlobe {
  scene:GlobeScene;
  geometry=new THREE.BufferGeometry();
  mesh:THREE.Mesh|null=null;
  ids:number[]=[];
  world:World|null=null;
  overlay:Overlay='terrain';
  texturesEnabled=true;
  textures:TerrainTextures;
  reveal:number[]=[];
  private artworkKey='';
  // Geometry/UV projection changes only with terrain; appearance is still evaluated every update.
  private tileBuffers=new Map<number,{radius:number;projection:Float64Array;style:string}>();
  private detail={value:1};
  spinning=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  selected=-1;
  private marker=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#d3f3d4',transparent:true,opacity:0.95,depthTest:false}));
  private pointer=new THREE.Vector2();
  private ray=new THREE.Raycaster();
  constructor(canvas:HTMLCanvasElement,onSelect:(id:number)=>void,private onArtwork:(status:string)=>void=()=>{},private assetHeaders:()=>HeadersInit=()=>({})) {
    this.scene=new GlobeScene(canvas);
    this.textures=new TerrainTextures(()=>{this.update();if(!this.world)this.onArtwork(this.textures.status);});
    this.scene.material.map=this.textures.texture;
    const lighting=this.scene.material.onBeforeCompile;
    this.scene.material.onBeforeCompile=(shader,renderer)=>{
      lighting(shader,renderer);shader.uniforms.uTextureDetail=this.detail;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aTexture;\nvarying float vTexture;\nattribute vec3 aLayer0;\nattribute vec3 aLayer1;\nvarying vec3 vLayer0;\nvarying vec3 vLayer1;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTexture=aTexture;\nvLayer0=aLayer0;vLayer1=aLayer1;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vTexture;\nvarying vec3 vLayer0;\nvarying vec3 vLayer1;\nuniform float uTextureDetail;').replace('#include <map_fragment>','').replace('#include <color_fragment>','#include <color_fragment>\n#ifdef USE_MAP\nvec4 artwork=texture2D(map,vMapUv);diffuseColor.rgb=mix(diffuseColor.rgb,artwork.rgb,vTexture*uTextureDetail*artwork.a);\nvec4 layer0=texture2D(map,vLayer0.xy);diffuseColor.rgb=mix(diffuseColor.rgb,layer0.rgb,layer0.a*vLayer0.z*uTextureDetail);\nvec4 layer1=texture2D(map,vLayer1.xy);diffuseColor.rgb=mix(diffuseColor.rgb,layer1.rgb,layer1.a*vLayer1.z*uTextureDetail);\n#endif');
    };
    this.scene.material.customProgramCacheKey=()=> 'logos-terrain-atlas-v3';
    this.textures.texture.anisotropy=Math.min(4,this.scene.renderer.capabilities.getMaxAnisotropy());


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
      previous=now;this.detail.value=Math.max(0,Math.min(1,(9-this.scene.camera.position.length())/2));this.scene.resize();this.scene.render();requestAnimationFrame(draw);
    };requestAnimationFrame(draw);
  }
  setWorld(world:World) {
    const rebuild=this.world?.id!==world.id || this.world.cells.length!==world.cells.length;
    this.world=world;this.reveal=textureReveals(world);
    const artworkKey=JSON.stringify([world.id,world.artwork]);
    if(artworkKey!==this.artworkKey){this.artworkKey=artworkKey;void this.textures.load([...terrainPack.entries.map(entry=>{const local=world.artwork?.images.find(i=>i.slot===entry.id);return {...entry,image:local?`/api/artwork/image/${world.id}/${local.hash}`:entry.image};}),...(world.artwork?.images.filter(i=>i.slot==='settlement'||i.slot==='condition').map(i=>({id:i.slot,image:`/api/artwork/image/${world.id}/${i.hash}`}))??[])],this.assetHeaders());}
    if(rebuild) {
      const triangles=world.cells.reduce((n,c)=>n+c.corners.length*3,0);
      this.tileBuffers.clear();
      this.geometry=new THREE.BufferGeometry();
      for(const key of ['position','color'])this.geometry.setAttribute(key,new THREE.BufferAttribute(new Float32Array(triangles*9),3));
      for(const key of ['aLayer0','aLayer1'])this.geometry.setAttribute(key,new THREE.BufferAttribute(new Float32Array(triangles*9),3));
      this.geometry.setAttribute('aTexture',new THREE.BufferAttribute(new Float32Array(triangles*3),1));
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
    const weight=this.geometry.getAttribute('aTexture') as THREE.BufferAttribute;
    const uv=this.geometry.getAttribute('uv') as THREE.BufferAttribute;
    const layers=[0,1].map(i=>this.geometry.getAttribute(`aLayer${i}`) as THREE.BufferAttribute);
    let vertex=0,textured=0,terrainChanged=false,appearanceChanged=false;
    for(const cell of this.world.cells) {
      const tile=this.world.tiles[cell.id],art=appearance(this.world,tile,this.overlay,this.reveal[cell.id]),base=new THREE.Color(art.color);
      const slot=art.assetId?this.textures.slots.get(art.assetId):undefined;
      const strength=this.texturesEnabled&&slot!==undefined?art.textureOpacity:0;const layerSlots=art.layers.map(l=>({slot:this.textures.slots.get(l.asset),opacity:l.opacity}));if(strength>0||this.texturesEnabled&&art.textureOpacity>0&&layerSlots.some(l=>l.slot!==undefined&&l.opacity>0))textured++;
      const radius=this.radius(cell.id),n=cell.corners.length,count=n*9;
      let cached=this.tileBuffers.get(cell.id);
      const terrainDirty=!cached||cached.radius!==radius;
      const style=JSON.stringify([art.color,slot,strength,layerSlots,art.variant%4,this.texturesEnabled,art.textureOpacity]);
      if(terrainDirty) {
        const center=new THREE.Vector3(...cell.center);
        const top=cell.corners.map(c=>new THREE.Vector3(...c).lerp(center,0.065).normalize().multiplyScalar(radius));
        const bottom=top.map(v=>v.clone().normalize().multiplyScalar(0.993));
        const tangent=new THREE.Vector3().crossVectors(Math.abs(center.y)<0.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),center).normalize();
        const bitangent=new THREE.Vector3().crossVectors(center,tangent);
        const scale=Math.max(...top.map(p=>p.clone().sub(center.clone().multiplyScalar(radius)).length()))*2;
        const projection=new Float64Array(count*3);let local=0;
        const add=(p:THREE.Vector3,shade:number)=>{
          pos.setXYZ(vertex+local,p.x,p.y,p.z);
          const delta=p.clone().sub(center.clone().multiplyScalar(radius));
          projection[local*3]=0.5+delta.dot(tangent)/scale;
          projection[local*3+1]=0.5+delta.dot(bitangent)/scale;
          projection[local*3+2]=shade;local++;
        };
        for(let i=0;i<n;i++) {
          const j=(i+1)%n;
          add(center.clone().multiplyScalar(radius),1);add(top[i],1);add(top[j],1);
          add(top[i],0.48);add(bottom[i],0.48);add(top[j],0.48);
          add(top[j],0.48);add(bottom[i],0.48);add(bottom[j],0.48);
        }
        cached={radius,projection,style:''};this.tileBuffers.set(cell.id,cached);terrainChanged=true;
      }
      if(cached!.style!==style||terrainDirty) {
        const projection=cached!.projection;
        for(let local=0;local<count;local++) {
          const index=vertex+local,u=projection[local*3],v=projection[local*3+1],shade=projection[local*3+2];
          colors.setXYZ(index,base.r*shade,base.g*shade,base.b*shade);
          uv.setXY(index,...atlasUV(slot??0,u,v,art.variant%4));weight.setX(index,shade===1?strength:0);
          for(const [i,attribute] of layers.entries()){
            const layer=layerSlots[i];
            attribute.setXYZ(index,...atlasUV(layer?.slot??0,u,v,art.variant%4),shade===1&&this.texturesEnabled&&layer?.slot!==undefined?art.textureOpacity*layer.opacity:0);
          }
        }
        cached!.style=style;appearanceChanged=true;
      }
      vertex+=count;
    }
    if(appearanceChanged) {
      for(const attribute of [colors,weight,uv,...layers])attribute.needsUpdate=true;
    }
    if(terrainChanged) {
      pos.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();
    }
    this.select(this.selected);
    this.onArtwork(!this.texturesEnabled?'Colors only':this.overlay!=='terrain'?'Overlay colors · artwork returns on Terrain':this.textures.status.includes('Loading')?this.textures.status:`${textured} / ${this.world.tiles.length} places illustrated · ${this.textures.status==='Terrain artwork ready'?'reveals through day 1,000':this.textures.status}`);
  }
  zoomView(factor:number|null):number {
    const baseline=innerWidth<=760?6.2:4.7;
    const distance=Math.max(this.scene.controls.minDistance,Math.min(this.scene.controls.maxDistance,factor===null?baseline:this.scene.camera.position.length()*factor));
    const damping=this.scene.controls.enableDamping;this.scene.controls.enableDamping=false;this.scene.controls.update();
    this.scene.camera.position.setLength(distance);this.scene.controls.update();this.scene.controls.enableDamping=damping;
    return Math.round(baseline/this.scene.camera.position.length()*100);
  }
  focusTile(id:number) {
    const cell=this.world?.cells[id];if(!cell)return;
    this.scene.spin.updateWorldMatrix(true,false);
    const direction=this.scene.spin.localToWorld(new THREE.Vector3(...cell.center)).normalize();
    const distance=this.scene.camera.position.length();
    // Clear residual orbit damping before positioning so a prior drag cannot
    // carry the camera away from the requested zone on the next frame.
    const damping=this.scene.controls.enableDamping;this.scene.controls.enableDamping=false;this.scene.controls.update();
    this.scene.camera.position.copy(direction.multiplyScalar(distance));this.scene.camera.lookAt(0,0,0);this.scene.controls.update();this.scene.controls.enableDamping=damping;
  }
  select(id:number) {
    this.selected=id;this.marker.visible=id>=0&&!!this.world?.cells[id];
    if(!this.marker.visible)return;
    const cell=this.world!.cells[id],center=new THREE.Vector3(...cell.center);
    const points=cell.corners.map(c=>new THREE.Vector3(...c).lerp(center,0.05).normalize().multiplyScalar(this.radius(id)+0.004));
    this.marker.geometry.dispose();this.marker.geometry=new THREE.BufferGeometry().setFromPoints(points);
  }
}
