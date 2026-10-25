// Attribute-only warp repair: exercise the user's nested tree without study controls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const base = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3000");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
    : "playwright"
);
const artifacts = resolve(
  process.env.ARTIFACT_DIR ?? ".output/warp-node-repair/browser"
);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"]
});
const report = [];
async function scrollPrelude(page, progress) {
  await page.evaluate((p) => {
    const runway = document.querySelector('[aria-label="Entry sequence"]');
    const top = runway.getBoundingClientRect().top + scrollY;
    window.scrollTo({
      top: top + ((runway.offsetHeight - innerHeight) * p) / 0.7,
      behavior: "instant"
    });
  }, progress);
  await page.waitForFunction((p) => {
    const runway = document.querySelector('[aria-label="Entry sequence"]');
    const actual =
      (-runway.getBoundingClientRect().top /
        (runway.offsetHeight - innerHeight)) *
      0.7;
    return Math.abs(actual - p) < 0.001;
  }, progress);
}
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 664 }],
    ["tablet", { width: 768, height: 1024 }]
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.origin === base.origin && !url.pathname.startsWith("/api/")
        ? route.continue()
        : route.abort();
    });
    try {
      console.log(name);
      await page.goto(base.href);
      await page.waitForFunction(
        () =>
          document.querySelector("[data-warp-study]")?.dataset.phase ===
          "Attraction"
      );
      const opening = await page.evaluate(() => {
        const runway = document.querySelector('[aria-label="Entry sequence"]');
        const group = runway.firstElementChild;
        const letters = [...group.querySelectorAll("[data-warp-char]")];
        const canvas = document.querySelector("canvas");
        return {
          headings: group.querySelectorAll("h2").length,
          total: letters.length,
          visible: letters.filter(
            (e) => Number(getComputedStyle(e).opacity) > 0.99
          ).length,
          left: letters[0].getBoundingClientRect().left,
          right: letters.at(-1).getBoundingClientRect().right,
          runway: runway.offsetHeight,
          heroTop: document.querySelector("#hero").getBoundingClientRect().top,
          canvas: canvas.getBoundingClientRect().toJSON(),
          overflow: document.documentElement.scrollWidth - innerWidth,
          children: [...runway.children].map((e) => e.tagName)
        };
      });
      assert.equal(opening.headings, 2);
      assert.equal(opening.total, opening.visible);
      assert.ok(opening.left >= 0 && opening.right <= viewport.width);
      assert.equal(opening.runway, viewport.height * 5);
      assert.equal(opening.heroTop, viewport.height * 4);
      assert.equal(opening.overflow, 0);
      assert.deepEqual(opening.children, ["DIV", "DIV", "DIV", "DIV"]);
      assert.equal(opening.canvas.width, viewport.width);
      assert.equal(opening.canvas.height, viewport.height);
      assert.equal(await page.locator("[data-warp-controls]").count(), 0);
      await page.screenshot({
        path: resolve(artifacts, `${name}-opening.png`)
      });
      await scrollPrelude(page, 0.42);
      await page.waitForFunction(
        () =>
          Number(
            getComputedStyle(document.querySelector("[data-warp-passage]"))
              .opacity
          ) > 0.99
      );
      const passage = await page.locator("[data-warp-passage]").boundingBox();
      assert.ok(
        passage.y > viewport.height / 2 && passage.y + passage.height < viewport.height
      );
      await page.screenshot({
        path: resolve(artifacts, `${name}-passage.png`)
      });
      await scrollPrelude(page, .47);
      await page.waitForFunction(() => {
        const rect = document.querySelector("[data-warp-passage]").getBoundingClientRect();
        return Math.abs(rect.top + rect.height / 2 - innerHeight / 2) < 2;
      });
      await page.screenshot({ path: resolve(artifacts, `${name}-passage-middle.png`) });
      await scrollPrelude(page, .595);
      await page.waitForFunction(() => document.querySelector("[data-warp-passage]").getBoundingClientRect().top < 0);
      const passageExit = await page.locator("[data-warp-passage]").evaluate(element => ({
        top: element.getBoundingClientRect().top,
        bottom: element.getBoundingClientRect().bottom,
        opacity: Number(getComputedStyle(element).opacity),
      }));
      assert.ok(passageExit.top < 0 && passageExit.bottom > 0);
      assert.equal(passageExit.opacity, 1, "Text must not fade while still crossing the top edge");
      await page.screenshot({ path: resolve(artifacts, `${name}-passage-exit.png`) });
      await scrollPrelude(page, .61);
      await page.waitForFunction(() => document.querySelector("[data-warp-passage]").getBoundingClientRect().bottom < 1);
      await scrollPrelude(page, 0.7);
      await page.waitForFunction(
        () =>
          document.querySelector("[data-warp-study]").dataset.phase === "Corona"
      );
      const arrival = await page.evaluate(() => ({
        heroTop: document.querySelector("#hero").getBoundingClientRect().top,
        canvas: document
          .querySelector("canvas")
          .getBoundingClientRect()
          .toJSON(),
        passageOpacity: Number(
          getComputedStyle(document.querySelector("[data-warp-passage]"))
            .opacity
        ),
        notices: [...document.querySelectorAll(".notification")].map((e) =>
          Number(getComputedStyle(e).opacity)
        )
      }));
      assert.ok(Math.abs(arrival.heroTop) < 2);
      assert.equal(arrival.canvas.top, 0);
      assert.equal(arrival.canvas.height, viewport.height);
      assert.equal(arrival.passageOpacity, 0);
      assert.ok(arrival.notices.every((n) => n === 0));
      await page.screenshot({
        path: resolve(artifacts, `${name}-corona-zero.png`)
      });
      await page.evaluate(() =>
        window.scrollTo({
          top:
            document.querySelector("#hero").getBoundingClientRect().top +
            scrollY +
            innerHeight * 0.8,
          behavior: "instant"
        })
      );
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".notification")].some(
          (e) => Number(getComputedStyle(e).opacity) > 0.95
        )
      );
      await page.screenshot({ path: resolve(artifacts, `${name}-notice.png`) });
      await scrollPrelude(page, 0);
      await page.waitForFunction(
        () =>
          document.querySelector("[data-warp-study]").dataset.phase ===
          "Attraction"
      );
      const reverse = await page
        .locator('section[aria-label="Entry sequence"] h2')
        .evaluateAll((nodes) =>
          nodes.map((e) => Number(getComputedStyle(e).opacity))
        );
      assert.deepEqual(reverse, [1, 1]);
      assert.deepEqual(errors, []);
      report.push({ name, opening, passage, passageExit, arrival, reverse, errors });
    } finally {
      await context.close();
    }
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });
  await page.goto(base.href);
  await page.waitForFunction(
    () =>
      document.querySelector("[data-warp-study]")?.dataset.phase ===
      "Attraction"
  );
  await page.mouse.wheel(0, 900);
  await page.waitForFunction(() => scrollY > 200);
  assert.equal(
    await page.locator("[data-warp-study]").getAttribute("data-phase"),
    "Attraction"
  );
  report.push({ name: "wheel", result: "normal scroll stays in prelude" });
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await fallback.goto(base.href);
  await fallback.getByRole("status").waitFor();
  await fallback.waitForFunction(
    () =>
      document.querySelector("[data-warp-study]")?.dataset.phase ===
      "Attraction"
  );
  assert.equal(
    await fallback.locator('section[aria-label="Entry sequence"] h2').count(),
    2
  );
  report.push({ name: "no-webgl", result: "ready and readable" });
} finally {
  await writeFile(
    resolve(artifacts, "report.json"),
    JSON.stringify(report, null, 2)
  );
  await browser.close();
}
console.log(
  JSON.stringify(report.map(({ name }) => ({ name, status: "PASS" })))
);
