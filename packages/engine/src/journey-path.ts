import type {World} from '../../contracts/src/index.js';
export function landJourneyPath(w:World,from:number,to:number):number[]{
 if(from===to||!w.tiles[from]||!w.tiles[to])throw Error('Choose a different existing destination');const open=(id:number)=>w.tiles[id].elevationM>0&&w.tiles[id].travelAllowed!==false;if(!open(from)||!open(to))throw Error('Endpoints must allow travel and be land');
 const queue=[from],parent=new Map<number,number>([[from,-1]]);for(let i=0;i<queue.length;i++)for(const next of [...w.cells[queue[i]].neighbors].sort((a,b)=>a-b)){if(parent.has(next)||!open(next))continue;parent.set(next,queue[i]);if(next===to){const path=[to];while(path.at(-1)!==from)path.push(parent.get(path.at(-1)!)!);path.reverse();if(path.length>65)throw Error('Journey exceeds 64 legs');return path;}queue.push(next);}throw Error('No open land path to destination');
}
