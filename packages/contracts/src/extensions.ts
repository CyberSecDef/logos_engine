import { z } from 'zod';
import {ArtworkSlot} from './artwork.js';

const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const scalar=z.number().finite().min(-1e9).max(1e9);
export const FieldDefinitionSchema=z.object({
 id,version:z.number().int().min(1),label:z.string().min(1).max(60),unit:z.string().max(24),
 description:z.string().max(300),quantity:z.enum(['index','stock']).optional(),min:scalar,max:scalar,defaultValue:scalar,
}).strict();
export const ReadSchema=z.object({
 source:z.enum(['temperatureC','rainMm','waterMm','vegetation','elevationM','population','custom']),
 fieldId:id.optional(),sample:z.enum(['self','neighbors-average','neighbors-min','neighbors-max']),
}).strict();
export const FormulaSchema=z.object({
 constant:scalar,min:scalar.optional(),max:scalar.optional(),terms:z.array(z.object({read:ReadSchema,coefficient:z.number().finite().min(-1000).max(1000)}).strict()).max(8),
}).strict();
export const ConditionSchema=z.object({read:ReadSchema,comparison:z.enum(['lt','lte','eq','gte','gt']),value:scalar}).strict();
export const CustomRuleSchema=z.object({
 id,version:z.number().int().min(1),label:z.string().min(1).max(80),tileId:z.number().int().nonnegative(),
 scope:z.enum(['tile','neighbors','world']),enabled:z.boolean(),everyDays:z.number().int().min(1).max(365),
 conditions:z.array(ConditionSchema).max(8),
 effects:z.array(z.object({fieldId:id,kind:z.enum(['add','set','transfer']),value:FormulaSchema,destination:z.enum(['neighbors','lower-neighbors']).optional()}).strict()).min(1).max(4),
}).strict();
export const AppearanceRuleSchema=z.object({
 id,version:z.number().int().min(1),label:z.string().min(1).max(80),tileId:z.number().int().nonnegative(),
 scope:z.enum(['tile','neighbors','world']),enabled:z.boolean(),priority:z.number().int().min(0).max(100),
 conditions:z.array(ConditionSchema).max(8),
 style:z.object({label:z.string().min(1).max(60),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),asset:z.enum(['none','terrain','ocean','city','alpine','forest','meadow','dry']),layers:z.array(z.object({asset:ArtworkSlot,opacity:z.number().finite().min(0).max(1)}).strict()).max(2).optional()}).strict(),
}).strict();
export type AppearanceRule=z.infer<typeof AppearanceRuleSchema>;
export const DefinitionsSchema=z.object({fields:z.array(FieldDefinitionSchema).max(32),rules:z.array(CustomRuleSchema).max(64),appearance:z.array(AppearanceRuleSchema).max(32).optional()}).strict();
export const extensionOperations=[
 z.object({kind:z.literal('appearance-define'),tileId:z.number().int().nonnegative(),rule:AppearanceRuleSchema}).strict(),
 z.object({kind:z.literal('appearance-remove'),tileId:z.number().int().nonnegative(),ruleId:id}).strict(),
 z.object({kind:z.literal('field-transfer'),tileId:z.number().int().nonnegative(),toTileId:z.number().int().nonnegative(),fieldId:id,amount:z.number().finite().min(0).max(1e9)}).strict(),
 z.object({kind:z.literal('field-define'),tileId:z.number().int().nonnegative(),definition:FieldDefinitionSchema,migration:z.enum(['preserve','clamp']),transform:z.object({scale:scalar,offset:scalar,precision:z.enum(['exact','round'])}).strict().optional()}).strict(),
 z.object({kind:z.literal('field-set'),tileId:z.number().int().nonnegative(),fieldId:id,value:scalar}).strict(),
 z.object({kind:z.literal('field-remove'),tileId:z.number().int().nonnegative(),fieldId:id}).strict(),
 z.object({kind:z.literal('rule-define'),tileId:z.number().int().nonnegative(),rule:CustomRuleSchema}).strict(),
 z.object({kind:z.literal('rule-remove'),tileId:z.number().int().nonnegative(),ruleId:id}).strict(),
] as const;
export type FieldDefinition=z.infer<typeof FieldDefinitionSchema>;
export type CustomRule=z.infer<typeof CustomRuleSchema>;
export type Read=z.infer<typeof ReadSchema>;

const milli=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const ResourceLedgerSchema=z.object({
 tick:milli,revision:milli,entries:z.array(z.object({
  fieldId:id,label:z.string(),unit:z.string(),beforeMilli:milli,createdMilli:milli,removedMilli:milli,transferredMilli:milli,afterMilli:milli,
 }).strict()).max(32),
}).strict();
