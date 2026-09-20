import {z} from 'zod';
const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),tile=z.number().int().min(0).max(6761),amount=z.number().min(0).max(1e9);
export const ResourceRouteSchema=z.object({id,version:z.number().int().positive(),label:z.string().trim().min(1).max(80),tileId:tile,toTileId:tile,fieldId:id,enabled:z.boolean(),everyDays:z.number().int().min(1).max(365),amount,reserve:amount,target:amount}).strict();
export const RouteDayEntrySchema=z.object({routeId:id,from:tile,to:tile,fieldId:id,label:z.string().max(80),unit:z.string().max(24),amountMilli:z.number().int().min(0).max(1e12),status:z.enum(['moved','limited','paused','not-due','closed','border-closed','submerged'])}).strict();
export const ResourceRoutesSchema=z.object({model:z.literal('adjacent-resources-v1'),routes:z.array(ResourceRouteSchema).max(64),lastDay:z.object({tick:z.number().int().nonnegative(),entries:z.array(RouteDayEntrySchema).max(64)}).strict().optional()}).strict();
export const routeOperations=[
 z.object({kind:z.literal('resource-route-define'),tileId:tile,route:ResourceRouteSchema}).strict(),
 z.object({kind:z.literal('resource-route-remove'),tileId:tile,routeId:id}).strict(),
 z.object({kind:z.literal('travel-permission'),tileId:tile,allowed:z.boolean()}).strict(),
] as const;
export type ResourceRoute=z.infer<typeof ResourceRouteSchema>;
