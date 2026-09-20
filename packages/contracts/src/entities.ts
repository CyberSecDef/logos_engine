import {z} from 'zod';
const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),scalar=z.number().finite().min(-1e6).max(1e6),tile=z.number().int().nonnegative();
export const EntityPropertySchema=z.object({id,label:z.string().min(1).max(60),unit:z.string().max(24),min:scalar,max:scalar,defaultValue:scalar}).strict();
export const EntityTypeSchema=z.object({id,version:z.number().int().min(1),label:z.string().min(1).max(60),description:z.string().max(300),properties:z.array(EntityPropertySchema).max(8)}).strict();
export const EntitySchema=z.object({id,typeId:id,tileId:tile,label:z.string().min(1).max(80),properties:z.record(scalar)}).strict();
export const EntitiesSchema=z.object({types:z.array(EntityTypeSchema).max(16),instances:z.array(EntitySchema).max(256)}).strict();
export const entityOperations=[
 z.object({kind:z.literal('entity-type-define'),tileId:tile,definition:EntityTypeSchema,migration:z.enum(['preserve','clamp']),discardProperties:z.array(id).max(8)}).strict(),
 z.object({kind:z.literal('entity-type-remove'),tileId:tile,typeId:id}).strict(),
 z.object({kind:z.literal('entity-create'),tileId:tile,entity:EntitySchema}).strict(),
 z.object({kind:z.literal('entity-update'),tileId:tile,entityId:id,label:z.string().min(1).max(80).optional(),properties:z.record(scalar).optional(),toTileId:tile.optional()}).strict(),
 z.object({kind:z.literal('entity-remove'),tileId:tile,entityId:id}).strict(),
] as const;
