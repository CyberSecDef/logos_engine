import {z} from 'zod';
const count=z.number().int().min(0).max(1000000),tile=z.number().int().min(0).max(6761),tick=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
export const ConflictSettingsSchema=z.object({deploymentPermille:z.number().int().min(0).max(1000),minimumTroops:count.min(1),daysPerHop:z.number().int().min(1).max(30),provisionDays:z.number().int().min(1).max(365),cooldownDays:z.number().int().min(1).max(3650),lossPermille:z.number().int().min(0).max(500),requiredAdvantagePermille:z.number().int().min(1001).max(4000),maxDeparturesPerDay:z.number().int().min(0).max(16)}).strict();

const battle=z.object({journeyId:id,from:tile,to:tile,attackerFaction:id,defenderFaction:id.optional(),outcome:z.enum(['captured','repelled','cancelled']),attackerBefore:count,attackerAfter:count,attackerLosses:count,defenderBefore:count,defenderAfter:count,defenderLosses:count}).strict();
export const ConflictSchema=z.object({model:z.literal('adjacent-conflict-v1'),version:tick.positive(),enabled:z.boolean(),settings:ConflictSettingsSchema,nextSequence:tick.positive(),lastActions:z.array(z.object({tileId:tile,tick}).strict()).max(6762),lastDay:z.object({tick,battles:z.array(battle).max(64),launches:z.array(z.object({journeyId:id,from:tile,to:tile,factionId:id,population:count,foodRations:z.number().int().min(0).max(1e9)}).strict()).max(16)}).strict().optional()}).strict();
export const conflictOperations=[z.object({kind:z.literal('conflict-configure'),tileId:tile,expectedVersion:tick,enabled:z.boolean(),settings:ConflictSettingsSchema}).strict()] as const;

export {DEFAULT_CONFLICT_SETTINGS} from './conflict-defaults.js';
