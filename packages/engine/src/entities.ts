import type {World,Operation} from '../../contracts/src/index.js';
import type {Read} from '../../contracts/src/extensions.js';
const round=(n:number)=>Math.round(n*1000)/1000;
export function entityProperty(w:World,typeId:string,fieldId:string){return w.entities?.types.find(t=>t.id===typeId)?.properties.find(f=>f.id===fieldId);}
export function outputProperty(w:World,fieldId:string,entityTypeId?:string){return entityTypeId?entityProperty(w,entityTypeId,fieldId):w.definitions.fields.find(f=>f.id===fieldId);}
export function validRead(w:World,r:Read):boolean {
 if(r.source==='entity-count'||r.source==='entity-sum')return !!r.entityTypeId&&!!w.entities?.types.some(t=>t.id===r.entityTypeId)&&(r.source==='entity-count'?r.fieldId===undefined:!!r.fieldId&&!!entityProperty(w,r.entityTypeId,r.fieldId));
 return r.entityTypeId===undefined&&(r.source==='custom'?!!r.fieldId&&w.definitions.fields.some(f=>f.id===r.fieldId):r.fieldId===undefined);
}
export function validateEntities(w:World){
 if(!w.entities)return;const types=new Set<string>(),ids=new Set<string>(),counts=new Map<number,number>();
 for(const t of w.entities.types){if(types.has(t.id))throw Error('Duplicate entity type');types.add(t.id);const keys=new Set<string>();for(const f of t.properties){if(keys.has(f.id)||['constructor','prototype','__proto__'].includes(f.id)||f.min>=f.max||f.defaultValue<f.min||f.defaultValue>f.max||[f.min,f.max,f.defaultValue].some(n=>round(n)!==n))throw Error('Invalid entity property definition');keys.add(f.id);}}
 for(const e of w.entities.instances){if(ids.has(e.id)||!w.tiles[e.tileId]||!types.has(e.typeId))throw Error('Invalid entity identity, location or type');ids.add(e.id);counts.set(e.tileId,(counts.get(e.tileId)??0)+1);if(counts.get(e.tileId)!>16)throw Error('At most 16 entities per tile');for(const [key,value] of Object.entries(e.properties)){const f=entityProperty(w,e.typeId,key);if(!f||value<f.min||value>f.max||round(value)!==value)throw Error('Invalid entity property value');}}
}
export function validateEntityMigrations(w:World,ops:Operation[]){
 const creates=ops.filter(o=>o.kind==='entity-create').map(o=>o.entity.id);if(new Set(creates).size!==creates.length)throw Error('Duplicate entity creation in proposal');
 for(const op of ops){if(op.kind!=='entity-type-define'||!w.entities?.types.some(t=>t.id===op.definition.id))continue;const id=op.definition.id;
  if(ops.filter(o=>o.kind==='entity-type-define'&&o.definition.id===id||o.kind==='entity-type-remove'&&o.typeId===id).length!==1)throw Error('Migrate an entity type at most once per proposal');
  for(const r of w.definitions.rules)if([...r.conditions.map(c=>c.read),...r.effects.flatMap(e=>e.value.terms.map(t=>t.read))].some(r=>r.entityTypeId===id)||r.effects.some(e=>e.entityTypeId===id))if(!ops.some(o=>o.kind==='rule-define'&&o.rule.id===r.id||o.kind==='rule-remove'&&o.ruleId===r.id))throw Error(`Entity migration requires updating or removing rule ${r.id}`);
  for(const r of w.definitions.appearance??[])if(r.conditions.some(c=>c.read.entityTypeId===id)&&!ops.some(o=>o.kind==='appearance-define'&&o.rule.id===r.id||o.kind==='appearance-remove'&&o.ruleId===r.id))throw Error(`Entity migration requires updating or removing appearance ${r.id}`);
  for(const {definition:p} of w.plugins)if(p.program.some(i=>i.op==='read'&&i.read.entityTypeId===id||i.op==='emit'&&i.entityTypeId===id)&&!ops.some(o=>o.kind==='plugin-define'&&o.definition.id===p.id||o.kind==='plugin-remove'&&o.pluginId===p.id))throw Error(`Entity migration requires updating or removing plugin ${p.id}`);
 }
}
export function applyEntity(w:World,op:Operation){
 if(!op.kind.startsWith('entity-'))return;
 const data=w.entities??={types:[],instances:[]};
 if(op.kind==='entity-type-define'){
  const def=op.definition,old=data.types.find(t=>t.id===def.id),prior=w.history.flatMap(p=>p.operations).reduce((n,o)=>o.kind==='entity-type-define'&&o.definition.id===def.id?Math.max(n,o.definition.version):n,old?.version??0);
  if(def.version!==prior+1)throw Error(`Entity type version must be ${prior+1}`);
  const dropped=old?.properties.filter(f=>!def.properties.some(n=>n.id===f.id)).map(f=>f.id)??[];
  if(new Set(op.discardProperties).size!==op.discardProperties.length||dropped.length!==op.discardProperties.length||dropped.some(k=>!op.discardProperties.includes(k)))throw Error('Explicitly list removed entity properties in discardProperties');
  if(old)for(const e of data.instances.filter(e=>e.typeId===def.id))e.properties=Object.fromEntries(def.properties.map(f=>{const previous=old.properties.find(p=>p.id===f.id);let value=previous?(e.properties[f.id]??previous.defaultValue):f.defaultValue;if(op.migration==='clamp')value=Math.max(f.min,Math.min(f.max,value));if(value<f.min||value>f.max)throw Error('Entity migration discards values; choose clamp explicitly');return [f.id,value];}));
  data.types=[...data.types.filter(t=>t.id!==def.id),def].sort((a,b)=>a.id<b.id?-1:1);
 }
 if(op.kind==='entity-type-remove'){if(!data.types.some(t=>t.id===op.typeId)||data.instances.some(e=>e.typeId===op.typeId))throw Error('Unknown entity type or remaining instances');data.types=data.types.filter(t=>t.id!==op.typeId);}
 if(op.kind==='entity-create'){
  if(op.entity.tileId!==op.tileId||data.instances.some(e=>e.id===op.entity.id)||w.history.some(p=>p.operations.some(o=>o.kind==='entity-create'&&o.entity.id===op.entity.id)))throw Error('Entity ID already used or location mismatch');
  data.instances.push(op.entity);
 }
 if(op.kind==='entity-update'||op.kind==='entity-remove'){
  const e=data.instances.find(e=>e.id===op.entityId);if(!e||e.tileId!==op.tileId)throw Error('Unknown entity or mismatched location');
  if(op.kind==='entity-remove')data.instances=data.instances.filter(n=>n!==e);
  else{if(op.label!==undefined)e.label=op.label;if(op.toTileId!==undefined)e.tileId=op.toTileId;if(op.properties)e.properties={...e.properties,...op.properties};}
 }
 data.instances.sort((a,b)=>a.id<b.id?-1:1);
}
// Index reads once per immutable simulation snapshot. Invalidate after entity writes.
const aggregates=new WeakMap<World,Map<string,number>>();
export function invalidateEntityReads(w:World){aggregates.delete(w);}
export function readEntities(w:World,tileId:number,r:Read){
 let cache=aggregates.get(w);if(!cache){cache=new Map();for(const e of [...(w.entities?.instances??[])].sort((a,b)=>a.id<b.id?-1:1)){const prefix=`${e.tileId}:${e.typeId}`;cache.set(prefix,(cache.get(prefix)??0)+1);for(const f of w.entities!.types.find(t=>t.id===e.typeId)!.properties){const key=`${prefix}:${f.id}`;cache.set(key,(cache.get(key)??0)+(e.properties[f.id]??f.defaultValue));}}aggregates.set(w,cache);}
 return cache.get(`${tileId}:${r.entityTypeId}${r.source==='entity-sum'?`:${r.fieldId}`:''}`)??0;
}
