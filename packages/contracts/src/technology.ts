import {z} from 'zod';
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),tile=z.number().int().min(0).max(6761),id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
export const TechnologyDefinitionSchema=z.object({id,label:z.string().trim().min(1).max(80),workRequired:z.number().int().min(1).max(1000000000),farmBonusPermille:z.number().int().min(0).max(1000),treatmentBonusPermille:z.number().int().min(0).max(1000).optional(),prerequisites:z.array(id).max(4).optional()}).strict();
export const TechnologySchema=z.object({model:z.literal('local-research-v1'),version:count.positive(),enabled:z.boolean(),settings:z.object({workerPermille:z.number().int().min(0).max(1000),reserveDays:z.number().int().min(0).max(3650)}).strict(),exchange:z.object({model:z.literal('neighbor-knowledge-v1'),enabled:z.boolean(),bonusPermille:z.number().int().min(0).max(1000)}).strict().optional(),definitions:z.array(TechnologyDefinitionSchema).max(16)}).strict();
export const ResearchSchema=z.object({paused:z.boolean().optional(),projects:z.array(z.object({technologyId:id,progress:count,completedTick:count.optional()}).strict()).max(16),assignment:z.object({automatic:z.boolean(),technologyId:id,workers:z.number().int().min(1).max(1000000),reserveDays:z.number().int().min(0).max(3650)}).strict().optional(),lastDay:z.object({tick:count,workers:count,progressAdded:count,knowledgeWork:count.optional(),knowledgeSource:tile.optional(),reason:z.enum(['prerequisites','idle','working','completed','paused','empty','terrain','food','workers'])}).strict().optional()}).strict();
export const technologyOperations=[
 z.object({kind:z.literal('knowledge-configure'),tileId:tile,expectedVersion:count.positive(),enabled:z.boolean(),bonusPermille:z.number().int().min(0).max(1000)}).strict(),
 z.object({kind:z.literal('technology-configure'),tileId:tile,expectedVersion:count,enabled:z.boolean(),settings:z.object({workerPermille:z.number().int().min(0).max(1000),reserveDays:z.number().int().min(0).max(3650)}).strict()}).strict(),
 z.object({kind:z.literal('technology-define'),tileId:tile,expectedVersion:count.positive(),definition:TechnologyDefinitionSchema}).strict(),
 z.object({kind:z.literal('research-assign'),tileId:tile,technologyId:id,workers:z.number().int().min(1).max(1000000),reserveDays:z.number().int().min(0).max(3650)}).strict(),
 z.object({kind:z.literal('research-pause'),tileId:tile}).strict(),
 z.object({kind:z.literal('research-auto'),tileId:tile}).strict(),
] as const;
export const CULTIVATION_TECHNOLOGY={id:'improved-cultivation',label:'Improved cultivation',workRequired:200,farmBonusPermille:200};

export const DEFAULT_RESEARCH_SETTINGS={workerPermille:100,reserveDays:7};

export const FILTRATION_TECHNOLOGY={id:'improved-filtration',label:'Improved filtration',workRequired:300,farmBonusPermille:0,treatmentBonusPermille:500};
