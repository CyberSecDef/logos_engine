import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../dist/apps/server/src/index.js';

const root=await mkdtemp(join(tmpdir(),'logos-cache-test-'));
let first,second,browser;
try {
 first=await startServer({root:join(root,'first'),port:0,dev:true});
 const url=app=>`http://127.0.0.1:${app.server.address().port}`;
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();
 const failures=[];let firstDependency='';
 page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);if(r.url().includes('/three.js?'))firstDependency=r.url();});
 await page.goto(url(first));
 await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent?.includes('Saved locally'));
 assert.ok(firstDependency,'Three.js optimized dependency was loaded');
 assert.equal(await page.locator('header').evaluate(e=>getComputedStyle(e).position),'fixed');
 second=await startServer({root:join(root,'second'),port:0,dev:true});
 const other=await browser.newPage();let secondDependency='';
 other.on('response',r=>{if(r.url().includes('/three.js?'))secondDependency=r.url();});
 await other.goto(url(second));
 await other.waitForFunction(()=>document.querySelector('#save-status')?.textContent?.includes('Saved locally'));
 assert.notEqual(new URL(firstDependency).pathname,new URL(secondDependency).pathname,'Concurrent servers must use separate cache paths');
 await other.close();await second.close();second=undefined;
 assert.equal((await fetch(firstDependency)).status,200,'Original dependency survives other server shutdown');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent?.includes('Saved locally'));
 assert.deepEqual(failures,[]);
 const cssOnly=await browser.newPage();
 await cssOnly.route('**/src/main.ts',route=>route.abort());
 await cssOnly.goto(url(first));
 assert.equal(await cssOnly.locator('header').evaluate(e=>getComputedStyle(e).position),'fixed','CSS loads even when application JavaScript fails');
 console.log('Cache regression passed: concurrent Vite instances, dependency survives shutdown/reload, CSS independent of JS.');
} finally {
 await browser?.close();await second?.close();await first?.close();await rm(root,{recursive:true,force:true});
}
