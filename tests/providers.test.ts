import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile, chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {CodexProvider,codexArgs,codexSandboxArgs,decodeCodexReply} from '../packages/agent-bridge/src/codex.js';
import { CursorProvider, cursorArgs, cursorSandboxArgs, decodeCursorReply, runCursor } from '../packages/agent-bridge/src/cursor.js';
import { decodeClaudeReply } from '../packages/agent-bridge/src/claude.js';
import { AnthropicProvider } from '../packages/agent-bridge/src/anthropic.js';
import { buildContext, type ModelProvider } from '../packages/agent-bridge/src/context.js';
import { createWorld } from '../packages/worldgen/src/index.js';
import { WorldStore, stateHash } from '../apps/server/src/store.js';
import { PromptService, forecast } from '../apps/server/src/prompts.js';
import { applyProposal } from '../packages/engine/src/index.js';
import type { PromptRequest } from '../packages/contracts/src/prompts.js';
const world=()=>createWorld({id:'providers',name:'Providers',seed:'providers',frequency:2});
const request=(mode:'discuss'|'propose'):PromptRequest=>({id:'contract',worldId:'providers',expectedRevision:0,tileId:0,mode,scope:'tile',message:'Set rain to 80 mm per day.'});
const reply=(proposal:boolean,tileId=0)=>({kind:proposal?'proposal':'discussion',message:'Rain causes runoff.',assumptions:[],operations:proposal?[{kind:'rainfall',tileId,mmPerDay:80}]:[]});
const envelope=(value:unknown)=>JSON.stringify({type:'result',subtype:'success',is_error:false,result:JSON.stringify(value)});
const codexEnvelope=(value:unknown)=>[JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({reply:JSON.stringify(value)})}}),JSON.stringify({type:'turn.completed'})].join('\n');
const adapters:Record<string,(value:unknown)=>ModelProvider>={
 'Codex envelope':value=>({name:'Codex envelope',async generate(){return decodeCodexReply(codexEnvelope(value));}}),
 'Claude envelope':value=>({name:'Claude envelope',async generate(){return decodeClaudeReply(JSON.stringify({structured_output:value}));}}),
 'Cursor envelope':value=>({name:'Cursor envelope',async generate(){return decodeCursorReply(envelope(value));}}),
 'Anthropic mocked HTTP':value=>new AnthropicProvider('test-only','test-model',(async()=>new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]}))) as typeof fetch),
};
for(const [name,provider] of Object.entries(adapters))test(`${name}: shared discussion/proposal/scope contract and explicit application`,async()=>{
 for(const [mode,value,ok] of [['discuss',reply(false),true],['propose',reply(true),true],['discuss',reply(true),false],['propose',reply(true,40),false],['propose',{...reply(true),operations:[{kind:'unknown'}]},false]] as const){
  const root=await mkdtemp(join(tmpdir(),'logos-provider-contract-')),store=new WorldStore(root),w=world(),before=stateHash(w),service=new PromptService(store,provider(value));
  try{await store.save(w);await service.start(w,request(mode));
   while(service.busy)await new Promise(r=>setTimeout(r,5));
   const job=await service.get(w,'contract');assert.equal(job.status,ok?'complete':'failed');assert.equal(stateHash(w),before);assert.equal(stateHash(await store.load(w.id)),before);
   if(ok&&mode==='propose'){assert.ok(job.proposal);forecast(w,job.proposal);assert.equal(stateHash(w),before);assert.notEqual(stateHash(applyProposal(w,job.proposal)),before);}
   else assert.equal(job.proposal,undefined);
  }finally{await service.close();await rm(root,{recursive:true,force:true});}
 }
});
test('provider JSON errors never echo private output into browser errors',async()=>{
 for(const decode of [decodeClaudeReply,decodeCursorReply,decodeCodexReply]){
  for(const value of ['PRIVATE_SECRET',JSON.stringify({type:'result',subtype:'success',result:'PRIVATE_SECRET'})])assert.throws(()=>decode(value),e=>e instanceof Error&&!e.message.includes('PRIVATE_SECRET'));
 }
 const ctx=buildContext(world(),request('discuss'),[]);
 for(const body of ['PRIVATE_SECRET',JSON.stringify({content:[{type:'text',text:'PRIVATE_SECRET'}]})]){
  const p=new AnthropicProvider('key','model',(async()=>new Response(body)) as typeof fetch);
  await assert.rejects(()=>p.generate(ctx,new AbortController().signal),e=>e instanceof Error&&!e.message.includes('PRIVATE_SECRET'));
 }
});
test('API transport limits, truncation and pre-cancellation stop without retries',async()=>{
 const ctx=buildContext(world(),request('discuss'),[]);let calls=0;
 const p=new AnthropicProvider('key','model',(async()=>{calls++;return new Response(' '.repeat(128001));}) as typeof fetch);
 await assert.rejects(()=>p.generate(ctx,new AbortController().signal),/size limit/);assert.equal(calls,1);
 const cancelled=AbortSignal.abort();await assert.rejects(()=>p.generate(ctx,cancelled));assert.equal(calls,1);
 const truncated=new AnthropicProvider('key','model',(async()=>new Response(JSON.stringify({stop_reason:'max_tokens'}))) as typeof fetch);
 await assert.rejects(()=>truncated.generate(ctx,new AbortController().signal),/truncated/);
});
test('Cursor sandbox hides repository and host config, preserves native auth, bounds process output and cancellation',async t=>{
 if(process.platform!=='linux'){t.skip('Linux bubblewrap integration');return;}
 const root=await mkdtemp(join(tmpdir(),'logos-cursor-test-')),home=join(root,'home'),work=join(root,'world'),auth=join(root,'auth');
 try{
  await mkdir(join(home,'.config/cursor'),{recursive:true});await mkdir(work);await mkdir(auth);await writeFile(join(auth,'test-login'),'native');
  const base=cursorSandboxArgs('/usr/bin',home,work,auth),env={PATH:'/usr/bin:/bin'};
  const {stdout}=await promisify(execFile)('/usr/bin/bwrap',[...base,'--','/opt/cursor/sh','-c','test ! -r "$1" && test ! -w /usr && test ! -r "$2" && cat /home/logos/.config/cursor/test-login && printf refreshed > /home/logos/.config/cursor/test-login && printf scratch > /tmp/world/check','--',resolve('package.json'),resolve('.env')],{env,timeout:10000});
  assert.equal(stdout,'native');assert.equal(await readFile(join(auth,'test-login'),'utf8'),'refreshed');assert.equal(await readFile(join(work,'check'),'utf8'),'scratch');
  await assert.rejects(()=>runCursor([...base,'--','/opt/cursor/sh','-c','head -c 128001 /dev/zero'],env,'',AbortSignal.timeout(5000)),/size limit/);
  await assert.rejects(()=>runCursor([...base,'--','/opt/cursor/sh','-c','sleep 20'],env,'',AbortSignal.timeout(50)),/cancelled|timed out/);
  const args=cursorArgs();assert.equal(args[args.indexOf('--allowed-tools')+1],'');assert.ok(args.includes('--disable-auto-update'));assert.ok(!args.includes('--force'));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Codex rejects incomplete/failed/tool events and isolates only its native auth file',async t=>{
 const valid=codexEnvelope(reply(false));assert.deepEqual(decodeCodexReply(valid),reply(false));
 for(const extra of [{type:'turn.failed'},{type:'error',message:'PRIVATE_SECRET'},{type:'item.completed',item:{type:'command_execution'}},{type:'item.completed',item:{type:'error',message:'unexpected'}}])assert.throws(()=>decodeCodexReply(JSON.stringify(extra)+'\n'+valid),/text-only/);
 assert.throws(()=>decodeCodexReply(valid.split('\n')[0]),/text-only/);
 const args=codexArgs();assert.ok(args.includes('--ignore-user-config'));assert.ok(args.includes('--ephemeral'));assert.ok(args.includes('shell_tool'));assert.ok(args.includes('permissions.logos.network.enabled=false'));
 if(process.platform!=='linux'){t.skip('Linux sandbox');return;}
 const root=await mkdtemp(join(tmpdir(),'logos-codex-test-')),home=join(root,'home'),work=join(root,'world'),auth=join(root,'auth.json');
 try{await mkdir(join(home,'.codex'),{recursive:true});await mkdir(work);await writeFile(auth,'native');
  const {stdout}=await promisify(execFile)('/usr/bin/bwrap',[...codexSandboxArgs('/usr/bin/sh',home,work,auth),'--','/opt/codex','-c','test ! -r "$1" && cat /home/logos/.codex/auth.json && printf refreshed > /home/logos/.codex/auth.json','--',resolve('package.json')],{env:{PATH:'/usr/bin:/bin'},timeout:10000});
  assert.equal(stdout,'native');assert.equal(await readFile(auth,'utf8'),'refreshed');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Cursor accepts a single complete JSON fence but never extracts executable operations from prose',()=>{
 const value=reply(true);assert.deepEqual(decodeCursorReply(JSON.stringify({type:'result',subtype:'success',result:'```json\n'+JSON.stringify(value)+'\n```'})),value);
 assert.throws(()=>decodeCursorReply(JSON.stringify({type:'result',subtype:'success',result:'Explanation: '+JSON.stringify(value)})),/world-change JSON/);
});

test('unverified native CLI versions fail before any model request',async t=>{
 if(process.platform!=='linux'){t.skip('Linux sandbox');return;}
 const root=await mkdtemp(join(tmpdir(),'logos-cli-version-'));
 const saved=Object.fromEntries(['CURSOR_BIN','CURSOR_API_KEY','CODEX_BIN','CODEX_API_KEY'].map(key=>[key,process.env[key]]));
 try{
  for(const file of ['cursor-agent','codex']){await writeFile(join(root,file),'#!/bin/sh\nif [ "$1" = --version ]; then printf unverified; else printf unexpected-model-call; fi\n');await chmod(join(root,file),0o700);}
  await writeFile(join(root,'node'),'');await writeFile(join(root,'index.js'),'');
  process.env.CURSOR_BIN=join(root,'cursor-agent');process.env.CODEX_BIN=join(root,'codex');process.env.CURSOR_API_KEY='test-only';process.env.CODEX_API_KEY='test-only';
  for(const provider of [new CursorProvider(),new CodexProvider()])await assert.rejects(()=>provider.generate(buildContext(world(),request('discuss'),[]),AbortSignal.timeout(10000)),/version is not verified/i);
 }finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;await rm(root,{recursive:true,force:true});}
});
