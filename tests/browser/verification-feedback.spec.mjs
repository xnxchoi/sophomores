// Run against an already running, local trial server; never a deployed service.
// PLAYWRIGHT_MODULE may point at an existing Playwright installation's index.mjs.
// BASE_URL=http://localhost:3217 node tests/browser/verification-feedback.spec.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3217");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Local server required");
const moduleName = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(moduleName ? pathToFileURL(resolve(moduleName)).href : "playwright");
const artifactDir = resolve(process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-verification-feedback");
const reportPath = resolve("docs/qa/verification-browser-results.json");
await mkdir(artifactDir, { recursive: true });
const report = {
  startedAt: new Date().toISOString(), baseUrl: base.origin, browser: "Chromium",
  scope: "Fixture-only browser interaction; no provider, mailbox, Messages, or real verification calls",
  repetitions: Number(process.env.REPEAT ?? 3), runs: [], screenshots: [],
  limitations: ["No physical Android/iOS haptics or carrier delivery proof", "Chromium only; not Safari or a physical-device viewport"],
};
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const body = "SPHMRS EXACT 123456";
const recipient = "verify@example.invalid";

class VerificationPage {
  constructor(page) { this.page = page; }
  button(name) { return this.page.getByRole("button", { name, exact: true }); }
  get dialog() { return this.page.getByRole("dialog"); }
  async openEnglish() {
    await this.page.goto(new URL("/studies/verification", base).href);
    await this.dialog.waitFor();
    await this.button("English").click();
    await this.page.getByRole("heading", { name: "Verify your phone", exact: true }).waitFor();
  }
  async start() {
    await this.page.getByRole("textbox", { name: "Phone number", exact: true }).fill("01012345678");
    await this.button("Continue").click();
    await this.page.getByRole("heading", { name: "Send the trial message", exact: true }).waitFor();
    await this.button("Copy code").waitFor();
  }
  async close() {
    await this.button("Close local verification trial").scrollIntoViewIfNeeded();
    await this.button("Close local verification trial").click();
    await this.dialog.waitFor({ state: "hidden" });
    await this.page.waitForFunction(() => document.activeElement?.getAttribute("aria-haspopup") === "dialog");
  }
  async reopen() {
    await this.button("Verify your phone").click();
    await this.page.getByRole("textbox", { name: "Phone number", exact: true }).waitFor();
    assert.equal(await this.page.getByRole("textbox", { name: "Phone number", exact: true }).inputValue(), "");
    assert.equal(await this.page.getByText(body, { exact: true }).count(), 0);
  }
  async feedback(kind, label) {
    await this.page.waitForFunction(({ kind, label }) =>
      Array.from(document.querySelectorAll("button")).some(button => button.getAttribute("aria-label") === `Copy ${kind}` && button.textContent.includes(label)), { kind, label });
  }
  async screenshot(name) {
    const path = resolve(artifactDir, `${name}.png`);
    await this.page.screenshot({ path });
    report.screenshots.push(path);
  }
}

async function shellGeometry(page) {
  const dialog = page.getByRole("dialog");
  const sheet = page.locator("[data-verification-sheet]");
  const frame = await (await sheet.count() ? sheet : dialog).boundingBox();
  const bar = await dialog.locator('[data-brand-mark]').boundingBox();
  const font = await dialog.locator('[data-brand-mark]').evaluate(element => getComputedStyle(element).fontFamily);
  assert.match(font, /^Helvetica(?:,|$)/, "Brand mark must use Helvetica, not a different brand font");
  return { frame, bar, bottom: frame.y + frame.height };
}

function sameBox(before, after, label) {
  assert.ok(before && after, `${label} must be visible`);
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(before[key] - after[key]) <= 1, `${label} ${key} jumped: ${before[key]} → ${after[key]}`);
  }
}

async function anchoredShell(page, baseline) {
  const current = await shellGeometry(page);
  assert.ok(current.frame && baseline.frame, "Sheet must remain visible");
  for (const key of ["x", "width"]) {
    assert.ok(Math.abs(current.frame[key] - baseline.frame[key]) <= 1, `Sheet ${key} changed unnecessarily`);
  }
  assert.ok(Math.abs(current.bottom - baseline.bottom) <= 1, `Sheet bottom anchor moved: ${baseline.bottom} → ${current.bottom}`);
  assert.ok(current.frame.height <= page.viewportSize().height, "Sheet must remain viewport-capped");
}

