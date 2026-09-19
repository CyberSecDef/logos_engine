import type {World,Operation} from '../../contracts/src/index.js';
import {PLUGIN_LIMITS,type PluginDefinition} from '../../contracts/src/plugins.js';
import {executePlugin} from '../../plugin-host/src/index.js';
import {readValue,ruleTargets} from './extensions.js';
export type PluginChange={tileId:number;fieldId:string;value:number;kind:'add'|'set'};
export const pluginTargets=(world:World,p:PluginDefinition)=>ruleTargets(world,p);
const outputs=(p:PluginDefinition)=>p.program.filter(i=>i.op==='emit');
export function validatePlugins(world:World):void {
 const ids=new Set<string>(),writers=new Map<string,'add'|'set'>();let worstFuel=0;
 const register=(tileId:number,fieldId:string,kind:'add'|'set')=>{const key=`${tileId}:${fieldId}`,old=writers.get(key);if(old&&(old==='set'||kind==='set'))throw Error('Conflicting plugin/rule set writes; use additive effects or disjoint scopes');writers.set(key,kind);};
 for(const rule of world.definitions.rules)if(rule.enabled)for(const tile of ruleTargets(world,rule))for(const effect of rule.effects)if(effect.kind!=='transfer')register(tile,effect.fieldId,effect.kind);
 for(const instance of world.plugins) {
  const p=instance.definition;if(ids.has(p.id))throw Error('Duplicate plugin');ids.add(p.id);
  const targets=pluginTargets(world,p),targetSet=new Set(targets),keys=new Set<string>();
  for(const field of p.stateFields){if(keys.has(field.id)||['constructor','prototype','__proto__'].includes(field.id)||field.min>field.max||field.initial<field.min||field.initial>field.max||[field.min,field.max,field.initial].some(n=>Math.round(n*1000)/1000!==n))throw Error('Invalid plugin state definition');keys.add(field.id);}
  for(const ins of p.program) {
   if((ins.op==='jump'||ins.op==='jump-zero')&&ins.target>=p.program.length)throw Error('Plugin jump outside program');
   if((ins.op==='state-get'||ins.op==='state-set')&&!keys.has(ins.key))throw Error('Unknown plugin state key');
   if(ins.op==='read'&&(ins.read.source==='custom'?!world.definitions.fields.some(f=>f.id===ins.read.fieldId):ins.read.fieldId!==undefined))throw Error('Unknown plugin read property');
   if(ins.op==='emit'&&!world.definitions.fields.some(f=>f.id===ins.fieldId))throw Error('Unknown plugin output property');
  }
  const stateIds=new Set<number>();for(const entry of instance.state){if(!targetSet.has(entry.tileId)||stateIds.has(entry.tileId)||entry.values.length!==p.stateFields.length)throw Error('Invalid plugin state targets/shape');stateIds.add(entry.tileId);for(const [i,value] of entry.values.entries())if(value<p.stateFields[i].min||value>p.stateFields[i].max||Math.round(value*1000)/1000!==value)throw Error('Invalid saved plugin state');}
  if(!p.enabled)continue;
  // Static worst-case reservation makes budget acceptance independent of branches.
  worstFuel+=targets.length*PLUGIN_LIMITS.instructions;
  const outputKinds=new Map<string,'add'|'set'>();for(const ins of outputs(p)){const prior=outputKinds.get(ins.fieldId);if(prior&&prior!==ins.mode)throw Error('Plugin cannot mix set and add for one output');outputKinds.set(ins.fieldId,ins.mode);}
  for(const tileId of targets)for(const [fieldId,kind] of outputKinds)register(tileId,fieldId,kind);
 }
 if(worstFuel>PLUGIN_LIMITS.worldFuel)throw Error('World exceeds reserved plugin instruction budget; narrow plugin scope');
}
export function applyPlugin(world:World,op:Operation):void {
 if(op.kind==='plugin-define') {
  const p=op.definition;if(p.tileId!==op.tileId)throw Error('Plugin origin must match operation');
  const old=world.plugins.find(i=>i.definition.id===p.id);
  if(old&&old.definition.tileId!==p.tileId)throw Error('Plugin update cannot move its origin');
  const prior=world.history.flatMap(h=>h.operations).filter(o=>o.kind==='plugin-define'&&o.definition.id===p.id).reduce((max,o)=>o.kind==='plugin-define'?Math.max(max,o.definition.version):max,old?.definition.version??0);
  if(p.version!==prior+1)throw Error(`Plugin version must be ${prior+1}`);
  if(old&&op.migration==='preserve'&&(p.scope!==old.definition.scope||p.stateFields.length!==old.definition.stateFields.length||p.stateFields.some((f,i)=>f.id!==old.definition.stateFields[i].id)))throw Error('Plugin state shape/scope changed; choose reset explicitly');
  world.plugins=world.plugins.filter(i=>i.definition.id!==p.id);
  world.plugins.push({definition:p,state:old&&op.migration==='preserve'?pluginTargets(world,old.definition).map(tileId=>({tileId,values:old.state.find(s=>s.tileId===tileId)?.values??old.definition.stateFields.map(f=>f.initial)})):[]});world.plugins.sort((a,b)=>a.definition.id<b.definition.id?-1:1);
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
    for(const effect of result.effects){if(effect.kind==='set'&&setters.has(effect.fieldId))throw Error('multiple set effects on one tile');setters.add(effect.fieldId);changes.push({...effect,tileId});}
   }catch(error){throw new PluginExecutionError(`Plugin ${p.id} v${p.version}, zone ${tileId}: ${error instanceof Error?error.message:'execution failed'}. Tick was not saved. Disable, update, or restore this plugin to continue.`);}
  }
  instance.state=[...state].sort(([a],[b])=>a-b).map(([tileId,values])=>({tileId,values}));
 }
 return changes;
}
