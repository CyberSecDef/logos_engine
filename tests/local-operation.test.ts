import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../apps/server/src/index.js';
import {WorldStore,stateHash} from '../apps/server/src/store.js';
import {createWorld} from '../packages/worldgen/src/index.js';
import {advance} from '../packages/engine/src/index.js';
const provider={name:'Unavailable provider',async generate(){throw Error('No model calls expected');}};
const snapshot=async(root:string):Promise<Record<string,string>>=>{
 const result:Record<string,string>={};
 const walk=async(path:string)=>{for(const entry of await readdir(join(root,path),{withFileTypes:true})){
  const relative=join(path,entry.name);if(entry.isDirectory())await walk(relative);
  else result[relative]=(await readFile(join(root,relative))).toString('base64');
 }};await walk('');return result;
};
test('startup rejects invalid ports before writing and refuses to replace damaged existing worlds',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-startup-'));
 try {
  for(const port of [-1,65536,NaN,1.5])await assert.rejects(startServer({root,port,provider}),/PORT must/);
  assert.deepEqual(await readdir(root),[]);
  await mkdir(join(root,'first-world'));await writeFile(join(root,'first-world','keep.txt'),'recovery evidence');
  const missing=await snapshot(root);
  await assert.rejects(startServer({root,port:0,provider}),/Cannot open saved world first-world.*no replacement/);
  assert.deepEqual(await snapshot(root),missing);
  await writeFile(join(root,'first-world','state.json'),'broken save');
  const broken=await snapshot(root);
  await assert.rejects(startServer({root,port:0,provider}),/Cannot open saved world/);
  assert.deepEqual(await snapshot(root),broken);
  await rm(join(root,'first-world'),{recursive:true});
  await writeFile(join(root,'.active-world.json'),JSON.stringify({id:'first-world'}));
  await assert.rejects(startServer({root,port:0,provider}),/Cannot open saved world/);
  await assert.rejects(readFile(join(root,'first-world','state.json')),/ENOENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('stopped full-directory backup restores active world, history and sidecars without offline progression',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-recovery-')),source=join(root,'worlds'),restored=join(root,'restored','worlds');
 try {
  const store=new WorldStore(source);const w=createWorld({id:'recovery-test',name:'Recovery test',seed:'recovery',frequency:2});
  await store.save(w);await store.save(advance(w),{kind:'step',days:1});await store.selectWorld(w.id);
  await mkdir(join(source,w.id,'conversations'));await writeFile(join(source,w.id,'conversations','recovery-note.json'),'{"note":"preserve local sidecars"}');
  const before=await snapshot(source),expected=await store.load(w.id);
  // Exercise the documented archive/extraction with no writer running.
  const archive=join(root,'worlds.tar.gz'),run=promisify(execFile);
  await run('tar',['-czf',archive,'-C',root,'worlds']);
  await mkdir(join(root,'restored'));
  await run('tar',['-xzf',archive,'-C',join(root,'restored')]);
  assert.deepEqual(await snapshot(restored),before);
  const app=await startServer({root:restored,host:'127.0.0.1',port:0,provider});
  try {
   const address=app.server.address();assert.ok(address&&typeof address==='object');
   const base=`http://127.0.0.1:${address.port}/api/`;
   const session=await(await fetch(base+'session')).json() as {token:string};
   const response=await(await fetch(base+'world',{headers:{authorization:`Bearer ${session.token}`}})).json();
   assert.deepEqual(response,expected);
  }finally{await app.close();}
  assert.deepEqual(await snapshot(restored),before);
  assert.deepEqual(await snapshot(source),before);
  const recovered=new WorldStore(restored);
  assert.equal(stateHash(await recovered.load(w.id)),stateHash(expected));
  await recovered.verifyHistory(w.id);
 }finally{await rm(root,{recursive:true,force:true});}
});
