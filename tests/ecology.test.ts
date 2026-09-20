import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWorld} from '../packages/worldgen/src/index.js';import {advance,applyProposal,validateWorld} from '../packages/engine/src/index.js';
import {ecologySetup} from '../packages/engine/src/ecology-setup.js';import {DEFAULT_ECOLOGY_SETTINGS} from '../packages/contracts/src/ecology-defaults.js';import {DEFAULT_SETTLEMENT_SETTINGS} from '../packages/contracts/src/settlement-defaults.js';
import {ProposalSchema} from '../packages/contracts/src/index.js';
import type {World,Operation,Proposal} from '../packages/contracts/src/index.js';import {WorldStore,stateHash} from '../apps/server/src/store.js';import {PromptService,forecast} from '../apps/server/src/prompts.js';import {fieldValue} from '../packages/engine/src/extensions.js';import {unpackBundle} from '../apps/server/src/portable.js';import {copyWorld} from '../apps/server/src/world-management.js';
const make=()=>{const w=createWorld({id:'ecology',name:'Ecology',seed:'soil',frequency:2});w.tiles.forEach(t=>t.elevationM=1000);w.rules=[{id:'rain-0',kind:'rainfall',tileId:0,mmPerDay:5},{id:'temperature-0',kind:'temperature',tileId:0,celsius:20}];return w;};
const proposal=(w:World,operations:Operation[]):Proposal=>({id:`edit-${w.history.length}`,worldId:w.id,expectedRevision:w.revision,summary:'Soil ecology change',operations});
const edit=(w:World,operations:Operation[])=>applyProposal(w,proposal(w,operations));
const active=(population=0)=>{let w=make();if(population)w=edit(w,[{kind:'settlement-create',tileId:0,label:'Soil town',population,foodRations:100000000,settings:{...DEFAULT_SETTLEMENT_SETTINGS,capacity:1000000,farmRationsPerDay:10000000}}]);return edit(w,ecologySetup(w,0));};
const soil=(w:World)=>fieldValue(w,0,w.soilEcology!.fieldId);
const zeroRates={...DEFAULT_ECOLOGY_SETTINGS,rainRecovery:0,droughtLoss:0,excessRainLoss:0,heatLoss:0,coldLoss:0,floodLoss:0,farmerGain:0,cityLoss:0,cityVegetationLoss:0};
test('soil activation preserves values, requires review and multiplies weather-limited harvest',()=>{
 for(const [fertility,yieldExpected] of [[0,0],[50,100],[100,200]]){let w=active(100);w.soilEcology!.settings={...zeroRates};w=edit(w,[{kind:'field-set',tileId:0,fieldId:'soil-fertility',value:fertility}]);const hash=stateHash(w),next=advance(w);assert.equal(next.tiles[0].settlement!.lastDay!.produced,yieldExpected);assert.equal(next.tiles[0].settlement!.lastDay!.fertilityPermille,fertility*10);assert.equal(stateHash(w),hash);}
 const legacy=make();assert.equal(advance(legacy).soilEcology,undefined);assert.equal(advance(legacy).tiles[0].soilDay,undefined);
 const w=active(100),hash=stateHash(w);forecast(w,proposal(w,[{kind:'field-set',tileId:0,fieldId:'soil-fertility',value:10}]));assert.equal(stateHash(w),hash);
});
test('rain, drought, excessive rain, temperature and flooding drive soil on unpopulated land',()=>{
 const cases:[number,number,number][]=[[5,20,50.2],[0,20,49.8],[60,20,49.7],[5,40,49.5],[5,-10,49.9]];
 for(const [rain,temp,expected] of cases){const w=edit(active(),[{kind:'rainfall',tileId:0,mmPerDay:rain},{kind:'temperature',tileId:0,mode:'sustained',celsius:temp}]);assert.equal(soil(advance(w)),expected);}
 const wet=active();wet.tiles[0].waterL=wet.cells[0].areaM2*200;assert.equal(soil(advance(wet)),49.5);
 const sea=active();sea.tiles[0].elevationM=0;assert.equal(soil(advance(sea)),50);assert.equal(advance(sea).tiles[0].soilDay!.weatherPoints,0);
});
test('farmer stewardship rises then fades; urban pressure damages soil and vegetation with saturation',()=>{
 for(const [pop,gain,loss] of [[0,0,0],[100,.05,0],[1000,.5,0],[3000,.25,0],[5000,0,0],[27500,0,.5],[50000,0,1],[100000,0,1]]){
  const w=active(pop),next=advance(w),d=next.tiles[0].soilDay!;assert.equal(d.stewardshipPoints,gain);assert.equal(d.urbanPoints,loss);assert.equal(soil(next),Math.round((50+.2+gain-loss)*1000)/1000);
  const baseline=structuredClone(w);baseline.soilEcology!.enabled=false;const natural=advance(baseline);assert.ok(next.tiles[0].vegetation<=natural.tiles[0].vegetation);if(loss>0)assert.ok(next.tiles[0].vegetation<natural.tiles[0].vegetation);
 }
 const frozen=edit(active(1000),[{kind:'temperature',tileId:0,mode:'sustained',celsius:-10}]);assert.equal(advance(frozen).tiles[0].soilDay!.stewardshipPoints,0);
 let bounded=active(100000);bounded.tiles[0].properties['soil-fertility']=0;bounded.tiles[0].vegetation=0;bounded=advance(bounded);assert.equal(soil(bounded),0);assert.equal(bounded.tiles[0].vegetation,0);
});
test('existing weather rules are explicitly disabled and original fertility units are preserved',async()=>{
 let w=make();const sample=JSON.parse(await readFile('docs/examples/soil-fertility.json','utf8'));w=edit(w,sample.operations);w=edit(w,[{kind:'field-set',tileId:0,fieldId:'soil-fertility',value:73}]);const ops=ecologySetup(w,0);assert.equal(ops.filter(o=>o.kind==='rule-define').length,2);const broken=ops.filter(o=>o.kind==='soil-ecology-configure');assert.throws(()=>edit(w,broken),/Disable custom rules/);const linked=edit(w,ops);assert.equal(soil(linked),73);assert.equal(linked.definitions.rules.filter(r=>r.enabled).length,0);assert.equal(soil(advance(linked)),73.2);
 const fractions=active(100);fractions.soilEcology!.settings={...zeroRates};const f=fractions.definitions.fields[0];f.max=1;f.defaultValue=.5;assert.equal(advance(fractions).tiles[0].settlement!.lastDay!.produced,100);assert.equal(soil(advance(fractions)),.5);
});
test('stale settings, invalid thresholds, missing fields and stock bindings reject atomically',()=>{
 const w=active(),hash=stateHash(w),op=ecologySetup(w,0).at(-1)!;assert.equal(op.kind,'soil-ecology-configure');if(op.kind!=='soil-ecology-configure')return;
 for(const o of [{...op,expectedVersion:0},{...op,fieldId:'missing'},{...op,settings:{...op.settings,cityPopulationStart:1}}])assert.throws(()=>edit(w,[o]));assert.equal(stateHash(w),hash);
 const stock=structuredClone(w);stock.definitions.fields[0].quantity='stock';assert.throws(()=>validateWorld(stock),/index property/);
 assert.throws(()=>edit(w,[{kind:'plugin-define',tileId:0,migration:'preserve',definition:{id:'soil-writer',version:1,abi:'logos-stack-v1',label:'Soil writer',description:'',tileId:0,scope:'tile',enabled:true,everyDays:1,stateFields:[],program:[{op:'constant',value:1},{op:'emit',fieldId:'soil-fertility',mode:'add'}]}}]),/Disable plugins/);
 assert.throws(()=>edit(w,[{kind:'field-remove',tileId:0,fieldId:'soil-fertility'}]),/index property/);
 const disabled=edit(w,[{...op,enabled:false}]);assert.equal(soil(advance(disabled)),50);assert.equal(advance(disabled).tiles[0].soilDay,undefined);
});
test('soil and demographic history replays, checkpoints and portable copies preserve future output',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-ecology-')),store=new WorldStore(root);let w=make();try{await store.save(w);const p=ProposalSchema.parse(proposal(w,ecologySetup(w,0)));w=applyProposal(w,p);await store.save(w,{kind:'proposal',proposal:p});const c=await store.checkpoint(w,'Soil activated');for(let i=0;i<50;i++)w=advance(w);await store.save(w,{kind:'step',days:50});assert.equal((await store.verifyHistory(w.id)).hash,stateHash(w));assert.equal((await store.readCheckpoint(w.id,c.id)).world.soilEcology!.model,'soil-ecology-v1');const bundle=await unpackBundle(await store.exportBundle(w.id));const copy=copyWorld(bundle.world,'soil-copy','Soil copy');await store.createNew(copy,undefined,bundle);assert.deepEqual(advance(await store.load(copy.id)).tiles,advance(w).tiles);}finally{await rm(root,{recursive:true,force:true});}
});
test('soil settings require world prompt scope; Discuss cannot mutate',async()=>{
 const root=await mkdtemp(join(tmpdir(),'logos-soil-prompt-')),store=new WorldStore(root),w=active();try{await store.save(w);for(const [mode,scope,expected] of [['propose','tile','failed'],['discuss','world','failed'],['propose','world','complete']] as const){const svc=new PromptService(store,{name:'Soil fixture',async generate(){return {kind:'proposal',message:'Configure soil',assumptions:[],operations:ecologySetup(w,0)};}});try{const id=`${mode}-${scope}`;await svc.start(w,{id,worldId:w.id,expectedRevision:w.revision,tileId:0,mode,scope,message:'Enable soil ecology'});while(svc.busy)await new Promise(r=>setTimeout(r,5));assert.equal((await svc.get(w,id)).status,expected);assert.equal(stateHash(await store.load(w.id)),stateHash(w));}finally{await svc.close();}}}finally{await rm(root,{recursive:true,force:true});}
});
