import {z} from 'zod';
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),tile=z.number().int().min(0).max(6761),rate=z.number().int().min(0).max(1000);
export const HealthSchema=z.object({ill:count,immune:count}).strict();
export const DiseaseSettingsSchema=z.object({waterExposurePermille:rate,recoveryPermille:rate,immunityLossPermille:rate}).strict();
export const DiseaseSchema=z.object({model:z.literal('health-state-v1'),version:count.positive(),enabled:z.boolean(),settings:DiseaseSettingsSchema,contact:z.object({model:z.literal('daily-contact-v1'),enabled:z.boolean(),ratePermille:rate}).strict().optional(),lastDay:z.object({tick:count,waterCases:count,recovered:count,immunityLost:count,contactCases:count.optional(),contactEntries:z.array(z.object({homeTileId:tile.optional(),atTileId:tile.optional(),journeyId:z.string().max(80).optional(),group:z.enum(['resident','visitor','transit']),population:count,susceptible:count,exposedToIll:count,presentPopulation:count,cases:count}).strict()).max(135302).optional()}).strict().optional()}).strict();
export const diseaseOperations=[
 z.object({kind:z.literal('disease-contact-configure'),tileId:tile,expectedVersion:count.positive(),enabled:z.boolean(),ratePermille:rate}).strict(),
 z.object({kind:z.literal('disease-configure'),tileId:tile,expectedVersion:count,enabled:z.boolean(),settings:DiseaseSettingsSchema}).strict(),
 z.object({kind:z.literal('disease-introduce'),tileId:tile,count:count.positive()}).strict(),
 z.object({kind:z.literal('disease-treat'),tileId:tile,count:count.positive()}).strict(),
] as const;
export type Health=z.infer<typeof HealthSchema>;
