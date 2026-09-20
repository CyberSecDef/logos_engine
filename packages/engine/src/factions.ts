import type {World,Operation} from '../../contracts/src/index.js';
export function validateFactions(w:World):void {
 const data=w.factions;
 if(!data){if(w.tiles.some(t=>t.factionId!==undefined))throw Error('Territory requires a faction registry');return;}
 const ids=new Set(data.definitions.map(f=>f.id));if(ids.size!==data.definitions.length)throw Error('Duplicate faction ID');
 for(const t of w.tiles)if(t.factionId!==undefined&&!ids.has(t.factionId))throw Error('Unknown territory owner');
 const pairs=new Set<string>();for(const r of data.relations){const key=`${r.a}:${r.b}`;if(!ids.has(r.a)||!ids.has(r.b)||r.a>=r.b||pairs.has(key))throw Error('Invalid faction relationship');pairs.add(key);}
}
export function applyFaction(w:World,op:Operation):void {
 if(op.kind==='faction-claim'){
  const t=w.tiles[op.tileId];if(op.factionId===null){delete t.factionId;return;}
  if(!w.factions?.definitions.some(f=>f.id===op.factionId))throw Error('Define the faction before claiming territory');
  if(t.elevationM<=0)throw Error('New territory claims require land above sea level');
  t.factionId=op.factionId;return;
 }
 if(op.kind==='faction-borders-configure'){
  if(!w.factions)throw Error('Define factions before configuring borders');
  if(op.expectedVersion!==w.factions.version)throw Error('Stale faction registry version');
  w.factions.borders={model:'hostile-borders-v1',enabled:op.enabled,travel:op.travel,trade:op.trade,knowledge:op.knowledge};w.factions.version++;return;
 }
 if(op.kind!=='faction-define'&&op.kind!=='faction-remove'&&op.kind!=='faction-relation')return;
 if(op.expectedVersion!==(w.factions?.version??0))throw Error('Stale faction registry version');
 if(op.kind==='faction-define'){
  w.factions??={model:'territory-v1',version:1,definitions:[],relations:[]};
  w.factions.definitions=[...w.factions.definitions.filter(f=>f.id!==op.faction.id),{...op.faction}].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 }else{
  if(!w.factions?.definitions.some(f=>f.id===op.factionId))throw Error('Unknown faction');
  if(op.kind==='faction-remove'){
   if(w.tiles.some(t=>t.factionId===op.factionId))throw Error('Release or reassign all territory before removing a faction');
   w.factions.definitions=w.factions.definitions.filter(f=>f.id!==op.factionId);
   w.factions.relations=w.factions.relations.filter(r=>r.a!==op.factionId&&r.b!==op.factionId);
  }else{
   if(op.factionId===op.otherFactionId||!w.factions.definitions.some(f=>f.id===op.otherFactionId))throw Error('Choose two distinct existing factions');
   const [a,b]=[op.factionId,op.otherFactionId].sort();
   w.factions.relations=w.factions.relations.filter(r=>r.a!==a||r.b!==b);
   if(op.relationship!=='neutral')w.factions.relations.push({a,b,relationship:op.relationship});
   w.factions.relations.sort((x,y)=>x.a<y.a?-1:x.a>y.a?1:x.b<y.b?-1:x.b>y.b?1:0);
  }
 }
 w.factions!.version=op.expectedVersion+1;
}
export function factionSummary(w:World){return w.factions?.definitions.map(f=>({...f,zones:w.tiles.filter(t=>t.factionId===f.id).length,residents:w.tiles.filter(t=>t.factionId===f.id).reduce((n,t)=>n+t.population,0)}))??[];}

// Territorial edge policy, not personal allegiance. Physical transport and generic
// custom transfers do not call this gate. Missing policy preserves legacy replay.
export function factionBorderOpen(w:World,from:number,to:number,channel:'travel'|'trade'|'knowledge'):boolean {
 const policy=w.factions?.borders;if(!policy?.enabled||!policy[channel])return true;
 const a=w.tiles[from].factionId,b=w.tiles[to].factionId;if(!a||!b||a===b)return true;
 return !w.factions!.relations.some(r=>r.relationship==='hostile'&&(r.a===a&&r.b===b||r.a===b&&r.b===a));
}
export function factionBorderSummary(w:World,tileId:number){return w.cells[tileId].neighbors.map(to=>({to,travel:factionBorderOpen(w,tileId,to,'travel'),trade:factionBorderOpen(w,tileId,to,'trade'),knowledge:factionBorderOpen(w,tileId,to,'knowledge')}));}
