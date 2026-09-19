import './style.css';
import { WorldGlobe } from './globe.js';
import { appearance, type Overlay } from '../../../packages/globe/src/appearance.js';
import type { World, Operation, Proposal } from '../../../packages/contracts/src/index.js';
// getRandomValues also works on ordinary LAN HTTP, unlike randomUUID.
function requestId():string {
 return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let token='',world:World,selected=-1,busy=false,playing=false,pending:Proposal|null=null,timer:ReturnType<typeof setTimeout>|undefined;
const globe=new WorldGlobe($<HTMLCanvasElement>('globe'),selectTile);
const fmt=(n:number)=>Math.round(n).toLocaleString();
const text=(id:string,value:string)=>{$(id).textContent=value;};
function error(e:unknown) {text('toast',e instanceof Error?e.message:String(e));$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true;},6500);}
async function api<T>(path:string,body?:unknown):Promise<T> {
 const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw Error(data.error??'Request failed');return data;
}
function setPlaying(value:boolean) {
 playing=value;clearTimeout(timer);text('play',value?'Ⅱ Pause time':'▶ Let time flow');
 if(value)timer=setTimeout(tick,Number($<HTMLSelectElement>('speed').value));
}
async function action(fn:()=>Promise<void>) {
 if(busy)return;busy=true;document.body.classList.add('busy');
 try {await fn();}catch(e){setPlaying(false);error(e);try{setWorld(await api<World>('world'));}catch{}}
 finally{busy=false;document.body.classList.remove('busy');}
}
function setWorld(value:World) {const changed=world?.id!==value.id;world=value;if(changed)selected=-1;globe.setWorld(world);selectTile(selected);text('world-name',world.name);text('day',`DAY ${world.tick}`);text('save-status',`Saved locally · ${fmt(world.tiles.length)} places`);}
function selectTile(id:number) {
 selected=id;globe.select(id);const t=world?.tiles[id];$('creator').hidden=!t;
 if(!t) {text('tile-title','Choose a place.');text('tile-subtitle','Select a tile to inspect its terrain, water, and possibilities.');$('tile-details').replaceChildren();return;}
 text('tile-title',appearance(world,t).label);text('tile-subtitle',`ZONE ${String(id).padStart(4,'0')} · ${world.cells[id].neighbors.length} neighbors`);
 const entries=[['Elevation',`${fmt(t.elevationM)} m`],['Standing water',`${(t.waterL/world.cells[id].areaM2).toFixed(1)} mm`],['Rainfall today',`${t.rainMm} mm`],['Temperature',`${t.temperatureC} °C`],['Vegetation',`${Math.round(t.vegetation*100)}%`],['Communication',t.communication?'Connected':'Isolated']];
 const container=$('tile-details');container.replaceChildren();
 for(const [label,value] of entries){const row=document.createElement('div');row.className='stat';const k=document.createElement('span');k.textContent=label;const v=document.createElement('strong');v.textContent=value;row.append(k,v);container.append(row);}
 const rule=world.rules.find(r=>r.tileId===id);if(rule){const p=document.createElement('p');p.className='rule-note';p.textContent=`Recurring rule: ${rule.mmPerDay} mm of rain / day`;container.append(p);}
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
  const result=await api<{tick:number;tiles:{before:World['tiles'][number];after:World['tiles'][number]}[]}>('proposals/preview',proposal);
  pending=proposal;text('proposal-summary',summary);
  const after=result.tiles[0].after;text('preview-results',`After 5 days: ${after.elevationM} m elevation · ${(after.waterL/world.cells[after.id].areaM2).toFixed(1)} mm standing water · ${after.rainMm} mm daily rain. Neighboring runoff may also change.`);
  $('proposal').hidden=false;$('apply-proposal').focus();
 });
}
$('play').onclick=()=>setPlaying(!playing);$('step').onclick=()=>{setPlaying(false);void tick();};
$('spin').onclick=()=>{globe.spinning=!globe.spinning;text('spin',globe.spinning?'Pause rotation':'Resume rotation');};
text('spin',globe.spinning?'Pause rotation':'Resume rotation');
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
window.addEventListener('pagehide',()=>setPlaying(false));
$('rain-change').onclick=()=>void propose({kind:'rainfall',tileId:selected,mmPerDay:Number($<HTMLInputElement>('rain').value)},`Set zone ${selected} rainfall to ${$<HTMLInputElement>('rain').value} mm every day.`);
$('elevation-change').onclick=()=>void propose({kind:'elevation',tileId:selected,deltaM:Number($<HTMLInputElement>('elevation').value)},`Change zone ${selected} elevation by ${$<HTMLInputElement>('elevation').value} metres.`);
$('communication-change').onclick=()=>void propose({kind:'communication',tileId:selected,enabled:!world.tiles[selected].communication},`${world.tiles[selected].communication?'Disable':'Restore'} communication for zone ${selected}. Physical runoff is unaffected. Knowledge transfer is not yet simulated.`);
$('cancel-proposal').onclick=()=>{pending=null;$('proposal').hidden=true;$('rain-change').focus();};
$('apply-proposal').onclick=()=>void action(async()=>{if(!pending)return;setWorld(await api<World>('proposals/apply',pending));pending=null;$('proposal').hidden=true;$('rain-change').focus();});
$('proposal').addEventListener('keydown',e=>{if(e.key==='Escape')$('cancel-proposal').click();if(e.key==='Tab'){const first=$('cancel-proposal'),last=$('apply-proposal');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
const layers:{id:Overlay;label:string;legend:string}[]=[{id:'terrain',label:'Terrain',legend:'Ocean / grassland / forest / alpine'},{id:'water',label:'Water',legend:'Dry land / retained water / flooding above 100 mm'},{id:'rain',label:'Rainfall',legend:'Dark → light · 0–100+ mm per day'},{id:'temperature',label:'Temperature',legend:'Blue → red · −30 to 35 °C'},{id:'communication',label:'Connections',legend:'Green: connected · amber: isolated'}];
for(const l of layers){const b=document.createElement('button');b.textContent=l.label;b.classList.toggle('active',l.id==='terrain');b.onclick=()=>{globe.overlay=l.id;globe.update();text('legend',l.legend);for(const x of Array.from($('layer-buttons').children))x.classList.toggle('active',x===b);};$('layer-buttons').append(b);}
$('worlds-toggle').onclick=()=>void action(async()=>{
 setPlaying(false);$('worlds').hidden=!$('worlds').hidden;if($('worlds').hidden)return;
 const worlds=await api<{id:string;name:string;tick:number}[]>('worlds');$('world-list').replaceChildren();
 for(const w of worlds){const b=document.createElement('button');b.textContent=`${w.name} · day ${w.tick}`;b.onclick=()=>void action(async()=>{setWorld(await api<World>('worlds/open',{id:w.id}));$('worlds').hidden=true;});$('world-list').append(b);}
});
$('new-world').onsubmit=e=>{e.preventDefault();void action(async()=>{setWorld(await api<World>('worlds/create',{id:`world-${requestId()}`,name:$<HTMLInputElement>('new-name').value,seed:$<HTMLInputElement>('new-seed').value,frequency:12}));$('worlds').hidden=true;});};
try {token=(await api<{token:string}>('session')).token;setWorld(await api<World>('world'));}catch(e){error(e);text('save-status','Could not open world');}
