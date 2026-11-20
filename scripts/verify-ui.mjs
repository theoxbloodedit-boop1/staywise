import { chromium as playwright } from 'playwright-core';
import chromium from '@sparticuz/chromium';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { brotliDecompressSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
if (process.platform !== 'linux') throw new Error('This bundled Chromium smoke runner requires Linux. Run it in CI or the workspace.');
const require = createRequire(import.meta.url);
const artifacts = path.resolve('.arena/ui-qa'); await fs.mkdir(artifacts, { recursive: true });
const libraries = await fs.mkdtemp(path.join(os.tmpdir(), 'staywise-ui-libs-'));
const archive = path.join(libraries, 'runtime.tar');
const bundled = path.resolve(path.dirname(require.resolve('@sparticuz/chromium')), '../bin/al2023.tar.br');
await fs.writeFile(archive, brotliDecompressSync(await fs.readFile(bundled)));
execFileSync('tar', ['xf', archive, '-C', libraries]);
process.env.LD_LIBRARY_PATH = `${path.join(libraries, 'lib')}:${process.env.LD_LIBRARY_PATH || ''}`;
const port = 3197;
const env = { ...process.env, PORT: String(port), NODE_ENV: 'development' };
delete env.VERCEL;
const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { cwd: process.cwd(), env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLogs = '';
server.stderr.on('data', chunk => { serverLogs += chunk; });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('UI server startup timed out')), 45000);
    server.stdout.on('data', chunk => { serverLogs += chunk; if (serverLogs.includes('listening on')) { clearTimeout(timeout); resolve(); } });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`UI server exited (${code})`)); });
  });
browser = await playwright.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter(arg => !['--disable-web-security', '--allow-running-insecure-content', '--disable-site-isolation-trials'].includes(arg)), headless: true });
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const org={id:'qa-org',name:'QA workspace — browser fixture',plan_tier:'Starter',default_country:'US'};
const empty={indicators:{totalProperties:0,readyProperties:0,notReadyProperties:0,activeStays:0,upcomingArrivals:0,upcomingDepartures:0,criticalIncidents:0,openIncidents:0,overdueCleaning:0,unresolvedGuestRequests:0},analytics:{categoryBreakdown:[],knowledgeGapsOpen:0,guestInquiryVolume:0},propertyReadinessMatrix:[],dateWindowLabel:'QA fixture — no customer data'};
let variant='empty';
await page.route('**/api/**', async route=>{
 const pathname=new URL(route.request().url()).pathname;
 let payload={};
 if(pathname==='/api/auth/context') payload={authenticated:true,needsOnboarding:false,user:{organizationId:org.id,id:'qa-owner',name:'QA Owner',role:'Organization Owner'},organization:org,organizations:[org],members:[]};
 else if(pathname==='/api/admin/dashboard') payload=variant==='empty'?empty:{...empty,indicators:{...empty.indicators,totalProperties:3,criticalIncidents:2,notReadyProperties:1,overdueCleaning:1}};
 else if(pathname==='/api/properties') payload=[];
 else if(pathname==='/api/auth/configuration') payload={configured:false,missing:['NEON_AUTH_BASE_URL','NEON_AUTH_AUDIENCE']};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
});
const axe=await fs.readFile('node_modules/axe-core/axe.min.js','utf8');
const checks=[];
for(const width of [360,390,768,1024,1440]){
 await page.setViewportSize({width,height:1000});
 await page.goto('http://127.0.0.1:3197/app');
 await page.getByRole('heading',{name:'Your first property. Your clearer day.'}).waitFor();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 checks.push({page:'owner-empty',width,overflow});
 if(width===1440){await page.screenshot({path:'.arena/ui-qa/owner-desktop.png',fullPage:true});await page.addScriptTag({content:axe});const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));checks.push({page:'owner-empty',axe:audit.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length,targets:x.nodes.map(n=>n.target)}))});}
 if(width===390) await page.screenshot({path:'.arena/ui-qa/owner-mobile.png',fullPage:true});
}
await page.setViewportSize({width:390,height:900});const menu=page.getByRole('button',{name:'Open navigation menu'});await menu.click();await page.getByRole('dialog',{name:'Workspace menu'}).waitFor();await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(el=>el===document.activeElement),true);checks.push({page:'mobile-menu',escapeCloses:true,focusRestored:true});
variant='urgent';await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:3197/app');await page.getByRole('heading',{name:'Start with your critical incidents.'}).waitFor();checks.push({page:'owner-urgent',correctPriority:true});
variant='empty';await page.goto('http://127.0.0.1:3197/app');await page.getByRole('button',{name:'Add your first property'}).click();await page.getByRole('button',{name:'Add Property',exact:true}).first().click();await page.getByRole('dialog',{name:'Add New Property'}).waitFor();const initialFocus=await page.evaluate(()=>document.activeElement?.tagName);assert.equal(initialFocus,'INPUT');const modal=page.getByRole('dialog',{name:'Add New Property'});const focusables=modal.locator('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');await focusables.last().focus();await page.keyboard.press('Tab');assert.equal(await focusables.first().evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Shift+Tab');assert.equal(await focusables.last().evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Add New Property'}).waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Add Property',exact:true}).first().evaluate(el=>el===document.activeElement),true);checks.push({page:'property-modal',initialFocus,escapeCloses:true,tabTrap:true,focusRestored:true});
for(const width of [360,768,1440]){await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:3197/');await page.getByRole('heading',{level:1}).waitFor();checks.push({page:'public-home',width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});if(width===1440){await page.screenshot({path:'.arena/ui-qa/home-desktop.png',fullPage:true});await page.addScriptTag({content:axe});const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));checks.push({page:'public-home',axe:audit.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length,targets:x.nodes.map(n=>n.target)}))});}}
for (const width of [360, 768, 1440]) {
  await page.setViewportSize({width,height:1000});
  await page.goto('http://127.0.0.1:3197/auth');
  await page.getByRole('heading',{name:'Welcome back'}).waitFor();
  checks.push({page:'auth',width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  if(width===1440){
    await page.addScriptTag({content:axe});
    const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
    checks.push({page:'auth',axe:audit.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length,targets:x.nodes.map(n=>n.target)}))});
  }
}
for (const check of checks) {
  if ('overflow' in check) assert.equal(check.overflow, false, `${check.page} overflows at ${check.width}px`);
  if ('axe' in check) assert.deepEqual(check.axe, [], `${check.page} axe violations`);
}
assert.deepEqual(errors, [], 'Browser runtime errors');
console.log(JSON.stringify({checks,pageErrors:errors},null,2));await fs.writeFile('.arena/ui-qa/results.json',JSON.stringify({checks,pageErrors:errors},null,2));
} finally {
  await browser?.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch {}
  await fs.rm(libraries, { recursive: true, force: true });
}
