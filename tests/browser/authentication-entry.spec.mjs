// Local fixture-only acceptance: no real login, mailbox, carrier or provider actions.
// BASE_URL=http://localhost:3217 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/authentication-entry.spec.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3217");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Only local fixture previews are allowed");
const moduleName = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(moduleName ? pathToFileURL(resolve(moduleName)).href : "playwright");
const artifactDir = resolve(process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-authentication-entry");
const reportPath = resolve("docs/qa/authentication-entry-browser-results.json");
const report = {
  startedAt: new Date().toISOString(), baseUrl: base.origin, repetitions: Number(process.env.REPEAT ?? 3), runs: [],
  scope: "Local chooser and authentication-shell interaction with intercepted API calls only",
  limitations: ["Chromium only", "Synthetic visualViewport keyboard inset, not physical keyboard or Safari proof", "No real login or OTP transport tested"],
};
await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });

const button = (page, name) => page.getByRole("button", { name, exact: true });
const sheet = page => page.locator("[data-verification-sheet]");
const chooser = page => page.locator("[data-authentication-entry]");
const cancel = page => page.locator("[data-authentication-cancel]");
const close = page => page.locator("[data-authentication-close]");

async function settle(page) {
  await page.evaluate(async () => {
    const element = document.querySelector("[data-verification-sheet]");
    let previous = "";
    let stable = 0;
    const start = performance.now();
    while (element?.isConnected && performance.now() - start < 2500 && stable < 10) {
      await new Promise(requestAnimationFrame);
      const rect = element.getBoundingClientRect();
      const key = [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 10)).join();
      stable = key === previous ? stable + 1 : 0;
      previous = key;
    }
  });
}

async function fixture(viewport) {
  const context = await browser.newContext({ viewport });
  const calls = [];
  const errors = [];
  await context.addInitScript(() => {
    const viewport = window.visualViewport;
    if (viewport) {
      const nativeHeight = Object.getOwnPropertyDescriptor(VisualViewport.prototype, "height").get;
      let inset = 0;
      Object.defineProperty(viewport, "height", { configurable: true, get: () => nativeHeight.call(viewport) - inset });
      window.__setAuthenticationKeyboardInset = value => {
        inset = value;
        viewport.dispatchEvent(new Event("resize"));
      };
    }
    window.__authenticationCopies = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.__authenticationCopies.push(value); } } });
  });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base.origin) { await route.abort(); return; }
    if (!url.pathname.startsWith("/api/")) { await route.continue(); return; }
    calls.push({ method: request.method(), path: url.pathname, seenAt: Date.now() });
    assert.ok(url.pathname.startsWith("/api/phone-verification/challenges"), `Unexpected API or credential submission: ${url.pathname}`);
    if (request.method() === "DELETE") { await route.fulfill({ status: 204 }); return; }
    const challenge = { id: "authentication-shell-fixture", expiresAt: new Date(Date.now() + 300_000).toISOString(), mode: "trial" };
    if (request.method() === "POST") {
      assert.deepEqual(request.postDataJSON(), { phone: "+821012345678" });
      await route.fulfill({ json: { success: true, data: { ...challenge, recipient: "verify@example.invalid", body: "SPHMRS SHELL 123456" } } });
      return;
    }
    assert.equal(request.method(), "GET");
    await route.fulfill({ json: { success: true, data: { ...challenge, state: "pending" } } });
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(new URL("/studies/verification", base).href);
    await chooser(page).waitFor();
    if (await button(page, "English").count()) await button(page, "English").click();
    await button(page, "Log in").waitFor();
    await button(page, "Sign up").waitFor();
    await settle(page);
  } catch (error) {
    report.bootstrap = { visibleText: (await page.locator("body").innerText()).slice(0, 1000), errors };
    await page.screenshot({ path: resolve(artifactDir, `bootstrap-failure-${viewport.width}x${viewport.height}.png`) });
    await context.close();
    throw error;
  }
  return { context, page, calls, errors };
}

