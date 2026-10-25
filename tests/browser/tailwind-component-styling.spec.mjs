// Local presentation-only smoke test. All API and external requests are blocked.
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cn } from "cn";
const base = new URL(process.env.BASE_URL ?? "http://localhost:3217");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const artifacts = resolve("/tmp/sphmrs-tailwind-components");
await mkdir(artifacts, { recursive: true });
const runs = [];
const controls = await readFile(new URL("../../components/member-auth/account-controls.tsx", import.meta.url), "utf8");
const controlClasses = [...controls.matchAll(/className=\{cn\(\s*"([^"]+)"/g)].map(match => match[1]);
const oldPrimary = controlClasses[0] + " border-neutral-100 bg-neutral-100 text-neutral-950 hover:bg-white";
const newPrimary = cn(controlClasses[0], controlClasses[1]);
async function settle(page) {
  await page.evaluate(async () => {
    const start = performance.now(); let last = ""; let stable = 0;
    while (performance.now() - start < 3000 && stable < 12) {
      await new Promise(requestAnimationFrame);
      const r = document.querySelector("[data-verification-sheet]")?.getBoundingClientRect();
      const next = r ? [r.x, r.y, r.width, r.height].map(n => Math.round(n * 10)).join() : "none";
      stable = next === last ? stable + 1 : 0; last = next;
    }
  });
}
try {
  for (const viewport of [{width:1280,height:900},{width:390,height:844},{width:319,height:560}]) {
    const context = await browser.newContext({viewport});
    const errors = []; const apiCalls = [];
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
        if (url.pathname.startsWith("/api/")) apiCalls.push(url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
    await page.goto(new URL("/studies/verification",base).href);
    const sheet = page.locator("[data-verification-sheet]");
    await page.getByRole("button", {name:"로그인",exact:true}).click();
    await page.getByRole("textbox", {name:"이메일 주소",exact:true}).waitFor();
    await settle(page);
    const login = await page.screenshot({path:resolve(artifacts,`login-${viewport.width}.png`)});
    assert.ok(login.length > 1000);
    assert.equal(await sheet.evaluate(el=>el.scrollWidth <= el.clientWidth + 1),true);
    assert.equal(await page.locator("[data-brand-mark]").last().evaluate(el=>getComputedStyle(el).fontFamily.startsWith("Helvetica")),true);
    await page.getByRole("button", {name:"취소",exact:true}).click();
    await page.locator("[data-authentication-entry]").waitFor(); await settle(page);
    await page.screenshot({path:resolve(artifacts,`chooser-${viewport.width}.png`)});
    await page.getByRole("button", {name:"회원가입",exact:true}).click();
    await page.locator("#pv-phone").waitFor(); await settle(page);
    await page.screenshot({path:resolve(artifacts,`signup-${viewport.width}.png`)});
    assert.equal(await sheet.evaluate(el=>el.scrollWidth <= el.clientWidth + 1),true);
    // Compare pre-refactor cascade with the component's merged classes. In
    // particular, cn must not accidentally turn the old dark border white.
    const primaryStyles = await page.evaluate(({oldPrimary,newPrimary}) => {
      const styles = [];
      for (const className of [oldPrimary,newPrimary]) {
        const button = document.createElement("button");
        button.className = className; button.hidden = true; document.body.append(button);
        const style = getComputedStyle(button);
        styles.push({border:style.borderColor,background:style.backgroundColor,color:style.color});
        button.remove();
      }
      return styles;
    },{oldPrimary,newPrimary});
    assert.deepEqual(primaryStyles[0],primaryStyles[1],"Primary account control changed computed colors");
    assert.deepEqual(errors,[]); assert.deepEqual(apiCalls,[]);
    runs.push({viewport,result:"PASS",states:["chooser","login","signup entry"],apiCalls});
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  await page.goto(base.href); await page.getByRole("heading", {level:1}).first().waitFor();
  await page.waitForFunction(() => {
    const heading = document.querySelector("h1");
    return heading && heading.getBoundingClientRect().top < 100 && getComputedStyle(heading).opacity === "1";
  });
  await page.screenshot({path:resolve(artifacts,"teaser-desktop.png")});
  await context.close();
  await writeFile(resolve(artifacts,"results.json"),JSON.stringify({scope:"Styling-only regression smoke; existing tall-scrolled reverse issue and Back/Cancel redesign not assessed",runs},null,2));
  console.log(JSON.stringify(runs,null,2));
} finally {await browser.close();}
