import {spawn} from 'node:child_process';
// Keep diagnostics private: CLI errors can include local configuration or tokens.
export function runIsolatedCli(args:string[],env:NodeJS.ProcessEnv,input:string,signal:AbortSignal,provider='Cursor CLI'):Promise<string> {
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const child=spawn('/usr/bin/bwrap',args,{env,stdio:['pipe','pipe','pipe'],detached:true});
  let output='',diagnostics='',failure:Error|undefined,timer:NodeJS.Timeout|undefined;
  const stop=(error:Error)=>{failure??=error;if(child.pid)try{process.kill(-child.pid,'SIGTERM');}catch{}
   timer??=setTimeout(()=>{if(child.pid)try{process.kill(-child.pid,'SIGKILL');}catch{}},1000);};
  const abort=()=>stop(Error('Model request cancelled or timed out'));
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const cleanup=()=>{signal.removeEventListener('abort',abort);if(timer)clearTimeout(timer);};
  child.stdout.on('data',chunk=>{if(failure)return;output+=chunk;if(output.length>128000)stop(Error('Model response exceeded size limit'));});
  child.stderr.on('data',chunk=>{if(failure)return;diagnostics+=chunk;if(diagnostics.length>32000)stop(Error('Provider diagnostics exceeded size limit'));});
  child.stdin.on('error',()=>{});
  child.once('error',()=>{cleanup();reject(Error(`Could not start isolated ${provider}. Verify Linux bubblewrap support.`));});
  child.once('close',code=>{cleanup();if(failure)return reject(failure);
   if(code!==0)return reject(Error(/Authentication required|unauthenticated|not authenticated|login.*required/i.test(output+diagnostics)?`${provider} login is unavailable. Run its documented login command on the server.`:`Isolated ${provider} exited unsuccessfully. Verify its login, version, and sandbox configuration.`));
   resolve(output);});
  child.stdin.end(input);
 });
}
