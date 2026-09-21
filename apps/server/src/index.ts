import {previewWaterQuality} from '../../../packages/engine/src/index.js';
import {previewAir} from '../../../packages/engine/src/air.js';
import {defaultMigration} from '../../../packages/contracts/src/migration.js';
import {defaultNeighborVisits} from '../../../packages/contracts/src/neighbor-visits.js';
import {previewWater} from '../../../packages/engine/src/index.js';
import {unpackBundle,MAX_BUNDLE_BYTES,artworkHashes} from './portable.js';
import {parseArtwork,MAX_ARTWORK_BYTES} from './artwork.js';
import type {SaveAction} from './journal.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { hostname, networkInterfaces, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createWorld } from '../../../packages/worldgen/src/index.js';
import { advance, applyProposal, validateWorld } from '../../../packages/engine/src/index.js';
import { CreateWorldSchema, ProposalSchema, Id, type World } from '../../../packages/contracts/src/index.js';
import { Digest } from '../../../packages/contracts/src/checkpoints.js';
import { copyWorld, worldSummary, digest } from './world-management.js';
import { WorldStore } from './store.js';
import { PromptService, configuredProvider, forecast } from './prompts.js';
import type { ModelProvider } from '../../../packages/agent-bridge/src/context.js';

export async function startServer(options:{port?:number; host?:string; root?:string; dev?:boolean; provider?:ModelProvider; promptTimeoutMs?:number}={}) {
  const store=new WorldStore(resolve(options.root??'worlds'));
  const token=randomUUID();
  const prompts=new PromptService(store,options.provider??configuredProvider(),options.promptTimeoutMs??120000);
  const bindHost=options.host??process.env.HOST??'0.0.0.0';
  const allowedHosts=['localhost',hostname(),`${hostname()}.local`,...(process.env.ALLOWED_HOSTS??'').split(',').map(h=>h.trim()).filter(Boolean)];
  let world:World;
  const activeId=await store.activeWorldId();
  try {world=await store.load(activeId);}
  catch(error) {
    if((error as NodeJS.ErrnoException).code!=='ENOENT'||activeId!=='first-world') throw error;
    world=createWorld({id:'first-world',name:'Aethra',seed:'aethra-01',frequency:12});
    world.neighborVisits=defaultNeighborVisits();world.migration=defaultMigration();
    await store.save(world);
  }
  let queue=Promise.resolve();
  const server=createServer((req,res)=>{
    const action=()=>handle(req,res).then(()=>{}).catch(error=>{
      if(!res.headersSent) json(res,400,{error:error instanceof Error?error.message:'Request failed'});
      else res.end();
    });
    if(req.url?.startsWith('/api/')) {queue=queue.then(action,action);} else void action();
  });
  let vite:Awaited<ReturnType<typeof import('vite')['createServer']>>|undefined;
  let devCache:string|undefined;
  const closeVite=async()=>{
    try {await vite?.close();} finally {if(devCache)await rm(devCache,{recursive:true,force:true});}
  };
  if(options.dev) {
    // Test servers and the player's server must never invalidate each other's deps.
    devCache=await mkdtemp(resolve(tmpdir(),'logos-vite-'));
    try {
      const {createServer:createViteServer}=await import('vite');
      vite=await createViteServer({configFile:resolve('vite.config.ts'),cacheDir:devCache,server:{middlewareMode:true,allowedHosts,ws:{server}}});
    } catch(error) {await closeVite();throw error;}
  }
  function json(res:ServerResponse,status:number,value:unknown) {
    res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(value));
  }
  async function body(req:IncomingMessage,limit=64000):Promise<unknown> {
    if(!req.headers['content-type']?.startsWith('application/json')) throw Error('Expected JSON');
    const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>limit)throw Error('Request too large');chunks.push(bytes);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  function revision(expected:number) {if(expected!==world.revision)throw Error('Stale revision; refresh first');}
  async function activate(next:World) {await store.selectWorld(next.id);world=next;}
  async function commit(next:World,action?:SaveAction) {await store.save(next,action);world=next;}
  async function handle(req:IncomingMessage,res:ServerResponse) {
    const host=req.headers.host??'';
    const hostName=new URL(`http://${host}`).hostname.replace(/^\[|\]$/g,'');
    if(!isIP(hostName) && !allowedHosts.includes(hostName)) return json(res,403,{error:'Host not allowed; use the server IP or configure ALLOWED_HOSTS'});
    if(req.headers.origin && req.headers.origin!==`http://${host}`) return json(res,403,{error:'Origin not allowed'});
    const pathname=new URL(req.url??'/',`http://${host}`).pathname;
    if(pathname.startsWith('/api/')) {
      if(req.method==='GET' && pathname==='/api/session') return json(res,200,{token});
      if(req.headers.authorization!==`Bearer ${token}`) return json(res,401,{error:'Session required'});
      if(req.method==='GET'&&pathname.startsWith('/api/artwork/image/')){
        const parts=pathname.slice('/api/artwork/image/'.length).split('/');if(parts.length!==2||parts[0]!==world.id||!world.artwork?.images.some(i=>i.hash===parts[1]))throw Error('Artwork is not active in this world');
        const data=await store.readArtwork(world.id,parts[1]);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);return;
      }
      if(req.method==='GET' && pathname==='/api/world') return json(res,200,world);
      if(req.method==='GET' && pathname==='/api/history') return json(res,200,await store.history(world.id,new URL(req.url??'/',`http://${host}`).searchParams.get('before')??undefined));
      if(req.method==='GET' && pathname==='/api/checkpoints') return json(res,200,await store.checkpoints(world.id));
      if(req.method==='GET' && pathname==='/api/worlds/export') return json(res,200,await store.exportBundle(world.id));
      if(req.method==='GET' && pathname==='/api/worlds/sources'){const query=new URL(req.url??'/',`http://${host}`).searchParams;return json(res,200,await store.sourceHistory(world.id,query.has('index')?Number(query.get('index')):undefined,query.get('before')??undefined));}
      if(req.method==='GET' && pathname==='/api/worlds') return json(res,200,await store.list());
      if(req.method==='GET' && pathname==='/api/prompts/config')return json(res,200,prompts.configuration);
      if(req.method==='GET' && pathname==='/api/prompts/history')return json(res,200,await prompts.history(world));
      if(req.method==='GET' && pathname.startsWith('/api/prompts/jobs/'))return json(res,200,await prompts.get(world,pathname.slice('/api/prompts/jobs/'.length)));
      if(req.method!=='POST') return json(res,404,{error:'Unknown route'});
      const input=await body(req,['/api/worlds/import','/api/worlds/import/preview','/api/artwork/preview','/api/artwork/apply'].includes(pathname)?pathname.startsWith('/api/worlds/import')?MAX_BUNDLE_BYTES:MAX_ARTWORK_BYTES:64000);
      if(pathname==='/api/prompts')return json(res,202,await prompts.start(world,input));
      if(pathname==='/api/prompts/export')return json(res,200,await prompts.export(world,input));
      if(pathname==='/api/prompts/import')return json(res,200,await prompts.import(world,input));
      if(pathname==='/api/prompts/cancel'){const p=z.object({id:z.string()}).strict().parse(input);prompts.cancel(world,p.id);return json(res,200,{cancelled:true});}
      if(prompts.busy)throw Error('World is paused while the model responds; wait or cancel the request');
      if(pathname==='/api/water-quality/preview'){
        const p=z.object({worldId:Id,expectedRevision:z.number().int().nonnegative(),tileId:z.number().int().nonnegative()}).strict().parse(input);
        if(p.worldId!==world.id)throw Error('Water quality preview belongs to another world');revision(p.expectedRevision);
        return json(res,200,previewWaterQuality(world,p.tileId));
      }
      if(pathname==='/api/air/preview'){
        const p=z.object({worldId:Id,expectedRevision:z.number().int().nonnegative(),tileId:z.number().int().nonnegative()}).strict().parse(input);
        if(p.worldId!==world.id)throw Error('Air preview belongs to another world');revision(p.expectedRevision);
        return json(res,200,previewAir(world,p.tileId));
      }
      if(pathname==='/api/transport/preview'){
        const p=z.object({worldId:Id,expectedRevision:z.number().int().nonnegative(),tileId:z.number().int().nonnegative()}).strict().parse(input);
        if(p.worldId!==world.id)throw Error('Water preview belongs to another world');revision(p.expectedRevision);
        return json(res,200,previewWater(world,p.tileId));
      }
      if(pathname==='/api/artwork/preview'||pathname==='/api/artwork/apply'){
        const p=z.object({worldId:Id,expectedRevision:z.number().int(),bundle:z.unknown()}).strict().parse(input);if(p.worldId!==world.id)throw Error('Artwork belongs to another world');revision(p.expectedRevision);
        const parsed=parseArtwork(p.bundle),proposal:ReturnType<typeof ProposalSchema.parse>={id:`artwork-${randomUUID()}`,worldId:world.id,expectedRevision:world.revision,summary:`Activate artwork: ${parsed.pack.label} v${parsed.pack.version}`,operations:[{kind:'artwork-activate',tileId:0,pack:parsed.pack}]};
        const next=applyProposal(world,proposal);
        if(pathname.endsWith('/preview'))return json(res,200,{summary:worldSummary(next),pack:parsed.pack,images:parsed.images.map(({data,...info})=>info)});
        await store.saveArtwork(world.id,parsed.images.map(i=>i.data));await commit(next,{kind:'proposal',proposal});return json(res,200,world);
      }
      if(pathname==='/api/step') {
        const p=z.object({expectedRevision:z.number().int(),days:z.number().int().min(1).max(10).default(1)}).strict().parse(input);
        if(p.expectedRevision!==world.revision) throw Error('Stale revision; refresh first');
        let next=world; for(let i=0;i<p.days;i++) next=advance(next); await store.automaticCheckpoint(world,next);await commit(next,{kind:'step',days:p.days}); return json(res,200,world);
      }
      if(pathname==='/api/proposals/preview') {
        const p=ProposalSchema.parse(input);
        return json(res,200,forecast(world,p));
      }
      if(pathname==='/api/proposals/apply') {const proposal=ProposalSchema.parse(input);for(const op of proposal.operations)if(op.kind==='artwork-activate')for(const image of op.pack.images)await store.readArtwork(world.id,image.hash);await commit(applyProposal(world,proposal),{kind:'proposal',proposal});return json(res,200,world);}
      if(pathname==='/api/checkpoints') {
        const p=z.object({label:z.string().min(1).max(80),expectedRevision:z.number().int()}).strict().parse(input);revision(p.expectedRevision);
        return json(res,200,await store.checkpoint(world,p.label));
      }
      if(pathname==='/api/checkpoints/preview'||pathname==='/api/checkpoints/restore') {
        const p=z.object({id:Id,expectedRevision:z.number().int()}).strict().parse(input);revision(p.expectedRevision);
        const saved=await store.readCheckpoint(world.id,p.id);
        if(pathname.endsWith('/preview'))return json(res,200,{checkpoint:saved.checkpoint,summary:worldSummary(saved.world)});
        const next=validateWorld({...saved.world,revision:world.revision+1});
        await store.checkpoint(world,`Before restore · day ${world.tick}`,'before-restore');
        await commit(next,{kind:'snapshot',reason:'restore'});return json(res,200,world);
      }
      if(pathname==='/api/history/intervention'){
        const p=z.object({worldId:Id,recordId:Digest,expectedRevision:z.number().int().nonnegative()}).strict().parse(input);if(p.worldId!==world.id)throw Error('Replay source is not the active world');revision(p.expectedRevision);return json(res,200,await store.intervention(world.id,p.recordId));
      }
      if(pathname==='/api/history/selective/preview'||pathname==='/api/history/selective/branch'){
        const edit=z.discriminatedUnion('mode',[z.object({mode:z.literal('omit')}).strict(),z.object({mode:z.literal('replace'),summary:z.string().min(1).max(500),operations:ProposalSchema.shape.operations}).strict()]);
        const schema=z.object({worldId:Id,recordId:Digest,id:Id,name:z.string().trim().min(1).max(80),expectedRevision:z.number().int().nonnegative(),edit}).strict();
        const p=(pathname.endsWith('/branch')?schema.extend({reviewedHash:Digest}):schema).parse(input);
        if(p.worldId!==world.id)throw Error('Replay source is not the active world');revision(p.expectedRevision);if(await store.exists(p.id))throw Error('World already exists');
        const result=await store.selectiveState(world.id,p.recordId,p.edit,{id:p.id,name:p.name});if(result.sourceHash!==digest(world))throw Error('Replay source changed outside this server; reload before continuing');
        // Replacement artwork must already exist in this source world. No paths or uploads.
        const images=new Set([...(result.start.artwork?.images??[]),...(result.world.artwork?.images??[]),...result.world.history.flatMap(h=>h.operations.flatMap(o=>o.kind==='artwork-activate'?o.pack.images:[]))].map(i=>i.hash));for(const hash of artworkHashes(await store.readOrigins(world.id)))images.add(hash);if(images.size>1024)throw Error('Selective branch exceeds 1024 artwork images');let imageBytes=0;for(const hash of images){imageBytes+=(await store.readArtwork(world.id,hash)).length;if(imageBytes>MAX_BUNDLE_BYTES)throw Error('Selective branch artwork exceeds 128 MiB');}
        if(pathname.endsWith('/preview')){
          const changes=result.world.tiles.flatMap((tile,index)=>{const before=world.tiles[index];return JSON.stringify(tile)===JSON.stringify(before)?[]:[{tileId:tile.id,before,after:tile}];});
          const describe=(w:typeof world,id:string)=>{const e=w.entities?.instances.find(e=>e.id===id);if(!e)return 'absent';const t=w.entities!.types.find(t=>t.id===e.typeId)!;return `${e.label} in zone ${e.tileId}: ${t.properties.map(f=>`${f.label} ${e.properties[f.id]??f.defaultValue} ${f.unit}`).join(', ')}`;};
          const entityChanges=[...new Set([...(world.entities?.instances??[]),...(result.world.entities?.instances??[])].map(e=>e.id))].map(id=>({id,before:describe(world,id),after:describe(result.world,id)})).filter(e=>e.before!==e.after);
          return json(res,200,{entityChanges:{total:entityChanges.length,rows:entityChanges.slice(0,12)},summary:worldSummary(result.world),hash:result.hash,days:result.days,workDays:result.workDays,proposals:result.proposals,rebased:result.rebased,baseTick:result.baseTick,original:result.original.summary,originalOperations:result.original.operations,changes:{total:changes.length,tiles:changes.slice(0,12)},entities:{before:world.entities?.instances.length??0,after:result.world.entities?.instances.length??0}});
        }
        if(!('reviewedHash' in p)||p.reviewedHash!==result.hash)throw Error('Selective replay differs from reviewed candidate');
        await store.createSelective(world.id,result);await activate(result.world);return json(res,200,world);
      }
      if(pathname==='/api/history/preview'||pathname==='/api/history/branch') {
        const schema=z.object({worldId:Id,recordId:Digest,id:Id,name:z.string().trim().min(1).max(80),expectedRevision:z.number().int().nonnegative()}).strict();
        const p=(pathname.endsWith('/branch')?schema.extend({reviewedHash:Digest}):schema).parse(input);
        if(p.worldId!==world.id)throw Error('Historical branch belongs to another active world');revision(p.expectedRevision);
        if(await store.exists(p.id))throw Error('World already exists');
        const reconstructed=await store.historicalState(world.id,p.recordId),next=copyWorld(reconstructed.world,p.id,p.name);
        if(pathname.endsWith('/preview'))return json(res,200,{summary:worldSummary(next),hash:reconstructed.hash,days:reconstructed.days,baseTick:reconstructed.baseTick,baseKind:reconstructed.baseKind});
        if(!('reviewedHash' in p)||p.reviewedHash!==reconstructed.hash)throw Error('Historical state differs from reviewed state');
        await store.createNew(next,world.id);await activate(next);return json(res,200,world);
      }
      if(pathname==='/api/worlds/branch') {
        const p=z.object({id:Id,name:z.string().min(1).max(80),expectedRevision:z.number().int(),checkpointId:Id.optional()}).strict().parse(input);revision(p.expectedRevision);
        const source=p.checkpointId?(await store.readCheckpoint(world.id,p.checkpointId)).world:world;
        const next=copyWorld(source,p.id,p.name);await store.createNew(next,world.id);await activate(next);return json(res,200,world);
      }
      if(pathname==='/api/worlds/import/preview'||pathname==='/api/worlds/import') {
        const p=z.object({archive:z.unknown(),id:Id,name:z.string().min(1).max(80)}).strict().parse(input);
        if(await store.exists(p.id))throw Error('World already exists');
        const parsed=await unpackBundle(p.archive),next=copyWorld(parsed.world,p.id,p.name);
        if(pathname.endsWith('/preview'))return json(res,200,{...worldSummary(next),bundle:{legacy:parsed.legacy,images:parsed.images.length,sources:parsed.origins.length,records:parsed.records}});
        await store.createNew(next,undefined,parsed);await activate(next);return json(res,200,world);
      }
      if(pathname==='/api/worlds/create') {
        const next=createWorld(CreateWorldSchema.parse(input));next.neighborVisits=defaultNeighborVisits();next.migration=defaultMigration();await store.createNew(next);await activate(next);return json(res,200,world);
      }
      if(pathname==='/api/worlds/open') {
        const p=z.object({id:Id}).strict().parse(input);await activate(await store.load(p.id));return json(res,200,world);
      }
      return json(res,404,{error:'Unknown route'});
    }
    if(vite) return vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});
    const base=resolve('dist/web'), target=resolve(base,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
    if(!target.startsWith(base+sep)) {res.statusCode=403;return res.end();}
    const content=await readFile(target).catch(()=>null);
    if(!content) {res.statusCode=404;return res.end('Not found. Run npm run build.');}
    const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
    const immutable=/^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(js|css)$/.test(pathname)||pathname.startsWith('/painterly-v1/');
    // HTML must discover new hashed assets after a deployment; API responses stay no-store.
    res.writeHead(200,{'Content-Type':types[extname(target)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache'});res.end(content);
  }
  try {
    await new Promise<void>((yes,no)=>{server.once('error',no);server.listen(options.port??Number(process.env.PORT??5180),bindHost,yes);});
  } catch(error) {await closeVite();throw error;}
  return {server,close:async()=>{await prompts.close();await closeVite();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.loadEnvFile();} catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
  const app=await startServer({dev:process.argv.includes('--dev')});
  const address=app.server.address();
  const port=typeof address==='object'?address?.port:5180;
  console.log(`Logos Engine listening on ${typeof address==='object'?address?.address:'0.0.0.0'}:${port}`);
  console.log(`Local · http://localhost:${port}`);
  if(typeof address==='object' && address?.address==='0.0.0.0') {
    for(const entries of Object.values(networkInterfaces())) for(const entry of entries??[]) {
      if(entry.family==='IPv4'&&!entry.internal) console.log(`Network · http://${entry.address}:${port}`);
    }
  }
  for(const signal of ['SIGTERM','SIGINT']) process.once(signal,()=>void app.close().then(()=>process.exit(0)));
}
