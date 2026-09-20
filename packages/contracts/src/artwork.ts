import {z} from 'zod';
export const ArtworkSlot=z.enum(['ocean','city','alpine','forest','meadow','dry','settlement','condition']);
const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const ArtworkPackSchema=z.object({
 id:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),version:z.number().int().min(1),label:z.string().min(1).max(80),credit:z.string().max(500),
 images:z.array(z.object({slot:ArtworkSlot,hash}).strict()).min(1).max(8),
}).strict();
export const ArtworkImportSchema=z.object({format:z.literal('logos-artwork'),version:z.literal(1),pack:ArtworkPackSchema,images:z.array(z.object({hash,data:z.string().max(12*1024*1024)}).strict()).min(1).max(8)}).strict();
export const artworkOperations=[
 z.object({kind:z.literal('artwork-activate'),tileId:z.number().int().nonnegative(),pack:ArtworkPackSchema}).strict(),
 z.object({kind:z.literal('artwork-reset'),tileId:z.number().int().nonnegative()}).strict(),
] as const;
export type ArtworkPack=z.infer<typeof ArtworkPackSchema>;