async function settleSheet(page) {
  await page.evaluate(async () => {
    const sheet = document.querySelector("[data-verification-sheet]") ?? document.querySelector('[role="dialog"]');
    let previous = "";
    let stable = 0;
    const start = performance.now();
    while (performance.now() - start < 2000 && stable < 8) {
      await new Promise(requestAnimationFrame);
      const rect = sheet.getBoundingClientRect();
      const current = [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 10)).join();
      stable = current === previous ? stable + 1 : 0;
      previous = current;
    }
  });
}

async function disclosureMotion(page, details, open) {
  const controlledId = await details.getAttribute("aria-controls");
  assert.ok(controlledId, "Disclosure controls an addressable body");
  const frames = await details.evaluate(async (button, controlledId) => {
    const body = document.getElementById(controlledId);
    const sheet = document.querySelector("[data-verification-sheet]") ?? document.querySelector('[role="dialog"]');
    const read = () => {
      const frame = sheet.getBoundingClientRect();
      return { body: body.getBoundingClientRect().height, height: frame.height, bottom: frame.bottom };
    };
    const samples = [read()];
    button.click();
    const start = performance.now();
    while (performance.now() - start < 750) {
      await new Promise(requestAnimationFrame);
      samples.push(read());
    }
    return samples;
  }, controlledId);
  assert.equal(await details.getAttribute("aria-expanded"), String(open));
  const before = frames[0];
  const after = frames.at(-1);
  if (open) {
    assert.ok(before.body <= 1, `Collapsed content retained ${before.body}px`);
    assert.ok(after.body > 12, "Opening must reveal real content height");
    assert.ok(after.height > before.height + 10, "Opening must grow the content-sized sheet");
  } else {
    assert.ok(after.body <= 1, `Closing must remove body height, got ${after.body}px`);
    assert.ok(after.height < before.height - 10, "Closing must shrink the sheet, not leave empty space");
  }
  for (const sample of frames) assert.ok(Math.abs(sample.bottom - before.bottom) <= 2, "Height animation moved the sheet bottom anchor");
  const intermediate = frames.filter(sample => sample.body > Math.min(before.body, after.body) + 1 && sample.body < Math.max(before.body, after.body) - 1);
  assert.ok(intermediate.length >= 3, "Real height change must be eased across frames, not snap instantly");
  const body = page.locator(`[id="${controlledId}"]`);
  assert.equal(await body.getAttribute("aria-hidden"), String(!open));
  if (!open) assert.equal(await body.getAttribute("inert"), "", "Collapsed content must not be keyboard-interactive");
  return after;
}

async function copyFeedbackMotion(ui, mode) {
  await ui.page.evaluate(mode => { window.__clipboard.mode = mode; }, mode);
  const samples = await ui.button("Copy code").evaluate(async button => {
    const region = button.parentElement.parentElement.querySelector("[data-copy-error]");
    if (!region) throw new Error("Copy error must have an independently collapsing feedback region");
    const samples = [region.getBoundingClientRect().height];
    button.click();
    const start = performance.now();
    while (performance.now() - start < 650) {
      await new Promise(requestAnimationFrame);
      samples.push(region.getBoundingClientRect().height);
    }
    return samples;
  });
  const before = samples[0];
  const after = samples.at(-1);
  if (mode === "reject") {
    assert.ok(before <= 1 && after > 8, "Copy failure must reveal real error space");
  } else {
    assert.ok(before > 8 && after <= 1, "Copy recovery must remove error space");
  }
  assert.ok(samples.filter(height => height > Math.min(before, after) + 1 && height < Math.max(before, after) - 1).length >= 3, "Copy feedback geometry must ease instead of snapping");
}

async function trialErrorMotion(ui, show) {
  const samples = await ui.button("Check status").evaluate(async button => {
    const read = () => document.querySelector("[data-trial-error]")?.getBoundingClientRect().height ?? 0;
    const samples = [read()];
    button.click();
    const start = performance.now();
    while (performance.now() - start < 1000) {
      await new Promise(requestAnimationFrame);
      samples.push(read());
    }
    return samples;
  });
  const before = samples[0];
  const after = samples.at(-1);
  if (show) {
    assert.ok(before <= 1 && after > 8, "Status error must reveal real error space");
  } else {
    assert.ok(before > 8 && after <= 1, "Clearing status error must collapse its space");
    assert.equal(await ui.page.locator("[data-trial-error]").count(), 0, "Cleared status error must leave no permanent slot");
  }
  assert.ok(samples.filter(height => height > Math.min(before, after) + 1 && height < Math.max(before, after) - 1).length >= 3, "Status error height must ease across frames, including exit");
}

