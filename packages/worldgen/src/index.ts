import { goldberg } from '../../globe/src/goldberg.js';
import { CreateWorldSchema, ENGINE_VERSION, type World, type Vec } from '../../contracts/src/index.js';

// Integer hashing isolates each random draw from iteration order and other systems.
export function random(seed:string, ...keys:(string|number)[]):number {
  let h = 2166136261;
  for (const c of [seed,...keys].join(':')) h = Math.imul(h ^ c.charCodeAt(0),16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const dot=(a:Vec,b:Vec)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function area(a:Vec,b:Vec,c:Vec):number {
  const cross:Vec=[b[1]*c[2]-b[2]*c[1], b[2]*c[0]-b[0]*c[2], b[0]*c[1]-b[1]*c[0]];
  return 2*Math.atan2(Math.abs(dot(a,cross)),1+dot(a,b)+dot(b,c)+dot(c,a));
}
export function createWorld(input:unknown):World {
  const options=CreateWorldSchema.parse(input);
  const topology=goldberg(options.frequency);
  const vec=(buffer:Float32Array, i:number):Vec=>[buffer[i*3],buffer[i*3+1],buffer[i*3+2]];
  const cells=Array.from({length:topology.tileCount},(_,id)=>{
    const center=vec(topology.centers,id);
    const corners=Array.from({length:topology.sides[id]},(_,k)=>vec(topology.corners,topology.cornerStart[id]+k));
    const areaM2=Math.round(corners.reduce((sum,c,k)=>sum+area(center,c,corners[(k+1)%corners.length]),0)*100000**2);
    return {id,center,corners,neighbors:topology.neighbors[id] as number[],areaM2};
  });
  const waves=Array.from({length:7},(_,i)=>({
    axis:[random(options.seed,'axis',i,0)*2-1,random(options.seed,'axis',i,1)*2-1,random(options.seed,'axis',i,2)*2-1] as Vec,
    phase:random(options.seed,'phase',i)*Math.PI*2,
  }));
  const tiles=cells.map(cell=>{
    const continental=waves.reduce((v,w,i)=>v+Math.sin(dot(cell.center,w.axis)*(3+i)+w.phase)/(i+1),0);
    const elevationM=Math.round(continental*1100-120);
    return {id:cell.id,elevationM,waterL:0,sedimentKg:0,rainMm:0,
      temperatureC:Math.round(28-Math.abs(cell.center[1])*45-Math.max(elevationM,0)*0.005),
      vegetation:elevationM>0 ? Math.round((0.25+random(options.seed,'forest',cell.id)*0.6)*100)/100:0,
      population:0, communication:true,properties:{}};
  });
  return {schemaVersion:4,engineVersion:ENGINE_VERSION,...options,radiusM:100000,tick:0,revision:0,cells,tiles,
    rules:[],definitions:{fields:[],rules:[]},resourceLedger:{tick:0,revision:0,entries:[]},plugins:[],history:[],events:[],accounting:{rainL:0,evaporationL:0,oceanDrainL:0}};
}
