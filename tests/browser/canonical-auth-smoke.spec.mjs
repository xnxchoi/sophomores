// Read-only live smoke; start the local preview separately with outbound mail disabled.
// rtk proxy env BASE_URL=http://localhost:3000 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/canonical-auth-smoke.spec.mjs
// No OTP submissions, provider calls, mocked status responses, or database mutations.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3000");
assert.equal(base.protocol, "http:", "Only a local HTTP preview is allowed");
assert.equal(base.hostname, "localhost", "Use the canonical localhost origin");
assert.equal(base.username + base.password + base.search + base.hash, "");
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : "playwright");
const artifacts = resolve(process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-canonical-auth-smoke");
await mkdir(artifacts, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  base: base.origin,
  scope: "Real local render and anonymous status with outbound delivery disabled",
  limitations: ["Chromium viewport emulation only", "Not interactive OTP/session/phone enrollment E2E"],
  runs: [],
  artifactErrors: [],
};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
});

// Test-only POM; installed Playwright locators/waits are used directly rather than custom polling.
class AuthSurface {
  constructor(page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: "Log in", exact: true });
  }

  async open(path) {
    const response = await this.page.goto(new URL(path, base).href);
    assert.equal(response?.status(), 200, `${path} must render successfully`);
    if (path === "/account") {
      await this.page.getByRole("button", { name: "Log in", exact: true }).click();
      await this.dialog.waitFor({ state: "visible" });
      await this.page.getByRole("status").filter({ hasText: "Email sign-in is unavailable. Try again shortly." }).waitFor();
      await this.page.getByRole("button", { name: "Sign in with a passkey", exact: true }).waitFor({ state: "visible" });
    } else {
      await this.page.getByRole("heading", { name: "Staff sign in", exact: true }).waitFor();
      await this.page.getByText("Sign-in is unavailable. Try again shortly.", { exact: true }).waitFor();
    }
    await this.page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations()
        .filter(animation => animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity)
        .map(animation => animation.finished));
    });
  }
}

