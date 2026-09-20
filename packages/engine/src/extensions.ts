import {validRead,outputProperty,readEntities,invalidateEntityReads} from './entities.js';
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
   if(!validRead(world,read))throw Error('Invalid rule property reference');
  }
  for(const effect of rule.effects) {
   const field=outputProperty(world,effect.fieldId,effect.entityTypeId);if(!field)throw Error('Unknown rule output property');
   if(effect.value.min!==undefined&&effect.value.max!==undefined&&effect.value.min>effect.value.max)throw Error('Invalid formula clamp');
   if(effect.kind==='transfer') {
    if(effect.entityTypeId||!('quantity' in field)||field.quantity!=='stock'||!effect.destination)throw Error('Transfer rules require a stock property and a destination');
    if(rule.enabled)transferEdges+=targets.reduce((sum,id)=>sum+world.cells[id].neighbors.length,0);
   }else if(effect.destination!==undefined)throw Error('Only transfer effects have destinations');
  }
  if(!rule.enabled)continue;
  evaluations+=targets.length;
  for(const id of targets)for(const effect of rule.effects) {
   if(effect.kind==='transfer')continue;
   const key=`${id}:${effect.entityTypeId??''}:${effect.fieldId}`,prior=writers.get(key);
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
 const styleIds=new Set<string>();let styleEvaluations=0;
 for(const rule of world.definitions.appearance??[]) {
  if(styleIds.has(rule.id))throw Error('Duplicate appearance rule');styleIds.add(rule.id);
  const targets=ruleTargets(world,rule);if(rule.enabled)styleEvaluations+=targets.length;
  for(const {read} of rule.conditions)if(!validRead(world,read))throw Error('Invalid appearance property reference');
 }
 if(styleEvaluations>100000)throw Error('World exceeds appearance evaluation budget');
 if(evaluations>100000)throw Error('World exceeds custom rule evaluation budget');
}
export function applyExtension(world:World,op:Operation):void {
 if(op.kind==='appearance-define') {
  if(op.tileId!==op.rule.tileId)throw Error('Appearance origin must match operation tile');
  const old=world.definitions.appearance?.find(r=>r.id===op.rule.id);
  if(old&&old.tileId!==op.tileId)throw Error('Appearance update cannot move its origin');
  const previous=world.history.flatMap(p=>p.operations).reduce((max,o)=>o.kind==='appearance-define'&&o.rule.id===op.rule.id?Math.max(max,o.rule.version):max,old?.version??0);
  if(op.rule.version!==previous+1)throw Error(`Appearance version must be ${previous+1}`);
  world.definitions.appearance=[...(world.definitions.appearance??[]).filter(r=>r.id!==op.rule.id),op.rule].sort((a,b)=>a.id<b.id?-1:1);
 }
 if(op.kind==='appearance-remove') {
  const old=world.definitions.appearance?.find(r=>r.id===op.ruleId);
  if(!old||old.tileId!==op.tileId)throw Error('Unknown appearance rule or mismatched origin');
  world.definitions.appearance=world.definitions.appearance!.filter(r=>r.id!==op.ruleId);
 }
 if(op.kind==='field-transfer')transferOnce(world,op.tileId,op.toTileId,op.fieldId,op.amount);
 if(op.kind==='field-define') {
  const old=world.definitions.fields.find(f=>f.id===op.definition.id);
  const recorded=world.history.flatMap(p=>p.operations).filter(o=>o.kind==='field-define'&&o.definition.id===op.definition.id).map(o=>o.kind==='field-define'?o.definition.version:0);
  const previous=recorded.reduce((max,version)=>Math.max(max,version),old?.version??0);
  if(op.definition.version!==previous+1)throw Error(`Property definition version must be ${previous+1}`);
  if(op.definition.min>=op.definition.max||!validValue(op.definition,op.definition.defaultValue))throw Error('Invalid property bounds/default');
  if(op.transform&&!old)throw Error('Property conversion requires an existing definition');
  if(op.transform&&(old?.quantity==='stock'||op.definition.quantity==='stock')&&(op.transform.scale<=0||op.transform.offset!==0))throw Error('Stock conversions require a positive scale and zero offset');
  if(old)for(const tile of world.tiles) {
   let value=fieldValue(world,tile.id,old.id);
   if(op.transform) {
    value=value*op.transform.scale+op.transform.offset;
    if(!Number.isFinite(value))throw Error('Non-finite property conversion');
    if(op.migration==='clamp')value=Math.max(op.definition.min,Math.min(op.definition.max,value));
    if(op.transform.precision==='exact'&&Math.abs(value*1000-Math.round(value*1000))>1e-7)throw Error('Property conversion loses precision; choose round explicitly');
    value=round(value);
   }
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
  if(world.definitions.rules.some(r=>r.effects.some(e=>!e.entityTypeId&&e.fieldId===op.fieldId)||reads(r).some(read=>read.source==='custom'&&read.fieldId===op.fieldId)))throw Error('Remove dependent rules before removing a property');
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
 const at=(id:number)=>read.source==='foodRations'||read.source==='shortageDays'||read.source==='surplusDays'?(world.tiles[id].settlement?.[read.source]??0):read.source==='entity-count'||read.source==='entity-sum'?readEntities(world,id,read):read.source==='custom'?fieldValue(world,id,read.fieldId!):read.source==='waterMm'?world.tiles[id].waterL/world.cells[id].areaM2:world.tiles[id][read.source];
 if(read.sample==='self')return at(tileId);
 const ids=[...world.cells[tileId].neighbors].sort((a,b)=>a-b),values=ids.map(at);
 return read.sample==='neighbors-min'?Math.min(...values):read.sample==='neighbors-max'?Math.max(...values):values.reduce((sum,n)=>sum+n,0)/ids.length;
}
export function advanceExtensions(world:World,pluginChanges:{tileId:number;entityTypeId?:string;fieldId:string;value:number;kind:'add'|'set'}[]=[]):void {
 // Rules read the completed built-in phase and one common custom-state snapshot.
 // Aggregate writes before committing: no rule can observe another rule's writes.
 const before=new Map(world.definitions.fields.filter(f=>f.quantity==='stock').map(f=>[f.id,world.tiles.map(t=>stockUnits(world,t.id,f))]));
 const transfers:TransferRequest[]=[];
 const changes=new Map<string,{tileId:number;entityTypeId?:string;fieldId:string;value:number;kind:'add'|'set'}>();
 for(const change of pluginChanges){const key=`${change.tileId}:${change.entityTypeId??''}:${change.fieldId}`,prior=changes.get(key);changes.set(key,{...change,value:change.value+(prior?.value??0)});}
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
    const key=`${tileId}:${effect.entityTypeId??''}:${effect.fieldId}`,prior=changes.get(key);
    changes.set(key,{tileId,entityTypeId:effect.entityTypeId,fieldId:effect.fieldId,value:value+(prior?.value??0),kind:effect.kind});
   }
  }
 }
 for(const change of changes.values()) {
  const field=outputProperty(world,change.fieldId,change.entityTypeId)!;
  if(!Number.isFinite(change.value))throw Error('Non-finite combined custom output');
  if(change.entityTypeId){for(const e of world.entities?.instances??[]){if(e.tileId!==change.tileId||e.typeId!==change.entityTypeId)continue;const value=change.kind==='add'?(e.properties[field.id]??field.defaultValue)+change.value:change.value;e.properties[field.id]=round(Math.max(field.min,Math.min(field.max,value)));}continue;}
  const value=change.kind==='add'?fieldValue(world,change.tileId,change.fieldId)+change.value:change.value;
  world.tiles[change.tileId].properties[change.fieldId]=round(Math.max(field.min,Math.min(field.max,value)));
 }
 invalidateEntityReads(world);
 settleTransfers(world,transfers,before);
}

