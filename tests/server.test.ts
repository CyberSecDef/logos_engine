import test from 'node:test';
import { get as httpGet } from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../apps/server/src/index.js';
import type { World, Proposal } from '../packages/contracts/src/index.js';

test('HTTP flow: authenticated local commands, preview isolation, apply, step, persisted reload',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-http-'));
 const app=await startServer({root,port:0});
 try {
  const address=app.server.address();assert.ok(address&&typeof address==='object');
  assert.equal(address.address,'0.0.0.0');
  const base=`http://127.0.0.1:${address.port}/api/`;
  const session=await (await fetch(base+'session')).json() as {token:string};
  const headers={Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'};
  const get=async()=>await (await fetch(base+'world',{headers})).json() as World;
  const post=(path:string,data:unknown)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(data)});
  assert.equal((await fetch(base+'world')).status,401);
  const lanHost=`192.168.1.20:${address.port}`;
  const hostStatus=(host:string)=>new Promise<number|undefined>((resolve,reject)=>{
    httpGet(base+'world',{headers:{...headers,Host:host,Origin:`http://${host}`}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);
  });
  assert.equal(await hostStatus(lanHost),200);
  assert.equal(await hostStatus('unconfigured.example'),403);
  assert.equal((await fetch(base+'world',{headers:{...headers,Origin:'https://example.com'}})).status,403);
  const initial=await get();assert.equal(initial.tick,0);
  const p:Proposal={id:'request-a',worldId:initial.id,expectedRevision:0,summary:'Rain',operations:[{kind:'rainfall',tileId:0,mmPerDay:100}]};
  assert.equal((await post('proposals/preview',p)).status,200);
  assert.deepEqual(await get(),initial);
  assert.equal((await post('proposals/apply',p)).status,200);
  assert.equal((await get()).tick,0);
  assert.equal((await post('proposals/apply',p)).status,400);
  const concurrent=await Promise.all([post('step',{expectedRevision:1}),post('step',{expectedRevision:1})]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400]);
  const after=await get();assert.equal(after.tick,1);assert.equal(after.revision,2);
  assert.equal((await post('worlds/create',{id:initial.id,name:'Overwrite',seed:'new'})).status,400);
  assert.equal((await post('worlds/open',{id:'../escape'})).status,400);
 } finally {await app.close();}
 const reopened=await startServer({root,port:0});
 try {
  const address=reopened.server.address();assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}/api/`;
  const {token}=await (await fetch(base+'session')).json() as {token:string};
  const world=await (await fetch(base+'world',{headers:{Authorization:`Bearer ${token}`}})).json() as World;
  assert.equal(world.tick,1);assert.equal(world.rules.find(r=>r.kind==='rainfall')?.mmPerDay,100);
 }finally{await reopened.close();await rm(root,{recursive:true,force:true});}
});

test('prompt HTTP requests are user-triggered, cancellable, and keep mutations paused until completion',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-http-prompts-'));let calls=0;
 const provider={name:'HTTP test provider',async generate(context:{message:string;mode:string;selectedTileId:number},signal:AbortSignal){
  calls++;if(context.message==='wait')await new Promise((_yes,no)=>signal.addEventListener('abort',()=>no(Error('cancelled')),{once:true}));
  return {kind:context.mode==='discuss'?'discussion':'proposal',message:'Rain may increase runoff.',assumptions:[],operations:context.mode==='discuss'?[]:[{kind:'rainfall',tileId:context.selectedTileId,mmPerDay:80}]};
 }};
 const app=await startServer({root,port:0,provider});
 try {
  const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`;
  const {token}=await (await fetch(base+'session')).json() as {token:string};const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const post=(path:string,data:unknown)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(data)});
  const get=(path:string)=>fetch(base+path,{headers}).then(r=>r.json());
  const world=await get('world') as World;await get('prompts/config');await get('prompts/history');assert.equal(calls,0);
  const request={id:'http-discuss',worldId:world.id,expectedRevision:0,tileId:0,mode:'discuss',scope:'tile',message:'wait'};
  assert.equal((await post('prompts',request)).status,202);
  assert.equal((await post('step',{expectedRevision:0})).status,400);
  assert.equal((await post('worlds/open',{id:world.id})).status,400);
  assert.equal((await post('prompts/cancel',{id:request.id})).status,200);
  for(let i=0;i<100;i++){const job=await get('prompts/jobs/'+request.id);if(job.status==='cancelled')break;await new Promise(r=>setTimeout(r,5));}
  assert.equal((await get('prompts/jobs/'+request.id)).status,'cancelled');assert.equal(calls,1);assert.deepEqual(await get('world'),world);
  const exportResponse=await post('prompts/export',{...request,id:'manual-http',mode:'propose',message:'80 mm rain'});assert.equal(exportResponse.status,200);
  const importResponse=await post('prompts/import',{requestId:'manual-http',reply:{kind:'proposal',message:'80 mm every day',assumptions:[],operations:[{kind:'rainfall',tileId:0,mmPerDay:80}]}});assert.equal(importResponse.status,200);
  const job=await importResponse.json() as {proposal:Proposal};assert.deepEqual(await get('world'),world);
  assert.equal((await post('proposals/apply',job.proposal)).status,200);assert.equal((await get('world')).rules[0].mmPerDay,80);assert.equal(calls,1);
 }finally{await app.close();await rm(root,{recursive:true,force:true});}
});
