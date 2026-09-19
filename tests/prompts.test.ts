import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorld } from '../packages/worldgen/src/index.js';
import { advance, applyProposal } from '../packages/engine/src/index.js';
import { WorldStore, stateHash } from '../apps/server/src/store.js';
import { PromptService, forecast } from '../apps/server/src/prompts.js';
import { buildContext, type ModelProvider } from '../packages/agent-bridge/src/context.js';
import { AnthropicProvider } from '../packages/agent-bridge/src/anthropic.js';
import { claudeArgs, sandboxArgs } from '../packages/agent-bridge/src/claude.js';
import type { PromptRequest, PromptJob } from '../packages/contracts/src/prompts.js';
const make=()=>createWorld({id:'prompt-test',name:'Prompt test',seed:'prompts',frequency:2});
const req=(id:string,mode:'discuss'|'propose'='discuss'):PromptRequest=>({id,worldId:'prompt-test',expectedRevision:0,tileId:0,mode,scope:'tile',message:'Set 80 mm rainfall daily here.'});
const reply=(proposal=false,tileId=0)=>({kind:proposal?'proposal':'discussion',message:'Rain may increase runoff.',assumptions:[],operations:proposal?[{kind:'rainfall',tileId,mmPerDay:80}]:[]});
async function fixture(provider:ModelProvider,timeout=1000) {
 const root=await mkdtemp(join(tmpdir(),'logos-prompts-')),world=make(),store=new WorldStore(root);
 await store.save(world);const service=new PromptService(store,provider,timeout);
 return {world,store,service,close:async()=>{await service.close();await rm(root,{recursive:true,force:true});}};
}
async function finish(service:PromptService,world:ReturnType<typeof make>,id:string):Promise<PromptJob> {
 for(let n=0;n<200;n++){const job=await service.get(world,id);if(job.status!=='running'&&!service.busy)return job;await new Promise(r=>setTimeout(r,5));}
 throw Error('Prompt did not finish');
}
test('discussion persists without mutation; ticks and history do not invoke the model',async()=>{
 let calls=0;const f=await fixture({name:'Test',async generate(){calls++;return reply();}});
 try {const hash=stateHash(f.world);assert.equal(calls,0);await f.service.history(f.world);advance(f.world);assert.equal(calls,0);
  await f.service.start(f.world,req('discuss-1'));const job=await finish(f.service,f.world,'discuss-1');
  assert.equal(job.status,'complete');assert.equal(job.proposal,undefined);assert.equal(stateHash(f.world),hash);assert.equal(stateHash(await f.store.load(f.world.id)),hash);
  assert.equal((await f.service.history(f.world)).length,1);assert.equal(calls,1);
  await assert.rejects(()=>f.service.start(f.world,req('discuss-1')),/already been used/);assert.equal(calls,1);
 }finally{await f.close();}
});
test('proposal is scoped, server-versioned, previewed against baseline, and applied only explicitly',async()=>{
 const f=await fixture({name:'Test',async generate(){return reply(true);}});
 try{const hash=stateHash(f.world);await f.service.start(f.world,req('propose-1','propose'));const job=await finish(f.service,f.world,'propose-1');
 assert.equal(job.status,'complete');assert.ok(job.proposal);assert.equal(job.proposal.worldId,f.world.id);assert.equal(job.proposal.expectedRevision,0);
 const forecasted=forecast(f.world,job.proposal);assert.equal(forecasted.tick,5);assert.equal(stateHash(f.world),hash);
 const changed=applyProposal(f.world,job.proposal);assert.equal(changed.rules.find(r=>r.kind==='rainfall')?.mmPerDay,80);assert.equal(changed.tick,0);
 assert.throws(()=>applyProposal(advance(f.world),job.proposal!),/Stale/);
 }finally{await f.close();}
});
test('discussion cannot smuggle changes, invalid model output and out-of-scope operations fail closed',async()=>{
 for(const [id,mode,response] of [
  ['smuggle','discuss',reply(true)],['scope','propose',reply(true,40)],
  ['invalid','propose',{...reply(true),operations:[{kind:'shell',command:'anything'}]}],
 ] as const){const f=await fixture({name:'Test',async generate(){return response;}});
 try{const hash=stateHash(f.world);await f.service.start(f.world,req(id,mode));const job=await finish(f.service,f.world,id);assert.equal(job.status,'failed');assert.equal(job.proposal,undefined);assert.equal(stateHash(f.world),hash);}finally{await f.close();}}
});
test('cancel and timeout finish without mutation or retry',async()=>{
 for(const timeout of [1000,15]){let calls=0;
 const f=await fixture({name:'Slow',generate(_c,signal){calls++;return new Promise((_yes,no)=>{signal.addEventListener('abort',()=>no(Error('aborted')),{once:true});});}},timeout);
 try{const hash=stateHash(f.world);await f.service.start(f.world,req('slow'));await assert.rejects(()=>f.service.start(f.world,req('another')),/already running/);
 if(timeout===1000)f.service.cancel(f.world,'slow');
 const job=await finish(f.service,f.world,'slow');assert.equal(job.status,'cancelled');assert.equal(calls,1);assert.equal(stateHash(f.world),hash);
 }finally{await f.close();}}
});
test('manual exchange keeps authority server-side, rejects stale/reused imports, never calls model',async()=>{
 let calls=0;const f=await fixture({name:'Never',async generate(){calls++;throw Error('Should not run');}});
 try{const bundle=await f.service.export(f.world,req('external','propose'));assert.equal(bundle.context.allowedTileIds.length,1);assert.equal(calls,0);
 await assert.rejects(()=>f.service.import(advance(f.world),{requestId:'external',reply:reply(true)}),/stale/);
 await assert.rejects(()=>f.service.import(f.world,{requestId:'external',reply:reply(true,40)}),/outside/);
 const job=await f.service.import(f.world,{requestId:'external',reply:reply(true)});assert.ok(job.proposal);assert.equal(f.world.rules.length,0);
 await assert.rejects(()=>f.service.import(f.world,{requestId:'external',reply:reply(true)}),/not awaiting/);assert.equal(calls,0);
 }finally{await f.close();}
});
test('old running requests become interrupted records without restarting models',async()=>{
 const f=await fixture({name:'Never',async generate(){throw Error('Should not run');}});
 try{await f.store.writePrompt(f.world.id,'interrupted',{request:req('interrupted'),provider:'Test',status:'running',createdAt:new Date().toISOString()});
 const jobs=await f.service.history(f.world);assert.equal(jobs[0].status,'failed');assert.match(jobs[0].error!,/restart/);
 }finally{await f.close();}
});
test('context is bounded to selected neighbors and explicitly selected mutation scope',()=>{
 const w=make(),request=req('context');const c=buildContext(w,request,[]);
 assert.equal(c.tiles.length,w.cells[0].neighbors.length+1);assert.deepEqual(c.allowedTileIds,[0]);
 assert.equal(buildContext(w,{...request,scope:'neighbors'},[]).allowedTileIds.length,c.tiles.length);
});
test('Claude invocation disables tools, hooks, external configuration and masks engine home',()=>{
 const args=claudeArgs();assert.equal(args[args.indexOf('--tools')+1],'');assert.ok(args.includes('--restricted'));assert.ok(args.includes('--strict-mcp-config'));assert.ok(args.includes('--no-session-persistence'));
 const sandbox=sandboxArgs('/binary','/private-home','/workspace');assert.ok(sandbox.includes('--ro-bind'));assert.ok(sandbox.includes('--tmpfs'));assert.ok(sandbox.includes('/home'));assert.ok(!args.includes('--dangerously-skip-permissions'));
});
test('Anthropic API adapter sends bounded context once and does not expose provider error bodies',async()=>{
 let calls=0;const c=buildContext(make(),req('api'),[]);
 const fake=(async(_url,init)=>{calls++;assert.equal((init?.headers as Record<string,string>)['x-api-key'],'test-key');return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(reply())}]}));}) as typeof fetch;
 assert.deepEqual(await new AnthropicProvider('test-key','test-model',fake).generate(c,new AbortController().signal),reply());assert.equal(calls,1);
 const failure=(async()=>new Response('private-provider-details',{status:401})) as typeof fetch;
 await assert.rejects(()=>new AnthropicProvider('secret','model',failure).generate(c,new AbortController().signal),e=>e instanceof Error&&e.message.includes('401')&&!e.message.includes('private-provider'));
});
