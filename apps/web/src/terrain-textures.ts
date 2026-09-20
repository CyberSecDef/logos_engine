import * as THREE from 'three';
import {ATLAS,atlasRect} from '../../../packages/globe/src/texture-layout.js';
export type TextureEntry={id:string;image:string};
export class TerrainTextures {
 readonly texture:THREE.CanvasTexture;
 readonly slots=new Map<string,number>();
 readonly canvas=document.createElement('canvas');
 status='Loading terrain artwork…';
 constructor(private changed:()=>void) {
  this.canvas.width=ATLAS.columns*ATLAS.slot;this.canvas.height=ATLAS.rows*ATLAS.slot;
  const ctx=this.canvas.getContext('2d')!;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
  this.texture=new THREE.CanvasTexture(this.canvas);this.texture.colorSpace=THREE.SRGBColorSpace;
  this.texture.minFilter=THREE.LinearMipmapLinearFilter;this.texture.magFilter=THREE.LinearFilter;
 }
 async load(entries:TextureEntry[]) {
  if(entries.length>ATLAS.columns*ATLAS.rows)throw Error('Terrain pack exceeds atlas capacity');
  await Promise.all(entries.map(async(entry,index)=>{
   try {
    const image=new Image();image.decoding='async';
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{image.onload=null;image.onerror=null;image.src='';reject(Error('Image timeout'));},20000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('Image unavailable'));};image.src=entry.image;});
    if(image.naturalWidth>4096||image.naturalHeight>4096)throw Error('Texture dimensions too large');
    const {x,y,size}=atlasRect(index),ctx=this.canvas.getContext('2d')!,g=ATLAS.gutter;
    ctx.drawImage(image,x,y,size,size);
    // Extrude edge pixels, including corners, into the gutter.
    ctx.drawImage(this.canvas,x,y,1,size,x-g,y,g,size);ctx.drawImage(this.canvas,x+size-1,y,1,size,x+size,y,g,size);
    ctx.drawImage(this.canvas,x-g,y,size+g*2,1,x-g,y-g,size+g*2,g);ctx.drawImage(this.canvas,x-g,y+size-1,size+g*2,1,x-g,y+size,size+g*2,g);
    this.slots.set(entry.id,index);
   }catch{/* Missing artwork leaves this biome in its original color. */}
  }));
  this.texture.needsUpdate=true;
  this.status=this.slots.size===entries.length?'Terrain artwork ready':this.slots.size?`Artwork partly available · ${entries.length-this.slots.size} color fallbacks`:'Artwork unavailable · showing colors';
  this.changed();
 }
}