async function fixtureContext(viewport, options = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce", ...options });
  const fixture = { state: "pending", failStatus: false, calls: [], external: [], errors: [] };
  await context.addInitScript(() => {
    const viewport = window.visualViewport;
    if (viewport) {
      const nativeHeight = Object.getOwnPropertyDescriptor(VisualViewport.prototype, "height").get;
      let keyboardInset = 0;
      Object.defineProperty(viewport, "height", { configurable: true, get: () => nativeHeight.call(viewport) - keyboardInset });
      window.__setKeyboardInset = inset => {
        keyboardInset = inset;
        viewport.dispatchEvent(new Event("resize"));
      };
    }
    window.__clipboard = { mode: "success", values: [], calls: 0, release: null };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async value => {
        const state = window.__clipboard;
        state.calls += 1;
        if (state.mode === "reject") throw new Error("Fixture clipboard permission denied");
        if (state.mode === "deferred") await new Promise(resolve => { state.release = resolve; });
        state.values.push(value);
      },
    } });
  });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base.origin) { fixture.external.push(url.origin); await route.abort(); return; }
    if (!url.pathname.startsWith("/api/")) { await route.continue(); return; }
    assert.ok(url.pathname.startsWith("/api/phone-verification/challenges"), `Unexpected API: ${url.pathname}`);
    fixture.calls.push({ method: request.method(), path: url.pathname });
    if (request.method() === "DELETE") { await route.fulfill({ status: 204 }); return; }
    const challenge = { id: "browser-fixture", expiresAt: new Date(Date.now() + 300_000).toISOString(), mode: "trial" };
    if (request.method() === "POST") {
      assert.deepEqual(request.postDataJSON(), { phone: "+821012345678" });
      await route.fulfill({ json: { success: true, data: { ...challenge, recipient, body } } });
      return;
    }
    assert.equal(request.method(), "GET");
    if (fixture.failStatus) { await route.fulfill({ status: 503, json: { success: false, error: { code: "UNAVAILABLE" } } }); return; }
    await route.fulfill({ json: { success: true, data: { ...challenge, state: fixture.state } } });
  });
  const page = await context.newPage();
  page.on("pageerror", error => fixture.errors.push(error.message));
  return { context, page, fixture, ui: new VerificationPage(page) };
}

async function assertLayout(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Document horizontal overflow");
  assert.equal(await page.getByRole("dialog").evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, "Dialog horizontal overflow");
  for (let index = 0; index < 18; index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement), null, { timeout: 2000 });
    assert.equal(await page.getByRole("dialog").evaluate(element => element.contains(document.activeElement)), true, `Focus escaped the modal at Tab ${index + 1}: ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 500))}`);
  }
}

