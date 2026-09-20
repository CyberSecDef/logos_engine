import {SETTLEMENT_LIMITS} from './settlement-defaults.js';
export {SETTLEMENT_LIMITS,DEFAULT_SETTLEMENT_SETTINGS} from './settlement-defaults.js';
import {z} from 'zod';
const count=(max:number)=>z.number().int().min(0).max(max),tile=count(6761);
export const SettlementSettingsSchema=z.object({
 capacity:count(SETTLEMENT_LIMITS.population),farmRationsPerDay:count(10_000_000),workerRationsPerDay:count(100),
 shortageIntervalDays:z.number().int().min(1).max(3650),growthIntervalDays:z.number().int().min(1).max(3650),
 reserveDays:count(3650),lossPermille:count(1000),growthPermille:count(1000),
}).strict();
export const SettlementDaySchema=z.object({
 tick:z.number().int().nonnegative(),beforeFood:count(SETTLEMENT_LIMITS.food),produced:count(10_000_000),overflow:count(10_000_000),consumed:count(SETTLEMENT_LIMITS.population),unmet:count(SETTLEMENT_LIMITS.population),afterFood:count(SETTLEMENT_LIMITS.food),
 beforePopulation:count(SETTLEMENT_LIMITS.population),births:count(SETTLEMENT_LIMITS.population),losses:count(SETTLEMENT_LIMITS.population),afterPopulation:count(SETTLEMENT_LIMITS.population),
 potential:count(10_000_000),temperaturePermille:count(1000),moisturePermille:count(1000),land:z.boolean(),flooded:z.boolean(),
}).strict();
export const SettlementSchema=z.object({
 model:z.literal('food-population-v1'),label:z.string().trim().min(1).max(80),rulesVersion:z.number().int().min(1),
 settings:SettlementSettingsSchema,foodRations:count(SETTLEMENT_LIMITS.food),shortageDays:count(3650),surplusDays:count(3650),lastDay:SettlementDaySchema.optional(),
}).strict();
export const settlementOperations=[
 z.object({kind:z.literal('settlement-create'),tileId:tile,label:z.string().trim().min(1).max(80),population:count(SETTLEMENT_LIMITS.population),foodRations:count(SETTLEMENT_LIMITS.food),settings:SettlementSettingsSchema.optional()}).strict(),
 z.object({kind:z.literal('settlement-configure'),tileId:tile,expectedRulesVersion:z.number().int().min(1),settings:SettlementSettingsSchema.partial(),label:z.string().trim().min(1).max(80).optional()}).strict(),
 z.object({kind:z.literal('settlement-food'),tileId:tile,deltaRations:z.number().int().min(-SETTLEMENT_LIMITS.food).max(SETTLEMENT_LIMITS.food)}).strict(),
 z.object({kind:z.literal('settlement-population'),tileId:tile,population:count(SETTLEMENT_LIMITS.population)}).strict(),
 z.object({kind:z.literal('settlement-remove'),tileId:tile,discardPopulation:count(SETTLEMENT_LIMITS.population),discardFoodRations:count(SETTLEMENT_LIMITS.food)}).strict(),
] as const;
export type Settlement=z.infer<typeof SettlementSchema>;
