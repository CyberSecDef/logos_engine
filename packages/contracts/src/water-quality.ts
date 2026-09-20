import {z} from 'zod';import {WATER_POLLUTION_MAX} from './water-quality-defaults.js';
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),load=z.number().int().min(0).max(WATER_POLLUTION_MAX),tile=z.number().int().min(0).max(6761),permille=z.number().int().min(0).max(1000);
export const WaterQualityTileSchema=z.object({dissolved:load,surface:load,emissionPerDay:z.number().int().min(0).max(1_000_000),sanitationCapacity:load,sanitationCondition:permille}).strict();
export const WaterQualitySettingsSchema=z.object({washoffPermille:permille,settlingPermille:permille,decayPermille:permille,qualityLimitPerMillionL:z.number().int().min(1).max(1_000_000),settlementWasteEnabled:z.boolean(),wastePerPerson:z.number().int().min(0).max(1000),shortageLossPermille:permille,recoveryPermille:permille}).strict();
export const WaterQualityBudgetSchema=z.object({tileId:tile,beforeDissolved:load,beforeSurface:load,emitted:load,waste:load,rejectedEmission:load,rejectedWaste:load,treatedDissolved:load,treatedSurface:load,dried:load,washed:load,settled:load,incoming:load,outgoing:load,oceanExport:load,decayedDissolved:load,decayedSurface:load,afterDissolved:load,afterSurface:load,effectiveTreatmentCapacity:load}).strict();
export const WaterQualityDaySchema=z.object({tick:count,before:count,emitted:count,waste:count,rejectedEmission:count,rejectedWaste:count,treated:count,oceanExport:count,decayed:count,after:count,transferred:count,tiles:z.array(WaterQualityBudgetSchema).max(6762),transfers:z.array(z.object({from:tile,to:tile,waterL:count.positive(),load:load.positive()}).strict()).max(40572)}).strict();
export const WaterQualitySchema=z.object({model:z.literal('runoff-pollution-v1'),version:count.positive(),enabled:z.boolean(),settings:WaterQualitySettingsSchema,lastDay:WaterQualityDaySchema.optional()}).strict();
export const waterQualityOperations=[
 z.object({kind:z.literal('water-quality-configure'),tileId:tile,expectedVersion:count,enabled:z.boolean(),settings:WaterQualitySettingsSchema}).strict(),
 z.object({kind:z.literal('water-pollution-release'),tileId:tile,amount:load,pool:z.enum(['water','surface'])}).strict(),
 z.object({kind:z.literal('water-pollution-cleanup'),tileId:tile,amount:load}).strict(),
 z.object({kind:z.literal('water-pollution-source'),tileId:tile,unitsPerDay:z.number().int().min(0).max(1_000_000)}).strict(),
 z.object({kind:z.literal('sanitation-configure'),tileId:tile,capacityPerDay:load,conditionPermille:permille}).strict(),
] as const;
export type WaterQualityDay=z.infer<typeof WaterQualityDaySchema>;
