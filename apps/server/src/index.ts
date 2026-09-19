import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { hostname, networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createWorld } from '../../../packages/worldgen/src/index.js';
import { advance, applyProposal, preview } from '../../../packages/engine/src/index.js';
import { CreateWorldSchema, ProposalSchema, type World } from '../../../packages/contracts/src/index.js';
import { WorldStore } from './store.js';

export async function startServer(options:{port?:number; host?:string; root?:string; dev?:boolean}={}) {
  const store=new WorldStore(resolve(options.root??'worlds'));
  const token=randomUUID();
  const bindHost=options.host??process.env.HOST??'0.0.0.0';
  const allowedHosts=['localhost',hostname(),`${hostname()}.local`,...(process.env.ALLOWED_HOSTS??'').split(',').map(h=>h.trim()).filter(Boolean)];
  let world:World;
  try {world=await store.load('first-world');}
  catch(error) {
    if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;
    world=createWorld({id:'first-world',name:'Aethra',seed:'aethra-01',frequency:12});
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
  if(options.dev) {
    const {createServer:createViteServer}=await import('vite');
    vite=await createViteServer({configFile:resolve('vite.config.ts'),server:{middlewareMode:true,allowedHosts,ws:{server}}});
  }
  function json(res:ServerResponse,status:number,value:unknown) {
    res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(value));
  }
  async function body(req:IncomingMessage):Promise<unknown> {
    if(!req.headers['content-type']?.startsWith('application/json')) throw Error('Expected JSON');
    let buffer=''; for await(const chunk of req) {buffer+=chunk; if(buffer.length>64000) throw Error('Request too large');}
    return JSON.parse(buffer);
  }
  async function commit(next:World) {await store.save(next);world=next;}
  async function handle(req:IncomingMessage,res:ServerResponse) {
    const host=req.headers.host??'';
    const hostName=new URL(`http://${host}`).hostname.replace(/^\[|\]$/g,'');
    if(!isIP(hostName) && !allowedHosts.includes(hostName)) return json(res,403,{error:'Host not allowed; use the server IP or configure ALLOWED_HOSTS'});
    if(req.headers.origin && req.headers.origin!==`http://${host}`) return json(res,403,{error:'Origin not allowed'});
    const pathname=new URL(req.url??'/',`http://${host}`).pathname;
    if(pathname.startsWith('/api/')) {
      if(req.method==='GET' && pathname==='/api/session') return json(res,200,{token});
      if(req.headers.authorization!==`Bearer ${token}`) return json(res,401,{error:'Session required'});
      if(req.method==='GET' && pathname==='/api/world') return json(res,200,world);
      if(req.method==='GET' && pathname==='/api/worlds') return json(res,200,await store.list());
      if(req.method!=='POST') return json(res,404,{error:'Unknown route'});
      const input=await body(req);
      if(pathname==='/api/step') {
        const p=z.object({expectedRevision:z.number().int(),days:z.number().int().min(1).max(10).default(1)}).strict().parse(input);
        if(p.expectedRevision!==world.revision) throw Error('Stale revision; refresh first');
        let next=world; for(let i=0;i<p.days;i++) next=advance(next); await commit(next); return json(res,200,world);
      }
      if(pathname==='/api/proposals/preview') {
        const p=ProposalSchema.parse(input), result=preview(world,p,5);
        return json(res,200,{tick:result.tick,tiles:p.operations.map(o=>({before:world.tiles[o.tileId],after:result.tiles[o.tileId]})),events:result.events.slice(-12)});
      }
      if(pathname==='/api/proposals/apply') {await commit(applyProposal(world,input));return json(res,200,world);}
      if(pathname==='/api/worlds/create') {
        const p=CreateWorldSchema.parse(input);
        // Refuse overwrite even if an existing save is corrupt.
        try {await store.load(p.id);throw Error('World already exists');}
        catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
        await commit(createWorld(p));return json(res,200,world);
      }
      if(pathname==='/api/worlds/open') {
        const p=z.object({id:z.string()}).strict().parse(input);world=await store.load(p.id);return json(res,200,world);
      }
      return json(res,404,{error:'Unknown route'});
    }
    if(vite) return vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});
    const base=resolve('dist/web'), target=resolve(base,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
    if(!target.startsWith(base+sep)) {res.statusCode=403;return res.end();}
    const content=await readFile(target).catch(()=>null);
    if(!content) {res.statusCode=404;return res.end('Not found. Run npm run build.');}
    const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':types[extname(target)]??'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);
  }
  await new Promise<void>((yes,no)=>{server.once('error',no);server.listen(options.port??Number(process.env.PORT??5180),bindHost,yes);});
  return {server,close:async()=>{await vite?.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
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
