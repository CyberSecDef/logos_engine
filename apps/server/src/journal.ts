import {z} from 'zod';
import {ProposalSchema,Id,migrateWorld,type World,type Proposal,ENGINE_VERSION} from '../../../packages/contracts/src/index.js';
import {advance,applyProposal,validateWorld} from '../../../packages/engine/src/index.js';
import {Digest} from '../../../packages/contracts/src/checkpoints.js';
import {digest} from './world-management.js';
const base={version:z.literal(1),engineVersion:z.literal(ENGINE_VERSION),previous:Digest.nullable(),worldId:Id,tick:z.number().int().nonnegative(),revision:z.number().int().nonnegative(),hash:Digest};
const RecordSchema=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('snapshot'),snapshot:Digest,reason:z.enum(['initial','adopted','replacement','restore'])}).strict(),
 z.object({...base,kind:z.literal('step'),before:Digest,days:z.number().int().min(1).max(1000)}).strict(),
 z.object({...base,kind:z.literal('proposal'),before:Digest,proposal:ProposalSchema}).strict(),
]);
type Record=z.infer<typeof RecordSchema>;
export type SaveAction={kind:'step';days:number}|{kind:'proposal';proposal:Proposal}|{kind:'snapshot';reason:'restore'|'replacement'};
export type JournalEntry={id:string;kind:Record['kind'];tick:number;revision:number;summary:string};
// Artifact writes are immutable; state.json's atomically replaced head is the
// sole commit marker. Unreachable files after an interrupted save are ignored.
export class ReplayJournal {
 constructor(private io:{read:(hash:string)=>Promise<unknown>;write:(hash:string,value:unknown)=>Promise<void>}){}
 async record(hash:string):Promise<Record>{Digest.parse(hash);const raw=await this.io.read(hash);if(digest(raw)!==hash)throw Error('Journal record integrity check failed');return RecordSchema.parse(raw);}
 async head(hash:string,world:World):Promise<Record>{const record=await this.record(hash);if(record.worldId!==world.id||record.hash!==digest(world)||record.tick!==world.tick||record.revision!==world.revision)throw Error('Journal head does not match saved world');return record;}
 private async write(record:Record){const parsed=RecordSchema.parse(record),hash=digest(parsed);await this.io.write(hash,parsed);return hash;}
 async snapshot(world:World,previous:string|null,reason:'initial'|'adopted'|'replacement'|'restore') {
  const hash=digest(world);await this.io.write(hash,{hash,world});
  return this.write({version:1,engineVersion:ENGINE_VERSION,previous,worldId:world.id,tick:world.tick,revision:world.revision,hash,kind:'snapshot',snapshot:hash,reason});
 }
 async append(world:World,old:World|undefined,head:string|undefined,action?:SaveAction):Promise<string>{
  if(head){if(!old)throw Error('Journal head without saved world');await this.head(head,old);}
  let previous=head??null;
  if(old&&!previous)previous=await this.snapshot(old,null,'adopted');
  if(old&&digest(old)===digest(world))return previous!;
  if(!old||!action||action.kind==='snapshot')return this.snapshot(world,previous,!old?'initial':action?.kind==='snapshot'?action.reason:'replacement');
  const common={version:1 as const,engineVersion:ENGINE_VERSION as typeof ENGINE_VERSION,previous,worldId:world.id,tick:world.tick,revision:world.revision,hash:digest(world),before:digest(old)};
  if(action.kind==='step'){
   if(world.tick!==old.tick+action.days||world.revision!==old.revision+action.days||digest(world.history)!==digest(old.history))throw Error('Step journal metadata does not match save');
   return this.write({...common,kind:'step',days:action.days});
  }
  if(world.tick!==old.tick||world.revision!==old.revision+1||world.history.length!==old.history.length+1||digest(world.history.slice(0,-1))!==digest(old.history)||digest(world.history.at(-1))!==digest(action.proposal))throw Error('Proposal journal metadata does not match save');
  return this.write({...common,kind:'proposal',proposal:action.proposal});
 }
 async recent(head:string|undefined,world:World,limit=50):Promise<{entries:JournalEntry[];hasMore:boolean}>{
  if(!head)return {entries:[],hasMore:false};await this.head(head,world);
  const entries:JournalEntry[]=[];let cursor:string|null=head,expected=digest(world);const seen=new Set<string>();
  while(cursor&&entries.length<limit){if(seen.has(cursor))throw Error('Cyclic journal');seen.add(cursor);const record=await this.record(cursor);if(record.worldId!==world.id||record.hash!==expected)throw Error('Broken journal chain');entries.push({id:cursor,kind:record.kind,tick:record.tick,revision:record.revision,summary:record.kind==='step'?`Advanced ${record.days} day${record.days===1?'':'s'}`:record.kind==='proposal'?record.proposal.summary:`${record.reason} snapshot`});expected=record.kind==='snapshot'?'':record.before;cursor=record.previous;if(cursor&&record.kind==='snapshot')expected=(await this.record(cursor)).hash;}
  return {entries,hasMore:cursor!==null};
 }
 async verify(head:string|undefined,world:World,maxDays=10000,maxRecords=10000){
  if(!head)throw Error('No replay history yet; recording begins on the next save');
  if(!Number.isInteger(maxDays)||maxDays<0||maxDays>100000)throw Error('Replay day limit must be 0–100000');
  await this.head(head,world);const records:Record[]=[],seen=new Set<string>();let cursor:string|null=head,days=0;
  while(cursor){if(records.length>=maxRecords)throw Error('Replay record limit exceeded; no verification result');if(seen.has(cursor))throw Error('Cyclic journal');seen.add(cursor);const record=await this.record(cursor);if(record.worldId!==world.id)throw Error('Journal belongs to another world');records.push(record);if(record.kind==='step')days+=record.days;if(days>maxDays)throw Error('Replay day limit exceeded; increase the explicit limit');cursor=record.previous;}
  let replay:World|undefined,snapshots=0,proposals=0;
  for(const record of records.reverse()){
   if(record.kind==='snapshot'){
    const raw=await this.io.read(record.snapshot) as {hash:string;world:unknown};
    if(raw.hash!==record.snapshot||digest(raw.world)!==record.snapshot)throw Error('Journal snapshot integrity check failed');
    replay=validateWorld(migrateWorld(raw.world));snapshots++;
   }else{
    if(!replay||digest(replay)!==record.before)throw Error('Journal input state mismatch');
    if(record.kind==='proposal'){replay=applyProposal(replay,record.proposal);proposals++;}
    else for(let i=0;i<record.days;i++){replay=advance(replay);if(i%10===0)await new Promise<void>(resolve=>setImmediate(resolve));}
   }
   if(!replay||replay.id!==world.id||digest(replay)!==record.hash||replay.tick!==record.tick||replay.revision!==record.revision)throw Error('Replay result differs from recorded state');
  }
  if(!replay||digest(replay)!==digest(world))throw Error('Replay does not match current world');
  return {verified:true,records:records.length,days,proposals,snapshots,startTick:records[0].tick,endTick:world.tick,revision:world.revision,hash:digest(world)};
 }
}
