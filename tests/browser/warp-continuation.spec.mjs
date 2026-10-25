// Local full-page continuation acceptance; no external services or submissions.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const base=new URL(process.env.BASE_URL??'http://127.0.0.1:3000');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href:'playwright');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const output=resolve(process.env.ARTIFACT_DIR??'.output/warp-continuation/browser');
await mkdir(output,{recursive:true});const report=[];
try{
 for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:664}],['tablet',{width:768,height:1024}]]){
  console.log(name);const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===base.origin&&!url.pathname.startsWith('/api/')?route.continue():route.abort();});
  try{
   await page.goto(base.href);await page.waitForFunction(()=>document.querySelector('[data-warp-study]')?.dataset.phase==='Attraction');
   assert.equal(await page.locator('main').count(),1);
   assert.deepEqual(await page.locator('section[id]').evaluateAll(es=>es.map(e=>e.id)),['hero','origin','how','strategy','people','contacts']);
   for(const id of ['how','strategy','people','contacts']){
    const section=page.locator(`#${id}`);await section.scrollIntoViewIfNeeded();
    const box=await section.boundingBox();assert.ok(box.width>=viewport.width-1,`${id} must span viewport`);
   }
   await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   await page.locator('#contacts canvas').waitFor();
   const footer=page.locator('#contacts footer');await footer.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#contacts footer').getBoundingClientRect().bottom<=innerHeight+1);
   // Capture the settled invitation, not the first partially blurred text frame.
   await page.waitForFunction(()=>[...document.querySelectorAll('#invitation-heading .blur-word')].every(word=>getComputedStyle(word).filter==='blur(0px)'));
   assert.ok(await page.getByRole('link',{name:'Back to the beginning'}).isVisible());
   await page.screenshot({path:resolve(output,`${name}-footer.png`)});
   const trigger=page.getByRole('button',{name:/The first invitation/});await trigger.click();
   const dialog=page.getByRole('dialog',{name:'The first invitation'});await dialog.waitFor();
   const lockedY=await page.evaluate(()=>scrollY);
   await page.mouse.wheel(0,500);
   assert.equal(await page.evaluate(()=>scrollY),lockedY,'modal must lock page scroll');
   await page.screenshot({path:resolve(output,`${name}-invitation.png`)});
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   assert.ok(await trigger.evaluate(e=>document.activeElement===e));
   await trigger.click();await dialog.getByRole('button',{name:'Close invitation'}).click();await dialog.waitFor({state:'hidden'});
   assert.ok(await trigger.evaluate(e=>document.activeElement===e));
   await page.getByRole('link',{name:'Back to the beginning'}).click();await page.waitForFunction(()=>scrollY<1);
   await page.waitForFunction(()=>document.querySelector('[data-warp-study]').dataset.phase==='Attraction');
   assert.equal(await page.locator('section[aria-label="Entry sequence"] h2').count(),2);
   assert.deepEqual(errors,[]);
   report.push({name,sections:'all six once',footer:'visible',dialog:'opens/closes/locks/restores focus',backToBeginning:'warp zero',errors});
  }finally{await context.close();}
 }
}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