async function desktopRun(iteration) {
  const { context, page, fixture, ui } = await fixtureContext({ width: 1440, height: 900 });
  try {
    await ui.openEnglish();
    await page.reload();
    await ui.button("English").click();
    await page.getByRole("textbox", { name: "Phone number", exact: true }).waitFor();
    await settleSheet(page);
    if (iteration === 1) await ui.screenshot("entry-desktop");
    const shell = await shellGeometry(page);
    const submit = ui.button("Continue");
    const actionBefore = await submit.boundingBox();
    await submit.click();
    await page.getByText("Enter an 11-digit mobile number starting with 010.", { exact: true }).waitFor();
    sameBox(actionBefore, await submit.boundingBox(), "Entry action after validation");
    await settleSheet(page);
    await anchoredShell(page, shell);
    const details = ui.button("Privacy & test details");
    await details.scrollIntoViewIfNeeded();
    await settleSheet(page);
    const closed = await shellGeometry(page);
    assert.ok(closed.frame.height < 620, `Entry sheet has excessive empty height: ${closed.frame.height}px`);
    assert.ok(Math.abs(closed.bottom - page.viewportSize().height) <= 48, "Tray must use a bottom anchor rather than recenter on height changes");
    await disclosureMotion(page, details, true);
    if (iteration === 1) await ui.screenshot("disclosure-open-desktop");
    const collapsed = await disclosureMotion(page, details, false);
    assert.ok(Math.abs(collapsed.height - closed.frame.height) <= 1, "Closed sheet must return to compact entry height");
    await assertLayout(page);
    await ui.start();
    await settleSheet(page);
    await anchoredShell(page, shell);
    const copyWidth = (await ui.button("Copy code").boundingBox()).width;
    await ui.button("Copy code").click();
    await ui.feedback("code", "Copied");
    assert.equal((await ui.button("Copy code").boundingBox()).width, copyWidth, "Copied label changed button width");
    await ui.button("Copy recipient").click();
    await ui.feedback("recipient", "Copied");
    assert.deepEqual(await page.evaluate(() => window.__clipboard.values), [body, recipient]);

    await copyFeedbackMotion(ui, "reject");
    await ui.feedback("code", "Retry");
    assert.equal((await ui.button("Copy code").boundingBox()).width, copyWidth, "Retry label changed button width");
    await page.getByRole("status").filter({ hasText: "Copy failed. Select the text below and copy it manually." }).waitFor();
    await copyFeedbackMotion(ui, "success");
    await ui.feedback("code", "Copied");

    const postCount = fixture.calls.filter(call => call.method === "POST").length;
    await ui.button("한국어").click();
    await ui.button("인증 코드 복사").waitFor();
    assert.equal(await page.getByText(body, { exact: true }).count(), 1);
    await ui.button("English").click();
    assert.equal(fixture.calls.filter(call => call.method === "POST").length, postCount, "Locale switch recreated challenge");
    await settleSheet(page);
    await anchoredShell(page, shell);

    // Full motion must survive an OS-level reduced-motion preference.
    assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    const mark = page.locator('[data-verification-mark="pending"] > span').first();
    const initialTransform = await mark.evaluate(element => getComputedStyle(element).transform);
    await page.waitForFunction(initial => {
      const element = document.querySelector('[data-verification-mark="pending"] > span');
      return element && getComputedStyle(element).transform !== initial;
    }, initialTransform);

    // A rejected status request cannot be dressed up as verification success.
    fixture.failStatus = true;
    await trialErrorMotion(ui, true);
    await page.getByRole("alert").filter({ hasText: "We could not check the current status" }).waitFor();
    await settleSheet(page);
    await anchoredShell(page, shell);
    assert.equal(await page.getByRole("heading", { name: "Local verification passed", exact: true }).count(), 0);
    fixture.failStatus = false;
    fixture.state = "review";
    await trialErrorMotion(ui, false);
    await page.getByRole("heading", { name: "Message needs review", exact: true }).waitFor();
    await page.getByRole("status").filter({ hasText: "Not verified." }).waitFor();
    await settleSheet(page);
    await anchoredShell(page, shell);
    fixture.state = "verified";
    await ui.button("Check status").click();
    await page.getByRole("heading", { name: "Local verification passed", exact: true }).waitFor();
    await page.getByRole("status").filter({ hasText: "This grants no account or registration" }).waitFor();
    await settleSheet(page);
    await anchoredShell(page, shell);
    await ui.button("Start a new trial").click();
    fixture.state = "pending";
    await ui.start();
    fixture.state = "expired";
    await ui.button("Check status").click();
    await page.getByRole("heading", { name: "Trial expired", exact: true }).waitFor();
    await settleSheet(page);
    await anchoredShell(page, shell);
    await ui.close();
    await ui.reopen();
    fixture.state = "pending";
    await ui.start();

    await page.evaluate(() => { window.__clipboard.mode = "deferred"; window.__clipboard.calls = 0; });
    // Dispatching repeated user-style clicks proves the in-flight guard, not just disabled UI.
    await ui.button("Copy code").evaluate(button => { for (let count = 0; count < 5; count += 1) button.click(); });
    assert.equal(await page.evaluate(() => window.__clipboard.calls), 1);
    await ui.close();
    await page.evaluate(() => { window.__clipboard.release(); window.__clipboard.mode = "success"; });
    await ui.reopen();
    await ui.start();
    assert.equal((await ui.button("Copy code").innerText()).replace(/\s/g, ""), "⧉Copy", "Late clipboard result leaked into reopened session");
    assert.equal(await page.getByRole("status").filter({ hasText: "Copied" }).count(), 0);
    await page.keyboard.press("Escape");
    await ui.dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-haspopup") === "dialog");
    await ui.reopen();
    assert.deepEqual(fixture.errors, [], "Browser pageerror after initial load/reload");
    assert.ok(fixture.calls.some(call => call.method === "DELETE"));
    return { iteration, viewport: "1440x900", checks: ["content-sized bottom-anchored sheet", "disclosure really collapses and eases height", "reload without pageerror", "exact body and recipient copy", "clipboard rejection and recovery", "rapid-click guard", "late clipboard after dismissal", "locale retains challenge", "focus trap", "close and Escape restore focus", "clean reopen", "pending/review/verified/expired", "status error and recovery with eased real-height exit", "full motion with reduced-motion emulation"], fixtureCalls: fixture.calls.length, blockedExternalOrigins: [...new Set(fixture.external)], status: "passed" };
  } finally { await context.close(); }
}

