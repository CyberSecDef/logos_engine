import { mkdir, open, readFile, rename, realpath, lstat, readdir, unlink, link } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { Id, migrateWorld, type World } from '../../../packages/contracts/src/index.js';
import { validateWorld } from '../../../packages/engine/src/index.js';

export function stateHash(world:World):string {
  return createHash('sha256').update(JSON.stringify(world)).digest('hex');
}
// A single local server is the supported writer. Every revision is self-contained;
// state.json is replaced atomically only after its complete content is durable.
export class WorldStore {
  constructor(readonly root:string) {}
  private async directory(id:string):Promise<string> {
    Id.parse(id);
    await mkdir(this.root,{recursive:true});
    if((await lstat(this.root)).isSymbolicLink()) throw Error('World root cannot be a symlink');
    const root=await realpath(this.root);
    const path=join(root,id);
    await mkdir(path,{recursive:true});
    if((await lstat(path)).isSymbolicLink() || dirname(await realpath(path))!==root) throw Error('World path escapes storage');
    return path;
  }
  async save(input:World):Promise<void> {
    const world=validateWorld(input), dir=await this.directory(world.id);
    // Preserve the prior save format before the first schema-3 commit. Reads never rewrite it.
    try {
      const current=join(dir,'state.json');
      if((await lstat(current)).isSymbolicLink())throw Error('Save cannot be a symlink');
      const source=await readFile(current,'utf8'),old=JSON.parse(source);
      if(old.world?.schemaVersion===1||old.world?.schemaVersion===2) {
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
    const serialized=JSON.stringify({hash:stateHash(world),world});
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
    return world;
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
