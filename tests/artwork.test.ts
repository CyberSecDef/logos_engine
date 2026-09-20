import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
import {createWorld} from '../packages/worldgen/src/index.js';import {applyProposal,advance} from '../packages/engine/src/index.js';import {textureReveals} from '../packages/globe/src/appearance.js';
import {pngInfo,parseArtwork} from '../apps/server/src/artwork.js';import {WorldStore,stateHash} from '../apps/server/src/store.js';import {copyWorld} from '../apps/server/src/world-management.js';import {startServer} from '../apps/server/src/index.js';import {PromptService} from '../apps/server/src/prompts.js';
const png=await readFile('packages/tile-packs/public/painterly-v1/alpine.png'),info=pngInfo(png),pack={id:'stone-forest',version:1,label:'Stone forest',credit:'Original Logos artwork',images:[{slot:'forest' as const,hash:info.hash}]},bundle={format:'logos-artwork',version:1,pack,images:[{hash:info.hash,data:png.toString('base64')}]};
const make=()=>createWorld({id:'first-world',name:'Artwork',seed:'artwork',frequency:2});
const proposal=(w:ReturnType<typeof make>)=>({id:`art-${w.revision}`,worldId:w.id,expectedRevision:w.revision,summary:'Stone forest artwork',operations:[{kind:'artwork-activate' as const,tileId:0,pack}]});

test('pack parsing checks PNG data, dimensions, checksums, manifest references and bounds',()=>{
 const parsed=parseArtwork(bundle);assert.deepEqual(parsed.pack,pack);assert.equal(parsed.images[0].hash,info.hash);
 assert.throws(()=>parseArtwork({...bundle,images:[{hash:'0'.repeat(64),data:png.toString('base64')}]}),/integrity/);
 assert.throws(()=>parseArtwork({...bundle,pack:{...pack,images:[...pack.images,...pack.images]}}),/Duplicate/);
 assert.throws(()=>parseArtwork({...bundle,images:[]}),/too_small/);
 const corrupt=Buffer.from(png);corrupt[40]^=1;assert.throws(()=>pngInfo(corrupt),/checksum|Truncated/);
 const oversized=Buffer.from(png);oversized.writeUInt32BE(4096,16);assert.throws(()=>pngInfo(oversized),/dimensions/);
 assert.throws(()=>pngInfo(Buffer.from('<svg/>')),/PNG/);
});

test('artwork versions are pinned and activation never accelerates reveal or changes simulation',()=>{
 const w=make(),changed=applyProposal(w,proposal(w));assert.deepEqual(textureReveals(changed),textureReveals(w));assert.ok(textureReveals(changed).every(x=>x===0));assert.deepEqual(advance(changed).tiles,advance(w).tiles);assert.equal(w.artwork,undefined);
 const p=proposal(changed);p.operations[0].pack={...pack,label:'Changed'};assert.throws(()=>applyProposal(changed,p),/immutable/);p.operations[0].pack={...pack,label:'Changed',version:2};assert.equal(applyProposal(changed,p).artwork?.version,2);
});

test('world-local images survive checkpoint and independent branch copies',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-art-save-')),store=new WorldStore(root),w=make();
 try{await store.save(w);await store.saveArtwork(w.id,[png]);const next=applyProposal(w,proposal(w));await store.save(next,{kind:'proposal',proposal:proposal(w)});assert.deepEqual((await store.load(w.id)).artwork,pack);const point=await store.checkpoint(next,'Art');assert.deepEqual((await store.readCheckpoint(w.id,point.id)).world.artwork,pack);
 const copy=copyWorld(next,'branch','Branch');await store.createNew(copy,w.id);assert.ok((await store.readArtwork(copy.id,info.hash)).equals(png));assert.equal((await store.verifyHistory(w.id)).proposals,1);
 const reset=applyProposal(next,{...proposal(next),operations:[{kind:'artwork-reset',tileId:0}]});const oldCopy=copyWorld(reset,'reset-branch','Reset branch');await store.createNew(oldCopy,w.id);assert.ok((await store.readArtwork(oldCopy.id,info.hash)).equals(png));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('artwork API previews without writes, enforces source/revision, journals activation and serves authenticated PNG',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-art-api-')),store=new WorldStore(root),w=make();await store.save(w);const app=await startServer({root,port:0});
 try{const address=app.server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/`,{token}=await(await fetch(base+'session')).json() as {token:string},headers={authorization:`Bearer ${token}`,'Content-Type':'application/json'},post=(route:string,data:unknown)=>fetch(base+route,{method:'POST',headers,body:JSON.stringify(data)}),body={worldId:w.id,expectedRevision:0,bundle};
 const preview=await post('artwork/preview',body);assert.equal(preview.status,200);assert.equal(stateHash(await store.load(w.id)),stateHash(w));assert.equal((await readdir(join(root,w.id))).includes('assets'),false);
 assert.equal((await post('artwork/apply',{...body,worldId:'other'})).status,400);assert.equal((await post('artwork/apply',{...body,expectedRevision:10})).status,400);assert.equal((await post('artwork/apply',body)).status,200);assert.equal((await store.load(w.id)).artwork?.id,pack.id);
 const route=`artwork/image/${w.id}/${info.hash}`;assert.equal((await fetch(base+route)).status,401);const response=await fetch(base+route,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.ok(Buffer.from(await response.arrayBuffer()).equals(png));assert.equal((await fetch(base+'artwork/image/other/'+info.hash,{headers})).status,400);
 assert.equal((await store.verifyHistory(w.id)).proposals,1);
 }finally{await app.close();await rm(root,{recursive:true,force:true});}
});

test('model artwork changes require world scope and an already imported exact manifest',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-art-scope-')),store=new WorldStore(root),w=make(),service=new PromptService(store,{name:'Unused',async generate(){throw Error('unused');}});
 try{const request={id:'local',worldId:w.id,expectedRevision:0,tileId:0,mode:'propose',scope:'tile',message:'Select artwork'},reply={kind:'proposal',message:'Select art',assumptions:[],operations:proposal(w).operations};await service.export(w,request);await assert.rejects(()=>service.import(w,{requestId:'local',reply}),/Entire world/);await service.export(w,{...request,id:'global',scope:'world'});await assert.rejects(()=>service.import(w,{requestId:'global',reply}),/Import and review/);
 const installed=applyProposal(w,proposal(w));await service.export(installed,{...request,id:'known',scope:'world',expectedRevision:installed.revision});assert.ok((await service.import(installed,{requestId:'known',reply})).proposal);
 }finally{await service.close();await rm(root,{recursive:true,force:true});}
});

test('artwork packing CLI produces a validated import without changing image bytes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-art-cli-'));
 try{const source=join(root,'manifest.json'),output=join(root,'pack.json');await writeFile(source,JSON.stringify({...pack,images:[{slot:'forest',file:resolve('packages/tile-packs/public/painterly-v1/alpine.png')}]}));const result=spawnSync(process.execPath,[resolve('dist/apps/server/src/artwork-cli.js'),source,output],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(parseArtwork(JSON.parse(await readFile(output,'utf8'))).images[0].hash,info.hash);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('packs support the bounded terrain plus settlement/condition slots',()=>{
 const slots=['ocean','city','alpine','forest','meadow','dry','settlement','condition'];
 const layered={...bundle,pack:{...pack,images:slots.map(slot=>({slot,hash:info.hash}))}};
 assert.equal(parseArtwork(layered).pack.images.length,8);
 assert.throws(()=>parseArtwork({...layered,pack:{...layered.pack,images:[...layered.pack.images,{slot:'forest',hash:info.hash}]}}));
});
