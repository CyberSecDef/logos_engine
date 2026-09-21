import {chromium,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {combinedWorld} from '../dist/tests/fixtures/phase5.js';
import {WorldStore,stateHash} from '../dist/apps/server/src/store.js';
import {startServer} from '../dist/apps/server/src/index.js';
const engine=process.env.LOGOS_BROWSER??'chromium';
assert.ok(['chromium','webkit'].includes(engine));
const root=await mkdtemp(join(tmpdir(),'logos-audit-')),store=new WorldStore(root),world=combinedWorld(2);await store.save(world);await store.selectWorld(world.id);await store.checkpoint(world,'Audit checkpoint');
const before=stateHash(await store.load(world.id));let calls=0;
const app=await startServer({root,host:'127.0.0.1',port:0,provider:{name:'No model',async generate(){calls++;throw Error('Unexpected model');}}});
let browser;
try {
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],reports=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+app.server.address().port);await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Saved locally'));
 const audit=async name=>{
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const map=r=>({id:r.id,impact:r.impact,nodes:r.nodes.map(n=>({target:n.target,summary:n.failureSummary}))});
  reports.push({name,violations:results.violations.map(map),incomplete:results.incomplete.map(map)});
  console.error(name+': '+results.violations.map(v=>v.id+' ('+v.nodes.length+')').join(', '));
 };
 await audit('desktop overview');
 await page.locator('#zone-number').fill('0');await page.locator('#zone-navigation button').click();
 // Every creator section should have named inputs, even when not expanded by default.
 await page.locator('#creator > details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 await audit('desktop all inspector sections');
 await page.locator('#temperature-change').click();await page.locator('#proposal').waitFor({state:'visible'});
 await audit('proposal dialog');await page.keyboard.press('Escape');await page.locator('#proposal').waitFor({state:'hidden'});
 await page.locator('#chat-open').click();await audit('conversation');await page.locator('#chat-close').click();
 await page.locator('#worlds-toggle').click();await audit('world management');
 await page.getByRole('button',{name:'Review restore',exact:true}).click();await page.locator('#world-review').waitFor({state:'visible'});await audit('world review dialog');await page.keyboard.press('Escape');
 await page.locator('#worlds-toggle').click();
 await page.setViewportSize({width:390,height:844});await page.locator('#panel-zone').click();await audit('mobile inspector');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#panel-layers').click();await audit('mobile layers');
 await page.locator('#panel-globe').click();await audit('mobile globe');
 await mkdir('.local/screenshots',{recursive:true});
 await page.screenshot({path:'.local/screenshots/audit-'+engine+'-mobile.png'});
 await writeFile('.local/audit-'+engine+'.json',JSON.stringify({engine,version:browser.version(),reports,errors},null,2));
 assert.deepEqual(errors,[]);assert.equal(calls,0);assert.equal(stateHash(await store.load(world.id)),before);
 assert.deepEqual(reports.flatMap(r=>[...r.violations,...r.incomplete].map(v=>({view:r.name,...v}))),[]);
 console.log(engine+' accessibility audit completed; report .local/audit-'+engine+'.json');
}finally{await browser?.close();await app.close();await rm(root,{recursive:true,force:true});}
