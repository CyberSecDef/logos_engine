import { z } from 'zod';
import { Id } from './index.js';
export const Digest=z.string().regex(/^[a-f0-9]{64}$/);
export const CheckpointSchema=z.object({
 id:Id,worldId:Id,label:z.string().min(1).max(80),kind:z.enum(['manual','before-restore','automatic']),
 tick:z.number().int().nonnegative(),revision:z.number().int().nonnegative(),hash:Digest,definitionsHash:Digest,createdAt:z.string().datetime(),
}).strict();
export type Checkpoint=z.infer<typeof CheckpointSchema>;
export const ArchiveSchema=z.object({format:z.literal('logos-world'),version:z.literal(1),hash:Digest,world:z.unknown()}).strict();
export const MAX_ARCHIVE_BYTES=32*1024*1024;