async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "Page horizontal overflow");
  assert.equal(await sheet(page).evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, "Authentication surface horizontal overflow");
}

async function assertFocused(page, identity) {
  await page.waitForFunction(() => document.querySelector("[data-verification-sheet]")?.dataset.authenticationMode === "focused");
  await settle(page);
  assert.equal(await identity.evaluate(element => element.isConnected && element === document.querySelector("[data-verification-sheet]")), true, "Choosing a flow must morph the same Vaul content element, not replace the dialog");
  assert.equal(await page.getByRole("dialog").count(), 1, "Nested or duplicate authentication dialogs are not allowed");
  const geometry = await sheet(page).boundingBox();
  const visual = await page.evaluate(() => ({ top: visualViewport.offsetTop, height: visualViewport.height }));
  assert.ok(Math.abs(geometry.y + geometry.height / 2 - visual.top - visual.height / 2) <= 2, "Focused flow must center within the visible viewport");
  assert.ok(geometry.y >= visual.top - 1 && geometry.y + geometry.height <= visual.top + visual.height + 1, "Focused flow must remain inside the visible viewport");
  assert.equal(await close(page).evaluate(element => {
    let opacity = 1;
    for (let node = element; node && !node.hasAttribute("data-verification-sheet"); node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity <= 0.01 && Boolean(element.closest("[inert]"));
  }), true, "Close control must fade and become inert in the focused flow");
  const handle = sheet(page).locator("[data-vaul-handle]");
  assert.equal(await handle.evaluate(element => {
    let opacity = 1;
    for (let node = element; node && !node.hasAttribute("data-verification-sheet"); node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity <= 0.01 && Boolean(element.closest("[inert]"));
  }), true, "Drag handle must fade and become inert in the focused flow");
  assert.equal(await cancel(page).count(), 1, "Focused flow must expose the Cancel action");
  await cancel(page).waitFor();
  assert.equal(await cancel(page).getAttribute("aria-label"), "Cancel");
  await assertNoOverflow(page);
}

async function chooseFlow(page, name, compactWidth) {
  const frames = await button(page, name).evaluate(async button => {
    const element = document.querySelector("[data-verification-sheet]");
    const read = () => {
      const rect = element.getBoundingClientRect();
      return { y: rect.y, width: rect.width, height: rect.height };
    };
    const samples = [read()];
    button.click();
    const start = performance.now();
    while (performance.now() - start < 1000) {
      await new Promise(requestAnimationFrame);
      samples.push(read());
    }
    return samples;
  });
  const before = frames[0];
  const after = frames.at(-1);
  const changed = ["y", "width", "height"].filter(key => Math.abs(before[key] - after[key]) > 4);
  assert.ok(changed.length > 0, "Choosing a flow must visibly morph the compact chooser");
  for (const key of changed) {
    const intermediate = frames.filter(frame => frame[key] > Math.min(before[key], after[key]) + 1 && frame[key] < Math.max(before[key], after[key]) - 1);
    assert.ok(intermediate.length >= 3, `Authentication ${key} must ease across frames, not jump`);
  }
  if (page.viewportSize().width >= 640) {
    assert.ok(after.width >= compactWidth + 16 && after.width <= compactWidth + 160, "Focused desktop flow should become slightly wider, not remain identical or explode in width");
  }
}

async function cancelToChooser(page, identity, compact) {
  const result = await cancel(page).evaluate(async button => {
    const element = document.querySelector("[data-verification-sheet]");
    const read = () => {
      const rect = element.getBoundingClientRect();
      const choice = document.querySelector("[data-authentication-entry]");
      const choiceRect = choice?.getBoundingClientRect();
      let choiceOpacity = 1;
      for (let node = choice; node; node = node.parentElement) choiceOpacity *= Number(getComputedStyle(node).opacity);
      return { y: rect.y, width: rect.width, height: rect.height, state: element.dataset.state, connected: element.isConnected, time: Date.now(), scrollTop: element.scrollTop,
        chooserVisible: Boolean(choice && !choice.closest('[aria-hidden="true"]') && choiceOpacity > 0.01), chooserTop: choiceRect?.top, chooserBottom: choiceRect?.bottom };

    };
    const frames = [read()];
    const startedAt = Date.now();
    button.click();
    await new Promise(requestAnimationFrame);
    const inputs = [...element.querySelectorAll('input[type="email"], input[type="tel"]')];
    const focusedInertImmediately = inputs.every(input => Boolean(input.closest("[inert]")));
    const start = performance.now();
    while (element.isConnected && performance.now() - start < 750) {
      frames.push(read());
      await new Promise(requestAnimationFrame);
    }
    return { frames, focusedInertImmediately, startedAt };
  });
  assert.equal(result.focusedInertImmediately, true, "Cancel must immediately inert or dispose focused inputs while reversing to chooser");
  assert.ok(result.frames.every(frame => frame.connected && frame.state === "open"), "Cancel must keep the same tray open throughout its reverse morph");
  for (const frame of result.frames.filter(frame => frame.chooserVisible)) {
    assert.ok(frame.chooserTop >= frame.y - 1, `Chooser clipped above the reversing surface after Cancel: ${JSON.stringify(frame)}`);
    assert.ok(frame.chooserBottom <= frame.y + frame.height + 1, `Chooser clipped below the reversing surface after Cancel: ${JSON.stringify(frame)}`);
  }

  const before = result.frames[0];
  const compactFrames = result.frames.filter(frame => frame.height <= compact.height + 2 && frame.width <= compact.width + 2);
  assert.ok(compactFrames.length > 0, "Cancel must return to compact tray dimensions");
  assert.ok(result.frames.some(frame => frame.y > before.y + 8), "Cancel must lower the popup back toward its tray anchor");
  const targetY = compactFrames.at(-1).y;
  assert.ok(result.frames.filter(frame => frame.y > Math.min(before.y, targetY) + 1 && frame.y < Math.max(before.y, targetY) - 1).length >= 3, "Cancel must ease the reverse vertical movement across frames");

  for (const key of ["height", ...(page.viewportSize().width >= 640 ? ["width"] : [])]) {
    const target = compactFrames.at(-1)[key];
    const intermediate = result.frames.filter(frame => frame[key] > target + 1 && frame[key] < before[key] - 1);
    assert.ok(intermediate.length >= 3, `Cancel must ease reverse ${key} over multiple frames`);
  }
  await chooser(page).waitFor();
  await settle(page);
  assert.equal(await identity.evaluate(element => element.isConnected && element === document.querySelector("[data-verification-sheet]")), true, "Cancel must return to chooser inside the same open surface");
  assert.equal(await sheet(page).getAttribute("data-authentication-mode"), "chooser");
  assert.equal(await close(page).isEnabled(), true, "Chooser close action must become enabled after Cancel");
  assert.equal(await close(page).evaluate(element => {
    let opacity = 1;
    for (let node = element; node && !node.hasAttribute("data-verification-sheet"); node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity >= 0.99 && !element.closest("[inert]");
  }), true, "Chooser close affordance must return visibly and interactively");
  assert.equal(await sheet(page).locator("[data-vaul-handle]").evaluate(element => {
    let opacity = 1;
    for (let node = element; node && !node.hasAttribute("data-verification-sheet"); node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity > 0.01 && !element.closest("[inert]");
  }), true, "Chooser drag affordance must return visibly and interactively");
  return { startedAt: result.startedAt, compactAt: compactFrames[0].time };
}

async function rapidLoginReentry(page, identity) {
  const result = await cancel(page).evaluate(async button => {
    button.click();
    let choice = document.querySelector('[data-authentication-choice="login"]');
    const start = performance.now();
    while (!choice && performance.now() - start < 1000) {
      await new Promise(requestAnimationFrame);
      choice = document.querySelector('[data-authentication-choice="login"]');
    }
    if (!choice) throw new Error("Cancel did not expose the chooser for immediate reentry");
    choice.click();
    const duplicateIds = [];
    const end = performance.now() + 350;
    while (performance.now() < end) {
      await new Promise(requestAnimationFrame);
      const ids = [...document.querySelectorAll("[data-verification-sheet] [id]")].map(element => element.id);
      duplicateIds.push(...ids.filter((id, index) => ids.indexOf(id) !== index));
    }
    return { duplicateIds };
  });
  assert.deepEqual(result.duplicateIds, [], "Rapid Cancel and same-flow reentry must not duplicate live or outgoing IDs");
  await assertFocused(page, identity);
  assert.equal(await page.getByRole("textbox", { name: /email/i }).count(), 1, "Rapid reentry must expose exactly one active login view");
}

async function attemptSwipe(page, shouldDismiss) {
  const rect = await sheet(page).boundingBox();
  const x = rect.x + rect.width / 2;
  const y = rect.y + 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const samples = [];
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(x, y + step * 32);
    if (!shouldDismiss) samples.push(await sheet(page).boundingBox());
  }
  await page.mouse.up();
  if (shouldDismiss) {
    await sheet(page).waitFor({ state: "hidden" });
  } else {
    await settle(page);
    assert.equal(await sheet(page).count(), 1, "Focused swipe dismissed the flow");
    for (const sample of samples) assert.ok(Math.abs(sample.y - rect.y) <= 2, "Focused flow moved under a blocked swipe");
  }
}

async function reopen(page) {
  await page.locator('button[aria-haspopup="dialog"]').click();
  await chooser(page).waitFor();
  await button(page, "Sign up").waitFor();
  await settle(page);
}

async function run(viewport, iteration) {
  const { context, page, calls, errors } = await fixture(viewport);
  try {
    const compact = await sheet(page).boundingBox();
    assert.ok(compact.height <= 420, `Chooser must be compact, got ${compact.height}px`);
    assert.ok(viewport.height - compact.y - compact.height <= 30, "Chooser must sit at the bottom gutter");
    assert.equal(await sheet(page).getAttribute("data-authentication-mode"), "chooser");
    assert.equal(calls.length, 0, "Opening a chooser must not create verification sessions");
    await assertNoOverflow(page);
    if (iteration === 1) await page.screenshot({ path: resolve(artifactDir, `chooser-${viewport.width}x${viewport.height}.png`) });
    await page.keyboard.press("Escape");
    await sheet(page).waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-haspopup") === "dialog");
    await reopen(page);
    await page.mouse.click(2, 2);
    await sheet(page).waitFor({ state: "hidden" });
    await reopen(page);
    await close(page).click();
    await sheet(page).waitFor({ state: "hidden" });
    await reopen(page);
    await attemptSwipe(page, true);
    await reopen(page);
    let identity = await sheet(page).elementHandle();
    await chooseFlow(page, "Log in", compact.width);
    await assertFocused(page, identity);
    if (iteration === 1) await page.screenshot({ path: resolve(artifactDir, `login-${viewport.width}x${viewport.height}.png`) });
    await rapidLoginReentry(page, identity);
    await page.keyboard.press("Escape");
    await page.mouse.click(2, 2);
    await attemptSwipe(page, false);
    await assertFocused(page, identity);
    await cancelToChooser(page, identity, compact);
    assert.equal(calls.length, 0, "Login cancellation must not submit credentials or create OTP sessions");
    assert.equal(await page.getByRole("textbox", { name: /email/i }).count(), 0, "Cancel must leave the clean chooser, not an active abandoned login view");
    await close(page).click();
    await sheet(page).waitFor({ state: "hidden" });
    await reopen(page);
    identity = await sheet(page).elementHandle();
    await chooseFlow(page, "Sign up", compact.width);
    await assertFocused(page, identity);
    const phone = page.getByRole("textbox", { name: "Phone number", exact: true });
    await phone.fill("01012345678");
    await phone.focus();
    const innerHeight = await page.evaluate(() => window.innerHeight);
    await page.evaluate(() => window.__setAuthenticationKeyboardInset(200));
    await settle(page);
    assert.equal(await page.evaluate(() => window.innerHeight), innerHeight, "Keyboard fixture may not resize the layout viewport");
    await phone.scrollIntoViewIfNeeded();
    const visibleBottom = await page.evaluate(() => visualViewport.offsetTop + visualViewport.height);
    const focused = await phone.boundingBox();
    assert.ok(focused.y >= -1 && focused.y + focused.height <= visibleBottom + 1, "Phone input must remain above the synthetic keyboard");
    await assertFocused(page, identity);
    await page.evaluate(() => window.__setAuthenticationKeyboardInset(0));
    await settle(page);
    await page.keyboard.press("Escape");
    await page.mouse.click(2, 2);
    await assertFocused(page, identity);
    for (let index = 0; index < 16; index += 1) {
      await page.keyboard.press("Tab");
      assert.equal(await sheet(page).evaluate(element => element.contains(document.activeElement)), true, "Focus escaped the locked authentication flow");
      assert.equal(await close(page).evaluate(element => element === document.activeElement), false, "Invisible close control received keyboard focus");
    }
    await phone.fill("01012345678");
    await button(page, "Continue").click();
    await button(page, "Copy code").waitFor();
    assert.equal(calls.filter(call => call.method === "POST").length, 1, "Signup must preserve the existing phone challenge behavior");
    await assertFocused(page, identity);
    if (iteration === 1) await page.screenshot({ path: resolve(artifactDir, `focused-${viewport.width}x${viewport.height}.png`) });
    const pendingScroll = await sheet(page).evaluate(element => {
      element.scrollTop = element.scrollHeight;
      return { top: element.scrollTop, max: element.scrollHeight - element.clientHeight };
    });
    if (pendingScroll.max > 1) assert.ok(pendingScroll.top > 0, "Tall pending fixture must be scrolled before cancellation");
    const cancellation = await cancelToChooser(page, identity, compact);
    const disposal = calls.find(call => call.method === "DELETE" && call.seenAt >= cancellation.startedAt);
    assert.ok(disposal, "Signup cancellation must dispose the existing fixture session");
    assert.ok(disposal.seenAt <= cancellation.compactAt, "Session disposal must happen during reverse, before the chooser morph completes");
    assert.equal(await sheet(page).getAttribute("data-authentication-mode"), "chooser");
    assert.equal(await phone.count(), 0, "Cancelled signup must return to chooser only");
    assert.equal(await page.getByText("SPHMRS SHELL 123456", { exact: true }).count(), 0);
    await button(page, "Sign up").click();
    await phone.waitFor();
    assert.equal(await phone.inputValue(), "", "A new signup must not revive cancelled input or session state");
    assert.deepEqual(errors, [], "Browser errors");
    return { viewport: `${viewport.width}x${viewport.height}`, iteration, status: "passed", checks: ["compact dismissible chooser", "Escape/outside/close/swipe", "same dialog DOM identity", "centered focused geometry", "close and handle faded/inert", "focused dismissal blocked", "Cancel immediately inerts focused input", "same-root eased Cancel reverse to open compact chooser", "restored chooser dismissal affordances", "rapid Cancel and same-flow reentry without duplicate IDs", "focus trap", "synthetic keyboard geometry", "fixture session disposed during reverse", "clean chooser and signup reentry"] };
  } catch (error) {
    await page.screenshot({ path: resolve(artifactDir, `failure-${viewport.width}x${viewport.height}-${iteration}.png`) });
    throw error;
  } finally { await context.close(); }
}

try {
  for (let iteration = 1; iteration <= report.repetitions; iteration += 1) report.runs.push(await run({ width: 1440, height: 900 }, iteration));
  report.runs.push(await run({ width: 390, height: 844 }, 1));
  report.runs.push(await run({ width: 319, height: 560 }, 1));
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = { name: error.name, message: error.message, location: error.stack?.split("\n").find(line => line.includes("authentication-entry.spec.mjs:"))?.trim() };
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await mkdir(resolve("docs/qa"), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, completedRuns: report.runs.length, reportPath, failure: report.failure }, null, 2));
}
