import type { World, Operation } from '../../contracts/src/index.js';
import { stockUnits, transferOnce, settleTransfers, type TransferRequest } from './resources.js';
import type { CustomRule, FieldDefinition, Read } from '../../contracts/src/extensions.js';

const round=(n:number)=>Math.round(n*1000)/1000;
export function fieldValue(world:World,tileId:number,id:string):number {
 const field=world.definitions.fields.find(f=>f.id===id);if(!field)throw Error(`Unknown property: ${id}`);
 return Object.hasOwn(world.tiles[tileId].properties,id)?world.tiles[tileId].properties[id]:field.defaultValue;
}
export function ruleTargets(world:World,rule:Pick<CustomRule,'tileId'|'scope'>):number[] {
 if(!world.tiles[rule.tileId])throw Error('Unknown rule origin');
 return rule.scope==='world'?world.tiles.map(t=>t.id):rule.scope==='neighbors'?[rule.tileId,...world.cells[rule.tileId].neighbors]:[rule.tileId];
}
// Authorization includes potential recipients, even when the lower-neighbor
// filter currently excludes them; a future terrain edit can change eligibility.
export function ruleAffectedTargets(world:World,rule:CustomRule):number[] {
 const sources=ruleTargets(world,rule);
 return rule.effects.some(e=>e.kind==='transfer')?[...new Set(sources.flatMap(id=>[id,...world.cells[id].neighbors]))]:sources;
}
function validValue(field:FieldDefinition,value:number):boolean {return Number.isFinite(value)&&value>=field.min&&value<=field.max;}
function reads(rule:CustomRule):Read[] {return [...rule.conditions.map(c=>c.read),...rule.effects.flatMap(e=>e.value.terms.map(t=>t.read))];}
export function validateExtensions(world:World):void {
 const fields=new Map(world.definitions.fields.map(f=>[f.id,f]));
 if(fields.size!==world.definitions.fields.length)throw Error('Duplicate property definition');
 for(const field of fields.values()) {
  if(['constructor','prototype','__proto__'].includes(field.id))throw Error('Reserved property ID');
  if(field.quantity==='stock'&&field.min!==0)throw Error('Stock properties must have a zero minimum');
  if(field.min>=field.max||!validValue(field,field.defaultValue))throw Error(`Invalid bounds/default for ${field.id}`);
  if([field.min,field.max,field.defaultValue].some(n=>round(n)!==n))throw Error('Property bounds/defaults support at most three decimal places');
 }
 for(const tile of world.tiles)for(const [id,value] of Object.entries(tile.properties)) {
  const field=fields.get(id);if(!field||!validValue(field,value)||round(value)!==value)throw Error(`Invalid property value: ${id}`);
 }
 const ids=new Set<string>(),writers=new Map<string,'set'|'add'>();let evaluations=0,transferEdges=0;
 for(const rule of world.definitions.rules) {
  if(ids.has(rule.id))throw Error('Duplicate custom rule');ids.add(rule.id);
  const targets=ruleTargets(world,rule);
  for(const read of reads(rule)) {
   if(read.source==='custom'?!read.fieldId||!fields.has(read.fieldId):read.fieldId!==undefined)throw Error('Invalid rule property reference');
  }
  for(const effect of rule.effects) {
   const field=fields.get(effect.fieldId);if(!field)throw Error('Unknown rule output property');
   if(effect.value.min!==undefined&&effect.value.max!==undefined&&effect.value.min>effect.value.max)throw Error('Invalid formula clamp');
   if(effect.kind==='transfer') {
    if(field.quantity!=='stock'||!effect.destination)throw Error('Transfer rules require a stock property and a destination');
    if(rule.enabled)transferEdges+=targets.reduce((sum,id)=>sum+world.cells[id].neighbors.length,0);
   }else if(effect.destination!==undefined)throw Error('Only transfer effects have destinations');
  }
  if(!rule.enabled)continue;
  evaluations+=targets.length;
  for(const id of targets)for(const effect of rule.effects) {
   if(effect.kind==='transfer')continue;
   const key=`${id}:${effect.fieldId}`,prior=writers.get(key);
   if(prior&&(prior==='set'||effect.kind==='set'))throw Error('Conflicting set/add rules target the same property; use additive rules or disjoint scopes');
   writers.set(key,effect.kind);
  }
 }
 if(transferEdges>250000)throw Error('World exceeds transfer edge budget');
 if(world.resourceLedger.tick>world.tick||world.resourceLedger.revision>world.revision)throw Error('Resource ledger is from a future state');
 const ledgerIds=new Set<string>();
 for(const entry of world.resourceLedger.entries) {
  if(ledgerIds.has(entry.fieldId)||entry.afterMilli-entry.beforeMilli!==entry.createdMilli-entry.removedMilli)throw Error('Invalid resource ledger');
  ledgerIds.add(entry.fieldId);
 }
 if(evaluations>100000)throw Error('World exceeds custom rule evaluation budget');
}
export function applyExtension(world:World,op:Operation):void {
 if(op.kind==='field-transfer')transferOnce(world,op.tileId,op.toTileId,op.fieldId,op.amount);
 if(op.kind==='field-define') {
  const old=world.definitions.fields.find(f=>f.id===op.definition.id);
  const recorded=world.history.flatMap(p=>p.operations).filter(o=>o.kind==='field-define'&&o.definition.id===op.definition.id).map(o=>o.kind==='field-define'?o.definition.version:0);
  const previous=recorded.reduce((max,version)=>Math.max(max,version),old?.version??0);
  if(op.definition.version!==previous+1)throw Error(`Property definition version must be ${previous+1}`);
  if(op.definition.min>=op.definition.max||!validValue(op.definition,op.definition.defaultValue))throw Error('Invalid property bounds/default');
  if(old)for(const tile of world.tiles) {
   const value=fieldValue(world,tile.id,old.id);
   if(op.migration==='preserve'&&!validValue(op.definition,value))throw Error('Property migration would discard values; choose clamp explicitly');
   tile.properties[old.id]=op.migration==='clamp'?round(Math.max(op.definition.min,Math.min(op.definition.max,value))):value;
  }
  world.definitions.fields=world.definitions.fields.filter(f=>f.id!==op.definition.id);
  world.definitions.fields.push(op.definition);world.definitions.fields.sort((a,b)=>a.id<b.id?-1:1);
 }
 if(op.kind==='field-set') {
  const field=world.definitions.fields.find(f=>f.id===op.fieldId);
  if(!field||!validValue(field,op.value)||round(op.value)!==op.value)throw Error('Property value is unknown, out of bounds, or exceeds three decimal places');
  world.tiles[op.tileId].properties[op.fieldId]=op.value;
 }
 if(op.kind==='field-remove') {
  if(!world.definitions.fields.some(f=>f.id===op.fieldId))throw Error('Unknown property');
  if(world.definitions.rules.some(r=>r.effects.some(e=>e.fieldId===op.fieldId)||reads(r).some(read=>read.fieldId===op.fieldId)))throw Error('Remove dependent rules before removing a property');
  world.definitions.fields=world.definitions.fields.filter(f=>f.id!==op.fieldId);
  for(const tile of world.tiles)delete tile.properties[op.fieldId];
 }
 if(op.kind==='rule-define') {
  if(op.tileId!==op.rule.tileId)throw Error('Rule origin must match operation tile');
  const old=world.definitions.rules.find(r=>r.id===op.rule.id);
  if(old&&old.tileId!==op.tileId)throw Error('Rule update cannot move its origin');
  const recorded=world.history.flatMap(p=>p.operations).filter(o=>o.kind==='rule-define'&&o.rule.id===op.rule.id).map(o=>o.kind==='rule-define'?o.rule.version:0);
  const previous=recorded.reduce((max,version)=>Math.max(max,version),old?.version??0);
  if(op.rule.version!==previous+1)throw Error(`Rule version must be ${previous+1}`);
  world.definitions.rules=world.definitions.rules.filter(r=>r.id!==op.rule.id);
  world.definitions.rules.push(op.rule);world.definitions.rules.sort((a,b)=>a.id<b.id?-1:1);
 }
 if(op.kind==='rule-remove') {
  const old=world.definitions.rules.find(r=>r.id===op.ruleId);
  if(!old||old.tileId!==op.tileId)throw Error('Unknown rule or mismatched origin');
  world.definitions.rules=world.definitions.rules.filter(r=>r.id!==op.ruleId);
 }
}
export function readValue(world:World,tileId:number,read:Read):number {
 const at=(id:number)=>read.source==='custom'?fieldValue(world,id,read.fieldId!):read.source==='waterMm'?world.tiles[id].waterL/world.cells[id].areaM2:world.tiles[id][read.source];
 if(read.sample==='self')return at(tileId);
 const ids=[...world.cells[tileId].neighbors].sort((a,b)=>a-b),values=ids.map(at);
 return read.sample==='neighbors-min'?Math.min(...values):read.sample==='neighbors-max'?Math.max(...values):values.reduce((sum,n)=>sum+n,0)/ids.length;
}
export function advanceExtensions(world:World,pluginChanges:{tileId:number;fieldId:string;value:number;kind:'add'|'set'}[]=[]):void {
 // Rules read the completed built-in phase and one common custom-state snapshot.
 // Aggregate writes before committing: no rule can observe another rule's writes.
 const before=new Map(world.definitions.fields.filter(f=>f.quantity==='stock').map(f=>[f.id,world.tiles.map(t=>stockUnits(world,t.id,f))]));
 const transfers:TransferRequest[]=[];
 const changes=new Map<string,{tileId:number;fieldId:string;value:number;kind:'add'|'set'}>();
 for(const change of pluginChanges){const key=`${change.tileId}:${change.fieldId}`,prior=changes.get(key);changes.set(key,{...change,value:change.value+(prior?.value??0)});}
 for(const rule of [...world.definitions.rules].sort((a,b)=>a.id<b.id?-1:1)) {
  if(!rule.enabled||world.tick%rule.everyDays!==0)continue;
  for(const tileId of ruleTargets(world,rule)) {
   const matches=rule.conditions.every(c=>{
    const n=readValue(world,tileId,c.read);
    return c.comparison==='lt'?n<c.value:c.comparison==='lte'?n<=c.value:c.comparison==='eq'?n===c.value:c.comparison==='gte'?n>=c.value:n>c.value;
   });
   if(!matches)continue;
   for(const [effectIndex,effect] of rule.effects.entries()) {
    let value=effect.value.constant+effect.value.terms.reduce((sum,t)=>sum+t.coefficient*readValue(world,tileId,t.read),0);
    if(!Number.isFinite(value))throw Error('Non-finite rule result');
    value=Math.max(effect.value.min??-Infinity,Math.min(effect.value.max??Infinity,value));
    if(effect.kind==='transfer') {
     const field=world.definitions.fields.find(f=>f.id===effect.fieldId)!;
     const destinations=world.cells[tileId].neighbors.filter(id=>effect.destination==='neighbors'||world.tiles[id].elevationM<world.tiles[tileId].elevationM).sort((a,b)=>a-b);
     if(!destinations.length)continue;
     const amountMilli=Math.round(Math.max(0,Math.min(field.max,value))*1000);
     if(amountMilli)transfers.push({ruleId:rule.id,effectIndex,from:tileId,destinations,fieldId:field.id,amountMilli});
     continue;
    }
    const key=`${tileId}:${effect.fieldId}`,prior=changes.get(key);
    changes.set(key,{tileId,fieldId:effect.fieldId,value:value+(prior?.value??0),kind:effect.kind});
   }
  }
 }
 for(const change of changes.values()) {
  const field=world.definitions.fields.find(f=>f.id===change.fieldId)!;
  if(!Number.isFinite(change.value))throw Error('Non-finite combined custom output');
  const value=change.kind==='add'?fieldValue(world,change.tileId,change.fieldId)+change.value:change.value;
  world.tiles[change.tileId].properties[change.fieldId]=round(Math.max(field.min,Math.min(field.max,value)));
 }
 settleTransfers(world,transfers,before);
}
