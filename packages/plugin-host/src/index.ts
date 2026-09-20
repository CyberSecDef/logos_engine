import {PLUGIN_LIMITS,type PluginDefinition} from '../../contracts/src/plugins.js';
import type {Read} from '../../contracts/src/extensions.js';
export type PluginEffect={fieldId:string;entityTypeId?:string;kind:'add'|'set';value:number};
// No eval, imports, callbacks from world data, clock, I/O or ambient randomness.
// The only host read is a validated numeric read supplied by the engine.
export function executePlugin(definition:PluginDefinition,input:{tick:number;state:number[];read:(read:Read)=>number},budget:{remaining:number}) {
 const stack:number[]=[],state=[...input.state],effects:PluginEffect[]=[];let pc=0,steps=0;
 const push=(value:number)=>{if(!Number.isFinite(value)||Math.abs(value)>1e9)throw Error('numeric result outside ±1e9');if(stack.length>=PLUGIN_LIMITS.stack)throw Error('stack limit exceeded');stack.push(value);};
 const pop=()=>{if(!stack.length)throw Error('stack underflow');return stack.pop()!;};
 while(pc<definition.program.length) {
  if(++steps>PLUGIN_LIMITS.instructions||--budget.remaining<0)throw Error('instruction budget exceeded');
  const ins=definition.program[pc++];
  switch(ins.op) {
   case 'stop':return {state,effects,steps};
   case 'constant':push(ins.value);break;
   case 'read':push(input.read(ins.read));break;
   case 'tick':push(input.tick);break;
   case 'state-get':{const index=definition.stateFields.findIndex(f=>f.id===ins.key);if(index<0)throw Error('unknown state key');push(state[index]);break;}
   case 'state-set':{const index=definition.stateFields.findIndex(f=>f.id===ins.key),field=definition.stateFields[index],value=pop();if(!field||value<field.min||value>field.max)throw Error('state value outside bounds');state[index]=Math.round(value*1000)/1000;break;}
   case 'jump':pc=ins.target;break;
   case 'jump-zero':if(pop()===0)pc=ins.target;break;
   case 'dup':{const value=pop();push(value);push(value);break;}
   case 'drop':pop();break;
   case 'floor':push(Math.floor(pop()));break;
   case 'emit':if(effects.length>=PLUGIN_LIMITS.emissions)throw Error('effect limit exceeded');effects.push({fieldId:ins.fieldId,...(ins.entityTypeId?{entityTypeId:ins.entityTypeId}:{}),kind:ins.mode,value:pop()});break;
   default:{const b=pop(),a=pop();switch(ins.op){
    case 'add':push(a+b);break;case 'subtract':push(a-b);break;case 'multiply':push(a*b);break;
    case 'divide':if(b===0)throw Error('division by zero');push(a/b);break;
    case 'modulo':if(b===0)throw Error('modulo by zero');push(a%b);break;
    case 'min':push(Math.min(a,b));break;case 'max':push(Math.max(a,b));break;
    case 'less':push(a<b?1:0);break;case 'greater':push(a>b?1:0);break;case 'equal':push(a===b?1:0);break;
    default:throw Error('unknown instruction');
   }}
  }
 }
 return {state,effects,steps};
}
