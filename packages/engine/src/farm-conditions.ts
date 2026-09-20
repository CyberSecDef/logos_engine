import {waterFarmingPermille} from './water-quality.js';
import type {World} from '../../contracts/src/index.js';
import {fertilityPermille} from './ecology.js';

export function farmConditions(world:World,id:number){
 const tile=world.tiles[id];
  const waterMm=tile.waterL/world.cells[tile.id].areaM2,temp=tile.temperatureC,land=tile.elevationM>0,flooded=waterMm>100;
  const temperaturePermille=Math.max(0,Math.min(1000,Math.floor(temp<10?temp*100:temp<=30?1000:(45-temp)*1000/15)));
  const moisturePermille=Math.max(0,Math.min(1000,Math.floor((tile.rainMm+Math.min(20,waterMm))*200)));
 return {waterQualityPermille:waterFarmingPermille(world,id),land,flooded,temperaturePermille,moisturePermille,fertility:fertilityPermille(world,id)};
}
