import {readValue} from '../../engine/src/extensions.js';
import type { Tile, World } from '../../contracts/src/index.js';
export type Overlay='terrain'|'water'|'rain'|'temperature'|'communication'|`custom:${string}`;
export type Appearance={label:string;color:string;assetId?:string;variant:number;textureOpacity:number;layers:{asset:string;opacity:number}[]};
import manifest from '../../tile-packs/public/painterly-v1/manifest.json' with {type:'json'};
export type TerrainEntry={id:string;label:string;color:string;image:string;conditions:{field:'elevationM'|'vegetation'|'population'|'temperatureC'|'rainMm';comparison:'lt'|'lte'|'gt'|'gte';value:number}[]};
export const terrainPack=manifest as {id:string;version:number;revealDays:number;entries:TerrainEntry[]};
export const catalog=terrainPack.entries;
function hash(text:string):number {let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return n>>>0;}
// Pure visual schedule: no simulation RNG draws or fields are changed.
export function textureReveals(world:World):number[] {
 const order=world.tiles.map(t=>({id:t.id,key:hash(`${terrainPack.id}:${world.seed}:${t.id}`)})).sort((a,b)=>a.key-b.key||a.id-b.id);
 const acted=new Set(world.history.flatMap(p=>p.operations.flatMap(op=>op.kind==='artwork-activate'||op.kind==='artwork-reset'?[]:op.kind==='field-transfer'||op.kind==='entity-update'&&op.toTileId!==undefined?[op.tileId,op.toTileId!]:[op.tileId])));
 const progress=world.tick*world.tiles.length/terrainPack.revealDays,result=world.tiles.map(()=>0);
 for(const [rank,tile] of order.entries())result[tile.id]=acted.has(tile.id)?1:Math.max(0,Math.min(1,progress-rank));
 return result;
}
export function appearance(w:World,t:Tile,overlay:Overlay='terrain',reveal?:number):Appearance {
 const depth=t.waterL/w.cells[t.id].areaM2;
 const entry=catalog.find(e=>e.conditions.every(c=>{const n=t[c.field];return c.comparison==='lt'?n<c.value:c.comparison==='lte'?n<=c.value:c.comparison==='gt'?n>c.value:n>=c.value;}))??catalog[catalog.length-1];
 const custom=matchingAppearance(w,t);
 let color=custom?.style.color??entry.color;
 if(overlay==='water') color=t.elevationM<=0?'#174863':depth>100?'#59c1e3':depth>20?'#387e9b':'#aeb28c';
 if(overlay==='rain') color=`hsl(${190+Math.min(t.rainMm,100)/100*35}, 55%, ${22+Math.min(t.rainMm,100)/100*50}%)`;
 if(overlay==='temperature') {
  const extreme=t.temperatureC>35?(t.temperatureC-35)/165:t.temperatureC< -30?(-30-t.temperatureC)/70:0;
  color=`hsl(${220-Math.max(0,Math.min(1,(t.temperatureC+30)/65))*210}, ${45+Math.min(1,extreme)*35}%, ${55-Math.min(1,extreme)*25}%)`;
 }
 if(overlay.startsWith('custom:')) {
  const field=w.definitions.fields.find(f=>f.id===overlay.slice(7));
  if(field){const value=t.properties[field.id]??field.defaultValue;const ratio=(value-field.min)/(field.max-field.min);color=`hsl(${220-ratio*180}, 55%, ${30+ratio*35}%)`;}
 }
 if(overlay==='communication') color=t.communication?'#469783':'#d8956b';
 const textureOpacity=overlay==='terrain'?(reveal??textureReveals(w)[t.id]):0;
 return {label:custom?.style.label??entry.label,color,assetId:textureOpacity>0?(custom?(custom.style.asset==='none'?undefined:custom.style.asset==='terrain'?entry.id:custom.style.asset):entry.id):undefined,variant:hash(`${terrainPack.id}:${t.id}`),textureOpacity,layers:textureOpacity>0?(custom?.style.layers??[]):[]};
}

export function matchingAppearance(world:World,tile:Tile) {
 return [...(world.definitions.appearance??[])].sort((a,b)=>b.priority-a.priority||(a.id<b.id?-1:a.id>b.id?1:0)).find(rule=>
  rule.enabled&&(rule.scope==='world'||tile.id===rule.tileId||rule.scope==='neighbors'&&world.cells[rule.tileId].neighbors.includes(tile.id))&&rule.conditions.every(c=>{
   const n=readValue(world,tile.id,c.read);
   return c.comparison==='lt'?n<c.value:c.comparison==='lte'?n<=c.value:c.comparison==='eq'?n===c.value:c.comparison==='gte'?n>=c.value:n>c.value;
  }));
}