async function viewportRun(viewport, name) {
  const { context, page, fixture, ui } = await fixtureContext(viewport);
  try {
    await ui.openEnglish();
    await settleSheet(page);
    if (viewport.width < 400) {
      for (const locale of ["English", "한국어"]) {
        const lines = await ui.button(locale).evaluate(button => {
          const range = document.createRange();
          range.selectNodeContents(button);
          return range.getClientRects().length;
        });
        assert.equal(lines, 1, `${locale} control must stay on one line at ${viewport.width}px`);
      }
      const phone = page.getByRole("textbox", { name: "Phone number", exact: true });
      const metrics = await phone.evaluate(input => {
        const style = getComputedStyle(input);
        const placeholder = getComputedStyle(input, "::placeholder");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = `${placeholder.fontWeight} ${placeholder.fontSize} ${placeholder.fontFamily}`;
        const tracking = parseFloat(placeholder.letterSpacing) || 0;
        return {
          fontSize: parseFloat(style.fontSize), color: style.color,
          available: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          needed: context.measureText(input.placeholder).width + tracking * (input.placeholder.length - 1),
        };
      });
      assert.ok(metrics.fontSize >= 16, "Phone input must retain legible native-input typography");
      assert.equal(metrics.color, "rgb(255, 255, 255)", "Legacy global input color overrode the dark field");
      assert.ok(metrics.needed <= metrics.available, `Phone placeholder clips at ${viewport.width}px: ${JSON.stringify(metrics)}`);
      const action = await ui.button("Continue").boundingBox();
      assert.ok(action && action.y >= 0 && action.y + action.height <= viewport.height, "Entry action must be above the fold on a short phone");
    }
    if (viewport.width < 400) {
      // A resized viewport exercises available-height loss without claiming an
      // actual operating-system keyboard was opened by headless Chromium.
      const phone = page.getByRole("textbox", { name: "Phone number", exact: true });
      await phone.fill("01012345678");
      await phone.focus();
      await page.setViewportSize({ ...viewport, height: 320 });
      await settleSheet(page);
      await phone.scrollIntoViewIfNeeded();
      const input = await phone.boundingBox();
      const sheet = await shellGeometry(page);
      assert.ok(input && input.y >= -1 && input.y + input.height <= 321, "Focused phone field must remain reachable when viewport height is reduced");
      assert.ok(sheet.frame.y >= -1 && sheet.bottom <= 321, "Sheet must stay inside the reduced visual viewport");
      assert.equal(await phone.inputValue(), "01012345678", "Viewport changes must preserve phone input");
      await page.setViewportSize(viewport);
      await settleSheet(page);
      await phone.clear();
    }
    if (name === "mobile") await ui.screenshot("entry-mobile-360x560");
    if (name === "narrow") await ui.screenshot("entry-narrow-319x560");
    await ui.start();
    await assertLayout(page);
    await ui.button("Copy code").scrollIntoViewIfNeeded();
    await ui.button("Copy code").click();
    await ui.feedback("code", "Copied");
    await ui.screenshot(`pending-${name}-${viewport.width}x${viewport.height}`);
    await ui.button("Check status").scrollIntoViewIfNeeded();
    await ui.button("Check status").click();
    await ui.button("Check status").waitFor({ state: "visible" });
    if (name === "mobile") await ui.screenshot("pending-mobile-controls-360x560");
    await ui.close();
    assert.deepEqual(fixture.errors, []);
    return { viewport: `${viewport.width}x${viewport.height}`, checks: ["copy reachable", "status reachable", "close reachable", "no horizontal overflow", ...(viewport.width < 400 ? ["single-line locale controls", "complete phone placeholder", "legible input typography", "entry action above fold", "reduced-height viewport keeps focused input reachable"] : []), "focus trap", "focus restoration"], status: "passed" };
  } finally { await context.close(); }
}

