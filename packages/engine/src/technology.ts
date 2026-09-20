import type {World,Operation} from '../../contracts/src/index.js';
export function validateTechnology(w:World):void {
 const tech=w.technology;
 if(!tech){if(w.tiles.some(t=>t.research))throw Error('Research requires technology activation');return;}
 const definitions=new Map(tech.definitions.map(d=>[d.id,d]));if(definitions.size!==tech.definitions.length)throw Error('Duplicate technology definition');
 for(const t of w.tiles){const r=t.research;if(!r)continue;const ids=new Set<string>();for(const p of r.projects){const d=definitions.get(p.technologyId);if(!d||ids.has(p.technologyId)||p.progress>d.workRequired||(p.completedTick!==undefined)!==(p.progress===d.workRequired)||p.completedTick!==undefined&&p.completedTick>w.tick)throw Error('Invalid research progress');ids.add(p.technologyId);}if(r.assignment&&!ids.has(r.assignment.technologyId))throw Error('Unknown research assignment');if(r.lastDay&&(r.lastDay.tick>w.tick||(r.lastDay.knowledgeWork!==undefined)!==(r.lastDay.knowledgeSource!==undefined)||(r.lastDay.workers+(r.lastDay.knowledgeWork??0)!==r.lastDay.progressAdded||r.lastDay.knowledgeWork!==undefined&&(r.lastDay.knowledgeWork>r.lastDay.workers||!tech.exchange||r.lastDay.knowledgeSource===undefined||!w.cells[t.id].neighbors.includes(r.lastDay.knowledgeSource)))))throw Error('Invalid research daily accounting');}
}
export function applyTechnology(w:World,op:Operation):void {
 if(op.kind==='knowledge-configure'){if(!w.technology)throw Error('Activate technology first');if(op.expectedVersion!==w.technology.version)throw Error('Stale technology version');w.technology.exchange={model:'neighbor-knowledge-v1',enabled:op.enabled,bonusPermille:op.bonusPermille};w.technology.version++;return;}
 if(op.kind==='technology-configure'){if(op.expectedVersion!==(w.technology?.version??0))throw Error('Stale technology version');w.technology={model:'local-research-v1',version:op.expectedVersion+1,enabled:op.enabled,settings:{...op.settings},...(w.technology?.exchange?{exchange:{...w.technology.exchange}}:{}),definitions:w.technology?.definitions??[]};return;}
 if(op.kind==='technology-define'){if(!w.technology)throw Error('Activate technology first');if(op.expectedVersion!==w.technology.version)throw Error('Stale technology version');if(w.technology.definitions.some(d=>d.id===op.definition.id))throw Error('Technology definitions are immutable; choose a new ID');w.technology.definitions.push({...op.definition});w.technology.version++;return;}
 if(op.kind==='research-auto'){const r=w.tiles[op.tileId].research;if(r){delete r.assignment;delete r.paused;delete r.lastDay;}return;}
 if(op.kind==='research-pause'){const r=w.tiles[op.tileId].research;if(!w.technology)throw Error('Activate technology first');const state=r??(w.tiles[op.tileId].research={projects:[]});state.paused=true;delete state.assignment;delete state.lastDay;return;}
 if(op.kind!=='research-assign')return;
 if(!w.technology?.definitions.some(d=>d.id===op.technologyId))throw Error('Unknown technology');const t=w.tiles[op.tileId];if(!t.settlement||!t.population||t.elevationM<=0)throw Error('Assign research to a populated land settlement');
 const r=t.research??={projects:[]};let project=r.projects.find(p=>p.technologyId===op.technologyId);if(project?.completedTick!==undefined)throw Error('Technology already learned here');if(!project){project={technologyId:op.technologyId,progress:0};r.projects.push(project);}delete r.paused;r.assignment={automatic:false,technologyId:op.technologyId,workers:op.workers,reserveDays:op.reserveDays};delete r.lastDay;
}
export function farmTechnologyPermille(w:World,id:number):number {
 if(!w.technology?.enabled)return 1000;const completed=new Set(w.tiles[id].research?.projects.filter(p=>p.completedTick!==undefined&&p.completedTick<w.tick).map(p=>p.technologyId));return 1000+Math.min(1000,w.technology.definitions.filter(d=>completed.has(d.id)).reduce((n,d)=>n+d.farmBonusPermille,0));
}
// Runs after visits and contact spread, before farming. Only healthy residents
// physically staying home can research; labor cannot also appear on a farm.
export function advanceResearch(w:World):void {
 if(!w.technology)return;
 // Snapshot only completed prior-day archives; newly learned knowledge cannot
 // move a second hop today, regardless of tile evaluation order.
 const exchange=w.technology.enabled&&w.technology.exchange?.enabled?w.technology.exchange:undefined;
 const known=w.tiles.map(t=>exchange&&t.communication&&t.settlement&&t.population>0&&t.elevationM>0?new Set(t.research?.projects.filter(p=>p.completedTick!==undefined&&p.completedTick<w.tick).map(p=>p.technologyId)):new Set<string>());
 const away=new Map<number,{population:number,ill:number}>();
 if(w.neighborVisits?.enabled&&w.neighborVisits.lastDay?.tick===w.tick)for(const e of w.neighborVisits.lastDay.entries){const v=away.get(e.from)??{population:0,ill:0};v.population+=e.visitors;v.ill+=e.health?.ill??0;away.set(e.from,v);}
 for(const t of w.tiles){
  if(w.technology.enabled&&t.settlement&&t.population&&t.elevationM>0){
   const r=t.research??={projects:[]};
   if(!r.paused&&(!r.assignment||r.assignment.automatic)){
    const current=r.assignment&&r.projects.some(p=>p.technologyId===r.assignment!.technologyId&&p.completedTick===undefined)?w.technology.definitions.find(d=>d.id===r.assignment!.technologyId):undefined;
    const definition=current??[...w.technology.definitions].sort((a,b)=>a.workRequired-b.workRequired||(a.id<b.id?-1:a.id>b.id?1:0)).find(d=>!r.projects.some(p=>p.technologyId===d.id&&p.completedTick!==undefined));
    if(definition&&w.technology.settings.workerPermille>0){
     if(!r.projects.some(p=>p.technologyId===definition.id))r.projects.push({technologyId:definition.id,progress:0});
     r.assignment={automatic:true,technologyId:definition.id,workers:Math.max(1,Math.floor(t.population*w.technology.settings.workerPermille/1000)),reserveDays:w.technology.settings.reserveDays};
    }else delete r.assignment;
   }
  }
  const r=t.research;if(!r)continue;const a=r.assignment,p=r.projects.find(p=>p.technologyId===a?.technologyId),d=w.technology.definitions.find(d=>d.id===a?.technologyId);let workers=0,progressAdded=0,knowledgeWork:number|undefined,knowledgeSource:number|undefined,reason:NonNullable<typeof r.lastDay>['reason']=w.technology.enabled&&!r.paused&&!a?'idle':'paused';
  if(w.technology.enabled&&a&&p&&d){
   if(p.completedTick!==undefined)reason='completed';
   else if(!t.population||!t.settlement)reason='empty';
   else if(t.elevationM<=0||t.waterL/w.cells[t.id].areaM2>100)reason='terrain';
   else if(t.settlement.foodRations<t.population*(a.reserveDays+1))reason='food';
   else{const v=away.get(t.id),ill=w.disease?.enabled?(t.health!.ill-(v?.ill??0)):0,available=Math.max(0,t.population-(v?.population??0)-ill);const source=exchange&&t.communication?[...w.cells[t.id].neighbors].sort((a,b)=>a-b).find(id=>known[id].has(d.id)):undefined;
    const bonus=source!==undefined?exchange!.bonusPermille:0,remaining=d.workRequired-p.progress;
    workers=Math.min(a.workers,available,Math.ceil(remaining*1000/(1000+bonus)));
    progressAdded=Math.min(remaining,workers+Math.floor(workers*bonus/1000));
    if(progressAdded>workers){knowledgeSource=source;knowledgeWork=progressAdded-workers;}
    p.progress+=progressAdded;reason=workers?'working':'workers';if(p.progress===d.workRequired){p.completedTick=w.tick;reason='completed';}}
  }
  r.lastDay={tick:w.tick,workers,progressAdded,...(knowledgeWork!==undefined?{knowledgeWork,knowledgeSource}:{}),reason};
 }
}
export function researchWorkers(w:World,id:number):number {const day=w.tiles[id].research?.lastDay;return w.technology?.enabled&&day?.tick===w.tick?day.workers:0;}