// Unit changes cannot silently leave dependent programs in their former units.
export function validateConversions(world:World,operations:Operation[]):void {
 for(const op of operations) {
  if(op.kind!=='field-define'||!op.transform)continue;
  const id=op.definition.id;
  if(operations.filter(o=>o.kind==='field-define'&&o.definition.id===id).length!==1)throw Error('Convert a property at most once per proposal');
  for(const route of world.resourceRoutes?.routes??[])if(route.fieldId===id&&!operations.some(o=>o.kind==='resource-route-define'&&o.route.id===route.id||o.kind==='resource-route-remove'&&o.routeId===route.id))throw Error(`Conversion requires an explicit update or removal of resource route ${route.id}`);
  for(const rule of world.definitions.rules) {
   if(!rule.effects.some(e=>!e.entityTypeId&&e.fieldId===id)&&!reads(rule).some(r=>r.source==='custom'&&r.fieldId===id))continue;
   if(!operations.some(o=>o.kind==='rule-define'&&o.rule.id===rule.id||o.kind==='rule-remove'&&o.ruleId===rule.id))throw Error(`Conversion requires an explicit update or removal of rule ${rule.id}`);
  }
  for(const rule of world.definitions.appearance??[]) {
   if(!rule.conditions.some(c=>c.read.source==='custom'&&c.read.fieldId===id))continue;
   if(!operations.some(o=>o.kind==='appearance-define'&&o.rule.id===rule.id||o.kind==='appearance-remove'&&o.ruleId===rule.id))throw Error(`Conversion requires an explicit update or removal of appearance rule ${rule.id}`);
  }
  for(const {definition:plugin} of world.plugins) {
   if(!plugin.program.some(i=>i.op==='emit'&&!i.entityTypeId&&i.fieldId===id||i.op==='read'&&i.read.source==='custom'&&i.read.fieldId===id))continue;
   if(!operations.some(o=>o.kind==='plugin-define'&&o.definition.id===plugin.id||o.kind==='plugin-remove'&&o.pluginId===plugin.id))throw Error(`Conversion requires an explicit update or removal of plugin ${plugin.id}`);
  }
 }
}
