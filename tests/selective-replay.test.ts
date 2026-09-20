import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {WorldStore,stateHash} from '../apps/server/src/store.js';import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal} from '../packages/engine/src/index.js';import {ProposalSchema,type World,type Operation} from '../packages/contracts/src/index.js';import {ReplayJournal} from '../apps/server/src/journal.js';import {startServer} from '../apps/server/src/index.js';import {unpackBundle} from '../apps/server/src/portable.js';
const edit=(w:World,operations:Operation[])=>ProposalSchema.parse({id:`edit-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:`Change ${w.revision}`,operations});
async function fixture(){const root=await mkdtemp(join(tmpdir(),'logos-selective-')),store=new WorldStore(root),start=createWorld({id:'first-world',name:'Source',seed:'selective',frequency:2});await store.save(start);const p=edit(start,[{kind:'rainfall',tileId:0,mmPerDay:30}]);let w=applyProposal(start,p);await store.save(w,{kind:'proposal',proposal:p});const recordId=(await store.history(w.id)).entries[0].id;for(let i=0;i<2;i++)w=advance(w);await store.save(w,{kind:'step',days:2});const q=edit(w,[{kind:'communication',tileId:1,enabled:false}]);w=applyProposal(w,q);await store.save(w,{kind:'proposal',proposal:q});w=advance(w);await store.save(w,{kind:'step',days:1});return {root,store,start,w,recordId};}

test('omission and replacement replay deterministically and publish independently verifiable journals',async()=>{
 const {root,store,start,w,recordId}=await fixture();
 try{const source=await readFile(join(root,w.id,'state.json'),'utf8'),omit=await store.selectiveState(w.id,recordId,{mode:'omit'},{id:'no-rain',name:'No rain'});assert.equal(omit.world.tick,w.tick);assert.equal(omit.world.history.length,w.history.length-1);assert.equal(omit.world.tiles[1].communication,false);assert.equal(omit.days,3);assert.equal(omit.workDays,6);assert.deepEqual(await store.selectiveState(w.id,recordId,{mode:'omit'},{id:'no-rain',name:'No rain'}),omit);
 let expected=structuredClone(start);expected.id='no-rain';expected.name='No rain';expected.revision++;expected=advance(advance(expected));expected=applyProposal(expected,{...w.history[1],worldId:expected.id,expectedRevision:expected.revision});expected=advance(expected);assert.equal(stateHash(expected),omit.hash);
 const replace=await store.selectiveState(w.id,recordId,{mode:'replace',summary:'Gentler rain',operations:[{kind:'rainfall',tileId:0,mmPerDay:5}]},{id:'gentle',name:'Gentle rain'});assert.equal(replace.world.tiles[0].rainMm,5);assert.equal(replace.rebased,1);assert.equal(replace.world.history[0].summary,'Gentler rain');assert.equal(await readFile(join(root,w.id,'state.json'),'utf8'),source);
 await store.createSelective(w.id,replace);assert.equal(stateHash(await store.load('gentle')),replace.hash);assert.equal((await store.verifyHistory('gentle')).days,3);assert.equal((await store.history('gentle')).entries.filter(e=>e.kind==='proposal').length,2);const point=await store.checkpoint(replace.world,'Alternate');assert.equal((await store.readCheckpoint('gentle',point.id)).world.id,'gentle');assert.equal((await unpackBundle(await store.exportBundle('gentle'))).world.id,'gentle');assert.equal(await readFile(join(root,w.id,'state.json'),'utf8'),source);assert.equal((await readdir(root)).some(f=>f.startsWith('.selective-')),false);
 await assert.rejects(()=>store.createSelective(w.id,replace),/already exists/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('removing a required definition stops at the later dependent intervention without a branch',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-selective-dependency-')),store=new WorldStore(root);let w=createWorld({id:'first-world',name:'Dependency',seed:'dep',frequency:2});await store.save(w);
 try{const p=edit(w,[{kind:'field-define',tileId:0,migration:'preserve',definition:{id:'mana',version:1,label:'Mana',unit:'units',description:'',min:0,max:100,defaultValue:0}}]);w=applyProposal(w,p);await store.save(w,{kind:'proposal',proposal:p});const recordId=(await store.history(w.id)).entries[0].id;const q=edit(w,[{kind:'field-set',tileId:0,fieldId:'mana',value:20}]);w=applyProposal(w,q);await store.save(w,{kind:'proposal',proposal:q});const hash=stateHash(w);await assert.rejects(()=>store.selectiveState(w.id,recordId,{mode:'omit'},{id:'broken',name:'Broken'}),/blocked at day 0, revision 2.*Change 1.*unknown.*not skipped/);assert.equal(await store.exists('broken'),false);assert.equal(stateHash(await store.load(w.id)),hash);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('snapshot boundaries, orphan records, work limits and corrupt source transitions reject',async()=>{
 const {root,store,w,recordId}=await fixture();
 try{const dir=join(root,w.id,'journal'),envelope=JSON.parse(await readFile(join(root,w.id,'state.json'),'utf8')),journal=new ReplayJournal({read:async hash=>JSON.parse(await readFile(join(dir,hash+'.json'),'utf8')),write:async(hash,value)=>{await writeFile(join(dir,hash+'.json'),JSON.stringify(value));}});
 await assert.rejects(()=>journal.selective(envelope.journalHead,w,recordId,{mode:'omit'},{id:'budget',name:'Budget'},5),/work days/);
 const fake=edit(w,[{kind:'communication',tileId:0,enabled:false}]),orphan=await journal.append(applyProposal(w,fake),w,envelope.journalHead,{kind:'proposal',proposal:fake});await assert.rejects(()=>store.selectiveState(w.id,orphan,{mode:'omit'},{id:'orphan',name:'Orphan'}),/committed history/);
 await assert.rejects(()=>store.selectiveState(w.id,envelope.journalHead,{mode:'omit'},{id:'step',name:'Step'}),/recorded intervention/);
 const recordPath=join(dir,recordId+'.json'),bytes=await readFile(recordPath,'utf8');await writeFile(recordPath,'{}');await assert.rejects(()=>store.selectiveState(w.id,recordId,{mode:'omit'},{id:'corrupt',name:'Corrupt'}),/integrity/);await writeFile(recordPath,bytes);
 await store.save({...w,revision:w.revision+1},{kind:'snapshot',reason:'restore'});await assert.rejects(()=>store.selectiveState(w.id,recordId,{mode:'omit'},{id:'restore',name:'Restore'}),/restore snapshot replaces the timeline/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('selective API rejects stale/tampered reviews and preserves source across branch activation and restart',async()=>{
 const {root,store,w,recordId}=await fixture();let app:Awaited<ReturnType<typeof startServer>>|undefined;
 try{app=await startServer({root,port:0});const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`,{token}=await(await fetch(base+'session')).json() as {token:string},headers={authorization:`Bearer ${token}`,'content-type':'application/json'},post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)}),body={worldId:w.id,recordId,id:'alternate',name:'Alternate',expectedRevision:w.revision,edit:{mode:'omit'}};
 const preview=await post('history/selective/preview',body);assert.equal(preview.status,200);const reviewed=await preview.json() as {hash:string;changes:{total:number}};assert.ok(reviewed.changes.total>0);assert.equal(await store.exists('alternate'),false);assert.equal((await post('history/selective/branch',{...body,reviewedHash:'0'.repeat(64)})).status,400);assert.equal((await post('history/selective/branch',{...body,expectedRevision:0,reviewedHash:reviewed.hash})).status,400);assert.equal((await post('history/selective/branch',{...body,name:'Changed',reviewedHash:reviewed.hash})).status,400);
 assert.equal((await post('history/selective/branch',{...body,reviewedHash:reviewed.hash})).status,200);assert.equal((await post('history/selective/preview',body)).status,400);assert.equal(stateHash(await store.load(w.id)),stateHash(w));await app.close();app=await startServer({root,port:0});assert.equal(await store.activeWorldId(),'alternate');assert.equal((await store.verifyHistory('alternate')).days,3);
 }finally{await app?.close();await rm(root,{recursive:true,force:true});}
});

