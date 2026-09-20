import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm, realpath, access } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { modelReplyJsonSchema } from '../../contracts/src/prompts.js';
import { systemPrompt, type ModelProvider, type PromptContext } from './context.js';

export async function findClaude():Promise<string> {
 const configured=process.env.CLAUDE_BIN;
 if(configured) {if(!isAbsolute(configured))throw Error('CLAUDE_BIN must be an absolute path');return realpath(configured);}
 for(const dir of (process.env.PATH??'').split(':')) {
  try {const file=join(dir,'claude');await access(file);return await realpath(file);}catch{}
 }
 throw Error('Claude Code not found. Install it or set CLAUDE_BIN to its absolute path.');
}
export function sandboxArgs(binary:string,home:string,workspace:string,authDirectory?:string):string[] {
 return ['--die-with-parent','--new-session','--unshare-pid','--unshare-ipc','--unshare-uts',
  '--ro-bind','/','/','--proc','/proc','--dev','/dev',
  '--tmpfs','/home','--tmpfs','/root','--tmpfs','/tmp','--tmpfs','/run','--tmpfs','/opt',
  // Preserve DNS when /etc/resolv.conf points into the masked /run directory.
  '--ro-bind',realpathSync('/etc/resolv.conf'),realpathSync('/etc/resolv.conf'),
  '--dir','/home/logos','--bind',home,'/home/logos',
  // The trusted CLI maintains its existing login here. This directory is never
  // provided as model context; hooks, tools, skills, and external MCP are disabled.
  ...(authDirectory?['--bind',authDirectory,'/home/logos/.claude']:[]),
  '--bind',workspace,'/tmp/world','--ro-bind',binary,'/opt/claude',
  '--chdir','/tmp/world','--setenv','HOME','/home/logos','--setenv','CLAUDE_CONFIG_DIR','/home/logos/.claude',
  '--setenv','TMPDIR','/tmp',
 ];
}
export function claudeArgs(model?:string):string[] {
 const args=['--print','--output-format','json','--json-schema',JSON.stringify(modelReplyJsonSchema),
  '--tools','','--restricted','--permission-mode','dontAsk','--permission-prompts','none',
  '--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--disable-slash-commands',
  '--setting-sources','','--settings','{"disableAllHooks":true,"enabledPlugins":{}}',
  '--no-session-persistence','--no-chrome','--system-prompt',systemPrompt];
 if(model)args.push('--model',model);
 return args;
}
export function decodeClaudeReply(output:string):unknown {
 let envelope:{is_error?:boolean;structured_output?:unknown;result?:string};
 try{envelope=JSON.parse(output);}catch{throw Error('Claude Code returned invalid JSON');}
 if(!envelope||envelope.is_error)throw Error('Claude Code could not complete the request. Check login, availability, and usage limits.');
 if(envelope.structured_output)return envelope.structured_output;
 if(typeof envelope.result==='string'){
  try{return JSON.parse(envelope.result);}catch{throw Error('Claude Code response did not contain world-change JSON. No changes were applied.');}
 }
 throw Error('Claude Code returned no structured response');
}
export class ClaudeCodeProvider implements ModelProvider {
 readonly name='Claude Code';
 constructor(private readonly model=process.env.CLAUDE_MODEL) {}
 async generate(context:PromptContext,signal:AbortSignal):Promise<unknown> {
  signal.throwIfAborted();
  if(process.platform!=='linux')throw Error('Claude Code isolation currently requires Linux and bubblewrap. Use the manual exchange on other hosts.');
  const binary=await findClaude();
  const root=await mkdtemp(join(tmpdir(),'logos-claude-'));
  const home=join(root,'home'),workspace=join(root,'world');
  try {
   await mkdir(join(home,'.claude'),{recursive:true,mode:0o700});await mkdir(workspace,{mode:0o700});
   // Preserve the native CLI's credential-refresh behavior, rather than copying
   // a refresh token and accidentally desynchronizing the host login.
   let authDirectory:string;
   try {
    authDirectory=await realpath(process.env.CLAUDE_CONFIG_DIR??join(homedir(),'.claude'));
    await access(join(authDirectory,'.credentials.json'));
   } catch {throw Error('Claude Code login is unavailable. Run claude auth login on the server.');}
   await writeFile(join(home,'.claude.json'),JSON.stringify({hasCompletedOnboarding:true}),{mode:0o600});
   const env:NodeJS.ProcessEnv={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',TERM:'dumb',DISABLE_AUTOUPDATER:'1',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'};
   const result=await new Promise<string>((resolve,reject)=>{
    const child=spawn('/usr/bin/bwrap',[...sandboxArgs(binary,home,workspace,authDirectory),'--','/opt/claude',...claudeArgs(this.model)],{env,stdio:['pipe','pipe','pipe'],detached:true});
    let output='',errorOutput='',failure:Error|undefined,killTimer:NodeJS.Timeout|undefined;
    const terminate=(error:Error)=>{
     failure??=error;
     if(child.pid)try{process.kill(-child.pid,'SIGTERM');}catch{}
     killTimer??=setTimeout(()=>{if(child.pid)try{process.kill(-child.pid,'SIGKILL');}catch{}},1000);
    };
    const abort=()=>terminate(new Error('Model request cancelled or timed out'));
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
    const cleanup=()=>{signal.removeEventListener('abort',abort);if(killTimer)clearTimeout(killTimer);};
    child.stdout.on('data',chunk=>{if(failure)return;output+=chunk;if(output.length>128000)terminate(new Error('Model response exceeded size limit'));});
    child.stderr.on('data',chunk=>{if(failure)return;errorOutput+=chunk;if(errorOutput.length>32000)terminate(new Error('Provider diagnostics exceeded size limit'));});
    child.stdin.on('error',()=>{});
    child.once('error',()=>{cleanup();reject(new Error('Could not start isolated Claude Code. Install bubblewrap and verify sandbox support.'));});
    child.once('close',code=>{
     cleanup();if(failure)return reject(failure);
     // Raw provider diagnostics can contain local configuration; do not return them to browsers.
     if(code!==0) {
      if(/authentication_failed|OAuth session expired|Failed to authenticate|invalid_grant/i.test(output+errorOutput))return reject(new Error('Claude Code login expired or could not refresh. Run claude auth login on the server, then send a new prompt.'));
      return reject(new Error('Isolated Claude Code exited unsuccessfully. Verify its login and sandbox configuration.'));
     }
     resolve(output);
    });
    child.stdin.end(JSON.stringify(context));
   });
   return decodeClaudeReply(result);
  } finally {await rm(root,{recursive:true,force:true});}
 }
}
