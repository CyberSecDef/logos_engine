import {z} from 'zod';
const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),tile=z.number().int().min(0).max(6761),version=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const FactionSchema=z.object({id,label:z.string().trim().min(1).max(80),color:z.string().regex(/^#[0-9a-fA-F]{6}$/)}).strict();
export const FactionsSchema=z.object({model:z.literal('territory-v1'),version:version.positive(),definitions:z.array(FactionSchema).max(32),relations:z.array(z.object({a:id,b:id,relationship:z.enum(['allied','hostile'])}).strict()).max(496)}).strict();
export const factionOperations=[
 z.object({kind:z.literal('faction-define'),tileId:tile,expectedVersion:version,faction:FactionSchema}).strict(),
 z.object({kind:z.literal('faction-remove'),tileId:tile,expectedVersion:version.positive(),factionId:id}).strict(),
 z.object({kind:z.literal('faction-claim'),tileId:tile,factionId:id.nullable()}).strict(),
 z.object({kind:z.literal('faction-relation'),tileId:tile,expectedVersion:version.positive(),factionId:id,otherFactionId:id,relationship:z.enum(['neutral','allied','hostile'])}).strict(),
] as const;
