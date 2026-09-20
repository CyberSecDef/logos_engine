import {validRead,outputProperty} from './entities.js';
import type {World,Operation} from '../../contracts/src/index.js';
import {PLUGIN_LIMITS,type PluginDefinition,type PluginInstance} from '../../contracts/src/plugins.js';
import {executePlugin} from '../../plugin-host/src/index.js';
import {readValue,ruleTargets} from './extensions.js';
export type PluginChange={tileId:number;entityTypeId?:string;fieldId:string;value:number;kind:'add'|'set'};
export const pluginTargets=(world:World,p:PluginDefinition)=>ruleTargets(world,p);
const outputs=(p:PluginDefinition)=>p.program.filter(i=>i.op==='emit');
export function validatePlugins(world:World):void {
 const ids=new Set<string>(),writers=new Map<string,'add'|'set'>();let worstFuel=0;
 const register=(tileId:number,fieldId:string,kind:'add'|'set',entityTypeId?:string)=>{const key=`${tileId}:${entityTypeId??''}:${fieldId}`,old=writers.get(key);if(old&&(old==='set'||kind==='set'))throw Error('Conflicting plugin/rule set writes; use additive effects or disjoint scopes');writers.set(key,kind);};
 for(const rule of world.definitions.rules)if(rule.enabled)for(const tile of ruleTargets(world,rule))for(const effect of rule.effects)if(effect.kind!=='transfer')register(tile,effect.fieldId,effect.kind,effect.entityTypeId);
 for(const instance of world.plugins) {
  const p=instance.definition;if(ids.has(p.id))throw Error('Duplicate plugin');ids.add(p.id);
  const targets=pluginTargets(world,p),targetSet=new Set(targets),keys=new Set<string>();
  for(const field of p.stateFields){if(keys.has(field.id)||['constructor','prototype','__proto__'].includes(field.id)||field.min>field.max||field.initial<field.min||field.initial>field.max||[field.min,field.max,field.initial].some(n=>Math.round(n*1000)/1000!==n))throw Error('Invalid plugin state definition');keys.add(field.id);}
  for(const ins of p.program) {
   if((ins.op==='jump'||ins.op==='jump-zero')&&ins.target>=p.program.length)throw Error('Plugin jump outside program');
   if((ins.op==='state-get'||ins.op==='state-set')&&!keys.has(ins.key))throw Error('Unknown plugin state key');
   if(ins.op==='read'&&!validRead(world,ins.read))throw Error('Unknown plugin read property');
   if(ins.op==='emit'&&!outputProperty(world,ins.fieldId,ins.entityTypeId))throw Error('Unknown plugin output property');
  }
  const stateIds=new Set<number>();for(const entry of instance.state){if(!targetSet.has(entry.tileId)||stateIds.has(entry.tileId)||entry.values.length!==p.stateFields.length)throw Error('Invalid plugin state targets/shape');stateIds.add(entry.tileId);for(const [i,value] of entry.values.entries())if(value<p.stateFields[i].min||value>p.stateFields[i].max||Math.round(value*1000)/1000!==value)throw Error('Invalid saved plugin state');}
  if(!p.enabled)continue;
  // Static worst-case reservation makes budget acceptance independent of branches.
  worstFuel+=targets.length*PLUGIN_LIMITS.instructions;
  const outputKinds=new Map<string,'add'|'set'>();for(const ins of outputs(p)){const key=`${ins.entityTypeId??''}:${ins.fieldId}`,prior=outputKinds.get(key);if(prior&&prior!==ins.mode)throw Error('Plugin cannot mix set and add for one output');outputKinds.set(key,ins.mode);}
  for(const tileId of targets)for(const [key,kind] of outputKinds){const [type,fieldId]=key.split(':');register(tileId,fieldId,kind,type===''?undefined:type);}
 }
 if(worstFuel>PLUGIN_LIMITS.worldFuel)throw Error('World exceeds reserved plugin instruction budget; narrow plugin scope');
}
export function validateStateMappings(world:World,operations:Operation[]):void {
 for(const op of operations)if(op.kind==='plugin-define'&&op.migration==='map') {
  const id=op.definition.id;
  if(!world.plugins.some(p=>p.definition.id===id))throw Error('State mapping requires an existing plugin');
  if(operations.filter(o=>o.kind==='plugin-define'&&o.definition.id===id||o.kind==='plugin-remove'&&o.pluginId===id).length!==1)throw Error('A mapped plugin can only be defined once and cannot be removed in the same proposal');
 }
}
function mappedState(world:World,old:PluginInstance|undefined,op:Extract<Operation,{kind:'plugin-define'}>):PluginInstance['state'] {
 if(!old)throw Error('State mapping requires an existing plugin');
 const p=op.definition;
 if(p.scope!==old.definition.scope)throw Error('State mapping requires unchanged plugin scope; use reset for scope changes');
 if(!op.stateMap)throw Error('State mapping requires stateMap');
 const mappings=new Map(op.stateMap.map(m=>[m.key,m]));
 if(mappings.size!==op.stateMap.length||mappings.size!==p.stateFields.length||p.stateFields.some(f=>!mappings.has(f.id)))throw Error('State mapping must name each destination key exactly once');
 const oldKeys=old.definition.stateFields.map(f=>f.id),used=new Set<string>();
 for(const mapping of mappings.values())if('from' in mapping) {
  if(!oldKeys.includes(mapping.from))throw Error(`Unknown source state key: ${mapping.from}`);
  used.add(mapping.from);
 }
 const discarded=op.discardStateKeys??[],unused=oldKeys.filter(key=>!used.has(key));
 if(new Set(discarded).size!==discarded.length||discarded.length!==unused.length||unused.some(key=>!discarded.includes(key)))throw Error('Explicitly list every unused old key in discardStateKeys');
 const states=new Map(old.state.map(s=>[s.tileId,s.values]));
 return pluginTargets(world,p).sort((a,b)=>a-b).map(tileId=>{
  const previous=states.get(tileId)??old.definition.stateFields.map(f=>f.initial);
  return {tileId,values:p.stateFields.map(field=>{
   const mapping=mappings.get(field.id)!;
   if('initial' in mapping)return field.initial;
   const value=previous[oldKeys.indexOf(mapping.from)]*mapping.scale+mapping.offset;
   if(!Number.isFinite(value))throw Error('Non-finite state conversion');
   if(mapping.precision==='exact'&&Math.abs(value*1000-Math.round(value*1000))>1e-7)throw Error(`State conversion loses precision for ${field.id}; choose round explicitly`);
   const rounded=Math.round(value*1000)/1000;
   if(rounded<field.min||rounded>field.max)throw Error(`Converted state outside bounds for ${field.id}`);
   return rounded;
  })};
 });
}
export function applyPlugin(world:World,op:Operation):void {
 if(op.kind==='plugin-define') {
  const p=op.definition;if(p.tileId!==op.tileId)throw Error('Plugin origin must match operation');
  const old=world.plugins.find(i=>i.definition.id===p.id);
  if(old&&old.definition.tileId!==p.tileId)throw Error('Plugin update cannot move its origin');
  const prior=world.history.flatMap(h=>h.operations).filter(o=>o.kind==='plugin-define'&&o.definition.id===p.id).reduce((max,o)=>o.kind==='plugin-define'?Math.max(max,o.definition.version):max,old?.definition.version??0);
  if(p.version!==prior+1)throw Error(`Plugin version must be ${prior+1}`);
  if(op.migration!=='map'&&(op.stateMap!==undefined||op.discardStateKeys!==undefined))throw Error('stateMap/discardStateKeys require map migration');
  if(old&&op.migration==='preserve'&&(p.scope!==old.definition.scope||p.stateFields.length!==old.definition.stateFields.length||p.stateFields.some((f,i)=>f.id!==old.definition.stateFields[i].id)))throw Error('Plugin state shape/scope changed; choose reset explicitly');
  const state=op.migration==='map'?mappedState(world,old,op):old&&op.migration==='preserve'?pluginTargets(world,old.definition).map(tileId=>({tileId,values:old.state.find(s=>s.tileId===tileId)?.values??old.definition.stateFields.map(f=>f.initial)})):[];
  world.plugins=world.plugins.filter(i=>i.definition.id!==p.id);
  world.plugins.push({definition:p,state});world.plugins.sort((a,b)=>a.definition.id<b.definition.id?-1:1);
 }
 if(op.kind==='plugin-toggle'||op.kind==='plugin-remove') {
  const old=world.plugins.find(i=>i.definition.id===op.pluginId);if(!old||old.definition.tileId!==op.tileId)throw Error('Unknown plugin or mismatched origin');
  if(op.kind==='plugin-toggle')old.definition.enabled=op.enabled;
  else world.plugins=world.plugins.filter(i=>i!==old);
 }
}
export class PluginExecutionError extends Error {}
export function advancePlugins(world:World):PluginChange[] {
 const changes:PluginChange[]=[],budget={remaining:PLUGIN_LIMITS.worldFuel};
 for(const instance of [...world.plugins].sort((a,b)=>a.definition.id<b.definition.id?-1:1)) {
  const p=instance.definition;if(!p.enabled||world.tick%p.everyDays!==0)continue;
  const state=new Map(instance.state.map(entry=>[entry.tileId,entry.values]));
  for(const tileId of pluginTargets(world,p).sort((a,b)=>a-b)) {
   try {
    const result=executePlugin(p,{tick:world.tick,state:state.get(tileId)??p.stateFields.map(f=>f.initial),read:read=>readValue(world,tileId,read)},budget);
    state.set(tileId,result.state);const setters=new Set<string>();
    for(const effect of result.effects){const key=`${effect.entityTypeId??''}:${effect.fieldId}`;if(effect.kind==='set'&&setters.has(key))throw Error('multiple set effects on one tile');setters.add(key);changes.push({...effect,tileId});}
   }catch(error){throw new PluginExecutionError(`Plugin ${p.id} v${p.version}, zone ${tileId}: ${error instanceof Error?error.message:'execution failed'}. Tick was not saved. Disable, update, or restore this plugin to continue.`);}
  }
  instance.state=[...state].sort(([a],[b])=>a-b).map(([tileId,values])=>({tileId,values}));
 }
 return changes;
}
