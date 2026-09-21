// Fixed, bounded atlas layout. Pixel gutters protect adjacent images at mip levels.
export const ATLAS={columns:8,rows:4,slot:512,gutter:16} as const;
export function atlasRect(index:number) {
 if(!Number.isInteger(index)||index<0||index>=ATLAS.columns*ATLAS.rows)throw Error('Atlas slot out of range');
 const width=ATLAS.columns*ATLAS.slot,height=ATLAS.rows*ATLAS.slot;
 return {x:(index%ATLAS.columns)*ATLAS.slot+ATLAS.gutter,y:Math.floor(index/ATLAS.columns)*ATLAS.slot+ATLAS.gutter,size:ATLAS.slot-2*ATLAS.gutter,width,height};
}
export function atlasUV(index:number,u:number,v:number,rotation=0):[number,number] {
 const r=atlasRect(index),angle=(rotation%4)*Math.PI/2,x=u-.5,y=v-.5;
 const a=Math.max(0,Math.min(1,.5+x*Math.cos(angle)-y*Math.sin(angle))),b=Math.max(0,Math.min(1,.5+x*Math.sin(angle)+y*Math.cos(angle)));
 // Canvas rows count down, while UV v counts up. Stay half a texel inside content.
 return [(r.x+.5+a*(r.size-1))/r.width,1-(r.y+.5+(1-b)*(r.size-1))/r.height];
}
