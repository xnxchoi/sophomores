// Local disconnected-preview acceptance. API/provider calls are blocked and the
// clipboard is stubbed: no message, verification, or OS clipboard write occurs.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3000");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : "playwright");
const output = resolve(process.env.ARTIFACT_DIR ?? ".output/warp-continuation/challenge");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 664 }]]) {
    const context = await browser.newContext({ viewport });
    const blocked = [];
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
        blocked.push(url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    await context.addInitScript(() => {
      window.__challengeCopies = [];
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async value => window.__challengeCopies.push(value) } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(new URL("/studies/verification", base).href);
      await page.getByRole("combobox").selectOption("en");
      await page.getByRole("button", { name: "Sign up", exact: true }).click();
      await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("01012345678");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      const card = page.getByRole("dialog").locator("code");
      await card.first().waitFor();
      const values = await card.allTextContents();
      assert.equal(values.length, 2);
      assert.ok(values.every(value => value.trim().length > 0));
      for (const [index, label] of ["Copy recipient", "Copy code"].entries()) {
        const action = page.getByRole("button", { name: label, exact: true });
        await action.click();
        await page.waitForFunction(({ index, value }) => window.__challengeCopies[index] === value, { index, value: values[index] });
        const size = await action.boundingBox();
        assert.ok(size.width >= 44 && size.height >= 44);
        assert.equal(await action.evaluate(element => getComputedStyle(element).color), "rgb(255, 255, 255)");
      }
      assert.equal(await page.getByRole("dialog").evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
      await page.waitForFunction(() => [...document.querySelectorAll("[data-copy-state]")].every(button => button.dataset.copyState === "idle"));
      await card.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(output, `${name}.png`) });
      assert.deepEqual(blocked, []);
      assert.deepEqual(errors, []);
      report.push({ name, visibleValues: 2, distinctCopyActions: 2, exactClipboardValues: true, apiCalls: 0, errors });
    } finally {
      await context.close();
    }
  }
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
