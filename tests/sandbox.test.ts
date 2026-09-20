import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {sandboxArgs} from '../packages/agent-bridge/src/claude.js';
test('local provider sandbox hides engine files and confines writes to scratch',async t=>{
 if(process.platform!=='linux'){t.skip('Linux sandbox integration');return;}
 try{await access('/usr/bin/bwrap');}catch{t.skip('bubblewrap not installed');return;}
 const root=await mkdtemp(join(tmpdir(),'logos-sandbox-test-'));const home=join(root,'home'),work=join(root,'world');
 try{await mkdir(home);await mkdir(work);
  const {stdout}=await promisify(execFile)('/usr/bin/bwrap',[...sandboxArgs('/usr/bin/sh',home,work),'--','/opt/claude','-c','test ! -r "$1" && test ! -w "$1" && test ! -w /usr && printf success > /tmp/world/check && printf isolated','--',resolve('package.json')],{env:{PATH:'/usr/bin:/bin'},timeout:10000});
  assert.equal(stdout,'isolated');assert.equal(await readFile(join(work,'check'),'utf8'),'success');
 }finally{await rm(root,{recursive:true,force:true});}
});
