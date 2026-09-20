import {ecologyOperations} from './ecology.js';
import {settlementOperations} from './settlements.js';
import {entityOperations} from './entities.js';
import {artworkOperations} from './artwork.js';
import { z } from 'zod';
import { pluginOperations } from './plugins.js';
import { extensionOperations } from './extensions.js';
import { modelSchema } from './model-schema.js';
import { Id, OperationSchema, ProposalSchema } from './index.js';
export const PromptRequestSchema=z.object({
 id:Id,worldId:Id,expectedRevision:z.number().int().nonnegative(),tileId:z.number().int().nonnegative(),
 mode:z.enum(['discuss','propose']),scope:z.enum(['tile','neighbors','world']).default('tile'),
 message:z.string().trim().min(1).max(4000),
}).strict();
export const ModelReplySchema=z.object({
 kind:z.enum(['discussion','proposal','clarification','unsupported']),
 message:z.string().trim().min(1).max(6000),assumptions:z.array(z.string().max(500)).max(8),
 operations:z.array(OperationSchema).max(16),
}).strict().superRefine((v,ctx)=>{
 if((v.kind==='proposal')!==(v.operations.length>0))ctx.addIssue({code:'custom',message:'Only proposals may contain operations, and a proposal must contain at least one'});
});
export const PromptJobSchema=z.object({
 request:PromptRequestSchema,provider:z.string(),status:z.enum(['running','awaiting-import','complete','failed','cancelled']),
 reply:ModelReplySchema.optional(),proposal:ProposalSchema.optional(),error:z.string().optional(),
 createdAt:z.string(),
}).strict();
export type PromptRequest=z.infer<typeof PromptRequestSchema>;
export type ModelReply=z.infer<typeof ModelReplySchema>;
export type PromptJob=z.infer<typeof PromptJobSchema>;
// JSON Schema is exported to both local agents and direct API adapters.
export const modelReplyJsonSchema={
 type:'object',additionalProperties:false,required:['kind','message','assumptions','operations'],properties:{
  kind:{type:'string',enum:['discussion','proposal','clarification','unsupported']},message:{type:'string'},
  assumptions:{type:'array',items:{type:'string'}},
  operations:{type:'array',items:{anyOf:[
   ...ecologyOperations.map(modelSchema),
   ...settlementOperations.map(modelSchema),
   ...extensionOperations.map(modelSchema),
   ...entityOperations.map(modelSchema),
   ...artworkOperations.map(modelSchema),
   ...pluginOperations.map(modelSchema),
   {type:'object',additionalProperties:false,required:['kind','tileId','deltaM'],properties:{kind:{const:'elevation'},tileId:{type:'integer'},deltaM:{type:'integer',minimum:-2000,maximum:2000}}},
   {type:'object',additionalProperties:false,required:['kind','tileId','mmPerDay'],properties:{kind:{const:'rainfall'},tileId:{type:'integer'},mmPerDay:{type:'integer',minimum:0,maximum:500}}},
   {type:'object',additionalProperties:false,required:['kind','tileId','enabled'],properties:{kind:{const:'communication'},tileId:{type:'integer'},enabled:{type:'boolean'}}},
   {type:'object',additionalProperties:false,required:['kind','tileId','celsius','mode'],properties:{kind:{const:'temperature'},tileId:{type:'integer'},celsius:{type:'number',minimum:-100,maximum:200},mode:{type:'string',enum:['pulse','sustained']}}},
   {type:'object',additionalProperties:false,required:['kind','tileId'],properties:{kind:{const:'temperature-reset'},tileId:{type:'integer'}}},
  ]}},
 },
};