try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 650 }]) {
    for (const path of ["/account", "/admin/login"]) {
      const context = await browser.newContext({ viewport, serviceWorkers: "block" });
      const forbiddenRequests = [];
      const emptyIdentifierCleanups = [];
      const runtimeErrors = [];
      const consoleErrors = [];
      assert.deepEqual(await context.cookies(), [], "Each case must start without cookies");
      // No response mocks. The only non-read exception clears an ABSENT identifier cookie:
      // identifier-http.ts:100-110 calls identifier.clear (DB) only when that cookie has a token.
      await context.route("**/*", async route => {
        const request = route.request();
        const url = new URL(request.url());
        const headers = await request.allHeaders();
        const emptyIdentifierCleanup = url.origin === base.origin && url.pathname === "/api/member/identify"
          && !url.search && request.method() === "DELETE" && request.postData() === null
          && headers.origin === base.origin
          && !(headers.cookie ?? "").split(";").some(part => part.trim().startsWith("sophomores-phone-identifier="));
        if (url.origin !== base.origin || (!["GET", "HEAD"].includes(request.method()) && !emptyIdentifierCleanup)) {
          forbiddenRequests.push(`${request.method()} ${request.url()}`);
          await route.abort();
          return;
        }
        if (emptyIdentifierCleanup) emptyIdentifierCleanups.push(request.url());
        await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      page.on("pageerror", error => runtimeErrors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      const label = `${path === "/account" ? "account" : "admin-login"}-${viewport.width}x${viewport.height}`;
      await context.tracing.start({ screenshots: true, snapshots: true });
      let failure;
      try {
        const surface = new AuthSurface(page);
        await surface.open(path);
        const names = path === "/account"
          ? ["Continue"]
          : ["Email a code", "Email a magic link"];
        for (const name of names) {
          const control = page.getByRole("button", { name, exact: true });
          assert.equal(await control.isDisabled(), true, `${label}: ${name} must be disabled`);
          assert.equal(await control.evaluate(element => element.disabled), true, `${name} needs native disabled`);
        }
        if (path === "/account") {
          const passkey = page.getByRole("button", { name: "Sign in with a passkey", exact: true });
          assert.equal(await passkey.isEnabled(), true, "Configured passkey sign-in stays available");
          assert.equal(await page.getByRole("button", { name: "Continue with Google", exact: true }).count(), 0);
          await page.getByRole("button", { name: "More options", exact: true }).click();
          assert.equal(await page.getByRole("button", { name: "Send a magic link", exact: true }).count(), 0);
          await page.getByRole("button", { name: "Use phone to identify account", exact: true }).waitFor({ state: "visible" });
          await page.getByRole("button", { name: "More options", exact: true }).click();
        }
        const status = await page.evaluate(async () => {
          const response = await fetch("/api/member/status", { signal: AbortSignal.timeout(15_000) });
          return { status: response.status, body: await response.json() };
        });
        assert.deepEqual(status, {
          status: 200,
          body: { success: true, data: {
            authenticated: false, emailVerified: false, phoneBound: false, member: false,
            capabilities: { emailOtp: false, magicLink: false, google: false, passkey: true },
          } },
        }, `${label}: anonymous status must be real, public-only and delivery-disabled`);
        const geometry = await page.evaluate(() => ({
          width: innerWidth, height: innerHeight,
          contentWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        assert.equal(geometry.width, viewport.width);
        assert.equal(geometry.height, viewport.height);
        assert.ok(geometry.contentWidth <= geometry.clientWidth, `${label}: horizontal overflow`);
        assert.equal(await page.getByRole("dialog", { name: /runtime error|build error/i }).count(), 0);
        assert.equal(await page.getByRole("button", { name: /\b(checkout|pay now|place order|complete payment)\b/i }).count(), 0);
        assert.equal(await page.locator('a[href*="/checkout"], a[href*="/payment"], form[action*="checkout"]').count(), 0);
        await page.screenshot({ path: resolve(artifacts, `${label}.png`) });
        const controls = path === "/account"
          ? [page.getByRole("textbox", { name: "Email address", exact: true }),
            page.getByRole("button", { name: "Refresh account status", exact: true })]
          : [page.getByRole("textbox", { name: "Email *", exact: true }),
            ...names.map(name => page.getByRole("button", { name, exact: true }))];
        for (const control of controls) {
          await control.scrollIntoViewIfNeeded();
          const box = await control.boundingBox();
          assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width
            && box.y + box.height <= viewport.height, `${label}: essential control must be reachable`);
        }
        if (path === "/account") {
          const cancel = page.getByRole("button", { name: "Cancel", exact: true });
          const box = await cancel.boundingBox();
          assert.ok(box && box.y >= 0 && box.y + box.height <= viewport.height, "Cancel must stay reachable");
          await page.screenshot({ path: resolve(artifacts, `${label}-scrolled.png`) });
        }
        assert.deepEqual(forbiddenRequests, [], "No provider or mutation request is permitted");
        assert.deepEqual(runtimeErrors, [], "No browser runtime errors");
        assert.deepEqual(consoleErrors, [], "No browser console errors");
        report.runs.push({ path, viewport, status: "PASS", anonymousStatus: status.body, geometry, emptyIdentifierCleanups });
      } catch (error) {
        failure = error;
        try {
          await page.screenshot({ path: resolve(artifacts, `${label}-failure.png`) });
        } catch (artifactError) {
          report.artifactErrors.push(`${label} screenshot: ${artifactError}`);
        }
        report.runs.push({ path, viewport, status: "FAIL", error: String(error), runtimeErrors, consoleErrors, forbiddenRequests });
      } finally {
        try {
          await context.tracing.stop({ path: resolve(artifacts, `${label}-trace.zip`) });
        } catch (artifactError) {
          report.artifactErrors.push(`${label} trace: ${artifactError}`);
          failure ??= artifactError;
        } finally {
          await context.close();
        }
      }
      if (failure) throw failure;
    }
  }
  report.status = "PASS";
  console.log(`PASS: ${report.runs.length} canonical auth read-only browser cases; artifacts ${artifacts}`);
} catch (error) {
  report.status = "FAIL";
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  try {
    await writeFile(resolve(artifacts, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}
