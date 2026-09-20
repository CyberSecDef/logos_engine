import {bundle,artworkHashes,SourcesSchema,MAX_BUNDLE_BYTES,validateSource,memoryJournal,type PortableSource} from './portable.js';
import {pngInfo} from './artwork.js';
import {ReplayJournal,type SaveAction} from './journal.js';
import { mkdir, open, readFile, rename, realpath, lstat, readdir, unlink, link, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { Id, migrateWorld, type World } from '../../../packages/contracts/src/index.js';
import { CheckpointSchema, Digest, type Checkpoint } from '../../../packages/contracts/src/checkpoints.js';
import { digest } from './world-management.js';
import { validateWorld } from '../../../packages/engine/src/index.js';

export function stateHash(world:World):string {
  return createHash('sha256').update(JSON.stringify(world)).digest('hex');
}
// A single local server is the supported writer. Every revision is self-contained;
// state.json is replaced atomically only after its complete content is durable.
export class WorldStore {
  constructor(readonly root:string) {}
  private automaticStarted=new Set<string>();
  private async directory(id:string,exclusive=false):Promise<string> {
    Id.parse(id);
    await mkdir(this.root,{recursive:true});
    if((await lstat(this.root)).isSymbolicLink()) throw Error('World root cannot be a symlink');
    const root=await realpath(this.root);
    const path=join(root,id);
    await mkdir(path,{recursive:!exclusive});
    if((await lstat(path)).isSymbolicLink() || dirname(await realpath(path))!==root) throw Error('World path escapes storage');
    return path;
  }
  async save(input:World,action?:SaveAction,originHash?:string):Promise<void> {
    const world=validateWorld(input), dir=await this.directory(world.id);
    let previous:World|undefined,journalHead:string|undefined;
    // Preserve the prior save format before the first schema-4 commit. Reads never rewrite it.
    try {
      const current=join(dir,'state.json');
      if((await lstat(current)).isSymbolicLink())throw Error('Save cannot be a symlink');
      const source=await readFile(current,'utf8'),old=JSON.parse(source);
      if(stateHash(old.world)!==old.hash)throw Error('Save integrity check failed');
      if(old.originHash!==undefined)originHash=Digest.parse(old.originHash);
      previous=validateWorld(migrateWorld(old.world));if(previous.id!==world.id)throw Error('Save belongs to another world');
      if(old.journalHead!==undefined)journalHead=Digest.parse(old.journalHead);
      if(old.world?.schemaVersion===1||old.world?.schemaVersion===2||old.world?.schemaVersion===3) {
        if(stateHash(old.world)!==old.hash)throw Error('Legacy save integrity check failed');
        const backup=join(dir,`state.v${old.world.schemaVersion}.backup.json`);
        const temporary=join(dir,`.legacy-${randomUUID()}.tmp`);
        try {
          const handle=await open(temporary,'wx',0o600);
          try{await handle.writeFile(source);await handle.sync();}finally{await handle.close();}
          try{await link(temporary,backup);}catch(error){
            if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
            if((await lstat(backup)).isSymbolicLink())throw Error('Legacy backup cannot be a symlink');
            const saved=JSON.parse(await readFile(backup,'utf8'));
            if(saved.world?.schemaVersion!==old.world.schemaVersion||stateHash(saved.world)!==saved.hash)throw Error('Legacy backup integrity check failed');
          }
        }finally{await unlink(temporary).catch(()=>{});}

      }
    }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    await this.pluginArtifacts(world);
    const head=await (await this.journal(world.id)).append(world,previous,journalHead,action);
    const serialized=JSON.stringify({hash:stateHash(world),world,journalHead:head,...(originHash?{originHash}: {})});
    const tmp=join(dir,`.state-${randomUUID()}.tmp`);
    const file=await open(tmp,'wx',0o600);
    try {await file.writeFile(serialized); await file.sync();} finally {await file.close();}
    try {
      await rename(tmp,join(dir,'state.json'));
      const handle=await open(dir,'r'); try {await handle.sync();} finally {await handle.close();}
    } catch(error) {await unlink(tmp).catch(()=>{}); throw error;}
  }
  async load(id:string):Promise<World> {
    const dir=await this.directory(id), file=join(dir,'state.json');
    if((await lstat(file)).isSymbolicLink()) throw Error('Save cannot be a symlink');
    const envelope=JSON.parse(await readFile(file,'utf8'));
    if(stateHash(envelope.world)!==envelope.hash) throw Error('Save integrity check failed');
    const world=validateWorld(migrateWorld(envelope.world));
    if(world.id!==id) throw Error('Save integrity check failed');
    if(envelope.journalHead!==undefined)await (await this.journal(id)).head(Digest.parse(envelope.journalHead),world);
    return world;
  }
  async exists(id:string):Promise<boolean> {
    Id.parse(id);try{await lstat(join(this.root,id));return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}
  }
  async createNew(input:World,artworkSource?:string,imported?:{origins:PortableSource[];images:Buffer[]}):Promise<void> {
    const world=validateWorld(input),dir=await this.directory(world.id,true);
    try{
      const origins=imported?.origins??(artworkSource?await this.readOrigins(artworkSource):[]);
      if(artworkSource){
        const hashes=new Set([...(world.artwork?.images??[]),...world.history.flatMap(p=>p.operations.flatMap(o=>o.kind==='artwork-activate'?o.pack.images:[]))].map(i=>i.hash));
        for(const hash of artworkHashes(origins))hashes.add(hash);
        for(const hash of hashes){try{await this.saveArtwork(world.id,[await this.readArtwork(artworkSource,hash)]);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
      }
      if(imported)await this.saveArtwork(world.id,imported.images);
      let originHash:string|undefined;
      if(origins.length){originHash=digest(origins);await this.immutable(dir,`origins-${originHash}.json`,{hash:originHash,origins});}
      await this.save(world,undefined,originHash);
    }catch(error){await rm(dir,{recursive:true,force:true});throw error;}
  }
  private async artifactDirectory(worldId:string,name:'snapshots'|'definitions'|'checkpoints'|'plugins'|'journal'|'assets'):Promise<string> {
    const dir=join(await this.directory(worldId),name);await mkdir(dir,{recursive:true});
    if((await lstat(dir)).isSymbolicLink())throw Error('Artifact directory cannot be a symlink');return dir;
  }
  private async immutable(dir:string,name:string,value:unknown):Promise<void> {
    return this.immutableBytes(dir,name,Buffer.from(JSON.stringify(value)));
  }
  private async immutableBytes(dir:string,name:string,serialized:Buffer):Promise<void> {
    const target=join(dir,name),tmp=join(dir,`.${randomUUID()}.tmp`);
    const handle=await open(tmp,'wx',0o600);
    try{await handle.writeFile(serialized);await handle.sync();}finally{await handle.close();}
    try {
      try{await link(tmp,target);}catch(error){
        if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
        if((await lstat(target)).isSymbolicLink()||!(await readFile(target)).equals(serialized))throw Error('Immutable artifact differs from existing content');
      }
      const directory=await open(dir,'r');try{await directory.sync();}finally{await directory.close();}
    }finally{await unlink(tmp).catch(()=>{});}
  }
  async saveArtwork(id:string,images:Buffer[]):Promise<void> {
    const dir=await this.artifactDirectory(id,'assets');
    for(const image of images){const info=pngInfo(image);await this.immutableBytes(dir,`${info.hash}.png`,image);}
  }
  async readArtwork(id:string,hash:string):Promise<Buffer> {
    Digest.parse(hash);const path=join(await this.artifactDirectory(id,'assets'),`${hash}.png`),stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8*1024*1024)throw Error('Invalid artwork file');
    const data=await readFile(path);if(pngInfo(data).hash!==hash)throw Error('Artwork image integrity check failed');return data;
  }
  private async journal(id:string):Promise<ReplayJournal> {
    const dir=await this.artifactDirectory(id,'journal');
    return new ReplayJournal({write:async(hash,value)=>{
      if(Buffer.byteLength(JSON.stringify(value))>64*1024*1024)throw Error('Journal artifact exceeds 64 MiB limit');
      await this.immutable(dir,`${Digest.parse(hash)}.json`,value);
    },read:async hash=>{
      const path=join(dir,`${Digest.parse(hash)}.json`),stat=await lstat(path);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64*1024*1024)throw Error('Invalid journal artifact');
      return JSON.parse(await readFile(path,'utf8'));
    }});
  }
  private async journalContext(id:string) {
    const world=await this.load(id),dir=await this.directory(id),envelope=JSON.parse(await readFile(join(dir,'state.json'),'utf8'));
    return {world,head:envelope.journalHead===undefined?undefined:Digest.parse(envelope.journalHead),journal:await this.journal(id)};
  }
  async history(id:string,before?:string){const {world,head,journal}=await this.journalContext(id);return journal.recent(head,world,50,before);}
  async historicalState(id:string,recordId:string) {
    const {world,head,journal}=await this.journalContext(id);
    const checkpoints=new Map((await this.checkpoints(id)).map(point=>[point.hash,point.id]));
    return journal.reconstruct(head,world,recordId,{checkpoint:async hash=>{const point=checkpoints.get(hash);return point?(await this.readCheckpoint(id,point)).world:undefined;}});
  }
  async verifyHistory(id:string,maxDays=10000){const {world,head,journal}=await this.journalContext(id);return journal.verify(head,world,maxDays);}
  async readOrigins(id:string):Promise<PortableSource[]> {
    const dir=await this.directory(id),envelope=JSON.parse(await readFile(join(dir,'state.json'),'utf8'));
    if(envelope.originHash===undefined)return [];
    const hash=Digest.parse(envelope.originHash),path=join(dir,`origins-${hash}.json`),stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BUNDLE_BYTES)throw Error('Invalid source history file');
    const raw=JSON.parse(await readFile(path,'utf8'));
    if(raw.hash!==hash||digest(raw.origins)!==hash)throw Error('Source history integrity check failed');
    return SourcesSchema.parse(raw.origins);
  }
  async exportBundle(id:string){
    const {world,head,journal}=await this.journalContext(id),source={world,history:await journal.portable(head,world)},origins=await this.readOrigins(id);
    let days=0,records=0;
    if(origins.length>=16)throw Error('Bundle exceeds 16 retained source histories');
    for(const item of [...origins,source]){const result=await validateSource(item);days+=result.days;records+=result.records;}
    if(days>10000||records>10000)throw Error('Bundle exceeds total verification budget (10000 replay days / 10000 records)');
    const images:{hash:string;data:string}[]=[];let bytes=Buffer.byteLength(JSON.stringify({source,origins}));
    for(const hash of artworkHashes([...origins,source])){
      let data:Buffer;try{data=await this.readArtwork(id,hash);}catch(error){throw Error(`Cannot export required artwork ${hash}: ${(error as Error).message}`);}
      const encoded=data.toString('base64');bytes+=encoded.length;if(bytes>MAX_BUNDLE_BYTES-4096)throw Error('Complete world bundle exceeds 128 MiB');images.push({hash,data:encoded});
    }
    return bundle(source,origins,images);
  }
  async sourceHistory(id:string,index?:number,before?:string){
    const sources=await this.readOrigins(id);
    if(index===undefined)return sources.map((source,index)=>{const world=validateWorld(source.world);return {index,id:world.id,name:world.name,tick:world.tick,revision:world.revision,records:source.history.records.length,hash:digest(world)};});
    if(!Number.isInteger(index)||index<0||index>=sources.length)throw Error('Unknown source history');
    const source=sources[index],world=validateWorld(source.world);return memoryJournal(source.history).recent(source.history.head??undefined,world,50,before);
  }
  private async pluginArtifacts(world:World):Promise<void> {
    const definitions=[...world.plugins.map(p=>p.definition),...world.history.flatMap(h=>h.operations).flatMap(op=>op.kind==='plugin-define'?[op.definition]:[])];
    if(!definitions.length)return;
    const root=await this.artifactDirectory(world.id,'plugins');
    for(const definition of definitions) {
      let dir=root;for(const part of [definition.id,String(definition.version)]){dir=join(dir,part);await mkdir(dir,{recursive:true});if((await lstat(dir)).isSymbolicLink())throw Error('Plugin artifact directory cannot be a symlink');}
      const hash=digest(definition);await this.immutable(dir,`${hash}.json`,{hash,definition});
    }
  }
  async checkpoint(input:World,label:string,kind:Checkpoint['kind']='manual'):Promise<Checkpoint> {
    const world=validateWorld(input),hash=stateHash(world),definitionsHash=digest(world.definitions);
    await this.pluginArtifacts(world);
    const record=CheckpointSchema.parse({id:`checkpoint-${randomUUID()}`,worldId:world.id,label:label.trim(),kind,tick:world.tick,revision:world.revision,hash,definitionsHash,createdAt:new Date().toISOString()});
    await this.immutable(await this.artifactDirectory(world.id,'definitions'),`${definitionsHash}.json`,{hash:definitionsHash,definitions:world.definitions});
    await this.immutable(await this.artifactDirectory(world.id,'snapshots'),`${hash}.json`,{hash,world});
    // Publish the reference last. Unreferenced artifacts after an interrupted
    // write are harmless; incomplete references are never advertised.
    await this.immutable(await this.artifactDirectory(world.id,'checkpoints'),`${record.id}.json`,record);
    return record;
  }
  async readCheckpoint(worldId:string,id:string):Promise<{checkpoint:Checkpoint;world:World}> {
    Id.parse(id);const dir=await this.artifactDirectory(worldId,'checkpoints'),file=join(dir,`${id}.json`);
    if((await lstat(file)).isSymbolicLink())throw Error('Checkpoint cannot be a symlink');
    const checkpoint=CheckpointSchema.parse(JSON.parse(await readFile(file,'utf8')));
    if(checkpoint.worldId!==worldId||checkpoint.id!==id)throw Error('Checkpoint belongs to another world');
    Digest.parse(checkpoint.hash);Digest.parse(checkpoint.definitionsHash);
    const snapshot=join(await this.artifactDirectory(worldId,'snapshots'),`${checkpoint.hash}.json`);
    const definitions=join(await this.artifactDirectory(worldId,'definitions'),`${checkpoint.definitionsHash}.json`);
    if((await lstat(snapshot)).isSymbolicLink()||(await lstat(definitions)).isSymbolicLink())throw Error('Artifact cannot be a symlink');
    const saved=JSON.parse(await readFile(snapshot,'utf8')),artifact=JSON.parse(await readFile(definitions,'utf8'));
    if(saved.hash!==checkpoint.hash||digest(saved.world)!==checkpoint.hash||artifact.hash!==checkpoint.definitionsHash||digest(artifact.definitions)!==checkpoint.definitionsHash||digest(saved.world.definitions)!==checkpoint.definitionsHash)throw Error('Checkpoint integrity check failed');
    const world=validateWorld(migrateWorld(saved.world));
    if(world.id!==worldId||world.tick!==checkpoint.tick||world.revision!==checkpoint.revision)throw Error('Checkpoint metadata mismatch');
    return {checkpoint,world};
  }
  async checkpoints(worldId:string):Promise<Checkpoint[]> {
    const dir=await this.artifactDirectory(worldId,'checkpoints'),records:Checkpoint[]=[];
    for(const file of await readdir(dir))if(file.endsWith('.json')&&Id.safeParse(file.slice(0,-5)).success) {
      // Corrupt or interrupted references are not advertised as restorable.
      try{records.push((await this.readCheckpoint(worldId,file.slice(0,-5))).checkpoint);}catch{}
    }
    return records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.revision-a.revision||b.id.localeCompare(a.id));
  }
  async automaticCheckpoint(before:World,next:World):Promise<void> {
    let written=false;
    if(!this.automaticStarted.has(before.id)) {
      const records=await this.checkpoints(before.id);
      if(!records.some(r=>r.kind==='automatic')){await this.checkpoint(before,`Automatic · day ${before.tick}`,'automatic');written=true;}
      this.automaticStarted.add(before.id);
    }
    if(Math.floor(next.tick/100)>Math.floor(before.tick/100)){await this.checkpoint(next,`Automatic · day ${next.tick}`,'automatic');written=true;}
    if(written)await this.pruneAutomatic(before.id);
  }
  async pruneAutomatic(worldId:string):Promise<void> {
    const dir=await this.artifactDirectory(worldId,'checkpoints');
    const records:Checkpoint[]=[];
    // If any descriptor is damaged, leave all artifacts in place for recovery.
    for(const file of await readdir(dir))if(file.endsWith('.json')) {
      const path=join(dir,file);if((await lstat(path)).isSymbolicLink())return;
      let raw:unknown;try{raw=JSON.parse(await readFile(path,'utf8'));}catch{return;}
      const parsed=CheckpointSchema.safeParse(raw);
      if(!parsed.success||parsed.data.worldId!==worldId||file!==`${parsed.data.id}.json`)return;
      records.push(parsed.data);
    }
    const automatic=records.filter(r=>r.kind==='automatic').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.revision-a.revision||b.id.localeCompare(a.id));
    const remove=new Set(automatic.slice(10).map(r=>r.id));if(!remove.size)return;
    for(const id of remove)await unlink(join(dir,`${id}.json`));
    const handle=await open(dir,'r');try{await handle.sync();}finally{await handle.close();}
    const remaining=records.filter(r=>!remove.has(r.id));
    for(const [folder,key] of [['snapshots','hash'],['definitions','definitionsHash']] as const) {
      const keep=new Set(remaining.map(r=>r[key])),artifacts=await this.artifactDirectory(worldId,folder);
      // Only collect artifacts released by these references; never touch unrelated files.
      for(const hash of new Set(records.filter(r=>remove.has(r.id)).map(r=>r[key])))if(!keep.has(hash))await unlink(join(artifacts,`${hash}.json`)).catch(error=>{if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;});
    }
  }
  async activeWorldId():Promise<string> {
    const path=join(this.root,'.active-world.json');
    try{if((await lstat(path)).isSymbolicLink())throw Error('Session cannot be a symlink');return Id.parse(JSON.parse(await readFile(path,'utf8')).id);}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return 'first-world';throw error;}
  }
  async selectWorld(id:string):Promise<void> {
    await this.load(id);const root=await realpath(this.root),tmp=join(root,`.session-${randomUUID()}.tmp`);
    const handle=await open(tmp,'wx',0o600);try{await handle.writeFile(JSON.stringify({id}));await handle.sync();}finally{await handle.close();}
    try{await rename(tmp,join(root,'.active-world.json'));const dir=await open(root,'r');try{await dir.sync();}finally{await dir.close();}}finally{await unlink(tmp).catch(()=>{});}
  }
  async writePrompt(worldId:string,id:string,value:unknown):Promise<void> {
    Id.parse(id);const dir=join(await this.directory(worldId),'conversations');
    await mkdir(dir,{recursive:true});
    if((await lstat(dir)).isSymbolicLink())throw Error('Conversation directory cannot be a symlink');
    const target=join(dir,`${id}.json`),tmp=join(dir,`.${randomUUID()}.tmp`);
    const handle=await open(tmp,'wx',0o600);
    try {await handle.writeFile(JSON.stringify(value));await handle.sync();}finally{await handle.close();}
    try {await rename(tmp,target);}catch(error){await unlink(tmp).catch(()=>{});throw error;}
  }
  async readPrompt(worldId:string,id:string):Promise<unknown> {
    Id.parse(id);const dir=join(await this.directory(worldId),'conversations');
    if((await lstat(dir)).isSymbolicLink())throw Error('Conversation directory cannot be a symlink');
    const file=join(dir,`${id}.json`);const stat=await lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128000)throw Error('Invalid conversation file');
    return JSON.parse(await readFile(file,'utf8'));
  }
  async listPrompts(worldId:string):Promise<unknown[]> {
    const dir=join(await this.directory(worldId),'conversations');
    try {if((await lstat(dir)).isSymbolicLink())throw Error('Conversation directory cannot be a symlink');}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
    const files=(await readdir(dir)).filter(f=>f.endsWith('.json')&&Id.safeParse(f.slice(0,-5)).success);
    const jobs=[];for(const file of files)jobs.push(await this.readPrompt(worldId,file.slice(0,-5)));
    return jobs;
  }
  async list():Promise<{id:string; name:string; tick:number}[]> {
    await mkdir(this.root,{recursive:true});
    const results=[];
    for(const e of await readdir(this.root,{withFileTypes:true})) {
      if(e.isDirectory() && Id.safeParse(e.name).success) {
        try {const w=await this.load(e.name); results.push({id:w.id,name:w.name,tick:w.tick});}
        catch { /* Corrupt saves are not silently overwritten; explicit open reports error. */ }
      }
    }
    return results.sort((a,b)=>a.id.localeCompare(b.id));
  }
}
export const defaultStore=()=>new WorldStore(resolve('worlds'));
