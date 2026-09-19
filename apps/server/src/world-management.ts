import { createHash } from 'node:crypto';
import { Id, migrateWorld, type World } from '../../../packages/contracts/src/index.js';
import { ArchiveSchema, MAX_ARCHIVE_BYTES } from '../../../packages/contracts/src/checkpoints.js';
import { validateWorld } from '../../../packages/engine/src/index.js';
export function digest(value:unknown):string {return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export function archiveWorld(input:World) {
 const world=validateWorld(input),archive={format:'logos-world' as const,version:1 as const,hash:digest(world),world};
 if(Buffer.byteLength(JSON.stringify(archive))>MAX_ARCHIVE_BYTES-4096)throw Error('World exceeds the 32 MiB portable archive limit');
 return archive;
}
export function unpackWorld(input:unknown):World {
 const archive=ArchiveSchema.parse(input);
 if(Buffer.byteLength(JSON.stringify(archive))>MAX_ARCHIVE_BYTES-4096)throw Error('World archive exceeds size limit');
 if(digest(archive.world)!==archive.hash)throw Error('World archive integrity check failed');
 return validateWorld(migrateWorld(archive.world));
}
export function copyWorld(input:World,id:string,name:string):World {
 Id.parse(id);if(!name.trim()||name.length>80)throw Error('World name must be 1–80 characters');
 const world=structuredClone(input);world.id=id;world.name=name.trim();world.revision++;
 for(const proposal of world.history)proposal.worldId=id;
 return validateWorld(world);
}
export function worldSummary(world:World) {return {id:world.id,name:world.name,tick:world.tick,revision:world.revision,tiles:world.tiles.length,fields:world.definitions.fields.length,rules:world.definitions.rules.length,interventions:world.history.length};}