test('a changed timeline can expose a plugin failure; replay reports its day without saving',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-selective-tick-')),store=new WorldStore(root);let w=createWorld({id:'first-world',name:'Tick failure',seed:'tick',frequency:2});
 try{w=applyProposal(w,edit(w,[{kind:'rainfall',tileId:0,mmPerDay:0},{kind:'field-define',tileId:0,migration:'preserve',definition:{id:'index',version:1,label:'Index',unit:'',description:'',min:0,max:100,defaultValue:0}},{kind:'plugin-define',tileId:0,migration:'preserve',definition:{id:'inverse-rain',version:1,abi:'logos-stack-v1',label:'Inverse rain',description:'Fails at zero rainfall',tileId:0,scope:'tile',enabled:true,everyDays:1,stateFields:[],program:[{op:'constant',value:1},{op:'read',read:{source:'rainMm',sample:'self'}},{op:'divide'},{op:'emit',fieldId:'index',mode:'add'}]}}]));await store.save(w);
 const rain=edit(w,[{kind:'rainfall',tileId:0,mmPerDay:10}]);w=applyProposal(w,rain);await store.save(w,{kind:'proposal',proposal:rain});const target=(await store.history(w.id)).entries[0].id;w=advance(w);await store.save(w,{kind:'step',days:1});const hash=stateHash(w);await assert.rejects(()=>store.selectiveState(w.id,target,{mode:'omit'},{id:'failure',name:'Failure'}),/blocked at day 1.*advance 1 days.*division by zero.*not skipped/);assert.equal(stateHash(await store.load(w.id)),hash);assert.equal(await store.exists('failure'),false);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('failed staged publication cleans temporary artifacts and retains the original world',async()=>{
 const {root,store,w,recordId}=await fixture();
 try{const result=await store.selectiveState(w.id,recordId,{mode:'omit'},{id:'failed-copy',name:'Failed copy'});await assert.rejects(()=>store.createSelective(w.id,{...result,hash:'0'.repeat(64)}),/differs from reviewed/);assert.equal(await store.exists('failed-copy'),false);assert.equal((await readdir(root)).some(p=>p.startsWith('.selective-')),false);assert.equal(stateHash(await store.load(w.id)),stateHash(w));
 }finally{await rm(root,{recursive:true,force:true});}
});