async function keyboardViewportRun() {
  const { context, page, fixture, ui } = await fixtureContext({ width: 390, height: 844 });
  try {
    await ui.openEnglish();
    await settleSheet(page);
    const before = await shellGeometry(page);
    const phone = page.getByRole("textbox", { name: "Phone number", exact: true });
    await phone.fill("01012345678");
    await phone.focus();
    const layoutHeight = await page.evaluate(() => innerHeight);
    await page.evaluate(() => window.__setKeyboardInset(320));
    await settleSheet(page);
    const visualBottom = await page.evaluate(() => visualViewport.offsetTop + visualViewport.height);
    const during = await shellGeometry(page);
    assert.equal(await page.evaluate(() => innerHeight), layoutHeight, "Keyboard mock must change visualViewport only, not layout viewport");
    assert.ok(during.frame.y >= -1 && during.bottom <= visualBottom + 1, "Tray must remain above the simulated keyboard");
    await phone.scrollIntoViewIfNeeded();
    const input = await phone.boundingBox();
    assert.ok(input.y >= -1 && input.y + input.height <= visualBottom + 1, "Focused field must remain in the visible keyboard viewport");
    await page.evaluate(() => window.__setKeyboardInset(0));
    await settleSheet(page);
    await page.getByRole("dialog").evaluate(element => { element.scrollTop = 0; });
    const after = await shellGeometry(page);
    assert.ok(Math.abs(after.bottom - before.bottom) <= 1, "Keyboard dismissal must restore the bottom anchor");
    assert.equal(await ui.dialog.evaluate(element => element.style.height), "", "Vaul must not leave a frozen inline height after keyboard dismissal");
    const details = ui.button("Privacy & test details");
    await disclosureMotion(page, details, true);
    await disclosureMotion(page, details, false);
    assert.equal(await phone.inputValue(), "01012345678");
    await ui.close();
    assert.deepEqual(fixture.errors, []);
    return { viewport: "390x844 with visualViewport-only keyboard inset", checks: ["unchanged layout viewport", "sheet and focused field above simulated keyboard", "keyboard dismissal restores anchor", "no frozen inline height", "disclosure grows and shrinks after keyboard closes", "input preserved"], status: "passed", limitation: "Synthetic visualViewport resize; not physical iOS/Android keyboard proof" };
  } finally { await context.close(); }
}

