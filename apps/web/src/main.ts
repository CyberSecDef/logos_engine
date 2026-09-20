import type {WaterPreview} from '../../../packages/contracts/src/transport.js';
import type { Checkpoint } from '../../../packages/contracts/src/checkpoints.js';
import { WorldGlobe } from './globe.js';
import { appearance, matchingAppearance, type Overlay } from '../../../packages/globe/src/appearance.js';
import type { PromptJob, PromptRequest } from '../../../packages/contracts/src/prompts.js';
import { ruleAffectedTargets,ruleTargets as pluginTargets } from '../../../packages/engine/src/extensions.js';
import type { CustomRule, Read } from '../../../packages/contracts/src/extensions.js';
import type { World, Operation, Proposal } from '../../../packages/contracts/src/index.js';
// getRandomValues also works on ordinary LAN HTTP, unlike randomUUID.
function requestId():string {
 return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let token='',world:World,selected=-1,busy=false,playing=false,pending:Proposal|null=null,timer:ReturnType<typeof setTimeout>|undefined;
let promptJobId:string|null=null,chatPoll:ReturnType<typeof setTimeout>|undefined;
const globe=new WorldGlobe($<HTMLCanvasElement>('globe'),selectTile,status=>text('art-status',status),()=>({Authorization:`Bearer ${token}`}));
try{globe.texturesEnabled=localStorage.getItem('logos-terrain-style')!=='colors';}catch{}
$<HTMLSelectElement>('texture-mode').value=globe.texturesEnabled?'artwork':'colors';
$('texture-mode').onchange=()=>{globe.texturesEnabled=$<HTMLSelectElement>('texture-mode').value==='artwork';try{localStorage.setItem('logos-terrain-style',globe.texturesEnabled?'artwork':'colors');}catch{}globe.update();};
const fmt=(n:number)=>Math.round(n).toLocaleString();
const text=(id:string,value:string)=>{$(id).textContent=value;};
function error(e:unknown) {text('toast',e instanceof Error?e.message:String(e));$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true;},6500);}
async function api<T>(path:string,body?:unknown):Promise<T> {
 const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw Error(data.error??'Request failed');return data;
}
function setPlaying(value:boolean) {
 if(value&&(promptJobId||!$('conversation').hidden||!$('worlds').hidden||!$('world-review').hidden))return;
 playing=value;clearTimeout(timer);text('play',value?'Ⅱ Pause time':'▶ Let time flow');
 if(value)timer=setTimeout(tick,Number($<HTMLSelectElement>('speed').value));
}
async function action(fn:()=>Promise<void>) {
 if(busy)return;busy=true;document.body.classList.add('busy');$<HTMLInputElement>('chat-import').disabled=true;$<HTMLInputElement>('import-world').disabled=true;$<HTMLInputElement>('import-artwork').disabled=true;
 try {await fn();}catch(e){setPlaying(false);error(e);try{setWorld(await api<World>('world'));}catch{}}
 finally{busy=false;document.body.classList.remove('busy');$<HTMLInputElement>('chat-import').disabled=!!promptJobId;$<HTMLInputElement>('import-world').disabled=!!promptJobId;$<HTMLInputElement>('import-artwork').disabled=!!promptJobId;}
}
function setWorld(value:World) {const changed=world?.id!==value.id;world=value;if(changed){pending=null;$('proposal').hidden=true;selected=-1;$('conversation').hidden=true;document.body.classList.remove('chat-open');$('chat-history').replaceChildren();promptState(promptJobId);}updateCustomLayers();globe.setWorld(world);selectTile(selected);text('world-name',world.name);text('day',`DAY ${world.tick}`);text('save-status',`Saved locally · ${fmt(world.tiles.length)} places`);}
function selectTile(id:number) {
 $('water-preview').hidden=true;$('water-preview').replaceChildren();
 if(promptJobId&&id!==selected)return;
 const changed=id!==selected;selected=id;globe.select(id);
 if(changed&&!$('conversation').hidden)void loadChat();
 const t=world?.tiles[id];$('creator').hidden=!t;
 if(!t) {text('tile-title','Choose a place.');text('tile-subtitle','Select a tile to inspect its terrain, water, and possibilities.');$('tile-details').replaceChildren();return;}
 text('tile-title',appearance(world,t).label);text('tile-subtitle',`ZONE ${String(id).padStart(4,'0')} · ${world.cells[id].neighbors.length} neighbors`);
 const entries=[['Artwork',globe.reveal[id]>=1?'Revealed':globe.reveal[id]>0?'Appearing gradually':'Not revealed yet'],['Elevation',`${fmt(t.elevationM)} m`],['Standing water',`${(t.waterL/world.cells[id].areaM2).toFixed(1)} mm`],['Rainfall today',`${t.rainMm} mm`],['Temperature',`${t.temperatureC.toFixed(1)} °C`],['Heat / cold anomaly',`${(t.temperatureAnomalyC??0)>=0?'+':''}${(t.temperatureAnomalyC??0).toFixed(1)} °C`],['Vegetation',`${Math.round(t.vegetation*100)}%`],['Communication',t.communication?'Connected':'Isolated']];
 const container=$('tile-details');container.replaceChildren();
 for(const [label,value] of entries){const row=document.createElement('div');row.className='stat';const k=document.createElement('span');k.textContent=label;const v=document.createElement('strong');v.textContent=value;row.append(k,v);container.append(row);}
 for(const rule of world.rules.filter(r=>r.tileId===id)){const p=document.createElement('p');p.className='rule-note';p.textContent=rule.kind==='rainfall'?`Recurring rule: ${rule.mmPerDay} mm of rain / day`:`Sustained temperature: ${rule.celsius} °C`;container.append(p);}
 $<HTMLButtonElement>('temperature-reset').disabled=!!promptJobId||!world.rules.some(r=>r.tileId===id&&r.kind==='temperature');
 for(const field of world.definitions.fields){const row=document.createElement('div');row.className='stat';row.title=field.description;const label=document.createElement('span'),value=document.createElement('strong');label.textContent=field.label;value.textContent=`${t.properties[field.id]??field.defaultValue}${field.quantity==='stock'?` / ${field.max}`:''} ${field.unit}`;row.append(label,value);container.append(row);}
 for(const rule of world.definitions.rules.filter(r=>ruleAffectedTargets(world,r).includes(id))){const note=document.createElement('p');note.className='rule-note';note.textContent=`${rule.label} · v${rule.version}${rule.enabled?'':' · paused'}: ${describeRule(rule)}`;container.append(note);}
 for(const e of world.entities?.instances.filter(e=>e.tileId===id)??[]){const type=world.entities!.types.find(t=>t.id===e.typeId)!;const row=document.createElement('p');row.className='entity-note rule-note';row.textContent=`${e.label} (${e.id}) · ${type.label} v${type.version} · ${type.properties.map(f=>`${f.label}: ${e.properties[f.id]??f.defaultValue} ${f.unit}`).join(', ')}`;container.append(row);}
 const activeStyle=matchingAppearance(world,t);
 for(const rule of world.definitions.appearance??[]){if(!pluginTargets(world,rule).includes(id))continue;const note=document.createElement('p');note.className='appearance-note rule-note';note.textContent=`Appearance: ${rule.label} v${rule.version} · ${!rule.enabled?'paused':activeStyle?.id===rule.id?'matching':'not selected'} · priority ${rule.priority} · ${rule.style.label}, ${rule.style.asset==='none'?'color only':rule.style.asset}${rule.style.layers?.length?` · layers ${rule.style.layers.map(l=>`${l.asset} ${Math.round(l.opacity*100)}%`).join(' → ')}`:''}`;container.append(note);}
 for(const plugin of world.plugins.filter(p=>pluginTargets(world,p.definition).includes(id))){const p=document.createElement('p');p.className='plugin-note rule-note';const def=plugin.definition,values=plugin.state.find(s=>s.tileId===id)?.values??def.stateFields.map(f=>f.initial);p.textContent=`Plugin: ${def.label} v${def.version} · ${def.enabled?'active':'paused'} · ${def.stateFields.map((f,i)=>`${f.id}: ${values[i]}`).join(', ')}`;const b=document.createElement('button');b.textContent=def.enabled?'Review disable plugin':'Review enable plugin';b.disabled=!!promptJobId;b.onclick=()=>void propose({kind:'plugin-toggle',tileId:def.tileId,pluginId:def.id,enabled:!def.enabled},`${def.enabled?'Disable':'Enable'} ${def.label}. Saved plugin state is retained.`);container.append(p,b);}
 for(const entry of world.resourceLedger?.entries??[]){if(!world.definitions.fields.some(f=>f.id===entry.fieldId&&f.quantity==='stock'))continue;const note=document.createElement('p');note.className='resource-note muted';note.textContent=`Day ${world.resourceLedger.tick} world balance · ${entry.label}: ${(entry.afterMilli/1000).toLocaleString()} ${entry.unit}; net added ${entry.createdMilli/1000}, net removed ${entry.removedMilli/1000}, transferred ${entry.transferredMilli/1000}. Transfers leave the world total unchanged.`;container.append(note);}
 const events=world.events.filter(e=>e.tileId===id).slice(-2);for(const e of events){const p=document.createElement('p');p.className='muted';p.textContent=`Day ${e.tick} · ${e.message}`;container.append(p);}
 text('communication-change',t.communication?'Isolate communication':'Restore communication');
}
$('water-explain').onclick=()=>{setPlaying(false);void action(async()=>{
 const source={worldId:world.id,expectedRevision:world.revision,tileId:selected};
 const report=await api<WaterPreview>('transport/preview',source);
 if(world.id!==source.worldId||world.revision!==source.expectedRevision||selected!==source.tileId)return;
 const container=$('water-preview');container.replaceChildren();container.hidden=false;
 const close=document.createElement('button');close.textContent='Close water preview';close.onclick=()=>{container.hidden=true;container.replaceChildren();};container.append(close);
 const heading=document.createElement('p');heading.className='rule-note';heading.textContent=`Day ${report.sourceTick} → ${report.tick} · Preview only`;container.append(heading);
 const note=document.createElement('p');note.className='muted';note.textContent='Current applied rules. Time and saved state are unchanged. Depths use this zone’s area.';container.append(note);
 const b=report.budget;
 for(const [label,value] of [['Starting water',b.beforeWaterL],['Rain added',b.rainL],['Evaporation removed',b.evaporationL],['Incoming runoff',b.incomingWaterL],['Outgoing runoff',b.outgoingWaterL],['Ocean drainage removed',b.oceanDrainL],['Ending water',b.afterWaterL]] as const){
  const row=document.createElement('div');row.className='stat';const k=document.createElement('span'),v=document.createElement('strong');k.textContent=label;v.textContent=`${(value/report.areaM2).toFixed(2)} mm · ${fmt(value)} L`;row.append(k,v);container.append(row);
 }
 const sediment=document.createElement('p');sediment.className='muted';sediment.textContent=`Sediment: ${fmt(b.beforeSedimentKg)} kg + ${fmt(b.incomingSedimentKg)} kg incoming − ${fmt(b.outgoingSedimentKg)} kg outgoing = ${fmt(b.afterSedimentKg)} kg. Ocean drainage removes water only.`;container.append(sediment);
 for(const flow of [...report.incoming,...report.outgoing]){
  const incoming=flow.toTileId===selected,other=incoming?flow.fromTileId:flow.toTileId;
  const row=document.createElement('p');row.className='water-route rule-note';row.textContent=`${incoming?'From':'To'} zone ${other}: ${fmt(flow.waterL)} L water · ${fmt(flow.sedimentKg)} kg sediment`;container.append(row);
 }
 if(!report.incoming.length&&!report.outgoing.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='No neighbor runoff on the next day.';container.append(empty);}
 const timing=document.createElement('p');timing.className='muted';timing.textContent='Runoff moves one neighbor hop per day. Arriving water cannot flow onward until a later day. Communication settings do not block water.';container.append(timing);
});};
async function tick() {
 if(!world||document.hidden||!$('world-review').hidden){setPlaying(false);return;}
 await action(async()=>{setWorld(await api<World>('step',{expectedRevision:world.revision,days:1}));});
 if(playing)timer=setTimeout(tick,Number($<HTMLSelectElement>('speed').value));
}
async function propose(operation:Operation,summary:string) {
 setPlaying(false);await action(async()=>{
  const proposal:Proposal={id:`change-${requestId()}`,worldId:world.id,expectedRevision:world.revision,summary,operations:[operation]};
  await reviewProposal(proposal);
 });
}
$('play').onclick=()=>setPlaying(!playing);$('step').onclick=()=>{setPlaying(false);void tick();};
$('spin').onclick=()=>{globe.spinning=!globe.spinning;text('spin',globe.spinning?'Pause rotation':'Resume rotation');};
text('spin',globe.spinning?'Pause rotation':'Resume rotation');
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
window.addEventListener('pagehide',()=>setPlaying(false));
$('rain-change').onclick=()=>void propose({kind:'rainfall',tileId:selected,mmPerDay:Number($<HTMLInputElement>('rain').value)},`Set zone ${selected} rainfall to ${$<HTMLInputElement>('rain').value} mm every day.`);
$('elevation-change').onclick=()=>void propose({kind:'elevation',tileId:selected,deltaM:Number($<HTMLInputElement>('elevation').value)},`Change zone ${selected} elevation by ${$<HTMLInputElement>('elevation').value} metres.`);
$('temperature-change').onclick=()=>{const celsius=Number($<HTMLInputElement>('temperature').value),mode=$<HTMLSelectElement>('temperature-mode').value as 'pulse'|'sustained';void propose({kind:'temperature',tileId:selected,celsius,mode},`${mode==='pulse'?'One-time temperature event: set':'Maintain'} zone ${selected} at ${celsius} °C. Heat or cold affects neighbors as time advances.`);};
$('temperature-reset').onclick=()=>void propose({kind:'temperature-reset',tileId:selected},`Stop maintaining zone ${selected} temperature. Remaining heat or cold will spread and fade.`);
$('communication-change').onclick=()=>void propose({kind:'communication',tileId:selected,enabled:!world.tiles[selected].communication},`${world.tiles[selected].communication?'Disable':'Restore'} communication for zone ${selected}. Physical runoff is unaffected. Knowledge transfer is not yet simulated.`);
$('cancel-proposal').onclick=()=>{pending=null;$('proposal').hidden=true;$('rain-change').focus();};
$('apply-proposal').onclick=()=>void action(async()=>{if(!pending)return;setWorld(await api<World>('proposals/apply',pending));pending=null;$('proposal').hidden=true;$('rain-change').focus();if(!$('conversation').hidden)await loadChat();});
$('proposal').addEventListener('keydown',e=>{if(e.key==='Escape')$('cancel-proposal').click();if(e.key==='Tab'){const first=$('cancel-proposal'),last=$('apply-proposal');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
const layers:{id:Overlay;label:string;legend:string}[]=[{id:'terrain',label:'Terrain',legend:'Ocean / grassland / forest / alpine'},{id:'water',label:'Water',legend:'Dry land / retained water / flooding above 100 mm'},{id:'rain',label:'Rainfall',legend:'Dark → light · 0–100+ mm per day'},{id:'temperature',label:'Temperature',legend:'Blue: cold · red: warm · darker: extreme temperatures'},{id:'communication',label:'Connections',legend:'Green: connected · amber: isolated'}];
for(const l of layers){const b=document.createElement('button');b.textContent=l.label;b.classList.toggle('active',l.id==='terrain');b.onclick=()=>{globe.overlay=l.id;$<HTMLSelectElement>('custom-layer').value='';globe.update();text('legend',l.legend);for(const x of Array.from($('layer-buttons').children))x.classList.toggle('active',x===b);};$('layer-buttons').append(b);}
type WorldSummary={name:string;tick:number;tiles:number;fields:number;plugins:number;rules:number;interventions:number;entities?:number;entityTypes?:number};
let worldReview:{path:string;body:unknown}|null=null;
function finishWorldReview() {
 worldReview=null;$('world-review').hidden=true;$('world-review-artwork').replaceChildren();
 for(const child of Array.from(document.body.children))if(child instanceof HTMLElement)child.inert=false;
 document.body.classList.remove('world-review-open');$('worlds-toggle').focus();
}
function reviewWorld(title:string,summary:WorldSummary,note:string,label:string,path:string,body:unknown) {
 $('world-review-artwork').replaceChildren();setPlaying(false);worldReview={path,body};text('world-review-title',title);
 text('world-review-summary',`${summary.name} · day ${summary.tick} · ${summary.tiles} zones · ${summary.fields} custom properties · ${summary.rules} custom rules · ${summary.plugins} plugins · ${summary.entities??0} entities (${summary.entityTypes??0} types) · ${summary.interventions} recorded changes.`);
 text('world-review-note',note);text('apply-world-review',label);$('world-review').hidden=false;
 for(const child of Array.from(document.body.children))if(child instanceof HTMLElement&&child.id!=='world-review'&&child.id!=='toast')child.inert=true;
 document.body.classList.add('world-review-open');$('cancel-world-review').focus();
}
$('cancel-world-review').onclick=finishWorldReview;
$('world-review').addEventListener('keydown',e=>{if(e.key==='Escape')finishWorldReview();});
$('apply-world-review').onclick=()=>void action(async()=>{
 if(!worldReview)return;const next=await api<World>(worldReview.path,worldReview.body);
 pending=null;$('proposal').hidden=true;setWorld(next);$('conversation').hidden=true;document.body.classList.remove('chat-open');promptState(null);
 finishWorldReview();$('worlds').hidden=true;
});
let historyCursor:string|null=null;
async function reviewSelective(recordId:string,edit:{mode:'omit'}|{mode:'replace';summary:string;operations:Operation[]}){
 const body={worldId:world.id,recordId,id:`world-${requestId()}`,name:$<HTMLInputElement>('copy-name').value,expectedRevision:world.revision,edit};
 const result=await api<{summary:WorldSummary;hash:string;days:number;workDays:number;proposals:number;rebased:number;baseTick:number;original:string;originalOperations:Operation[];changes:{total:number;tiles:{tileId:number;before:World['tiles'][number];after:World['tiles'][number]}[]};entityChanges:{total:number;rows:{id:string;before:string;after:string}[]}}>('history/selective/preview',body);
 reviewWorld('Create an alternate history?',result.summary,`${edit.mode==='omit'?'Omit':'Replace'}: ${result.original}. Replay ${result.days} days and ${result.proposals} interventions from day ${result.baseTick}; ${result.rebased} later revision numbers adjusted. All later operations were validated without skipping failures. Your source world stays unchanged.`, 'Create alternate world','history/selective/branch',{...body,reviewedHash:result.hash});
 const diff=document.createElement('div');diff.className='replay-diff';const heading=document.createElement('p');heading.textContent=`Compared with the current world: ${result.changes.total} changed zones and ${result.entityChanges.total} changed entities. Showing up to 12 of each. Rules may differ even when current values match.`;diff.append(heading);
 for(const operation of result.originalOperations){const row=document.createElement('p');row.textContent=`Original: ${describeOperation(operation)}`;diff.append(row);}
 if(edit.mode==='replace')for(const operation of edit.operations){const row=document.createElement('p');row.textContent=`Replacement: ${describeOperation(operation)}`;diff.append(row);}
 for(const change of result.changes.tiles){const parts:string[]=[];for(const key of ['elevationM','rainMm','temperatureC','waterL','vegetation','population','communication'] as const)if(change.before[key]!==change.after[key])parts.push(`${{elevationM:'Elevation (m)',rainMm:'Rain (mm)',temperatureC:'Temperature (°C)',waterL:'Water (L)',vegetation:'Vegetation',population:'Population',communication:'Connected'}[key]}: ${typeof change.before[key]==='number'?fmt(change.before[key] as number):String(change.before[key])} → ${typeof change.after[key]==='number'?fmt(change.after[key] as number):String(change.after[key])}`);for(const field of new Set([...Object.keys(change.before.properties),...Object.keys(change.after.properties)]))if(change.before.properties[field]!==change.after.properties[field])parts.push(`${field}: ${change.before.properties[field]??'default'} → ${change.after.properties[field]??'default'}`);const row=document.createElement('p');row.textContent=`Zone ${change.tileId}: ${parts.join('; ')||'saved state changed'}`;diff.append(row);}
 for(const e of result.entityChanges.rows){const row=document.createElement('p');row.textContent=`${e.before} → ${e.after}`;diff.append(row);}$('world-review-artwork').append(diff);
}
async function loadHistory(before?:string) {
 const history=await api<{entries:{id:string;kind:string;tick:number;revision:number;summary:string}[];hasMore:boolean}>(before?`history?before=${encodeURIComponent(before)}`:'history');if(!before)$('history-list').replaceChildren();
 historyCursor=history.hasMore?history.entries.at(-1)?.id??null:null;$('history-more').hidden=!historyCursor;
 for(const entry of history.entries){
  const row=document.createElement('div'),label=document.createElement('p'),button=document.createElement('button');row.className='history-row checkpoint-row';label.className='muted';label.textContent=`Day ${entry.tick} · revision ${entry.revision} · ${entry.summary}`;
  button.textContent='Review branch';button.onclick=()=>void action(async()=>{
   const body={worldId:world.id,recordId:entry.id,id:`world-${requestId()}`,name:$<HTMLInputElement>('copy-name').value,expectedRevision:world.revision};
   const result=await api<{summary:WorldSummary;hash:string;days:number;baseTick:number;baseKind:string}>('history/preview',body);
   reviewWorld('Branch from recorded history?',result.summary,`Reconstructed from a verified ${result.baseKind==='checkpoint'?'checkpoint':'journal snapshot'} at day ${result.baseTick}, replaying ${result.days} day${result.days===1?'':'s'}. Creates an independent world using the copy name. Your source world stays at day ${world.tick}.`,'Create branch','history/branch',{...body,reviewedHash:result.hash});
  });row.append(label,button);
  if(entry.kind==='proposal'){
   const omit=document.createElement('button');omit.textContent='Review without this';omit.onclick=()=>void action(()=>reviewSelective(entry.id,{mode:'omit'}));
   const replace=document.createElement('button');replace.textContent='Replace intervention';replace.onclick=()=>void action(async()=>{
    const proposal=await api<Proposal>('history/intervention',{worldId:world.id,recordId:entry.id,expectedRevision:world.revision});
    const editor=document.createElement('div'),nameLabel=document.createElement('label'),name=document.createElement('input'),label=document.createElement('label'),input=document.createElement('textarea'),review=document.createElement('button');editor.className='replay-editor';name.value=proposal.summary;name.maxLength=500;nameLabel.textContent='Replacement summary';nameLabel.append(name);label.textContent='Replacement operations (JSON)';input.value=JSON.stringify(proposal.operations,null,2);input.rows=8;input.maxLength=50000;label.append(input);review.textContent='Review replacement replay';review.onclick=()=>void action(()=>reviewSelective(entry.id,{mode:'replace',summary:name.value,operations:JSON.parse(input.value)}));editor.append(nameLabel,label,review);row.querySelector('.replay-editor')?.remove();row.append(editor);
   });row.append(omit,replace);
  }
  $('history-list').append(row);
 }
 text('history-status',$('history-list').children.length?`Showing ${$('history-list').children.length} recorded saves. Review a branch to explore a recorded moment in an independent world.`:'Replay recording begins on this world’s next save. Earlier day-by-day history is unavailable.');
}
$('history-more').onclick=()=>void action(async()=>{if(historyCursor)await loadHistory(historyCursor);});
async function refreshWorlds() {
 text('world-artwork-status',world.artwork?`${world.artwork.label} · v${world.artwork.version} · ${world.artwork.images.length} replacements`:'Built-in painterly artwork');$<HTMLButtonElement>('reset-artwork').disabled=!world.artwork;
 const worlds=await api<{id:string;name:string;tick:number}[]>('worlds');$('world-list').replaceChildren();
 for(const w of worlds){const b=document.createElement('button');b.textContent=`${w.name} · day ${w.tick}${w.id===world.id?' · current':''}`;b.onclick=()=>void action(async()=>{setWorld(await api<World>('worlds/open',{id:w.id}));$('worlds').hidden=true;});$('world-list').append(b);}
 await loadHistory();
 const sources=await api<{index:number;id:string;name:string;tick:number;records:number}[]>('worlds/sources');$('source-history').hidden=!sources.length;$('source-list').replaceChildren();
 for(const source of sources){
  const section=document.createElement('details'),heading=document.createElement('summary'),rows=document.createElement('div'),more=document.createElement('button');heading.textContent=`${source.name} (${source.id}) · day ${source.tick} · ${source.records} records`;more.textContent='Load source records';section.append(heading,rows,more);$('source-list').append(section);
  let cursor:string|undefined;
  more.onclick=()=>void action(async()=>{const result=await api<{entries:{id:string;tick:number;revision:number;summary:string}[];hasMore:boolean}>(`worlds/sources?index=${source.index}${cursor?`&before=${cursor}`:''}`);for(const entry of result.entries){const row=document.createElement('p');row.textContent=`Day ${entry.tick} · revision ${entry.revision} · ${entry.summary}`;rows.append(row);}cursor=result.entries.at(-1)?.id;more.hidden=!result.hasMore;more.textContent='Load earlier source records';if(!rows.children.length)rows.textContent='No replay records existed at export.';});
 }
 const checkpoints=await api<Checkpoint[]>('checkpoints');$('checkpoint-list').replaceChildren();
 for(const checkpoint of checkpoints) {
  const row=document.createElement('div');row.className='checkpoint-row';const label=document.createElement('p');label.textContent=`${checkpoint.label} · day ${checkpoint.tick} · ${checkpoint.kind==='manual'?'named':checkpoint.kind==='automatic'?'automatic':'restore backup'}`;
  const restore=document.createElement('button');restore.textContent='Review restore';restore.onclick=()=>void action(async()=>{
   const body={id:checkpoint.id,expectedRevision:world.revision},result=await api<{summary:WorldSummary}>('checkpoints/preview',body);
   reviewWorld('Restore checkpoint?',result.summary,'Your current state will be saved as a restore backup. Time stays paused. Previously proposed changes will need a new prompt.','Restore','checkpoints/restore',body);
  });
  const branch=document.createElement('button');branch.textContent='Branch from here';branch.onclick=()=>void branchWorld(checkpoint.id);row.append(label,restore,branch);$('checkpoint-list').append(row);
 }
 if(!checkpoints.length){const p=document.createElement('p');p.className='muted';p.textContent='No checkpoints yet.';$('checkpoint-list').append(p);}
}
async function branchWorld(checkpointId?:string) {await action(async()=>{
 setWorld(await api<World>('worlds/branch',{id:`world-${requestId()}`,name:$<HTMLInputElement>('copy-name').value,expectedRevision:world.revision,checkpointId}));$('worlds').hidden=true;
});}
$('worlds-toggle').onclick=()=>void action(async()=>{
 setPlaying(false);$('worlds').hidden=!$('worlds').hidden;if($('worlds').hidden)return;
 $<HTMLInputElement>('copy-name').value=`${world.name} branch`.slice(0,80);await refreshWorlds();
});
$('save-checkpoint').onsubmit=e=>{e.preventDefault();void action(async()=>{
 await api('checkpoints',{label:$<HTMLInputElement>('checkpoint-label').value,expectedRevision:world.revision});$<HTMLInputElement>('checkpoint-label').value='';await refreshWorlds();
});};
$('branch-world').onclick=()=>void branchWorld();
$('export-world').onclick=()=>void action(async()=>{
 const archive=await api('worlds/export'),href=URL.createObjectURL(new Blob([JSON.stringify(archive)],{type:'application/json'})),link=document.createElement('a');
 link.href=href;link.download=`logos-${world.id}-day-${world.tick}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
});
$('import-artwork').onchange=()=>void action(async()=>{
 const input=$<HTMLInputElement>('import-artwork'),file=input.files?.[0];input.value='';if(!file)return;
 if(file.size>32*1024*1024)throw Error('Artwork packs must be under 32 MiB');
 const bundle=JSON.parse(await file.text()),body={worldId:world.id,expectedRevision:world.revision,bundle};
 const result=await api<{summary:WorldSummary;pack:{label:string;version:number;credit:string;images:{slot:string;hash:string}[]};images:{hash:string;width:number;height:number}[]}>('artwork/preview',body);
 reviewWorld('Activate world artwork?',result.summary,`${result.pack.label} v${result.pack.version}. ${result.pack.credit} Replaces ${result.pack.images.map(i=>i.slot).join(', ')}. Other slots retain built-in artwork. Reveal timing and simulation stay unchanged.`,'Activate artwork','artwork/apply',body);
 for(const item of result.pack.images){const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=`data:image/png;base64,${bundle.images.find((i:{hash:string})=>i.hash===item.hash).data}`;image.alt=item.slot;caption.textContent=item.slot;figure.append(image,caption);$('world-review-artwork').append(figure);}
});
$('reset-artwork').onclick=()=>void action(async()=>{
 const proposal:Proposal={id:`artwork-${requestId()}`,worldId:world.id,expectedRevision:world.revision,summary:'Return to built-in painterly artwork',operations:[{kind:'artwork-reset',tileId:0}]};
 await api('proposals/preview',proposal);
 reviewWorld('Return to built-in artwork?',{name:world.name,tick:world.tick,tiles:world.tiles.length,fields:world.definitions.fields.length,plugins:world.plugins.length,rules:world.definitions.rules.length,interventions:world.history.length+1},'Imported images remain stored for checkpoints and history. Reveal timing is unchanged.','Use built-in artwork','proposals/apply',proposal);
});
$('import-world').onchange=()=>void action(async()=>{
 const input=$<HTMLInputElement>('import-world'),file=input.files?.[0];input.value='';if(!file)return;
 if(file.size>128*1024*1024)throw Error('World bundles must be under 128 MiB');
 const archive=JSON.parse(await file.text()),body={archive,id:`world-${requestId()}`,name:$<HTMLInputElement>('copy-name').value};
 const summary=await api<WorldSummary&{bundle:{legacy:boolean;images:number;sources:number;records:number}}>('worlds/import/preview',body);
 reviewWorld('Import an independent world?',summary,summary.bundle.legacy?'Legacy state-only archive: artwork files and replay records are absent. This creates a separate world with new history. Conversations and checkpoints are not included.':`Verified complete bundle: ${summary.bundle.images} images and ${summary.bundle.records} replay records across ${summary.bundle.sources} source histories. This creates an independent world; original history stays read-only. Conversations and named checkpoints are not included.`,'Import world','worlds/import',body);
});
$('new-world').onsubmit=e=>{e.preventDefault();void action(async()=>{setWorld(await api<World>('worlds/create',{id:`world-${requestId()}`,name:$<HTMLInputElement>('new-name').value,seed:$<HTMLInputElement>('new-seed').value,frequency:12}));$('worlds').hidden=true;});};
function describeRead(read:Read):string {const labels={temperatureC:'temperature (°C)',rainMm:'rainfall (mm)',waterMm:'standing water (mm)',vegetation:'vegetation fraction',elevationM:'elevation (m)',population:'population'};return `${read.sample==='neighbors-average'?'neighbor average of ':read.sample==='neighbors-min'?'neighbor minimum of ':read.sample==='neighbors-max'?'neighbor maximum of ':''}${read.source==='entity-count'?`${read.entityTypeId} count`:read.source==='entity-sum'?`${read.entityTypeId}.${read.fieldId} total`:read.source==='custom'?(world.definitions.fields.find(f=>f.id===read.fieldId)?.label??read.fieldId):labels[read.source]}`;}
function describeRule(rule:CustomRule):string {
 const conditions=rule.conditions.map(c=>`${describeRead(c.read)} ${{lt:'<',lte:'≤',eq:'=',gte:'≥',gt:'>'}[c.comparison]} ${c.value}`).join(' and ');
 const effects=rule.effects.map(e=>`${e.kind==='transfer'?'share a total of ':''}${e.entityTypeId?`each ${e.entityTypeId}.`:''}${e.fieldId} ${e.kind==='add'?'+=':e.kind==='set'?'=':'up to'} ${e.value.constant}${e.value.terms.map(t=>` + (${t.coefficient} × ${describeRead(t.read)})`).join('')}${e.value.min!==undefined?`, at least ${e.value.min}`:''}${e.value.max!==undefined?`, at most ${e.value.max}`:''}${e.kind==='transfer'?` among ${e.destination==='lower-neighbors'?'lower neighbors':'neighbors'} within available stock and capacity`:''}`).join('; ');
 return `Every ${rule.everyDays} day(s), ${rule.scope==='world'?'all zones':rule.scope==='neighbors'?`zone ${rule.tileId} and neighbors`:`zone ${rule.tileId}`}${conditions?`, when ${conditions}`:''}: ${effects}.`;
}
function describeOperation(o:Operation):string {
 switch(o.kind){
  case 'entity-type-define':return `Entity type ${o.definition.label} v${o.definition.version}: ${o.definition.properties.map(f=>`${f.label} ${f.min}–${f.max} ${f.unit}, default ${f.defaultValue}`).join('; ')}. Migration: ${o.migration}; discard properties: ${o.discardProperties.join(', ')||'none'}.`;
  case 'entity-type-remove':return `Remove entity type ${o.typeId}; all instances and dependencies must be removed first.`;
  case 'entity-create':return `Create ${o.entity.label} (${o.entity.id}, type ${o.entity.typeId}) on zone ${o.tileId}: ${JSON.stringify(o.entity.properties)}; omitted properties use type defaults.`;
  case 'entity-update':return `Update ${o.entityId} on zone ${o.tileId}${o.toTileId!==undefined?`, move to zone ${o.toTileId}`:''}: ${o.label??''} ${JSON.stringify(o.properties??{})}.`;
  case 'entity-remove':return `Remove ${o.entityId} and its saved properties from zone ${o.tileId}.`;
  case 'artwork-activate':return `Activate artwork pack ${o.pack.label} v${o.pack.version}: ${o.pack.images.map(i=>i.slot).join(', ')}. ${o.pack.credit} Reveal timing is unchanged.`;
  case 'artwork-reset':return 'Return this world to the built-in painterly artwork; imported images remain available in its history.';
  case 'appearance-define':return `Appearance rule: ${o.rule.label} v${o.rule.version} · ${o.rule.scope} · priority ${o.rule.priority}${o.rule.enabled?'':' · paused'}. When ${o.rule.conditions.map(c=>`${describeRead(c.read)} ${c.comparison} ${c.value}`).join(' AND ')||'always'}: ${o.rule.style.label}, color ${o.rule.style.color}, artwork ${o.rule.style.asset}${o.rule.style.layers?.length?`, layers ${o.rule.style.layers.map(l=>`${l.asset} ${Math.round(l.opacity*100)}%`).join(" → ")}`:""}. Cosmetic only; existing reveal timing applies.`;
  case 'appearance-remove':return `Remove appearance rule ${o.ruleId}; remaining appearance rules or base terrain determine its look.`;
  case 'plugin-define':return `World plugin: ${o.definition.label} v${o.definition.version} · ${o.definition.scope} · ${o.definition.program.length} instructions · ${o.definition.stateFields.length} saved state values per tile. ${o.definition.description} State migration: ${o.migration}.${o.migration==='map'?` ${(o.stateMap??[]).map(m=>'initial' in m?`${m.key}: new initial value`:`${m.key}: old ${m.from} × ${m.scale} + ${m.offset} (${m.precision==='exact'?'reject precision loss':'round to 0.001'})`).join('; ')}. Discard old keys: ${(o.discardStateKeys??[]).join(', ')||'none'}.`:''}`;
  case 'plugin-toggle':return `${o.enabled?'Enable':'Disable'} plugin ${o.pluginId}; saved state is retained.`;
  case 'plugin-remove':return `Remove plugin ${o.pluginId} and its saved state; output properties remain.`;
  case 'rainfall':return `Zone ${o.tileId}: ${o.mmPerDay} mm rain/day`;
  case 'elevation':return `Zone ${o.tileId}: ${o.deltaM>=0?'+':''}${o.deltaM} m elevation`;
  case 'temperature':return `Zone ${o.tileId}: ${o.celsius} °C (${o.mode==='pulse'?'one-time event':'sustained'})`;
  case 'temperature-reset':return `Zone ${o.tileId}: stop sustained temperature; residual heat/cold fades`;
  case 'communication':return `Zone ${o.tileId}: communication ${o.enabled?'connected':'isolated'}`;
  case 'field-transfer':return `Move exactly ${o.amount} ${o.fieldId} from zone ${o.tileId} to adjacent zone ${o.toTileId}; total stock is unchanged.`;
  case 'field-set':return `Zone ${o.tileId}: ${o.fieldId} = ${o.value}`;
  case 'field-define':return `World property: ${o.definition.label} (${o.definition.id}) v${o.definition.version}; ${o.definition.min}–${o.definition.max} ${o.definition.unit}; default ${o.definition.defaultValue}; ${o.definition.quantity==='stock'?'stock resource':'index'}. ${o.definition.description} ${o.transform?`Convert every existing value: old × ${o.transform.scale} + ${o.transform.offset}; ${o.transform.precision==='exact'?'reject precision loss':'round to 0.001'}. `:''}Existing values: ${o.migration==='clamp'?'clamp to new bounds':'preserve, reject if out of bounds'}.`;
  case 'field-remove':return `Remove ${o.fieldId} and its values from every zone.`;
  case 'rule-define':return `${o.rule.label} v${o.rule.version}${o.rule.enabled?'':' (paused)'}: ${describeRule(o.rule)}`;
  case 'rule-remove':return `Remove custom rule ${o.ruleId}; existing property values remain.`;
 }
}
function updateCustomLayers() {
 const select=$<HTMLSelectElement>('custom-layer');select.replaceChildren();select.hidden=!world.definitions.fields.length;
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='World property overlay…';select.append(placeholder);
 for(const field of world.definitions.fields){const option=document.createElement('option');option.value=`custom:${field.id}`;option.textContent=field.label;select.append(option);}
 if(globe.overlay.startsWith('custom:')) {
  if(world.definitions.fields.some(f=>`custom:${f.id}`===globe.overlay)){select.value=globe.overlay;const f=world.definitions.fields.find(f=>`custom:${f.id}`===globe.overlay)!;text('legend',`${f.label} · ${f.min}–${f.max} ${f.unit}`);}
  else {globe.overlay='terrain';text('legend','Terrain · ocean / grassland / forest / alpine');}
 }
}
$('custom-layer').onchange=()=>{const value=$<HTMLSelectElement>('custom-layer').value;if(!value)return;globe.overlay=value as Overlay;globe.update();updateCustomLayers();for(const button of Array.from($('layer-buttons').children))button.classList.remove('active');};
async function reviewProposal(proposal:Proposal) {
 const result=await api<{entityChanges:{total:number;rows:{id:string;before:{summary:string}|null;after:{summary:string}|null;forecast:{summary:string}|null;baseline:{summary:string}|null}[]};appearanceChanges:{total:number;tiles:{tileId:number;before:{label:string;color:string;asset:string;layers:{asset:string;opacity:number}[]};after:{label:string;color:string;asset:string;layers:{asset:string;opacity:number}[]}}[]};pluginMigrations:{id:string;label:string;totalTiles:number;tiles:{tileId:number;before:Record<string,number>;after:Record<string,number>}[]}[];tick:number;baselineError:string|null;baselineTick:number;totalTiles:number;resources:{fieldId:string;label:string;unit:string;baselineUnit:string|null;totalMilli:number;beforeMilli:number|null;baselineMilli:number|null}[];tiles:{properties:{id:string;label:string;unit:string;baselineUnit:string|null;after:number;baseline:number|null}[];id:number;after:World['tiles'][number];baseline:World['tiles'][number];waterMm:number;baselineWaterMm:number}[]}>('proposals/preview',proposal);
 pending=proposal;text('proposal-summary',proposal.summary);
 const container=$('preview-results');container.replaceChildren();
 if(result.baselineError){const note=document.createElement('p');note.className='baseline-error';note.textContent=`The unchanged world could not finish its forecast: ${result.baselineError} Baseline comparisons below use its last successful day (${result.baselineTick}); the proposed world reached day ${result.tick}.`;container.append(note);}
 for(const resource of result.resources??[]){const p=document.createElement('p');p.className='resource-preview';p.textContent=`World total · ${resource.label}: ${resource.totalMilli/1000} ${resource.unit} on day ${result.tick} (${resource.baselineMilli===null?'not previously a stock resource':`${resource.baselineMilli/1000} ${resource.baselineUnit??resource.unit} without this change`}).`;container.append(p);}
 for(const operation of proposal.operations){const p=document.createElement('p');p.textContent=describeOperation(operation);container.append(p);if(operation.kind==='plugin-define'){const details=document.createElement('details'),summary=document.createElement('summary'),code=document.createElement('pre');summary.textContent='Inspect plugin program';code.textContent=JSON.stringify(operation.definition,null,2);details.append(summary,code);container.append(details);}}
 if(result.entityChanges?.total){const block=document.createElement('details'),heading=document.createElement('summary');block.className='entity-preview';heading.textContent=`Entities · ${result.entityChanges.rows.length} of ${result.entityChanges.total} changed`;block.append(heading);for(const e of result.entityChanges.rows){const row=document.createElement('p');row.textContent=`${e.id}: before ${e.before?.summary??'absent'} → Apply ${e.after?.summary??'absent'}. Day +5: ${e.forecast?.summary??'absent'}; without change: ${e.baseline?.summary??'absent'}.`;block.append(row);}container.append(block);}
 if(result.appearanceChanges?.total){const block=document.createElement('details'),heading=document.createElement('summary');block.className='appearance-preview';heading.textContent=`Appearance on Apply · ${result.appearanceChanges.tiles.length} of ${result.appearanceChanges.total} changed zones`;block.append(heading);for(const tile of result.appearanceChanges.tiles){const row=document.createElement('p');row.textContent=`Zone ${tile.tileId}: ${tile.before.label} (${tile.before.color}, ${tile.before.asset}) → ${tile.after.label} (${tile.after.color}, ${tile.after.asset}). Layers: ${tile.before.layers.map(l=>`${l.asset} ${l.opacity}`).join(" → ")||"none"} → ${tile.after.layers.map(l=>`${l.asset} ${l.opacity}`).join(" → ")||"none"}. Artwork follows reveal timing.`;block.append(row);}container.append(block);}
 for(const migration of result.pluginMigrations??[]){
  const block=document.createElement('details'),heading=document.createElement('summary');heading.textContent=`${migration.label}: saved memory on Apply · ${migration.tiles.length} of ${migration.totalTiles} zones`;block.className='state-migration-preview';block.append(heading);
  const describe=(values:Record<string,number>)=>Object.entries(values).map(([key,value])=>`${key}: ${value}`).join(', ')||'no saved keys';
  for(const tile of migration.tiles){const row=document.createElement('p');row.textContent=`Zone ${tile.tileId} · before: ${describe(tile.before)} → on Apply: ${describe(tile.after)}`;block.append(row);}container.append(block);
 }
 if(result.totalTiles>result.tiles.length){const note=document.createElement('p');note.textContent=`Showing ${result.tiles.length} of ${result.totalTiles} potentially affected zones.`;container.append(note);}
 for(const tile of result.tiles){
  const customChanged=tile.properties.some(f=>f.baseline===null||f.after!==f.baseline);
  if(!proposal.operations.some(o=>o.tileId===tile.id)&&Math.abs(tile.waterMm-tile.baselineWaterMm)<0.1&&Math.abs(tile.after.temperatureC-tile.baseline.temperatureC)<0.05&&Math.abs(tile.after.vegetation-tile.baseline.vegetation)<0.001&&!customChanged)continue;
  const p=document.createElement('p');p.textContent=`Day ${result.tick}, zone ${tile.id}: ${tile.waterMm.toFixed(1)} mm water (${tile.baselineWaterMm.toFixed(1)} mm without this change), ${tile.after.temperatureC.toFixed(1)} °C (${tile.baseline.temperatureC.toFixed(1)} °C without this change), ${Math.round(tile.after.vegetation*100)}% vegetation (${Math.round(tile.baseline.vegetation*100)}% without this change), ${tile.after.elevationM} m elevation.`;container.append(p);
  for(const field of tile.properties){const row=document.createElement('p');row.textContent=`${field.label}: ${field.after} ${field.unit} (${field.baseline===null?'not previously defined':`${field.baseline} ${field.baselineUnit??field.unit} without this change`})`;container.append(row);}
 }
 $('proposal').hidden=false;$('apply-proposal').focus();
}
function promptState(id:string|null) {
 promptJobId=id;document.body.classList.toggle('prompt-running',!!id);$('chat-progress').hidden=!id;
 for(const name of ['chat-discuss','chat-propose','chat-export','chat-close','worlds-toggle','play','step','water-explain','rain-change','elevation-change','temperature-change','temperature-reset','communication-change'])$<HTMLButtonElement>(name).disabled=!!id;
 $<HTMLButtonElement>('temperature-reset').disabled=!!id||!world?.rules.some(r=>r.tileId===selected&&r.kind==='temperature');
 $<HTMLTextAreaElement>('chat-message').disabled=!!id;
 $<HTMLInputElement>('chat-import').disabled=!!id||busy;
 $<HTMLButtonElement>('play').disabled=!!id||!$('conversation').hidden;
 $<HTMLButtonElement>('step').disabled=!!id||!$('conversation').hidden;
}
function chatError(e:unknown) {text('chat-error',e instanceof Error?e.message:String(e));$('chat-error').hidden=false;}
function chatRequest(mode:'discuss'|'propose'):PromptRequest {
 if(selected<0)throw Error('Select a tile first');
 const message=$<HTMLTextAreaElement>('chat-message').value.trim();if(!message)throw Error('Write a message first');
 return {id:`request-${requestId()}`,worldId:world.id,expectedRevision:world.revision,tileId:selected,mode,scope:$<HTMLSelectElement>('chat-scope').value as 'tile'|'neighbors'|'world',message};
}
async function loadChat() {
 if(!world||selected<0)return;
 const requestedWorld=world.id,requestedTile=selected;
 text('chat-title',`Zone ${selected}, imagined.`);
 try {
  const [config,jobs]=await Promise.all([api<{provider:string}>('prompts/config'),api<PromptJob[]>('prompts/history')]);
  if(world.id!==requestedWorld||selected!==requestedTile)return;
  text('chat-provider',`${config.provider} · replies only when you ask`);
  $('chat-history').replaceChildren();
  for(const job of jobs.filter(j=>j.request.tileId===selected)) {
   const article=document.createElement('article');article.className='chat-entry';
   const label=document.createElement('small');label.textContent=`${job.request.mode==='discuss'?'DISCUSS':'PROPOSE'} · ${job.request.scope==='world'?'ENTIRE WORLD':job.request.scope==='tile'?'SELECTED TILE':'TILE + NEIGHBORS'}`;
   const user=document.createElement('p');user.className='chat-user';user.textContent=job.request.message;article.append(label,user);
   const reply=document.createElement('p');reply.textContent=job.reply?.message??job.error??(job.status==='awaiting-import'?'Waiting for an imported response.':'Considering this place…');article.append(reply);
   if(job.reply?.assumptions.length){const p=document.createElement('p');p.className='muted';p.textContent='Assumptions: '+job.reply.assumptions.join(' ');article.append(p);}
   if(job.proposal) {
    const applied=world.history.some(h=>h.id===job.proposal!.id);
    if(!applied&&job.proposal.expectedRevision===world.revision){const button=document.createElement('button');button.textContent='Review five-day preview';button.onclick=()=>void action(()=>reviewProposal(job.proposal!));article.append(button);}
    else {const p=document.createElement('p');p.className='muted';p.textContent=applied?'Applied to this world.':'World has changed. Send a new prompt for a current proposal.';article.append(p);}
   }
   if(job.status==='awaiting-import'){const b=document.createElement('button');b.textContent='Use this export for import';b.onclick=()=>{$<HTMLInputElement>('external-request').value=job.request.id;};article.append(b);}
   $('chat-history').append(article);
  }
  const running=jobs.find(j=>j.status==='running');
  if(running&&!promptJobId){promptState(running.request.id);setPlaying(false);schedulePoll();}
  $('chat-history').scrollTop=$('chat-history').scrollHeight;
 }catch(e){chatError(e);}
}
function schedulePoll(){clearTimeout(chatPoll);chatPoll=setTimeout(()=>void pollPrompt(),700);}
async function pollPrompt() {
 const id=promptJobId;if(!id)return;
 try {
  const job=await api<PromptJob>(`prompts/jobs/${id}`);
  if(job.status==='running'){schedulePoll();return;}
  promptState(null);await loadChat();if(job.error)chatError(job.error);
 }catch(e){promptState(null);chatError(e);}
}
async function sendPrompt(mode:'discuss'|'propose') {
 if(promptJobId)return;setPlaying(false);$('chat-error').hidden=true;
 await action(async()=>{
  try {const request=chatRequest(mode),job=await api<PromptJob>('prompts',request);promptState(job.request.id);$<HTMLTextAreaElement>('chat-message').value='';await loadChat();schedulePoll();}catch(e){chatError(e);}
 });
}
$('chat-open').onclick=()=>{setPlaying(false);$('conversation').hidden=false;promptState(promptJobId);document.body.classList.add('chat-open');void loadChat();$<HTMLTextAreaElement>('chat-message').focus();};
$('chat-close').onclick=()=>{$('conversation').hidden=true;promptState(promptJobId);document.body.classList.remove('chat-open');$('chat-open').focus();};
$('chat-form').onsubmit=e=>{e.preventDefault();void sendPrompt('discuss');};
$('chat-propose').onclick=()=>void sendPrompt('propose');
$('chat-cancel').onclick=()=>{if(promptJobId)void api('prompts/cancel',{id:promptJobId}).catch(chatError);};
$('chat-export').onclick=()=>void action(async()=>{
 try {
  $('chat-error').hidden=true;setPlaying(false);const request=chatRequest($<HTMLSelectElement>('external-mode').value as 'discuss'|'propose');
  const bundle=await api<{requestId:string}>('prompts/export',request);$<HTMLInputElement>('external-request').value=bundle.requestId;
  const href=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=href;link.download=`logos-${bundle.requestId}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);await loadChat();
 }catch(e){chatError(e);}
});
$('chat-import').onchange=()=>void action(async()=>{
 try {$('chat-error').hidden=true;const file=$<HTMLInputElement>('chat-import').files?.[0];if(!file)return;if(file.size>32000)throw Error('Response file must be under 32 KB');await api('prompts/import',{requestId:$<HTMLInputElement>('external-request').value,reply:JSON.parse(await file.text())});await loadChat();document.querySelector<HTMLDetailsElement>('.external-exchange')!.open=false;$('conversation').scrollTop=0;}catch(e){chatError(e);}finally{$<HTMLInputElement>('chat-import').value='';}
});
try {token=(await api<{token:string}>('session')).token;setWorld(await api<World>('world'));}catch(e){error(e);text('save-status','Could not open world');}
