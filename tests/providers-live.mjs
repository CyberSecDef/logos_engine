import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {CodexProvider,codexArgs,codexSandboxArgs,findCodex} from '../dist/packages/agent-bridge/src/codex.js';
import {CursorProvider} from '../dist/packages/agent-bridge/src/cursor.js';
import {ClaudeCodeProvider} from '../dist/packages/agent-bridge/src/claude.js';
import {createWorld} from '../dist/packages/worldgen/src/index.js';
import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';
import {PromptService,forecast} from '../dist/apps/server/src/prompts.js';
import {applyProposal} from '../dist/packages/engine/src/index.js';
const providers={'codex':()=>new CodexProvider(),'cursor':()=>new CursorProvider(),'claude-code':()=>new ClaudeCodeProvider()};
const selected=process.argv.slice(2);
if(!selected.length||selected.some(name=>!providers[name]))throw Error('Specify providers to test: codex cursor claude-code. This sends two real model requests per provider.');
for(const name of selected){const provider=providers[name]();
 if(name==='codex'){
  const root=await mkdtemp(join(tmpdir(),'logos-codex-policy-')),home=join(root,'home'),work=join(root,'world'),auth=join(root,'auth.json');
  try{await mkdir(join(home,'.codex'),{recursive:true});await mkdir(work);await writeFile(auth,'{}');
   const options=codexArgs(),policy=[];
   for(let i=0;i<options.length;i++)if(options[i]==='-c'&&(options[i+1].startsWith('default_permissions=')||options[i+1].startsWith('permissions.logos.')))policy.push(options[i],options[++i]);
   const {stdout}=await promisify(execFile)('/usr/bin/bwrap',[...codexSandboxArgs(await findCodex(),home,work,auth),'--','/opt/codex',...policy,'sandbox','--','/usr/bin/sh','-c','test ! -r /home/logos/.codex/auth.json && test ! -w /tmp/world && printf isolated'],{env:{PATH:'/usr/bin:/bin'},timeout:10000});
   assert.equal(stdout,'isolated');console.log('Codex CLI: inner sandbox denies dummy credentials and workspace writes');
  }finally{await rm(root,{recursive:true,force:true});}
 }
 const root=await mkdtemp(join(tmpdir(),'logos-live-provider-')),store=new WorldStore(root),world=createWorld({id:'acceptance',name:'Acceptance',seed:'provider-check',frequency:2}),service=new PromptService(store,provider,120000);
 try{await store.save(world);const before=stateHash(world);
 for(const mode of ['discuss','propose']){
  await service.start(world,{id:mode,worldId:world.id,expectedRevision:0,tileId:0,mode,scope:'tile',message:mode==='discuss'?'Explain briefly what increasing rainfall here would do. Do not propose changes.':'Set recurring rainfall on this tile to exactly 80 mm per day. Return the single rainfall operation.'});
  while(service.busy)await new Promise(r=>setTimeout(r,250));
  const job=await service.get(world,mode);assert.equal(job.status,'complete',job.error);assert.equal(stateHash(world),before);assert.equal(stateHash(await store.load(world.id)),before);
  if(mode==='propose'){assert.ok(job.proposal);forecast(world,job.proposal);const changed=applyProposal(world,job.proposal);assert.equal(changed.rules.find(r=>r.kind==='rainfall')?.mmPerDay,80);}
  else assert.equal(job.proposal,undefined);
  console.log(`${provider.name}: ${mode} contract passed; saved world unchanged`);
 }
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
}
