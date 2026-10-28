// Local developer-tool acceptance. Clipboard is stubbed; no OS clipboard/provider writes.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
const base=new URL(process.env.BASE_URL??'http://127.0.0.1:3000');assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href:'playwright');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const output=resolve(process.env.ARTIFACT_DIR??'.output/warp-continuation/controls');await mkdir(output,{recursive:true});const report=[];
async function change(page,name,value){
 const slider=page.getByRole('slider',{name,exact:true});
 await slider.evaluate((input,next)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(next));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await page.waitForFunction(({name,value})=>document.querySelector(`input[aria-label="${name}"]`)?.value===String(value),{name,value});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function litPixels(page){
 await page.getByRole('button',{name:'Close warp controls',exact:true}).click();
 const png=await page.locator('[data-warp-scene] canvas').screenshot();const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});let lit=0;
 for(let i=0;i<data.length;i+=info.channels)if(Math.max(data[i],data[i+1],data[i+2])>40)lit++;
 await page.getByRole('button',{name:'Warp controls',exact:true}).click();
 console.log('Scene lit pixels',lit);
 return lit;
}
try{
 for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:664}]]){
  console.log(name);const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiedWarp=text;}}}));
  try{
   await page.goto(base.href);await page.waitForFunction(()=>document.querySelector('[data-warp-study]')?.dataset.phase==='Attraction');
   const launcher=page.getByRole('button',{name:'Warp controls',exact:true});await launcher.click();const panel=page.getByRole('complementary',{name:'Warp controls'});await panel.waitFor();
   const defaults=await panel.getByRole('slider').evaluateAll(inputs=>Object.fromEntries(inputs.filter(e=>e.getAttribute('aria-label')!=='Sequence progress').map(e=>[e.getAttribute('aria-label'),Number(e.value)])));
   assert.equal(Object.keys(defaults).length,18);await page.screenshot({path:resolve(output,`${name}-panel.png`)});
   await change(page,'Sequence progress',42);await page.waitForFunction(()=>document.querySelector('[data-warp-study]').dataset.phase==='Passage');await change(page,'Ambient speed',0);
   await page.getByRole('checkbox',{name:'Show ring',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Show rays',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Show bloom',exact:true}).uncheck();
   // Canvas screenshots include the page's text overlay. Subtract an all-layers-off
   // baseline instead of treating that fixed typography as rendered light.
   await page.getByRole('checkbox',{name:'Show point',exact:true}).uncheck();const baseline=await litPixels(page);await page.getByRole('checkbox',{name:'Show point',exact:true}).check();
   await change(page,'Point size',.21);const smallPoint=await litPixels(page);await change(page,'Point size',2);const largePoint=await litPixels(page);assert.ok(largePoint-baseline>Math.max(1,smallPoint-baseline)*3,'Point size must affect the live image');
   // Before settlement the filled light deliberately follows Point size, not
   // Ring size. Test the latter while a rim actually forms, with its own baseline.
   await page.getByRole('checkbox',{name:'Show point',exact:true}).uncheck();await change(page,'Point size',defaults['Point size']);
   await change(page,'Sequence progress',63);await page.waitForFunction(()=>document.querySelector('[data-warp-study]').dataset.phase==='Color return');
   const ringBaseline=await litPixels(page);await page.getByRole('checkbox',{name:'Show ring',exact:true}).check();
   await change(page,'Ring size',.21);const smallRing=await litPixels(page);await change(page,'Ring size',2);const largeRing=await litPixels(page);assert.ok(largeRing-ringBaseline>Math.max(1,smallRing-ringBaseline)*3,'Ring size must affect the forming rim in the live image');
   // Scene blur is intentionally restored during settlement; its raw tuning
   // value is asserted in the prelude, where no restoration has started.
   await change(page,'Sequence progress',42);await page.waitForFunction(()=>document.querySelector('[data-warp-study]').dataset.phase==='Passage');
   await change(page,'Scene blur (px)',8);assert.equal(await page.locator('[style*="--warp-blur"]').evaluate(el=>getComputedStyle(el).filter),'blur(8px)');
   await page.screenshot({path:resolve(output,`${name}-tuned.png`)});
   await panel.getByRole('button',{name:'Reset look'}).click();
   const reset=await panel.getByRole('slider').evaluateAll(inputs=>Object.fromEntries(inputs.filter(e=>e.getAttribute('aria-label')!=='Sequence progress').map(e=>[e.getAttribute('aria-label'),Number(e.value)])));
   assert.deepEqual(reset,defaults);assert.equal(await panel.getByRole('checkbox').evaluateAll(inputs=>inputs.every(e=>e.checked)),true);
   await panel.getByRole('button',{name:'Copy settings'}).click();await page.waitForFunction(()=>Boolean(window.__copiedWarp));const copied=JSON.parse(await page.evaluate(()=>window.__copiedWarp));assert.equal(copied.ringScale,defaults['Ring size']);
   await panel.getByRole('button',{name:'Play jump',exact:true}).click();await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="Sequence progress"]')?.value)>43);await panel.getByRole('button',{name:'Stop',exact:true}).click();
   await panel.getByRole('button',{name:'Replay',exact:true}).click();await page.waitForFunction(()=>scrollY<1&&document.querySelector('[data-warp-study]').dataset.phase==='Attraction');
   await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.ok(await launcher.evaluate(e=>e===document.activeElement));
   await launcher.click();const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1);
   const pageY=await page.evaluate(()=>scrollY);await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.wheel(0,600);await page.waitForFunction(()=>document.querySelector('aside[aria-label="Warp controls"]').scrollTop>0);assert.equal(await page.evaluate(()=>scrollY),pageY);
   assert.deepEqual(errors,[]);report.push({name,defaults,baseline,smallPoint,largePoint,ringBaseline,smallRing,largeRing,blur:'live',reset:'matches latest defaults',transport:'seek/play/stop/replay',panelScroll:'does not move page',errors});
  }finally{await context.close();}
 }
}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
