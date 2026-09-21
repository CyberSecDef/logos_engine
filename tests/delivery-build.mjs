import {build} from 'vite';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
const existing=await readdir('dist/web/assets');
let checked=false;
const result=await build({logLevel:'silent',build:{write:false},plugins:[{
 name:'verify-delivery-boundaries',
 transform(code,id){
  // A real application-code change must not invalidate the renderer chunk.
  if(id.endsWith('/apps/web/src/main.ts'))return code+'\nconsole.info("Isolated delivery cache probe");';
 },
 generateBundle(_options,bundle){
  const chunks=Object.values(bundle).filter(value=>value.type==='chunk');
  const modules=chunks.flatMap(chunk=>Object.keys(chunk.modules));
  assert.ok(!modules.some(id=>id.includes('/node_modules/zod/')),'Browser must not include validation runtime');
  assert.ok(!modules.some(id=>/\/contracts\/src\/(technology|conflict)\.ts$/.test(id)),'Browser must import data-only defaults');
  const renderer=chunks.find(chunk=>chunk.fileName.startsWith('assets/three-'));
  assert.ok(renderer);assert.ok(existing.includes(renderer.fileName.split('/').pop()),'Application edit invalidated stable renderer');
  const main=chunks.find(chunk=>chunk.isEntry);
  assert.ok(main);assert.ok(!existing.includes(main.fileName.split('/').pop()),'Probe did not change application asset');
  checked=true;
 }
}]});
assert.ok(result&&checked);
console.log('Delivery build passed: no validation runtime in browser; application edit changes entry hash and preserves renderer hash; probe writes no files.');
