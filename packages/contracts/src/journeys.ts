import {z} from 'zod';
const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),tile=z.number().int().min(0).max(6761),food=z.number().int().min(0).max(1e9),population=z.number().int().min(0).max(1e6);
const path=z.array(tile).min(2).max(65),days=z.number().int().min(1).max(30),cargo=z.array(z.object({fieldId:id,amount:z.number().min(0).max(1e9)}).strict()).max(8);
export const JourneySchema=z.object({id,label:z.string().trim().min(1).max(80),path,daysPerHop:days,index:z.number().int().min(0).max(63),remainingDays:z.number().int().min(0).max(30),population,foodRations:food,cargo,departedTick:z.number().int().nonnegative(),shortageDays:z.number().int().min(0).max(3650),shortageIntervalDays:z.number().int().min(1).max(3650),lossPermille:z.number().int().min(0).max(1000)}).strict();
export const JourneyReportSchema=z.object({journeyId:id,label:z.string().max(80),origin:tile,tileId:tile,destination:tile,status:z.enum(['moving','arrived','closed','submerged','no-settlement','population-capacity','food-capacity','cargo-capacity','no-travelers']),beforePopulation:population,afterPopulation:population,beforeFood:food,afterFood:food,consumed:population,unmet:population,losses:population}).strict();
export const JourneysSchema=z.object({model:z.literal('land-journeys-v1'),active:z.array(JourneySchema).max(64),lastDay:z.object({tick:z.number().int().nonnegative(),entries:z.array(JourneyReportSchema).max(64)}).strict().optional()}).strict();
export const journeyOperations=[
 z.object({kind:z.literal('journey-depart'),tileId:tile,journeyId:id,label:z.string().trim().min(1).max(80),path,daysPerHop:days,population:population.min(1),foodRations:food,cargo}).strict(),
 z.object({kind:z.literal('journey-redirect'),tileId:tile,journeyId:id,path,daysPerHop:days}).strict(),
 z.object({kind:z.literal('journey-provision'),tileId:tile,journeyId:id,foodRations:food.min(1)}).strict(),
 z.object({kind:z.literal('journey-dock'),tileId:tile,journeyId:id}).strict(),
] as const;
export type Journey=z.infer<typeof JourneySchema>;
export type JourneyStatus=z.infer<typeof JourneyReportSchema>['status'];
