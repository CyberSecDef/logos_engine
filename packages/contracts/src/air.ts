import {z} from 'zod';import {AIR_LOAD_MAX} from './air-defaults.js';
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),load=z.number().int().min(0).max(AIR_LOAD_MAX),tile=z.number().int().min(0).max(6761);
export const AirTileSchema=z.object({load,emissionPerDay:z.number().int().min(0).max(1_000_000),windBearingDeg:z.number().int().min(0).max(359),windPermille:z.number().int().min(0).max(900)}).strict();
export const AirSettingsSchema=z.object({mixingPermille:z.number().int().min(0).max(100),removalPermille:z.number().int().min(0).max(1000)}).strict();
export const AirBudgetSchema=z.object({tileId:tile,before:load,emitted:load,rejectedEmission:load,incoming:load,outgoing:load,removed:load,after:load}).strict();
export const AirDaySchema=z.object({tick:count,before:count,emitted:count,rejectedEmission:count,removed:count,after:count,transferred:count,tiles:z.array(AirBudgetSchema).max(6762),transfers:z.array(z.object({from:tile,to:tile,wind:load,mixing:load,amount:load.positive()}).strict()).max(40572)}).strict();
export const AirSchema=z.object({model:z.literal('air-transport-v1'),version:count.positive(),enabled:z.boolean(),settings:AirSettingsSchema,lastDay:AirDaySchema.optional()}).strict();
export const airOperations=[
 z.object({kind:z.literal('air-configure'),tileId:tile,expectedVersion:count,enabled:z.boolean(),settings:AirSettingsSchema}).strict(),
 z.object({kind:z.literal('air-release'),tileId:tile,delta:z.number().int().min(-AIR_LOAD_MAX).max(AIR_LOAD_MAX)}).strict(),
 z.object({kind:z.literal('air-source'),tileId:tile,unitsPerDay:z.number().int().min(0).max(1_000_000)}).strict(),
 z.object({kind:z.literal('air-wind'),tileId:tile,bearingDeg:z.number().int().min(0).max(359),transportPermille:z.number().int().min(0).max(900)}).strict(),
] as const;
export type AirDay=z.infer<typeof AirDaySchema>;
