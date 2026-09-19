import {z} from 'zod';
import {ReadSchema} from './extensions.js';
const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),scalar=z.number().finite().min(-1e9).max(1e9);
// A flat instruction list prevents recursive parsing and makes every step meterable.
export const InstructionSchema=z.discriminatedUnion('op',[
 z.object({op:z.literal('constant'),value:scalar}).strict(),
 z.object({op:z.literal('read'),read:ReadSchema}).strict(),
 z.object({op:z.literal('state-get'),key:id}).strict(),
 z.object({op:z.literal('state-set'),key:id}).strict(),
 z.object({op:z.literal('jump'),target:z.number().int().min(0).max(127)}).strict(),
 z.object({op:z.literal('jump-zero'),target:z.number().int().min(0).max(127)}).strict(),
 z.object({op:z.literal('emit'),fieldId:id,mode:z.enum(['add','set'])}).strict(),
 ...(['add','subtract','multiply','divide','modulo','min','max','less','greater','equal','floor','dup','drop','tick','stop'] as const).map(op=>z.object({op:z.literal(op)}).strict()),
]);
export const PluginDefinitionSchema=z.object({
 id,version:z.number().int().min(1),abi:z.literal('logos-stack-v1'),label:z.string().min(1).max(80),description:z.string().max(400),
 tileId:z.number().int().nonnegative(),scope:z.enum(['tile','neighbors','world']),enabled:z.boolean(),everyDays:z.number().int().min(1).max(365),
 stateFields:z.array(z.object({id,min:scalar,max:scalar,initial:scalar}).strict()).max(8),
 program:z.array(InstructionSchema).min(1).max(128),
}).strict();
export const PluginInstanceSchema=z.object({definition:PluginDefinitionSchema,state:z.array(z.object({tileId:z.number().int().nonnegative(),values:z.array(scalar).max(8)}).strict()).max(6762)}).strict();
export const pluginOperations=[
 z.object({kind:z.literal('plugin-define'),tileId:z.number().int().nonnegative(),definition:PluginDefinitionSchema,migration:z.enum(['preserve','reset'])}).strict(),
 z.object({kind:z.literal('plugin-toggle'),tileId:z.number().int().nonnegative(),pluginId:id,enabled:z.boolean()}).strict(),
 z.object({kind:z.literal('plugin-remove'),tileId:z.number().int().nonnegative(),pluginId:id}).strict(),
] as const;
export type Instruction=z.infer<typeof InstructionSchema>;
export type PluginDefinition=z.infer<typeof PluginDefinitionSchema>;
export type PluginInstance=z.infer<typeof PluginInstanceSchema>;
export const PLUGIN_LIMITS={instructions:512,stack:32,emissions:16,worldFuel:4000000,plugins:8} as const;
