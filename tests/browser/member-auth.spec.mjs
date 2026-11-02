// Render/interaction acceptance against a running LOCAL account study.
// Every mutation and WebAuthn challenge is intercepted; no working DB/provider changes.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3240");
assert.equal(base.protocol, "http:");
assert.equal(base.hostname, "localhost");
const repetitions = Number(process.env.REPEAT ?? 3);
assert.ok(Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 5);
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : "playwright");
const artifactDirectory = resolve(process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-member-ui");
await mkdir(artifactDirectory, { recursive: true });
const report = { startedAt: new Date().toISOString(), base: base.origin, repetitions, runs: [], screenshots: [],
  scope: "Live local rendered shell; real read-only capabilities; fixture-only mutations and pending/member states",
  assertions: [
    "Chooser initializes no account API session until a flow is selected",
    "Unavailable providers are absent; email Continue is disabled with concise recovery guidance",
    "Focused tray ignores Escape/backdrop dismissal and exposes Cancel rather than a close control",
    "Eight consecutive keyboard Tab presses remain inside the focused dialog",
    "Cancel returns to the chooser and disposes email/phone-selection/error state",
    "Chooser dismissal restores focus to its launcher",
    "Desktop and short-mobile dialog frames fit the viewport without horizontal document overflow",
    "Phone Continue and Finish registration controls are reachable by tray scrolling",
    "Email border and radius remain neutral/rounded despite legacy global styles",
    "Phone-proof binding guidance has settled descendant motion and at least 4.5:1 text contrast",
    "Passkey cancellation never reports enrollment or account success",
    "Phone identification never reveals an email and still requires a credential",
    "A verified phone fixture does not activate membership before explicit binding and fresh authoritative status",
  ],
  motionPolicy: "No reduced-motion emulation, animation disabling or motion opt-out was used",
  contrastProbe: [],
  limitations: ["No real provider or working-database writes", "No actual email or Google callback proof", "Chromium viewport emulation, not physical mobile/Safari acceptance"] };
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });

async function settle(page) {
  await page.evaluate(async () => {
    await Promise.allSettled(document.getAnimations().filter(animation => animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished));
    await new Promise(requestAnimationFrame);
  });
}
async function frameFits(page) {
  const box = await page.getByRole("dialog").boundingBox();
  assert.ok(box);
  const viewport = page.viewportSize();
  assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, "Tray must stay within the viewport");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No horizontal document overflow");
}
async function screenshot(page, name) {
  await settle(page);
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog || dialog.querySelector('[aria-busy="true"]')) return false;
    const buttons = [...dialog.querySelectorAll("button")];
    const labels = ["Add a passkey", "Finish registration", "Use this phone", "Sign in with a passkey", "Continue", "Log in"];
    const probe = labels.map(label => buttons.find(button => button.textContent?.replace(/[↗+]/g, "").trim() === label)).find(Boolean);
    if (!probe) return false;
    const opaque = element => {
      for (let current = element; current && current !== dialog; current = current.parentElement)
        if (Number(getComputedStyle(current).opacity) < 0.99) return false;
      return true;
    };
    if (!opaque(probe.parentElement)) return false;
    // The Finish control is outside the legacy trial's nested AnimatePresence.
    // Its status paragraph must settle independently before visual acceptance.
    for (const paragraph of dialog.querySelectorAll('p[role="status"]'))
      if (paragraph.getClientRects().length && !opaque(paragraph)) return false;
    return true;
  });
  await frameFits(page);
  const path = resolve(artifactDirectory, `${name}.png`);
  await page.screenshot({ path });
  report.screenshots.push(path);
}
async function reachable(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const bounds = await locator.boundingBox();
  assert.ok(bounds && bounds.y >= -1 && bounds.y + bounds.height <= page.viewportSize().height + 1, "Action must be reachable within the viewport after tray scrolling");
}
async function probePhoneDescription(page, profile) {
  const paragraph = page.locator("[data-member-phone-binding-description]");
  const measure = async at => ({ at, chain: await paragraph.evaluate(element => {
    const chain = [];
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      chain.push({ tag: current.tagName, color: style.color, opacity: style.opacity, background: style.backgroundColor, filter: style.filter });
      if (current.getAttribute("role") === "dialog") break;
    }
    return chain;
  }) });
  const samples = [await measure("initial")];
  // Deliberate diagnostic sampling requested at one and three seconds, not test synchronization.
  await new Promise(resolveSample => setTimeout(resolveSample, 1000));
  samples.push(await measure("1s"));
  await new Promise(resolveSample => setTimeout(resolveSample, 2000));
  samples.push(await measure("3s"));
  report.contrastProbe.push({ profile, samples });
}
async function assertPhoneDescriptionContrast(page) {
  const paragraph = page.locator("[data-member-phone-binding-description]");
  await page.waitForFunction(() => {
    const paragraph = document.querySelector("[data-member-phone-binding-description]");
    if (!paragraph) return false;
    for (let element = paragraph; element && element.getAttribute("role") !== "dialog"; element = element.parentElement)
      if (Number(getComputedStyle(element).opacity) < 0.99) return false;
    return true;
  });
  const contrast = await paragraph.evaluate(element => {
    const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
    context.fillStyle = "#000";
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = getComputedStyle(element.closest('[role="dialog"]')).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const background = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    const foreground = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const luminance = channels => channels.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const first = luminance(foreground), second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  });
  assert.ok(contrast >= 4.5, "Settled phone-proof binding guidance must meet ordinary-text contrast");
  return Number(contrast.toFixed(2));
}
const realOnly = { authenticated: false, emailVerified: false, phoneBound: false, member: false,
  capabilities: { emailOtp: false, magicLink: false, google: false, passkey: true } };

