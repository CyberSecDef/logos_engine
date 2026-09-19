import { WorldGlobe } from './globe.js';
import { appearance, type Overlay } from '../../../packages/globe/src/appearance.js';
import type { PromptJob, PromptRequest } from '../../../packages/contracts/src/prompts.js';
import type { World, Operation, Proposal } from '../../../packages/contracts/src/index.js';
// getRandomValues also works on ordinary LAN HTTP, unlike randomUUID.
function requestId():string {
 return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let token='',world:World,selected=-1,busy=false,playing=false,pending:Proposal|null=null,timer:ReturnType<typeof setTimeout>|undefined;
let promptJobId:string|null=null,chatPoll:ReturnType<typeof setTimeout>|undefined;
const globe=new WorldGlobe($<HTMLCanvasElement>('globe'),selectTile);
const fmt=(n:number)=>Math.round(n).toLocaleString();
const text=(id:string,value:string)=>{$(id).textContent=value;};
function error(e:unknown) {text('toast',e instanceof Error?e.message:String(e));$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true;},6500);}
async function api<T>(path:string,body?:unknown):Promise<T> {
 const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw Error(data.error??'Request failed');return data;
}
function setPlaying(value:boolean) {
 if(value&&(promptJobId||!$('conversation').hidden))return;
 playing=value;clearTimeout(timer);text('play',value?'Ⅱ Pause time':'▶ Let time flow');
 if(value)timer=setTimeout(tick,Number($<HTMLSelectElement>('speed').value));
}
async function action(fn:()=>Promise<void>) {
 if(busy)return;busy=true;document.body.classList.add('busy');$<HTMLInputElement>('chat-import').disabled=true;
 try {await fn();}catch(e){setPlaying(false);error(e);try{setWorld(await api<World>('world'));}catch{}}
 finally{busy=false;document.body.classList.remove('busy');$<HTMLInputElement>('chat-import').disabled=!!promptJobId;}
}
function setWorld(value:World) {const changed=world?.id!==value.id;world=value;if(changed){selected=-1;$('conversation').hidden=true;document.body.classList.remove('chat-open');$('chat-history').replaceChildren();promptState(promptJobId);}globe.setWorld(world);selectTile(selected);text('world-name',world.name);text('day',`DAY ${world.tick}`);text('save-status',`Saved locally · ${fmt(world.tiles.length)} places`);}
function selectTile(id:number) {
 if(promptJobId&&id!==selected)return;
 const changed=id!==selected;selected=id;globe.select(id);
 if(changed&&!$('conversation').hidden)void loadChat();
 const t=world?.tiles[id];$('creator').hidden=!t;
 if(!t) {text('tile-title','Choose a place.');text('tile-subtitle','Select a tile to inspect its terrain, water, and possibilities.');$('tile-details').replaceChildren();return;}
 text('tile-title',appearance(world,t).label);text('tile-subtitle',`ZONE ${String(id).padStart(4,'0')} · ${world.cells[id].neighbors.length} neighbors`);
 const entries=[['Elevation',`${fmt(t.elevationM)} m`],['Standing water',`${(t.waterL/world.cells[id].areaM2).toFixed(1)} mm`],['Rainfall today',`${t.rainMm} mm`],['Temperature',`${t.temperatureC.toFixed(1)} °C`],['Heat / cold anomaly',`${(t.temperatureAnomalyC??0)>=0?'+':''}${(t.temperatureAnomalyC??0).toFixed(1)} °C`],['Vegetation',`${Math.round(t.vegetation*100)}%`],['Communication',t.communication?'Connected':'Isolated']];
 const container=$('tile-details');container.replaceChildren();
 for(const [label,value] of entries){const row=document.createElement('div');row.className='stat';const k=document.createElement('span');k.textContent=label;const v=document.createElement('strong');v.textContent=value;row.append(k,v);container.append(row);}
 for(const rule of world.rules.filter(r=>r.tileId===id)){const p=document.createElement('p');p.className='rule-note';p.textContent=rule.kind==='rainfall'?`Recurring rule: ${rule.mmPerDay} mm of rain / day`:`Sustained temperature: ${rule.celsius} °C`;container.append(p);}
 $<HTMLButtonElement>('temperature-reset').disabled=!!promptJobId||!world.rules.some(r=>r.tileId===id&&r.kind==='temperature');
 const events=world.events.filter(e=>e.tileId===id).slice(-2);for(const e of events){const p=document.createElement('p');p.className='muted';p.textContent=`Day ${e.tick} · ${e.message}`;container.append(p);}
 text('communication-change',t.communication?'Isolate communication':'Restore communication');
}
async function tick() {
 if(!world||document.hidden){setPlaying(false);return;}
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
for(const l of layers){const b=document.createElement('button');b.textContent=l.label;b.classList.toggle('active',l.id==='terrain');b.onclick=()=>{globe.overlay=l.id;globe.update();text('legend',l.legend);for(const x of Array.from($('layer-buttons').children))x.classList.toggle('active',x===b);};$('layer-buttons').append(b);}
$('worlds-toggle').onclick=()=>void action(async()=>{
 setPlaying(false);$('worlds').hidden=!$('worlds').hidden;if($('worlds').hidden)return;
 const worlds=await api<{id:string;name:string;tick:number}[]>('worlds');$('world-list').replaceChildren();
 for(const w of worlds){const b=document.createElement('button');b.textContent=`${w.name} · day ${w.tick}`;b.onclick=()=>void action(async()=>{setWorld(await api<World>('worlds/open',{id:w.id}));$('worlds').hidden=true;});$('world-list').append(b);}
});
$('new-world').onsubmit=e=>{e.preventDefault();void action(async()=>{setWorld(await api<World>('worlds/create',{id:`world-${requestId()}`,name:$<HTMLInputElement>('new-name').value,seed:$<HTMLInputElement>('new-seed').value,frequency:12}));$('worlds').hidden=true;});};
async function reviewProposal(proposal:Proposal) {
 const result=await api<{tick:number;tiles:{id:number;after:World['tiles'][number];baseline:World['tiles'][number];waterMm:number;baselineWaterMm:number}[]}>('proposals/preview',proposal);
 pending=proposal;text('proposal-summary',proposal.summary);
 const container=$('preview-results');container.replaceChildren();
 const operations=document.createElement('p');operations.textContent=proposal.operations.map(o=>o.kind==='rainfall'?`Zone ${o.tileId}: ${o.mmPerDay} mm rain/day`:o.kind==='elevation'?`Zone ${o.tileId}: ${o.deltaM>=0?'+':''}${o.deltaM} m elevation`:o.kind==='temperature'?`Zone ${o.tileId}: ${o.celsius} °C (${o.mode==='pulse'?'one-time event':'sustained'})`:o.kind==='temperature-reset'?`Zone ${o.tileId}: stop sustained temperature; residual heat/cold fades`:`Zone ${o.tileId}: communication ${o.enabled?'connected':'isolated'}`).join(' · ');container.append(operations);
 for(const tile of result.tiles){if(!proposal.operations.some(o=>o.tileId===tile.id)&&Math.abs(tile.waterMm-tile.baselineWaterMm)<0.1&&Math.abs(tile.after.temperatureC-tile.baseline.temperatureC)<0.05&&Math.abs(tile.after.vegetation-tile.baseline.vegetation)<0.001)continue;const p=document.createElement('p');p.textContent=`Day ${result.tick}, zone ${tile.id}: ${tile.waterMm.toFixed(1)} mm water (${tile.baselineWaterMm.toFixed(1)} mm without this change), ${tile.after.temperatureC.toFixed(1)} °C (${tile.baseline.temperatureC.toFixed(1)} °C without this change), ${Math.round(tile.after.vegetation*100)}% vegetation (${Math.round(tile.baseline.vegetation*100)}% without this change), ${tile.after.elevationM} m elevation.`;container.append(p);}
 $('proposal').hidden=false;$('apply-proposal').focus();
}
function promptState(id:string|null) {
 promptJobId=id;document.body.classList.toggle('prompt-running',!!id);$('chat-progress').hidden=!id;
 for(const name of ['chat-discuss','chat-propose','chat-export','chat-close','worlds-toggle','play','step','rain-change','elevation-change','temperature-change','temperature-reset','communication-change'])$<HTMLButtonElement>(name).disabled=!!id;
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
 return {id:`request-${requestId()}`,worldId:world.id,expectedRevision:world.revision,tileId:selected,mode,scope:$<HTMLSelectElement>('chat-scope').value as 'tile'|'neighbors',message};
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
   const label=document.createElement('small');label.textContent=`${job.request.mode==='discuss'?'DISCUSS':'PROPOSE'} · ${job.request.scope==='tile'?'SELECTED TILE':'TILE + NEIGHBORS'}`;
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
