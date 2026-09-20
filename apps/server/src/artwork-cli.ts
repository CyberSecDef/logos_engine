import {readFile,writeFile} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import {z} from 'zod';
import {ArtworkPackSchema,ArtworkSlot} from '../../../packages/contracts/src/artwork.js';import {pngInfo,parseArtwork} from './artwork.js';
const [source,output]=process.argv.slice(2);if(!source||!output)throw Error('Usage: npm run artwork:pack -- source-manifest.json output-pack.json');
const schema=ArtworkPackSchema.omit({images:true}).extend({images:z.array(z.object({slot:ArtworkSlot,file:z.string().min(1)}).strict()).min(1).max(6)});
const input=schema.parse(JSON.parse(await readFile(source,'utf8'))),images:{hash:string;data:string}[]=[],slots:{slot:z.infer<typeof ArtworkSlot>;hash:string}[]=[];
for(const entry of input.images){const data=await readFile(resolve(dirname(resolve(source)),entry.file)),info=pngInfo(data);slots.push({slot:entry.slot,hash:info.hash});if(!images.some(i=>i.hash===info.hash))images.push({hash:info.hash,data:data.toString('base64')});}
const bundle={format:'logos-artwork',version:1,pack:{id:input.id,version:input.version,label:input.label,credit:input.credit,images:slots},images};parseArtwork(bundle);await writeFile(output,JSON.stringify(bundle),{flag:'wx'});console.log(`Wrote ${output}: ${slots.length} slots, ${images.length} images. Import it under Worlds → World artwork, then review activation.`);
