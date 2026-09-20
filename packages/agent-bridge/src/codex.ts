import { access, mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { runIsolatedCli } from './process.js';
import { modelReplyJsonSchema } from '../../contracts/src/prompts.js';
import { systemPrompt, type ModelProvider, type PromptContext } from './context.js';
export const codexVersion='codex-cli 0.154.0';
export async function findCodex():Promise<string> {
 if(process.env.CODEX_BIN){if(!isAbsolute(process.env.CODEX_BIN))throw Error('CODEX_BIN must be an absolute path');return realpath(process.env.CODEX_BIN);}
 for(const dir of (process.env.PATH??'').split(':').filter(Boolean))try{const file=join(dir,'codex');await access(file);return await realpath(file);}catch{}
 throw Error('Codex CLI not found. Install it or set CODEX_BIN to the native executable.');
}
export function codexSandboxArgs(binary:string,home:string,workspace:string,authFile?:string):string[] {
 return ['--die-with-parent','--new-session','--unshare-pid','--unshare-ipc','--unshare-uts',
  '--ro-bind','/','/','--proc','/proc','--dev','/dev','--tmpfs','/home','--tmpfs','/root','--tmpfs','/tmp','--tmpfs','/run','--tmpfs','/opt',
  '--ro-bind',realpathSync('/etc/resolv.conf'),realpathSync('/etc/resolv.conf'),
  '--dir','/home/logos','--bind',home,'/home/logos',
  ...(authFile?['--bind',authFile,'/home/logos/.codex/auth.json']:[]),
  '--bind',workspace,'/tmp/world','--ro-bind',binary,'/opt/codex','--chdir','/tmp/world',
  '--setenv','HOME','/home/logos','--setenv','CODEX_HOME','/home/logos/.codex','--setenv','TMPDIR','/tmp'];
}
const disabledFeatures=['shell_tool','unified_exec','shell_snapshot','apps','multi_agent','hooks','browser_use','browser_use_external','computer_use','image_generation','view_image','remote_plugin','skill_search','skill_mcp_dependency_install','tool_suggest','goals','sleep_tool','code_mode','code_mode_host','unbounded_connection_retries'];
export function codexArgs(model?:string):string[] {
 return ['exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--color','never','--json',
  '--output-schema','/tmp/world/response-schema.json',
  ...disabledFeatures.flatMap(feature=>['--disable',feature]),
  '-c','approval_policy="never"','-c','web_search="disabled"','-c','cli_auth_credentials_store="file"',
  '-c','check_for_update_on_startup=false','-c','tools.view_image=false',
  '-c','default_permissions="logos"','-c','permissions.logos.filesystem={":minimal"="read","/opt/codex"="read","/tmp/world"="read","/home/logos/.codex"="deny"}',
  '-c','permissions.logos.network.enabled=false',
  ...(model?['--model',model]:[]),'-'];
}
// A string envelope avoids forcing OpenAI's strict JSON Schema dialect onto the
// world's optional/record fields. The inner JSON is validated by PromptService.
export const codexResponseSchema={type:'object',additionalProperties:false,required:['reply'],properties:{reply:{type:'string'}}};
export function decodeCodexReply(output:string):unknown {
 let message:string|undefined,completed=false;
 try {
  for(const line of output.split('\n').filter(s=>s.trim())){
   const event=JSON.parse(line);
   if(event.type==='error'||event.type==='turn.failed')throw Error('failed');
   if(event.type==='turn.completed')completed=true;
   if(event.item?.type==='error'&&event.item.message==='Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.')continue;
   if(event.item){if(!['agent_message','reasoning','plan'].includes(event.item.type))throw Error('Unexpected tool activity');
    if(event.type==='item.completed'&&event.item.type==='agent_message')message=event.item.text;}
  }
  if(!completed||!message)throw Error('incomplete');
  const outer=JSON.parse(message);if(typeof outer.reply!=='string')throw Error('missing reply');
  return JSON.parse(outer.reply);
 }catch{throw Error('Codex did not return a complete text-only world-change response. No changes were applied.');}
}
export class CodexProvider implements ModelProvider {
 readonly name='Codex CLI';
 constructor(private readonly model=process.env.CODEX_MODEL){}
 async generate(context:PromptContext,signal:AbortSignal):Promise<unknown> {
  signal.throwIfAborted();if(process.platform!=='linux')throw Error('Codex isolation requires Linux and bubblewrap. Use manual exchange on other hosts.');
  const binary=await findCodex(),root=await mkdtemp(join(tmpdir(),'logos-codex-')),home=join(root,'home'),workspace=join(root,'world');
  try{
   await mkdir(join(home,'.codex'),{recursive:true,mode:0o700});await mkdir(workspace,{mode:0o700});
   let authFile:string|undefined;
   if(!process.env.CODEX_API_KEY){try{authFile=await realpath(join(process.env.CODEX_HOME??join(homedir(),'.codex'),'auth.json'));}
    catch{throw Error('Codex login is unavailable. Run codex login on the server, or configure CODEX_API_KEY.');}}
   await writeFile(join(workspace,'response-schema.json'),JSON.stringify(codexResponseSchema),{mode:0o600});
   const env:NodeJS.ProcessEnv={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',TERM:'dumb',...(process.env.CODEX_API_KEY?{CODEX_API_KEY:process.env.CODEX_API_KEY}:{})};
   const base=[...codexSandboxArgs(binary,home,workspace,authFile),'--','/opt/codex'];
   if((await runIsolatedCli([...base,'--version'],env,'',signal,this.name)).trim()!==codexVersion)throw Error(`Codex version is not verified. This adapter requires ${codexVersion}; no model request was sent.`);
   const input=JSON.stringify({transport:'Return an object with one string key reply. That string must contain the complete JSON reply matching responseSchema. Do not use tools.',instructions:systemPrompt,responseSchema:modelReplyJsonSchema,context});
   return decodeCodexReply(await runIsolatedCli([...base,...codexArgs(this.model)],env,input,signal,this.name));
  }finally{await rm(root,{recursive:true,force:true});}
 }
}