async function iosBridgeRun() {
  const { context, page, fixture, ui } = await fixtureContext({ width: 390, height: 600 }, {
    isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  try {
    await ui.openEnglish();
    await ui.start();
    const copy = ui.button("Copy code");
    await copy.locator("label[data-haptic-trigger]").waitFor();
    assert.equal(await copy.locator("input[switch]").getAttribute("tabindex"), "-1");
    await copy.scrollIntoViewIfNeeded();
    const target = await copy.boundingBox();
    assert.ok(target);
    await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2);
    await ui.feedback("code", "Copied");
    assert.deepEqual(await page.evaluate(() => window.__clipboard.values), [body]);
    assert.equal(await page.evaluate(() => window.__clipboard.calls), 1, "Switch forwarded the action twice");
    assert.equal(await copy.locator("label[data-haptic-trigger]").count(), 1, "Feedback rerender lost/duplicated haptic bridge");
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.matches("input[switch]")), false, "Hidden haptic switch took keyboard focus");
    }
    await copy.scrollIntoViewIfNeeded();
    const scroll = await ui.dialog.evaluate(element => ({ top: element.scrollTop, max: element.scrollHeight - element.clientHeight }));
    assert.ok(scroll.max > 10, "Touch-scroll fixture must overflow the dialog");
    // A compact sheet may already be at its bottom after keyboard traversal.
    // Swipe toward available content, not into the scroll boundary.
    const direction = scroll.max - scroll.top > 20 ? -1 : 1;
    const touch = await copy.boundingBox();
    const cdp = await context.newCDPSession(page);
    const x = touch.x + touch.width / 2;
    const y = touch.y + touch.height / 2;
    const distance = Math.min(120, direction > 0 ? 580 - y : y - 20);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 5; step += 1) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + direction * distance * step / 5 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForFunction(before => Math.abs(document.querySelector('[role="dialog"]').scrollTop - before) > 10, scroll.top, { timeout: 2000 });
    await cdp.detach();
    await page.evaluate(() => { window.__clipboard.mode = "deferred"; window.__clipboard.calls = 0; });
    await copy.click();
    assert.equal(await copy.isDisabled(), true);
    await copy.locator("label[data-haptic-trigger]").evaluate(label => label.click());
    assert.equal(await page.evaluate(() => window.__clipboard.calls), 1, "Disabled haptic overlay ran action");
    await ui.close();
    await page.evaluate(() => { window.__clipboard.release(); });
    await ui.reopen();
    assert.deepEqual(fixture.errors, []);
    return { viewport: "390x600 iPhone UA / Chromium emulation", checks: ["iOS switch bridge installed", "one touch equals one exact copy", "feedback rerender preserves bridge", "hidden switch absent from keyboard focus", "disabled overlay does not act", "touch scroll starts on copy target", "dismissal after pending copy has no pageerror"], status: "passed", limitation: "DOM/event smoke only; no iOS Safari or haptic hardware claim" };
  } finally { await context.close(); }
}

async function loginGeometryRun() {
  const { context, page, fixture } = await fixtureContext({ width: 319, height: 889 });
  try {
    await page.goto(new URL("/login", base).href);
    const form = page.locator('form[action="/api/session"]');
    const before = await form.boundingBox();
    assert.equal(await page.locator('input[name="username"]').getAttribute("autocomplete"), "username");
    assert.equal(await page.locator('input[name="password"]').getAttribute("autocomplete"), "current-password");
    const neutral = await page.getByRole("button", { name: "Preview", exact: true }).evaluate(element => getComputedStyle(element).backgroundColor);
    const channels = neutral.match(/[\d.]+/g).map(Number);
    assert.equal(channels[0], channels[1]);
    assert.equal(channels[1], channels[2]);
    await page.goto(new URL("/login?error=credentials", base).href);
    await page.getByRole("alert").waitFor();
    sameBox(before, await form.boundingBox(), "Native login form after credential error");
    const loginPath = resolve(artifactDir, "login-stable-error-319x889.png");
    await page.screenshot({ path: loginPath });
    report.screenshots.push(loginPath);
    await page.goto(base.origin);
    await page.locator("h1.wordmark").waitFor();
    const family = await page.locator("h1.wordmark").evaluate(element => getComputedStyle(element).fontFamily);
    assert.match(family, /^Helvetica(?:,|$)/, "Hero and modal brand marks must share Helvetica");
    assert.equal(fixture.calls.length, 0, "A visual login check must not submit credentials or call an API");
    assert.deepEqual(fixture.errors, []);
    return { viewport: "319x889 login + hero", checks: ["native login error preserves form geometry", "neutral auth accent", "credential attributes unchanged", "hero brand is Helvetica", "no auth submission"], status: "passed" };
  } finally { await context.close(); }
}

try {
  for (let iteration = 1; iteration <= report.repetitions; iteration += 1) report.runs.push(await desktopRun(iteration));
  report.runs.push(await viewportRun({ width: 360, height: 560 }, "mobile"));
  report.runs.push(await viewportRun({ width: 319, height: 560 }, "narrow"));
  report.runs.push(await viewportRun({ width: 820, height: 1180 }, "tablet"));
  report.runs.push(await keyboardViewportRun());
  report.runs.push(await iosBridgeRun());
  report.runs.push(await loginGeometryRun());
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.stack ?? String(error);
  report.failure = { name: error.name, message: error.message, location: error.stack?.split("\n").find(line => line.includes("verification-feedback.spec.mjs:"))?.trim() };
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await mkdir(resolve("docs/qa"), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, completedRuns: report.runs.length, reportPath, error: report.error }, null, 2));
}
