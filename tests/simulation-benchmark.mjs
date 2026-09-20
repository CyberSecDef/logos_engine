import assert from 'node:assert/strict';
import {cpus} from 'node:os';
import {combinedWorld,measuredStep} from '../dist/tests/fixtures/phase5.js';
import {stateHash} from '../dist/apps/server/src/store.js';
import {journeyTotals} from '../dist/packages/engine/src/journeys.js';
import {forecast} from '../dist/apps/server/src/prompts.js';

// Fixed bounded cases: no CLI-supplied workloads, live saves or provider calls.
const reports=[];
const expectedHashes=new Map([[3,'980e1333c51971051baaed3ecff2569b2549d0281da20e87f16b3c13a4318678'],[12,'53990b46e186b05c45a7d188a24ba25cbcc2e551b722a146e172c878de85bc61'],[26,'be4202090014fb2b37702fdbbe7ae6be66ba30c9b757f949dbadc7051a2fa9cb']]);
for(const [frequency,days] of [[3,1000],[12,200],[26,30]]){
 let w=combinedWorld(frequency),replay=structuredClone(w);const samples=[],totals={births:0,starvation:0,transitLosses:0,combatLosses:0,battles:0};
 for(let day=0;day<days;day++){
  const step=measuredStep(w);w=step.world;samples.push(step.elapsedMs);
  for(const key of Object.keys(totals))totals[key]+=step[key];
  replay=measuredStep(replay).world;assert.equal(stateHash(w),stateHash(replay));
 }
 assert.ok(totals.battles>0);assert.ok(w.tiles.some(t=>t.research?.projects.some(p=>p.completedTick!==undefined)));
 const hash=stateHash(w);assert.equal(hash,expectedHashes.get(frequency),'Frozen Phase 5 acceptance replay');const started=performance.now();forecast(w,{id:'benchmark-preview',worldId:w.id,expectedRevision:w.revision,summary:'Temperature preview',operations:[{kind:'temperature',tileId:0,celsius:40,mode:'pulse'}]});const forecastMs=performance.now()-started;
 assert.equal(stateHash(w),hash);samples.sort((a,b)=>a-b);
 const percentile=p=>Math.round(samples[Math.min(samples.length-1,Math.ceil(samples.length*p)-1)]*100)/100;
 const report={frequency,zones:w.tiles.length,settlements:24,days,...totals,finalPopulation:journeyTotals(w).population,finalFood:journeyTotals(w).foodRationsTotal,tickMs:{median:percentile(.5),p95:percentile(.95),max:percentile(1)},forecastMs:Math.round(forecastMs),serializedBytes:Buffer.byteLength(JSON.stringify(w)),stateHash:hash};
 reports.push(report);console.error(`Verified ${days} days / ${w.tiles.length} zones; p95 ${report.tickMs.p95} ms; forecast ${report.forecastMs} ms`);
}
console.log(JSON.stringify({node:process.version,cpu:cpus()[0]?.model,measuredAt:new Date().toISOString(),notes:'Engine-only timings include validation; exclude fixture creation, hash checks, persistence, network and rendering. Cold samples retained; no hardware-dependent pass threshold.',reports},null,2));
