import { createWorld } from '../../../packages/worldgen/src/index.js';
import { advance } from '../../../packages/engine/src/index.js';
import { defaultStore, stateHash } from './store.js';
const [command,id='first-world',arg='1']=process.argv.slice(2);
const store=defaultStore();
if(command==='create') {
  try {await store.load(id);throw Error('World already exists');}
  catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
  const world=createWorld({id,name:id,seed:arg,frequency:8}); await store.save(world);
  console.log(`Created ${id}: ${world.tiles.length} tiles, hash ${stateHash(world)}`);
} else if(command==='step') {
  const ticks=Number(arg); if(!Number.isInteger(ticks)||ticks<1||ticks>1000) throw Error('Use 1–1000 ticks');
  let w=await store.load(id); for(let i=0;i<ticks;i++) w=advance(w); await store.save(w,{kind:'step',days:ticks});
  console.log(`Day ${w.tick}, revision ${w.revision}, hash ${stateHash(w)}`);
} else if(command==='verify-history') {
  console.log(await store.verifyHistory(id,process.argv[4]===undefined?10000:Number(arg)));
} else if(command==='history') {
  console.log(await store.history(id));
} else if(command==='inspect') {
  const w=await store.load(id); console.log({id:w.id,tiles:w.tiles.length,tick:w.tick,revision:w.revision,hash:stateHash(w)});
} else console.log('npm run world -- create <id> <seed> | step <id> <days> | inspect <id> | history <id> | verify-history <id> [max-days]');
