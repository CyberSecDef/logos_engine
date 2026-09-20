import type {World,Operation} from '../../contracts/src/index.js';
import {DEFAULT_ECOLOGY_SETTINGS} from '../../contracts/src/ecology-defaults.js';
// Returns reviewable operations only. Never changes the input world.
export function ecologySetup(w:World,tileId:number):Operation[] {
 const fieldId=w.soilEcology?.fieldId??'soil-fertility',field=w.definitions.fields.find(f=>f.id===fieldId),operations:Operation[]=[];
 if(field?.quantity==='stock')throw Error('Soil fertility must be an index; choose a different property through the advisor');
 if(!field){const prior=w.history.flatMap(p=>p.operations).filter(o=>o.kind==='field-define'&&o.definition.id===fieldId);const version=1+Math.max(0,...prior.map(o=>o.kind==='field-define'?o.definition.version:0));operations.push({kind:'field-define',tileId,migration:'preserve',definition:{id:fieldId,version,label:'Soil fertility',unit:'points',description:'Soil productivity affected by weather, stewardship and urban pressure.',min:0,max:100,defaultValue:50}});}
 for(const rule of w.definitions.rules)if(rule.enabled&&rule.effects.some(e=>!e.entityTypeId&&e.fieldId===fieldId))operations.push({kind:'rule-define',tileId:rule.tileId,rule:{...rule,version:rule.version+1,enabled:false}});
 for(const plugin of w.plugins)if(plugin.definition.enabled&&plugin.definition.program.some(i=>i.op==='emit'&&!i.entityTypeId&&i.fieldId===fieldId))operations.push({kind:'plugin-toggle',tileId:plugin.definition.tileId,pluginId:plugin.definition.id,enabled:false});
 operations.push({kind:'soil-ecology-configure',tileId,expectedVersion:w.soilEcology?.version??0,enabled:true,fieldId,settings:{...(w.soilEcology?.settings??DEFAULT_ECOLOGY_SETTINGS)}});
 if(operations.length>32)throw Error('Too many conflicting soil writers; ask the advisor to disable them in reviewed stages first');
 return operations;
}