class AccountPage {
  constructor(page) { this.page = page; }
  button(name) { return this.page.getByRole("button", { name, exact: true }); }
  async open() {
    await this.page.goto(new URL("/account", base).href);
    await this.page.getByRole("heading", { name: "Welcome", exact: true }).waitFor();
    await settle(this.page);
  }
  async choose(flow, expectedHeading = flow) {
    await this.button(flow).click();
    await this.page.getByRole("heading", { name: expectedHeading, exact: true }).waitFor();
    if (expectedHeading === "Log in") {
      await this.button("Sign in with a passkey").waitFor({ state: "visible" });
      await this.page.waitForFunction(() => {
        const button = [...document.querySelectorAll('[role="dialog"] button')]
          .find(control => control.textContent?.trim() === "Sign in with a passkey");
        return button && !button.disabled;
      });
    } else if (expectedHeading === "Verify your phone to finish") {
      await this.page.getByRole("textbox", { name: "Phone number", exact: true }).waitFor();
    }
    await settle(this.page);
  }
  async back() {
    await this.button("Cancel").click();
    await this.page.getByRole("heading", { name: "Welcome", exact: true }).waitFor();
    await settle(this.page);
  }
}

let phase = "initial";
try {
  for (const [profile, viewport] of [["desktop", { width: 1280, height: 900 }], ["short-mobile", { width: 390, height: 650 }]]) {
    for (let repetition = 1; repetition <= repetitions; repetition++) {
      let statusReads = 0, mutationsIntercepted = 0, externalRequests = 0;
      let fixture = null;
      const challenge = { id: randomUUID(), recipient: "verify@example.invalid", body: `SPHMRS ${"A".repeat(43)}`,
        expiresAt: new Date(Date.now() + 300000).toISOString(), mode: "trial" };
      const context = await browser.newContext({ viewport, ...(profile === "short-mobile" ? { isMobile: true, hasTouch: true } : {}) });
      await context.addInitScript(() => {
        Object.defineProperty(navigator.credentials, "get", { configurable: true, value: async () => { throw new DOMException("Synthetic cancellation", "NotAllowedError"); } });
        Object.defineProperty(navigator.credentials, "create", { configurable: true, value: async () => { throw new DOMException("Synthetic cancellation", "NotAllowedError"); } });
      });
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== base.origin) { externalRequests++; return route.abort(); }
        if (url.pathname === "/api/member/status") {
          statusReads++;
          if (fixture) return route.fulfill({ json: { success: true, data: fixture } });
          return route.continue();
        }
        if (url.pathname === "/api/member/identify") {
          mutationsIntercepted++;
          return route.fulfill({ json: { success: true, data: { identified: request.method() === "POST" } } });
        }
        if (url.pathname === "/api/auth/passkey/generate-authenticate-options" || url.pathname === "/api/auth/passkey/generate-register-options") {
          mutationsIntercepted++;
          return route.fulfill({ json: url.pathname.includes("authenticate")
            ? { challenge: "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE", rpId: "localhost", userVerification: "required", allowCredentials: [] }
            : { challenge: "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE", rp: { id: "localhost", name: "Fixture" }, user: { id: "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE", name: "fixture", displayName: "Fixture" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }] } });
        }
        if (url.pathname === "/api/phone-verification/challenges" && request.method() === "POST") {
          mutationsIntercepted++;
          return route.fulfill({ status: 201, json: { success: true, data: challenge } });
        }
        if (url.pathname === `/api/phone-verification/challenges/${challenge.id}` && request.method() === "GET") {
          mutationsIntercepted++;
          return route.fulfill({ json: { success: true, data: { id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" } } });
        }
        if (url.pathname === "/api/phone-verification/bind") {
          mutationsIntercepted++;
          fixture = { ...realOnly, authenticated: true, emailVerified: true, phoneBound: true, member: true };
          return route.fulfill({ json: { success: true, data: { phoneBound: true, member: true } } });
        }
        if (url.pathname.startsWith("/api/") && request.method() !== "GET") {
          mutationsIntercepted++;
          return route.fulfill({ status: 503, json: { success: false, error: { code: "UNAVAILABLE" } } });
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const account = new AccountPage(page);
      try {
        phase = `${profile}-${repetition}-chooser`;
        await account.open();
        assert.equal(statusReads, 0, "Chooser must not initialize an account flow");
        if (repetition === 1) await screenshot(page, `${profile}-chooser`);
        await account.choose("Log in");
        phase = `${profile}-${repetition}-disabled-capabilities`;
        assert.equal(await account.button("Continue with Google").count(), 0, "Unconfigured Google must not be offered");
        assert.equal(await account.button("Continue").isDisabled(), true, "Unconfigured email codes must not be submitted");
        assert.equal(await account.button("Continue").evaluate(button => button.disabled), true, "Unavailable email needs native disabled");
        await page.getByRole("status").filter({ hasText: "Email sign-in is unavailable. Try again shortly." }).waitFor();
        await account.button("More options").click();
        assert.equal(await account.button("Send a magic link").count(), 0, "Unconfigured email links must not be offered");
        await account.button("Use phone to identify account").waitFor({ state: "visible" });
        await account.button("More options").click();
        const emailStyle = await page.getByRole("textbox", { name: "Email address", exact: true }).evaluate(element => {
          const style = getComputedStyle(element);
          const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
          context.fillStyle = style.borderBottomColor;
          context.fillRect(0, 0, 1, 1);
          return { border: parseFloat(style.borderTopWidth), radius: parseFloat(style.borderRadius), color: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3) };
        });
        assert.ok(emailStyle.border >= 1 && emailStyle.radius >= 8, "Email field must retain rounded neutral borders despite legacy globals");
        const borderChannels = emailStyle.color;
        assert.equal(borderChannels.length, 3, "Computed field border must have RGB channels");
        assert.ok(Math.max(...borderChannels) - Math.min(...borderChannels) <= 3, "Email field border must be neutral, not a legacy accent");
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog").count(), 1, "Focused tray must ignore Escape");
        assert.equal(await account.button("Close account options").count(), 0, "Focused tray must not expose the chooser dismissal control");
        await page.mouse.click(viewport.width - 5, Math.floor(viewport.height / 2));
        assert.equal(await page.getByRole("dialog").count(), 1);
        for (let tab = 0; tab < 8; tab++) {
          await page.keyboard.press("Tab");
          assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), true, "Focus must stay in the focused tray");
        }
        if (repetition === 1) await screenshot(page, `${profile}-login`);
        phase = `${profile}-${repetition}-passkey-cancellation`;
        await account.button("Sign in with a passkey").click();
        await page.getByRole("status").filter({ hasText: "Passkey cancelled. Choose another method." }).waitFor();
        assert.equal(await page.getByText("Account ready", { exact: true }).count(), 0);
        phase = `${profile}-${repetition}-phone-selector`;
        await account.button("More options").click();
        await account.button("Use phone to identify account").click();
        await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("01012345678");
        if (repetition === 1) await screenshot(page, `${profile}-phone-selector`);
        await account.button("Use this phone").click();
        await page.getByText(/Phone selected\. Enter your email/).waitFor();
        assert.equal(await page.getByRole("textbox", { name: "Email address", exact: true }).inputValue(), "");
        await account.button("More options").click();
        await account.button("Change identifier").click();
        await page.getByRole("textbox", { name: "Email address", exact: true }).fill("synthetic@fixture.invalid");
        await account.back();
        await account.choose("Log in");
        assert.equal(await page.getByRole("textbox", { name: "Email address", exact: true }).inputValue(), "");
        assert.equal(await page.getByRole("alert").count(), 0);
        await account.back();
        await account.button("Close account options").click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page.waitForFunction(() => document.activeElement?.textContent?.includes("Open account options"));
        await account.button("Open account options").click();
        await page.getByRole("heading", { name: "Welcome", exact: true }).waitFor();
        phase = `${profile}-${repetition}-fixture-phone-binding`;
        fixture = { ...realOnly, authenticated: true, emailVerified: true };
        await account.choose("Sign up", "Verify your phone to finish");
        await page.getByText("Verify your phone to finish", { exact: true }).waitFor();
        await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("01012345678");
        if (repetition === 1) await screenshot(page, `${profile}-pending-phone`);
        phase = `${profile}-${repetition}-fixture-phone-proof`;
        await reachable(page, account.button("Continue"));
        await account.button("Continue").click();
        await account.button("Finish registration").waitFor();
        assert.equal(await page.getByText("Account ready", { exact: true }).count(), 0);
        if (process.env.CONTRAST_PROBE === "1" && repetition === 1) await probePhoneDescription(page, profile);
        const phoneDescriptionContrast = await assertPhoneDescriptionContrast(page);
        if (repetition === 1) await screenshot(page, `${profile}-phone-proof-fixture`);
        phase = `${profile}-${repetition}-fixture-member`;
        await reachable(page, account.button("Finish registration"));
        await account.button("Finish registration").click();
        await page.getByText("Account ready", { exact: true }).waitFor();
        if (repetition === 1) await screenshot(page, `${profile}-member-fixture`);
        phase = `${profile}-${repetition}-optional-passkey-cancellation`;
        await account.button("Add a passkey").click();
        await page.getByRole("status").filter({ hasText: "Passkey sign-in was cancelled. Try again or use another sign-in method." }).waitFor();
        assert.equal(await page.getByText(/Passkey added/i).count(), 0);
        assert.equal(externalRequests, 0, "No external request may be dispatched");
        report.runs.push({ profile, repetition, passed: true, mutationsIntercepted, statusReads, phoneDescriptionContrast, backendStateWasFixtureForPhoneStep: true });
      } finally { await context.close(); }
    }
  }
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failedPhase = phase;
  report.failureType = error?.name ?? "Error";
  report.failureMessage = String(error?.message ?? "Unknown failure").split("\n")[0].slice(0, 250);
  if (["boolean", "number"].includes(typeof error?.actual)) report.failureActual = error.actual;
  if (["boolean", "number"].includes(typeof error?.expected)) report.failureExpected = error.expected;
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(artifactDirectory, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, runs: report.runs.length, failedPhase: report.failedPhase, artifactDirectory,
    workingDatabaseWrites: false, realProvidersContacted: false }));
}
