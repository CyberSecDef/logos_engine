import {healthTotals} from '../../../packages/engine/src/disease.js';
import {waterQualityTotals,waterQualityMetrics} from '../../../packages/engine/src/water-quality.js';
import {airTotals} from '../../../packages/engine/src/air.js';
import {journeyTotals} from '../../../packages/engine/src/journeys.js';
import {settlementSummary} from '../../../packages/engine/src/settlements.js';
import {appearance} from '../../../packages/globe/src/appearance.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { World, Proposal } from '../../../packages/contracts/src/index.js';
import { PromptRequestSchema, PromptJobSchema, ModelReplySchema, type PromptRequest, type PromptJob } from '../../../packages/contracts/src/prompts.js';
import { buildContext, capabilities, systemPrompt, type ModelProvider } from '../../../packages/agent-bridge/src/context.js';
import { CodexProvider } from '../../../packages/agent-bridge/src/codex.js';
import { CursorProvider } from '../../../packages/agent-bridge/src/cursor.js';
import { ClaudeCodeProvider } from '../../../packages/agent-bridge/src/claude.js';
import { AnthropicProvider } from '../../../packages/agent-bridge/src/anthropic.js';
import { advance, applyProposal, depthMm } from '../../../packages/engine/src/index.js';
import { WorldStore } from './store.js';
import {pluginTargets,PluginExecutionError} from '../../../packages/engine/src/plugins.js';
import { resourceTotals } from '../../../packages/engine/src/resources.js';
import { ruleTargets, ruleAffectedTargets, fieldValue } from '../../../packages/engine/src/extensions.js';

