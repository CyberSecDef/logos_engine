import {z} from 'zod';
const food=z.number().int().min(0).max(1_000_000_000),tile=z.number().int().min(0).max(6761),total=z.number().int().min(0).max(6_762_000_000_000);
export const FoodTradeSettingsSchema=z.object({reserveDays:z.number().int().min(0).max(3650),targetDays:z.number().int().min(0).max(3650),exportPerDay:food,importPerDay:food,edgePerDay:food}).strict();
export const FoodTradeDaySchema=z.object({tick:z.number().int().nonnegative(),beforeFood:total,afterFood:total,transferred:total,transfers:z.array(z.object({from:tile,to:tile,rations:food.positive()}).strict()).max(40572)}).strict();
export const FoodTradeSchema=z.object({model:z.literal('adjacent-food-v1'),version:z.number().int().positive(),enabled:z.boolean(),settings:FoodTradeSettingsSchema,lastDay:FoodTradeDaySchema.optional()}).strict();
export const foodTradeOperations=[
 z.object({kind:z.literal('food-trade-configure'),tileId:tile,expectedVersion:z.number().int().nonnegative(),enabled:z.boolean(),settings:FoodTradeSettingsSchema}).strict(),
 z.object({kind:z.literal('food-trade-permission'),tileId:tile,allowed:z.boolean()}).strict(),
] as const;
