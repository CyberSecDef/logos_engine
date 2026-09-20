import {FoodTradeSchema,foodTradeOperations} from './food-trade.js';
import {SoilEcologySchema,SoilDaySchema,ecologyOperations} from './ecology.js';
import {SettlementSchema,settlementOperations} from './settlements.js';
import {EntitiesSchema,entityOperations} from './entities.js';
import {ArtworkPackSchema,artworkOperations} from './artwork.js';
import { z } from 'zod';
import {PluginInstanceSchema,pluginOperations} from './plugins.js';
import { DefinitionsSchema, ResourceLedgerSchema, extensionOperations } from './extensions.js';

export const ENGINE_VERSION = '0.4.0';
export const Id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const uint = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const Vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const CellSchema = z.object({
  id: uint, center: Vec3, corners: z.array(Vec3).min(5).max(6),
  neighbors: z.array(uint).min(5).max(6), areaM2: uint.positive(),
}).strict();
export const TileSchema = z.object({
  id: uint, elevationM: z.number().int().min(-5000).max(5000),
  waterL: uint, sedimentKg: uint, rainMm: uint.max(1000),
  temperatureC: z.number().finite(), vegetation: z.number().min(0).max(1),
  temperatureAnomalyC: z.number().finite().optional(),
  foodTradeAllowed:z.boolean().optional(),soilDay:SoilDaySchema.optional(), population: uint, settlement:SettlementSchema.optional(), communication: z.boolean(),
  properties:z.record(Id,z.number().finite().min(-1e9).max(1e9)),
}).strict();
export const RainRuleSchema = z.object({
  id: Id, kind: z.literal('rainfall'), tileId: uint,
  mmPerDay: uint.max(500),
}).strict();
export const TemperatureRuleSchema = z.object({
  id: Id, kind: z.literal('temperature'), tileId: uint,
  celsius: z.number().finite().min(-100).max(200),
}).strict();
export const RuleSchema = z.discriminatedUnion('kind', [RainRuleSchema, TemperatureRuleSchema]);
export const OperationSchema = z.discriminatedUnion('kind', [
  ...foodTradeOperations,
  ...ecologyOperations,
  ...settlementOperations,
  ...extensionOperations,
  ...artworkOperations,
  ...entityOperations,
  ...pluginOperations,
  z.object({kind:z.literal('elevation'), tileId:uint, deltaM:z.number().int().min(-2000).max(2000)}).strict(),
  z.object({kind:z.literal('rainfall'), tileId:uint, mmPerDay:uint.max(500)}).strict(),
  z.object({kind:z.literal('communication'), tileId:uint, enabled:z.boolean()}).strict(),
  z.object({kind:z.literal('temperature'), tileId:uint, celsius:z.number().finite().min(-100).max(200), mode:z.enum(['pulse','sustained'])}).strict(),
  z.object({kind:z.literal('temperature-reset'), tileId:uint}).strict(),
]);
export const ProposalSchema = z.object({
  id: Id, worldId: Id, expectedRevision: uint,
  summary: z.string().min(1).max(500), operations: z.array(OperationSchema).min(1).max(32),
}).strict();
export const EventSchema = z.object({
  tick:uint, kind:z.enum(['intervention','flood','flow','population']), tileId:uint,
  message:z.string(), amount:uint.optional(),
}).strict();
export const WorldSchema = z.object({
  schemaVersion:z.literal(4), engineVersion:z.literal(ENGINE_VERSION), id:Id,
  name:z.string().min(1).max(80), seed:z.string().min(1).max(120),
  frequency:z.number().int().min(1).max(26), radiusM:z.literal(100000),
  tick:uint, revision:uint, cells:z.array(CellSchema).min(12).max(6762),
  tiles:z.array(TileSchema).min(12).max(6762), rules:z.array(RuleSchema),
  definitions:DefinitionsSchema,resourceLedger:ResourceLedgerSchema,plugins:z.array(PluginInstanceSchema).max(8),
  foodTrade:FoodTradeSchema.optional(),soilEcology:SoilEcologySchema.optional(),artwork:ArtworkPackSchema.optional(),entities:EntitiesSchema.optional(),
  history:z.array(ProposalSchema), events:z.array(EventSchema).max(200),
  accounting:z.object({rainL:uint, evaporationL:uint, oceanDrainL:uint}).strict(),
}).strict();
export const CreateWorldSchema = z.object({
  id:Id, name:z.string().min(1).max(80), seed:z.string().min(1).max(120),
  frequency:z.number().int().min(1).max(26).default(12),
}).strict();
export type World = z.infer<typeof WorldSchema>;
export type Cell = z.infer<typeof CellSchema>;
export type Tile = z.infer<typeof TileSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type Operation = z.infer<typeof OperationSchema>;
export type WorldEvent = z.infer<typeof EventSchema>;
export type Vec = z.infer<typeof Vec3>;

// Verify the raw saved envelope before these pure, non-writing migrations.
export const LegacyV3WorldSchema=WorldSchema.extend({schemaVersion:z.literal(3),engineVersion:z.literal('0.3.0')}).omit({plugins:true});
export const LegacyV2WorldSchema=LegacyV3WorldSchema.extend({schemaVersion:z.literal(2),engineVersion:z.literal('0.2.0')}).omit({resourceLedger:true});
export const LegacyWorldSchema=LegacyV2WorldSchema.extend({
 schemaVersion:z.literal(1),engineVersion:z.literal('0.1.0'),
 tiles:z.array(TileSchema.omit({properties:true})).min(12).max(6762),
}).omit({definitions:true});
export function migrateWorld(input:unknown):World {
 if(typeof input==='object'&&input!==null&&'schemaVersion' in input) {
  if(input.schemaVersion===1) {
   const old=LegacyWorldSchema.parse(input);
   return WorldSchema.parse({...old,schemaVersion:4,engineVersion:ENGINE_VERSION,plugins:[],definitions:{fields:[],rules:[]},tiles:old.tiles.map(t=>({...t,properties:{}})),resourceLedger:{tick:old.tick,revision:old.revision,entries:[]}});
  }
  if(input.schemaVersion===3)return WorldSchema.parse({...LegacyV3WorldSchema.parse(input),schemaVersion:4,engineVersion:ENGINE_VERSION,plugins:[]});
  if(input.schemaVersion===2) {
   const old=LegacyV2WorldSchema.parse(input);
   return WorldSchema.parse({...old,schemaVersion:4,engineVersion:ENGINE_VERSION,plugins:[],resourceLedger:{tick:old.tick,revision:old.revision,entries:[]}});
  }
 }
 return WorldSchema.parse(input);
}