export function configuredProvider():ModelProvider {
 const name=process.env.LLM_PROVIDER??'claude-code';
 if(name==='claude-code')return new ClaudeCodeProvider();
 if(name==='cursor')return new CursorProvider();
 if(name==='codex')return new CodexProvider();
 if(name==='anthropic') {
  if(!process.env.ANTHROPIC_API_KEY||!process.env.ANTHROPIC_MODEL)return {name:'Anthropic API (configuration needed)',async generate(){throw Error('Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL in the server .env');}};
  return new AnthropicProvider(process.env.ANTHROPIC_API_KEY,process.env.ANTHROPIC_MODEL);
 }
 return {name:'Provider configuration needed',async generate(){throw Error('Unsupported LLM_PROVIDER. Choose claude-code, cursor, codex, or anthropic.');}};
}
export class PromptService {
 private active?:{job:PromptJob;controller:AbortController;done:Promise<void>};
 constructor(private readonly store:WorldStore,private readonly provider:ModelProvider,private readonly timeoutMs=120000) {}
 get busy(){return !!this.active;}
 get configuration(){return {provider:this.provider.name,capabilities,timeoutSeconds:this.timeoutMs/1000};}
 async history(world:World):Promise<PromptJob[]> {
  const records=(await this.store.listPrompts(world.id)).map(r=>PromptJobSchema.parse(r));
  for(const job of records)if(job.status==='running'&&job.request.id!==this.active?.job.request.id) {
   job.status='failed';job.error='Request interrupted by server restart. Send a new prompt to try again.';
   await this.store.writePrompt(world.id,job.request.id,job);
  }
  return records.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-40);
 }
 private async prepare(world:World,input:unknown):Promise<{request:PromptRequest;context:ReturnType<typeof buildContext>}> {
  const request=PromptRequestSchema.parse(input);
  if(request.worldId!==world.id)throw Error('Prompt belongs to another world');
  if(request.expectedRevision!==world.revision)throw Error('Stale world revision; refresh before sending your prompt');
  if(!world.tiles[request.tileId])throw Error('Unknown tile');
  if(this.active)throw Error('A model request is already running; wait or cancel it');
  try {await this.store.readPrompt(world.id,request.id);throw Error('This request ID has already been used.');}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  return {request,context:buildContext(world,request,await this.history(world))};
 }
 async start(world:World,input:unknown):Promise<PromptJob> {
  const {request,context}=await this.prepare(world,input);
  const job:PromptJob={request,provider:this.provider.name,status:'running',createdAt:new Date().toISOString()};
  await this.store.writePrompt(world.id,request.id,job);
  const controller=new AbortController(),snapshot=structuredClone(world);
  const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  // Dispatch after capturing authority; the model receives neither live state nor a write tool.
  const done=Promise.resolve().then(async()=>{
   try {
    const response=await this.provider.generate(context,controller.signal);
    controller.signal.throwIfAborted();this.accept(snapshot,job,response);
   }catch(error){job.status=controller.signal.aborted?'cancelled':'failed';job.error=controller.signal.aborted?'Request cancelled or timed out. No world changes were applied.':error instanceof z.ZodError?'Model output did not match the world-change contract. No changes were applied.':error instanceof Error?error.message:'Provider request failed';}
   finally {
    clearTimeout(timer);
    try {await this.store.writePrompt(world.id,request.id,job);}catch{job.status='failed';job.error='Could not save model response. No changes were applied.';}
    if(this.active?.job===job)this.active=undefined;
   }
  });
  this.active={job,controller,done};return structuredClone(job);
 }
 private accept(world:World,job:PromptJob,raw:unknown) {
  const reply=ModelReplySchema.parse(raw);
  if(job.request.mode==='discuss'&&(reply.kind==='proposal'||reply.operations.length))throw Error('Discuss cannot produce executable changes. Use Propose change.');
  const ids=job.request.scope==='world'?world.tiles.map(t=>t.id):job.request.scope==='neighbors'?[job.request.tileId,...world.cells[job.request.tileId].neighbors]:[job.request.tileId];
  if(reply.operations.some(op=>!ids.includes(op.tileId)))throw Error('Model attempted to edit outside the selected scope');
  for(const op of reply.operations) {
   if(op.kind==='artwork-activate'||op.kind==='artwork-reset'){
    if(job.request.scope!=='world')throw Error('Artwork changes require Entire world scope');
    if(op.kind==='artwork-activate'){
     const packs=[...(world.artwork?[world.artwork]:[]),...world.history.flatMap(p=>p.operations.flatMap(o=>o.kind==='artwork-activate'?[o.pack]:[]))];
     if(!packs.some(pack=>JSON.stringify(pack)===JSON.stringify(op.pack)))throw Error('Import and review artwork before selecting it through a prompt');
    }
   }
   if(op.kind==='journey-depart'||op.kind==='journey-redirect'){
    if(op.path.some(id=>!ids.includes(id)))throw Error('Journey path exceeds selected scope');
    if(op.kind==='journey-redirect'){const old=world.journeys?.active.find(j=>j.id===op.journeyId);if(old&&old.path.slice(old.index).some(id=>!ids.includes(id)))throw Error('Existing journey path exceeds selected scope');}
   }
   if(op.kind==='resource-route-define'||op.kind==='resource-route-remove'){
    const old=world.resourceRoutes?.routes.find(r=>r.id===(op.kind==='resource-route-define'?op.route.id:op.routeId));
    if(old&&!ids.includes(old.toTileId)||op.kind==='resource-route-define'&&!ids.includes(op.route.toTileId))throw Error('Resource route endpoints are outside selected scope');
   }
   if(op.kind==='disease-configure'&&job.request.scope!=='world')throw Error('Disease configuration requires Entire world scope');
   if(op.kind==='water-quality-configure'&&job.request.scope!=='world')throw Error('Water quality configuration requires Entire world scope');
   if(op.kind==='air-configure'&&job.request.scope!=='world')throw Error('Air configuration requires Entire world scope');
   if(op.kind==='migration-configure'&&job.request.scope!=='world')throw Error('Migration configuration requires Entire world scope');
   if(op.kind==='neighbor-visits-configure'&&job.request.scope!=='world')throw Error('Neighbor visits configuration requires Entire world scope');
   if(op.kind==='food-trade-configure'&&job.request.scope!=='world')throw Error('Food trade configuration requires Entire world scope');
   if(op.kind==='soil-ecology-configure'&&job.request.scope!=='world')throw Error('Soil ecology configuration requires Entire world scope');
   if((op.kind==='entity-type-define'||op.kind==='entity-type-remove')&&job.request.scope!=='world')throw Error('Entity type definitions require Entire world scope');
   if(op.kind==='entity-update'&&op.toTileId!==undefined&&!ids.includes(op.toTileId))throw Error('Entity destination is outside the selected scope');
   if((op.kind==='plugin-define'||op.kind==='plugin-toggle'||op.kind==='plugin-remove')&&job.request.scope!=='world')throw Error('Plugin changes require Entire world scope');
   if(op.kind==='field-transfer'&&!ids.includes(op.toTileId))throw Error('Transfer destination is outside the selected scope');
   if((op.kind==='field-define'||op.kind==='field-remove')&&job.request.scope!=='world')throw Error('Property definitions require Entire world scope');
   if(op.kind==='appearance-define'||op.kind==='appearance-remove') {
    const old=world.definitions.appearance?.find(r=>r.id===(op.kind==='appearance-define'?op.rule.id:op.ruleId));
    if(old&&ruleTargets(world,old).some(id=>!ids.includes(id)))throw Error('Existing appearance rule affects tiles outside the selected scope');
    if(op.kind==='appearance-define'&&ruleTargets(world,op.rule).some(id=>!ids.includes(id)))throw Error('Appearance rule affects tiles outside the selected scope');
   }
   if(op.kind==='rule-define'||op.kind==='rule-remove') {
    const old=world.definitions.rules.find(r=>r.id===(op.kind==='rule-define'?op.rule.id:op.ruleId));
    if(old&&ruleAffectedTargets(world,old).some(id=>!ids.includes(id)))throw Error('Existing rule affects tiles outside the selected scope');
    if(op.kind==='rule-define'&&ruleAffectedTargets(world,op.rule).some(id=>!ids.includes(id)))throw Error('Rule affects tiles outside the selected scope');
   }
  }
  if(reply.kind==='proposal') {
   const proposal:Proposal={id:`prompt-${randomUUID()}`,worldId:world.id,expectedRevision:world.revision,summary:reply.message.slice(0,500),operations:reply.operations};
   applyProposal(world,proposal); // Validate every effect atomically; discard the resulting copy.
   job.proposal=proposal;
  }
  job.reply=reply;job.status='complete';
 }
 async get(world:World,id:string):Promise<PromptJob> {
  const active=this.active;
  if(active?.job.request.id===id&&active.job.request.worldId===world.id){
   // A final status is visible only after persistence and lock release finish.
   if(active.job.status!=='running')await active.done;
   return structuredClone(active.job);
  }
  const job=PromptJobSchema.parse(await this.store.readPrompt(world.id,id));
  if(job.request.worldId!==world.id)throw Error('Conversation belongs to another world');return job;
 }
 cancel(world:World,id:string) {
  if(this.active?.job.request.worldId!==world.id||this.active.job.request.id!==id)throw Error('No matching active request');
  this.active.controller.abort();
 }
 async close(){this.active?.controller.abort();await this.active?.done;}
 async export(world:World,input:unknown) {
  const {request,context}=await this.prepare(world,input);
  const job:PromptJob={request,provider:'Manual exchange',status:'awaiting-import',createdAt:new Date().toISOString()};
  await this.store.writePrompt(world.id,request.id,job);
  return {requestId:request.id,systemPrompt,context,instructions:'Use this JSON as context in Cursor or Claude Code. Do not open the engine repository or run tools. Return ONLY the response-schema JSON. Import that JSON in Logos; it will be validated and never auto-applied.'};
 }
 async import(world:World,input:unknown) {
  const data=z.object({requestId:z.string(),reply:z.unknown()}).strict().parse(input);
  if(this.busy)throw Error('Wait for the active model request');
  const job=await this.get(world,data.requestId);
  if(job.status!=='awaiting-import')throw Error('This request is not awaiting an external response');
  if(job.request.expectedRevision!==world.revision)throw Error('Export is stale; export a new request from current state');
  this.accept(world,job,data.reply);await this.store.writePrompt(world.id,data.requestId,job);return job;
 }
}
export function forecast(world:World,proposal:Proposal) {
 let baseline=structuredClone(world),candidate=applyProposal(world,proposal),baselineError:string|null=null;
 const applied=candidate;const migrationDays:NonNullable<NonNullable<World['migration']>['lastDay']>[]=[];let routePreview:NonNullable<World['resourceRoutes']>['lastDay'];let tradePreview:NonNullable<World['foodTrade']>['lastDay'];
 for(let i=0;i<5;i++){if(!baselineError)try{baseline=advance(baseline);}catch(error){if(!(error instanceof PluginExecutionError))throw error;baselineError=error.message;}candidate=advance(candidate);if(candidate.migration?.enabled&&candidate.migration.lastDay)migrationDays.push(candidate.migration.lastDay);if(i===0)routePreview=candidate.resourceRoutes?.lastDay;if(i===0&&candidate.foodTrade?.enabled)tradePreview=candidate.foodTrade.lastDay;}
 const ids=new Set(proposal.operations.flatMap(o=>[o.tileId,...world.cells[o.tileId].neighbors]));
 for(const op of proposal.operations) {
  if(op.kind==='plugin-define')for(const id of pluginTargets(candidate,op.definition))ids.add(id);
  if(op.kind==='plugin-define'||op.kind==='plugin-toggle'||op.kind==='plugin-remove'){const old=world.plugins.find(p=>p.definition.id===(op.kind==='plugin-define'?op.definition.id:op.pluginId));if(old)for(const id of pluginTargets(world,old.definition))ids.add(id);}
  if(op.kind==='artwork-activate'||op.kind==='artwork-reset')for(const tile of world.tiles)ids.add(tile.id);
  if(op.kind==='entity-update'&&op.toTileId!==undefined)ids.add(op.toTileId);
  if(op.kind==='entity-type-define'||op.kind==='entity-type-remove')for(const tile of world.tiles)ids.add(tile.id);
  if(op.kind.startsWith('disease-')||op.kind.startsWith('water-')||op.kind==='sanitation-configure'||op.kind.startsWith('air-')||op.kind==='migration-configure'||op.kind==='neighbor-visits-configure'||op.kind.startsWith('journey-')||op.kind==='resource-route-define'||op.kind==='resource-route-remove'||op.kind==='travel-permission'||op.kind==='food-trade-permission'||op.kind==='food-trade-configure'||op.kind==='soil-ecology-configure'||op.kind==='field-define'||op.kind==='field-remove')for(const tile of world.tiles)ids.add(tile.id);
  if(op.kind==='appearance-define')for(const id of ruleTargets(world,op.rule))ids.add(id);
  if(op.kind==='appearance-define'||op.kind==='appearance-remove'){const old=world.definitions.appearance?.find(r=>r.id===(op.kind==='appearance-define'?op.rule.id:op.ruleId));if(old)for(const id of ruleTargets(world,old))ids.add(id);}
  if(op.kind==='rule-define')for(const id of ruleAffectedTargets(world,op.rule))ids.add(id);
  if(op.kind==='rule-define'||op.kind==='rule-remove') {
   const old=world.definitions.rules.find(r=>r.id===(op.kind==='rule-define'?op.rule.id:op.ruleId));
   if(old)for(const id of ruleAffectedTargets(world,old))ids.add(id);
  }
 }
 // A global definition/rule can affect every tile; preview stays bounded while
 // reporting its full affected count. Selected neighborhoods remain first.
 const totalTiles=ids.size,shown=[...ids].slice(0,24);
 const before=resourceTotals(world),base=resourceTotals(baseline);
 const resources=resourceTotals(candidate).map(r=>({...r,baselineUnit:base.find(b=>b.fieldId===r.fieldId)?.unit??null,beforeMilli:before.find(b=>b.fieldId===r.fieldId)?.totalMilli??null,baselineMilli:base.find(b=>b.fieldId===r.fieldId)?.totalMilli??null}));
 const pluginMigrations=proposal.operations.flatMap(op=>{
  if(op.kind!=='plugin-define'||op.migration!=='map')return [];
  const old=world.plugins.find(p=>p.definition.id===op.definition.id)!,next=applied.plugins.find(p=>p.definition.id===op.definition.id)!;
  const targets=pluginTargets(applied,next.definition);
  const values=(instance:typeof old,tileId:number)=>Object.fromEntries(instance.definition.stateFields.map((f,i)=>[f.id,instance.state.find(s=>s.tileId===tileId)?.values[i]??f.initial]));
  return [{id:op.definition.id,label:op.definition.label,totalTiles:targets.length,tiles:targets.slice(0,6).map(tileId=>({tileId,before:values(old,tileId),after:values(next,tileId)}))}];
 });
 const describeAppearance=(w:World,id:number)=>{const a=appearance(w,w.tiles[id],'terrain',1);return {label:a.label,color:a.color,asset:a.assetId??'none',layers:a.layers};};
 const visualChanges=[...ids].map(tileId=>({tileId,before:describeAppearance(world,tileId),after:describeAppearance(applied,tileId)})).filter(t=>JSON.stringify(t.before)!==JSON.stringify(t.after));
 const describeEntity=(w:World,id:string)=>{const e=w.entities?.instances.find(e=>e.id===id);if(!e)return null;const type=w.entities!.types.find(t=>t.id===e.typeId)!;return {...e,summary:`${e.label} in zone ${e.tileId}: ${type.properties.map(f=>`${f.label} ${e.properties[f.id]??f.defaultValue} ${f.unit}`).join(', ')||'no numeric properties'}`,properties:Object.fromEntries(type.properties.map(f=>[f.id,e.properties[f.id]??f.defaultValue]))};};
 const entityRows=[...new Set([...(world.entities?.instances??[]),...(applied.entities?.instances??[])].map(e=>e.id))].sort().map(id=>({id,before:describeEntity(world,id),after:describeEntity(applied,id),forecast:describeEntity(candidate,id),baseline:describeEntity(baseline,id)})).filter(row=>JSON.stringify(row.before)!==JSON.stringify(row.after)||JSON.stringify(row.forecast)!==JSON.stringify(row.baseline));
 const settlementRows=[...ids].filter(id=>world.tiles[id].settlement||applied.tiles[id].settlement).map(tileId=>({tileId,before:settlementSummary(world,tileId),after:settlementSummary(applied,tileId),forecast:settlementSummary(candidate,tileId),baseline:settlementSummary(baseline,tileId)}));
 const visits=candidate.neighborVisits?.enabled?candidate.neighborVisits.lastDay:undefined;
 return {healthPreview:candidate.disease?{before:healthTotals(world),applied:healthTotals(applied),forecast:healthTotals(candidate),baseline:healthTotals(baseline)}:null,waterQualityPreview:candidate.waterQuality?{enabled:candidate.waterQuality.enabled,before:waterQualityTotals(world),applied:waterQualityTotals(applied),forecast:waterQualityTotals(candidate),baseline:waterQualityTotals(baseline),day:candidate.waterQuality.lastDay?{tick:candidate.waterQuality.lastDay.tick,emitted:candidate.waterQuality.lastDay.emitted,waste:candidate.waterQuality.lastDay.waste,treated:candidate.waterQuality.lastDay.treated,oceanExport:candidate.waterQuality.lastDay.oceanExport,decayed:candidate.waterQuality.lastDay.decayed}:null}:null,airPreview:candidate.air?{enabled:candidate.air.enabled,before:airTotals(world),applied:airTotals(applied),forecast:airTotals(candidate),baseline:airTotals(baseline),day:candidate.air.lastDay?{tick:candidate.air.lastDay.tick,emitted:candidate.air.lastDay.emitted,removed:candidate.air.lastDay.removed,rejectedEmission:candidate.air.lastDay.rejectedEmission}:null}:null,migrationPreview:candidate.migration?{days:migrationDays}:null,neighborVisitPreview:visits?{tick:visits.tick,total:visits.entries.length,visitors:visits.entries.reduce((n,e)=>n+e.visitors,0),rations:visits.entries.reduce((n,e)=>n+e.rations,0),entries:visits.entries.slice(0,24)}:null,journeyPreview:{before:journeyTotals(world),applied:journeyTotals(applied),forecast:journeyTotals(candidate),baseline:journeyTotals(baseline),active:candidate.journeys?.active??[],reports:candidate.journeys?.lastDay?.entries??[]},routePreview:routePreview?{tick:routePreview.tick,total:routePreview.entries.length,entries:routePreview.entries.slice(0,24)}:null,foodTradePreview:tradePreview?{...tradePreview,routeCount:tradePreview.transfers.length,transfers:tradePreview.transfers.slice(0,24)}:null,settlementChanges:{total:settlementRows.length,rows:settlementRows.slice(0,24)},entityChanges:{total:entityRows.length,rows:entityRows.slice(0,24)},appearanceChanges:{total:visualChanges.length,tiles:visualChanges.slice(0,24)},pluginMigrations,tick:candidate.tick,baselineError,baselineTick:baseline.tick,totalTiles,resources,definitions:candidate.definitions,tiles:shown.map(id=>({id,waterQuality:waterQualityMetrics(candidate,id),baselineWaterQuality:waterQualityMetrics(baseline,id),before:world.tiles[id],after:candidate.tiles[id],baseline:baseline.tiles[id],waterMm:depthMm(candidate,id),baselineWaterMm:depthMm(baseline,id),properties:candidate.definitions.fields.map(f=>({id:f.id,label:f.label,unit:f.unit,baselineUnit:baseline.definitions.fields.find(b=>b.id===f.id)?.unit??null,after:fieldValue(candidate,id,f.id),baseline:baseline.definitions.fields.some(b=>b.id===f.id)?fieldValue(baseline,id,f.id):null}))})),events:candidate.events.slice(-12)};
}
