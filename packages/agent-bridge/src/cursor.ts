import { runIsolatedCli } from './process.js';
export {runIsolatedCli as runCursor} from './process.js';
import { access, mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { modelReplyJsonSchema } from '../../contracts/src/prompts.js';
import { systemPrompt, type ModelProvider, type PromptContext } from './context.js';

// Empty --allowed-tools is an internal CLI interface. Revalidate its semantics
// before accepting another release; an ordinary CLI update must fail closed.
export const cursorVersion='2026.09.18-9a7762b';
export async function findCursor():Promise<string> {
 const configured=process.env.CURSOR_BIN;
 if(configured){if(!isAbsolute(configured))throw Error('CURSOR_BIN must be an absolute path');return realpath(configured);}
 for(const file of [...(process.env.PATH??'').split(':').filter(Boolean).map(dir=>join(dir,'cursor-agent')),resolve('.local/cursor/cursor-agent')]) {
  try{await access(file);return await realpath(file);}catch{}
 }
 throw Error('Cursor CLI not found. Install the verified version and set CURSOR_BIN to its absolute path.');
}
export function cursorSandboxArgs(directory:string,home:string,workspace:string,authDirectory?:string):string[] {
 return ['--die-with-parent','--new-session','--unshare-pid','--unshare-ipc','--unshare-uts',
  '--ro-bind','/','/','--proc','/proc','--dev','/dev',
  '--tmpfs','/home','--tmpfs','/root','--tmpfs','/tmp','--tmpfs','/run','--tmpfs','/opt',
  '--ro-bind',realpathSync('/etc/resolv.conf'),realpathSync('/etc/resolv.conf'),
  '--dir','/home/logos','--bind',home,'/home/logos',
  ...(authDirectory?['--bind',authDirectory,'/home/logos/.config/cursor']:[]),
  '--bind',workspace,'/tmp/world','--ro-bind',directory,'/opt/cursor',
  '--chdir','/tmp/world','--setenv','HOME','/home/logos',
  '--setenv','XDG_CONFIG_HOME','/home/logos/.config','--setenv','CURSOR_CONFIG_DIR','/home/logos/.cursor',
  '--setenv','TMPDIR','/tmp'];
}
export function cursorArgs(model?:string):string[] {
 return ['--print','--output-format','json','--mode','ask','--trust',
  '--workspace','/tmp/world','--allowed-tools','',
  '--disable-auto-update','--single-turn',...(model?['--model',model]:[])];
}
export function decodeCursorReply(output:string):unknown {
 let envelope:unknown;
 try{envelope=JSON.parse(output);}catch{throw Error('Cursor CLI returned invalid JSON');}
 const value=envelope as {type?:string;subtype?:string;is_error?:boolean;result?:string};
 if(!value||value.type!=='result'||value.subtype!=='success'||value.is_error||typeof value.result!=='string')throw Error('Cursor CLI could not complete the request. Check login, availability, and usage limits.');
 // Accept a single complete JSON fence, but never extract JSON from prose.
 const result=value.result.trim(),fenced=/^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(result);
 try{return JSON.parse(fenced?fenced[1]:result);}catch{throw Error('Cursor CLI response did not contain world-change JSON. No changes were applied.');}
}
export class CursorProvider implements ModelProvider {
 readonly name='Cursor CLI';
 constructor(private readonly model=process.env.CURSOR_MODEL){}
 async generate(context:PromptContext,signal:AbortSignal):Promise<unknown> {
  signal.throwIfAborted();
  if(process.platform!=='linux')throw Error('Cursor CLI isolation requires Linux and bubblewrap. Use manual exchange on other hosts.');
  const binary=await findCursor(),directory=dirname(binary);
  // Official Linux installation keeps the wrapper and runtime together.
  await access(join(directory,'node'));await access(join(directory,'index.js'));
  const root=await mkdtemp(join(tmpdir(),'logos-cursor-')),home=join(root,'home'),workspace=join(root,'world');
  try {
   await mkdir(join(home,'.config/cursor'),{recursive:true,mode:0o700});
   await mkdir(join(home,'.cursor'),{mode:0o700});await mkdir(workspace,{mode:0o700});
   await writeFile(join(home,'.cursor/cli-config.json'),JSON.stringify({permissions:{allow:[],deny:['Shell(*)','Read(**)','Write(**)','WebFetch(*)','Mcp(*:*)']}}),{mode:0o600});
   let authDirectory:string|undefined;
   if(!process.env.CURSOR_API_KEY){
    try{authDirectory=await realpath(join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'cursor'));await access(join(authDirectory,'auth.json'));}
    catch{throw Error('Cursor login is unavailable. Run AGENT_CLI_CREDENTIAL_STORE=file cursor-agent login on the server.');}
   }
   const env:NodeJS.ProcessEnv={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',TERM:'dumb',AGENT_CLI_CREDENTIAL_STORE:'file',NO_OPEN_BROWSER:'1',
    ...(process.env.CURSOR_API_KEY?{CURSOR_API_KEY:process.env.CURSOR_API_KEY}:{})};
   const base=[...cursorSandboxArgs(directory,home,workspace,authDirectory),'--','/opt/cursor/cursor-agent'];
   const version=(await runIsolatedCli([...base,'--version'],env,'',signal)).trim();
   if(version!==cursorVersion)throw Error(`Cursor CLI version is not verified. This adapter requires ${cursorVersion}; no model request was sent.`);
   const input=JSON.stringify({instructions:systemPrompt,responseSchema:modelReplyJsonSchema,context});
   return decodeCursorReply(await runIsolatedCli([...base,...cursorArgs(this.model)],env,input,signal));
  }finally{await rm(root,{recursive:true,force:true});}
 }
}
