// Local rendered registration test. All API responses are fixtures; no native handler is opened.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3240");
assert.equal(base.protocol, "http:");
assert.equal(base.hostname, "localhost");
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const directory = resolve(process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-member-phone-recovery");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const report = { runs: [], screenshots: [], traces: [], failures: [], nativeComposerTested: false, providerRequests: 0 };
const message = "SPHMRS COMPOSER_FIXTURE_ONLY";
async function settle(page, target) {
  await target.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const content = document.querySelector('[data-member-phone-step]');
    const probe = content?.querySelector('a[href^="sms:"]');
    if (!probe) return false;
    for (let element = probe; element && !element.matches('[role="dialog"]'); element = element.parentElement)
      if (Number(getComputedStyle(element).opacity) < 0.99) return false;
    return true;
  });
}
async function elapsedSinceCompose(page, ms) {
  await page.waitForFunction(ms => performance.now() - window.__composeTappedAt >= ms, ms);
}
async function observeQuietWindow(page, ms) {
  const until = await page.evaluate(ms => performance.now() + ms, ms);
  await page.waitForFunction(until => performance.now() >= until, until);
}
async function settleCapture(page, selector) {
  await page.waitForFunction(selector => {
    const target = document.querySelector(selector);
    const dialog = target?.closest('[role="dialog"]');
    if (!target || !dialog) return false;
    for (let node = target; node; node = node.parentElement)
      if (Number(getComputedStyle(node).opacity) < 0.99) return false;
    const boxes = [target.getBoundingClientRect(), dialog.getBoundingClientRect()];
    const key = JSON.stringify(boxes.map(box => [box.x, box.y, box.width, box.height]));
    const previous = window.__captureMeasure;
    if (!previous || previous.key !== key) {
      window.__captureMeasure = { key, since: performance.now() };
      return false;
    }
    return performance.now() - previous.since >= 200;
  }, selector);
}
try {
  for (const [profile, viewport] of [["desktop", { width: 1280, height: 900 }],
    ["iphone-size", { width: 390, height: 650 }]]) {
    const context = await browser.newContext({ viewport,
      ...(profile === "iphone-size" ? { isMobile: true, hasTouch: true,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1" } : {}) });
    let challenge = { id: `compose-${profile}`, recipient: "verify@example.invalid", body: message,
      expiresAt: new Date(Date.now() + 300000).toISOString(), mode: "trial" };
    let polls = 0, verified = false, failStatus = false, receiverUnavailable = false;
    let statusGate;
    const unavailable = () => ({ status: 503,
      json: { success: false, error: { code: "RECEIVER_UNAVAILABLE" } } });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base.origin) { report.providerRequests++; return route.abort(); }
      if (url.pathname === "/api/member/status") return route.fulfill({ json: { success: true, data: {
        authenticated: true, emailVerified: true, phoneBound: false, member: false,
        capabilities: { google: true, emailOtp: true, magicLink: true, passkey: true } } } });
      if (url.pathname === "/api/phone-verification/challenges" && request.method() === "POST")
        return route.fulfill(receiverUnavailable ? unavailable()
          : { status: 201, json: { success: true, data: challenge } });
      if (url.pathname === `/api/phone-verification/challenges/${challenge.id}` && request.method() === "DELETE")
        return route.fulfill({ json: { success: true, data: { cancelled: true } } });
      if (url.pathname === `/api/phone-verification/challenges/${challenge.id}` && request.method() === "GET") {
        polls++;
        if (statusGate) await statusGate;
        if (receiverUnavailable) return route.fulfill(unavailable());
        if (failStatus) return route.fulfill({ status: 503,
          json: { success: false, error: { code: "UNAVAILABLE" } } });
        return route.fulfill({ json: { success: true, data: { id: challenge.id, expiresAt: challenge.expiresAt,
          mode: "trial", state: verified ? "verified" : "pending" } } });
      }
      if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 503,
        json: { success: false, error: { code: "UNAVAILABLE" } } });
      return route.continue();
    });
    const page = await context.newPage();
    await context.tracing.start({ screenshots: true, snapshots: true });
    // Real browser time keeps Motion/WAAPI transitions honest; exact 2999/3000ms
    // boundaries are covered by the hook's deterministic unit tests.
    await page.addInitScript(() => document.addEventListener("click", event => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href^="sms:"]') : null;
      if (!anchor) return;
      event.preventDefault();
      window.__composeTappedAt = performance.now();
    }, { capture: true }));
    try {
      await page.goto(`${base.origin}/account/continue`);
      await page.getByRole("button", { name: "Continue registration", exact: true }).click();
      await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("01012345678");
      receiverUnavailable = true;
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "can't receive verification messages" }).waitFor();
      assert.equal(await page.getByRole("link", { name: "Open Messages", exact: true }).count(), 0);
      assert.equal(await page.getByRole("heading", { name: "Send verification message", exact: true }).count(), 0,
        "an offline receiver prevents entering a silently pending challenge");
      receiverUnavailable = false;
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      const compose = page.getByRole("link", { name: "Open Messages", exact: true });
      await settle(page, compose);
      assert.equal(await compose.count(), 1);
      const helper = page.getByRole("button", { name: "Messages not opening?", exact: true });
      assert.equal(await helper.count(), 0, "compose recovery is not initial chrome");
      assert.equal(await page.getByRole("button", { name: "Privacy & verification details", exact: true }).count(), 0);
      const switchAccount = page.getByRole("button", { name: "Switch account", exact: true });
      const switchBox = await switchAccount.boundingBox();
      assert.ok(switchBox?.height >= 44, "Switch account retains a touch-sized target");
      assert.equal(await page.getByRole("button", { name: "Sign out and use another email", exact: true }).count(), 0);
      const href = await compose.getAttribute("href");
      assert.ok(href.startsWith("sms:verify@example.invalid"));
      assert.ok(href.endsWith(`body=${encodeURIComponent(message)}`));
      const visibleText = await page.getByRole("dialog").evaluate(element => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const text = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode())
          if (!node.parentElement?.closest('[aria-hidden="true"], [inert]')) text.push(node.textContent);
        return text.join(" ");
      });
      for (const unwanted of ["Email confirmed.", "Local verification trial", "Waiting for a message.",
        "open Messages manually", "Send the trial message", "English", "한국어", message, "verify@example.invalid"])
        assert.equal(visibleText.includes(unwanted), false, `${profile}: unwanted default content ${unwanted}`);
      const check = page.getByRole("button", { name: "Check status", exact: true });
      const statusRow = page.locator("[data-verification-status-row]");
      assert.equal(await statusRow.getByRole("timer").count(), 1);
      assert.equal(await statusRow.getByRole("status").innerText(), "Waiting for message");
      const before = await check.boundingBox();
      await check.evaluate(element => {
        window.__pollButtonChanges = [];
        window.__pollButtonObserver = new MutationObserver(() => {
          window.__pollButtonChanges.push({ label: element.textContent.trim(), disabled: element.disabled,
            busy: element.getAttribute("aria-busy") });
        });
        window.__pollButtonObserver.observe(element, { attributes: true, subtree: true, childList: true, characterData: true });
      });
      for (let index = 0; index < 4; index++)
        await page.waitForResponse(response => response.request().method() === "GET"
          && response.url().endsWith(`/api/phone-verification/challenges/${challenge.id}`));
      const changes = await page.evaluate(() => { window.__pollButtonObserver.disconnect(); return window.__pollButtonChanges; });
      assert.ok(polls >= 4);
      assert.ok(changes.every(change => change.label === "Check status" && !change.disabled && change.busy !== "true"));
      assert.equal(await check.isEnabled(), true);
      const after = await check.boundingBox();
      assert.equal(Math.round(before.width), Math.round(after.width));
      assert.equal(Math.round(before.height), Math.round(after.height));
      let manualStarted = Date.now();
      await check.click();
      await page.getByRole("button", { name: "Checking…", exact: true }).waitFor();
      assert.equal(await statusRow.getByRole("status").innerText(), "Checking…");
      await page.getByRole("button", { name: "Check status", exact: true }).waitFor();
      assert.ok(Date.now() - manualStarted >= 500, "Instant pending responses must remain perceptibly Checking");
      assert.equal(await statusRow.getByRole("status").innerText(), "Still waiting");
      const pendingShot = resolve(directory, `${profile}-checked-pending.png`);
      await settleCapture(page, "[data-verification-status-row]");
      await page.screenshot({ path: pendingShot }); report.screenshots.push(pendingShot);
      failStatus = true;
      manualStarted = Date.now();
      await check.click();
      await page.getByRole("button", { name: "Checking…", exact: true }).waitFor();
      await page.getByRole("button", { name: "Check status", exact: true }).waitFor();
      assert.ok(Date.now() - manualStarted >= 500, "Instant failures must show Checking before the error");
      assert.equal(await statusRow.getByRole("status").innerText(), "Couldn't check status");
      assert.equal(await page.getByRole("heading", { name: "Account ready", exact: true }).count(), 0);
      failStatus = false;
      await check.click();
      await page.getByRole("button", { name: "Checking…", exact: true }).waitFor();
      await check.waitFor();
      assert.equal(await statusRow.getByRole("status").innerText(), "Still waiting");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const screenshot = resolve(directory, `${profile}-single-compose.png`);
      await settleCapture(page, "[data-verification-status-row]");
      await page.screenshot({ path: screenshot }); report.screenshots.push(screenshot);

      await compose.click();
      assert.equal(await helper.count(), 0);
      await elapsedSinceCompose(page, 2000);
      assert.equal(await helper.count(), 0, "help must not appear immediately after tapping");
      await helper.waitFor();
      assert.ok(await page.evaluate(() => performance.now() - window.__composeTappedAt >= 2950),
        "recovery is delayed until about three seconds after an explicit tap");
      assert.equal(await helper.getAttribute("aria-expanded"), "false");
      assert.equal(await compose.evaluate(element => element === document.activeElement), true,
        "help appearing must not move keyboard focus");
      const delayedShot = resolve(directory, `${profile}-delayed-compose-recovery.png`);
      await settleCapture(page, "[data-verification-details] button");
      await page.screenshot({ path: delayedShot }); report.screenshots.push(delayedShot);
      await helper.click();
      await page.getByText(message, { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Copy recipient", exact: true }).isVisible(), true);
      await helper.click();
      assert.equal(await helper.getAttribute("aria-expanded"), "false");
      assert.equal(await page.getByRole("button", { name: "Copy recipient", exact: true }).count(), 0);

      await compose.click();
      await page.evaluate(() => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });
      await elapsedSinceCompose(page, 3500);
      assert.equal(await helper.count(), 0, "returning from a blurred native handoff must not expose recovery");
      await compose.click();
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
        delete document.visibilityState;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await elapsedSinceCompose(page, 3500);
      assert.equal(await helper.count(), 0, "a short hidden interval permanently cancels that attempt");
      await compose.click();
      await elapsedSinceCompose(page, 2000);
      await compose.click();
      await elapsedSinceCompose(page, 2000);
      assert.equal(await helper.count(), 0, "another tap owns a fresh deadline");
      await helper.waitFor();

      receiverUnavailable = true;
      await check.click();
      await page.getByRole("button", { name: "Checking…", exact: true }).waitFor();
      await check.waitFor();
      assert.equal(await statusRow.getByRole("status").innerText(), "Message receiver unavailable");
      assert.equal(await compose.count(), 0, "offline receiver must not invite sending");
      assert.equal(await helper.count(), 0);
      assert.match(await page.getByRole("alert").innerText(), /can't receive verification messages/);
      const outageShot = resolve(directory, `${profile}-receiver-unavailable.png`);
      await settleCapture(page, '[role="alert"]');
      await page.screenshot({ path: outageShot }); report.screenshots.push(outageShot);
      const stoppedPolls = polls;
      await observeQuietWindow(page, 4500);
      assert.equal(polls, stoppedPolls, "receiver outage pauses automatic polls rather than silently waiting");
      receiverUnavailable = false;
      let releaseStatus;
      statusGate = new Promise(resolve => { releaseStatus = resolve; });
      await check.click();
      await page.getByRole("button", { name: "Checking…", exact: true }).waitFor();
      assert.equal(await compose.count(), 0,
        "a retry does not invite sending before the receiver actually responds successfully");
      releaseStatus(); statusGate = undefined;
      await check.waitFor();
      await settle(page, compose);
      assert.equal(await helper.count(), 0, "a recovered receiver must not resurrect an old helper");

      await compose.click();
      await page.getByRole("button", { name: "Cancel and edit number", exact: true }).click();
      await page.getByRole("textbox", { name: "Phone number", exact: true }).waitFor();
      await elapsedSinceCompose(page, 3500);
      assert.equal(await helper.count(), 0, "reset removes old compose-attempt observers");
      challenge = { ...challenge, id: `${challenge.id}-next` };
      await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("01012345678");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await settle(page, compose);
      assert.equal(await helper.count(), 0, "a new challenge starts without recovery chrome");
      verified = true;
      await check.click();
      await page.getByRole("button", { name: "Finish registration", exact: true }).waitFor();
      await compose.waitFor({ state: "hidden" });
      assert.equal(await page.getByRole("link", { name: "Open Messages", exact: true }).count(), 0);
      assert.equal(await page.getByRole("heading", { name: "Account ready", exact: true }).count(), 0);
      report.runs.push({ profile, passed: true, statusRequests: polls, backgroundButtonStateChanges: changes.length,
        compactStatusTimer: true, perceptibleManualPendingAndFailure: true,
        explicitDelayedRecovery: true, blurAndHiddenSuppressRecovery: true,
        repeatedTapResetsDeadline: true, receiverOutagePausesPolling: true,
        retryPreservesReceiverOutageUntilSuccess: true,
        recoveredReceiverDoesNotRestoreOldHelp: true, resetClearsRecovery: true,
        offlineReceiverBlocksChallenge: true, noRegistrationPrivacy: true, touchSizedSwitchAccount: true });
    } catch (error) {
      const failureShot = resolve(directory, `${profile}-failure.png`);
      await page.screenshot({ path: failureShot }).catch(() => undefined);
      report.screenshots.push(failureShot);
      report.failures.push({ profile, error: error instanceof Error ? error.message : "Browser assertion failed" });
      throw error;
    } finally {
      const trace = resolve(directory, `${profile}-trace.zip`);
      await context.tracing.stop({ path: trace }); report.traces.push(trace);
      await context.close();
    }
  }
  assert.equal(report.providerRequests, 0);
} finally {
  await browser.close();
  await writeFile(resolve(directory, "report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
