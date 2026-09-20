import {z} from 'zod';
import {Digest} from '../../../packages/contracts/src/checkpoints.js';
import {ENGINE_VERSION,type World} from '../../../packages/contracts/src/index.js';
import {validateWorld} from '../../../packages/engine/src/index.js';
import {digest,unpackWorld} from './world-management.js';
import {ReplayJournal} from './journal.js';
import {pngInfo} from './artwork.js';
export const MAX_BUNDLE_BYTES=128*1024*1024;
const HistorySchema=z.object({head:Digest.nullable(),records:z.array(z.object({id:Digest,record:z.unknown()}).strict()).max(10000),snapshots:z.array(z.object({hash:Digest,world:z.unknown()}).strict()).max(10000)}).strict();
const SourceSchema=z.object({world:z.unknown(),history:HistorySchema}).strict();
export const SourcesSchema=z.array(SourceSchema).max(16);
export type PortableSource=z.infer<typeof SourceSchema>;
const PayloadSchema=z.object({engineVersion:z.literal(ENGINE_VERSION),source:SourceSchema,origins:SourcesSchema,images:z.array(z.object({hash:Digest,data:z.string().max(12*1024*1024)}).strict()).max(1024)}).strict();
const BundleSchema=z.object({format:z.literal('logos-world'),version:z.literal(2),hash:Digest,payload:PayloadSchema}).strict();
export function artworkHashes(sources:PortableSource[]):Set<string>{
 const hashes=new Set<string>();
 const add=(world:World)=>{for(const image of [...(world.artwork?.images??[]),...world.history.flatMap(p=>p.operations.flatMap(o=>o.kind==='artwork-activate'?o.pack.images:[]))])hashes.add(image.hash);};
 for(const source of sources){add(validateWorld(source.world));for(const snapshot of source.history.snapshots)add(validateWorld(snapshot.world));for(const entry of source.history.records){const record=entry.record as {kind:string;proposal?:World['history'][number]};if(record.kind==='proposal')for(const op of record.proposal!.operations)if(op.kind==='artwork-activate')for(const image of op.pack.images)hashes.add(image.hash);}}
 return hashes;
}
export function memoryJournal(history:PortableSource['history']) {
 const values=new Map<string,unknown>();
 for(const {id,record} of history.records){if(values.has(id))throw Error('Duplicate journal artifact');values.set(id,record);}
 for(const snapshot of history.snapshots){if(values.has(snapshot.hash))throw Error('Duplicate journal artifact');values.set(snapshot.hash,snapshot);}
 return new ReplayJournal({read:async hash=>{if(!values.has(hash))throw Error(`Bundle is missing journal artifact ${hash}`);return values.get(hash);},write:async()=>{throw Error('Source history is read-only');}});
}
export async function validateSource(source:PortableSource,replay=false){
 const world=validateWorld(source.world),journal=memoryJournal(source.history);
 const actual=await journal.portable(source.history.head??undefined,world);
 if(actual.records.length!==source.history.records.length||actual.snapshots.length!==source.history.snapshots.length)throw Error('Bundle contains unreferenced journal artifacts');
 const days=actual.records.reduce((n,e)=>n+(e.record.kind==='step'?e.record.days:0),0);
 if(replay&&source.history.head)await journal.verify(source.history.head,world,10000);
 return {world,days,records:actual.records.length};
}
export function bundle(source:PortableSource,origins:PortableSource[],images:{hash:string;data:string}[]){
 const payload=PayloadSchema.parse({engineVersion:ENGINE_VERSION,source,origins,images}),result={format:'logos-world' as const,version:2 as const,hash:digest(payload),payload};
 if(Buffer.byteLength(JSON.stringify(result))>MAX_BUNDLE_BYTES-4096)throw Error('Complete world bundle exceeds 128 MiB; no partial export was produced');
 return result;
}
export async function unpackBundle(input:unknown){
 if(Buffer.byteLength(JSON.stringify(input))>MAX_BUNDLE_BYTES-4096)throw Error('World bundle exceeds 128 MiB');
 if((input as {version?:number})?.version===1)return {world:unpackWorld(input),origins:[] as PortableSource[],images:[] as Buffer[],legacy:true,records:0};
 const archive=BundleSchema.parse(input);
 if(digest(archive.payload)!==archive.hash)throw Error('World bundle integrity check failed');
 const sources=[...archive.payload.origins,archive.payload.source];
 if(sources.length>16)throw Error('Import would exceed 16 retained source histories');
 let days=0,records=0;const ids=new Set<string>();
 for(const source of sources){const key=digest(source);if(ids.has(key))throw Error('Duplicate source history');ids.add(key);const result=await validateSource(source);days+=result.days;records+=result.records;}
 if(days>10000||records>10000)throw Error('Bundle exceeds total verification budget (10000 replay days / 10000 records)');
 const required=artworkHashes(sources),images:Buffer[]=[],seen=new Set<string>();
 for(const image of archive.payload.images){if(seen.has(image.hash)||!required.has(image.hash))throw Error('Duplicate or unreferenced bundle image');seen.add(image.hash);const data=Buffer.from(image.data,'base64');if(data.toString('base64')!==image.data||pngInfo(data).hash!==image.hash)throw Error('Bundle image integrity check failed');images.push(data);}
 if(seen.size!==required.size)throw Error('Bundle is missing referenced artwork');
 for(const source of sources)await validateSource(source,true);
 return {world:validateWorld(archive.payload.source.world),origins:sources,images,legacy:false,records};
}
