import type { Tile, World } from '../../contracts/src/index.js';
export type Overlay='terrain'|'water'|'rain'|'temperature'|'communication'|`custom:${string}`;
export type Appearance={label:string;color:string;assetId?:string;variant:number};
// Catalog entries are data. Asset IDs are reserved until real image packs exist.
export const catalog=[
 {id:'ocean',label:'Deep water',color:'#174863'},
 {id:'alpine',label:'Alpine rock',color:'#b0b9b4'},
 {id:'forest',label:'Forest canopy',color:'#367c64'},
 {id:'meadow',label:'Meadow',color:'#89a96a'},
 {id:'dry',label:'Dry grassland',color:'#b4a574'},
 {id:'city',label:'Settlement',color:'#bda993'},
];
export function appearance(w:World,t:Tile,overlay:Overlay='terrain'):Appearance {
 const depth=t.waterL/w.cells[t.id].areaM2;
 const id=t.elevationM<=0?'ocean':t.population>=100?'city':t.elevationM>1200?'alpine':t.vegetation>0.6?'forest':t.vegetation>0.3?'meadow':'dry';
 const entry=catalog.find(e=>e.id===id)!;
 let color=entry.color;
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
 return {label:entry.label,color,assetId:w.tick>0?entry.id:undefined,variant:Math.imul(t.id+1,2654435761)>>>0};
}
