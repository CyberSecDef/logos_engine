import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const runs=[];
for(const engine of ['chromium','webkit'])for(const file of ['navigation-browser','panels-browser','review-accessibility-browser','simulation-browser','accessibility-audit'])runs.push({engine,file});
for(const file of ['delivery-build','delivery-browser','render-performance','checkpoints-browser','portable-browser'])runs.push({engine:'chromium',file});
const results=[];await mkdir('.local',{recursive:true});
for(const run of runs){
 console.log('Acceptance: '+run.engine+' / '+run.file);
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tests/'+run.file+'.mjs'],{stdio:'inherit',env:{...process.env,LOGOS_BROWSER:run.engine}});
  child.once('error',reject);child.once('exit',(code,signal)=>resolve(signal?1:code??1));
 });
 results.push({...run,passed:code===0});
 await writeFile('.local/phase6-acceptance.json',JSON.stringify({measuredAt:new Date().toISOString(),results},null,2));
 if(code!==0){process.exitCode=1;break;}
}
