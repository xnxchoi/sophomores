// Local callback UI regression. Every API response is a fixture; providers are blocked.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3240");
assert.equal(base.protocol, "http:");
assert.equal(base.hostname, "localhost");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
    : "playwright"
);
const directory = resolve(
  process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-member-continuation"
);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
    : {})
});
process.once("SIGTERM", async () => {
  try { await browser.close(); } finally { process.exit(143); }
});
const anonymous = {
  authenticated: false,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities: {
    google: true,
    emailOtp: false,
    magicLink: false,
    passkey: true
  }
};
const pending = { ...anonymous, authenticated: true, emailVerified: true };
const active = { ...pending, phoneBound: true, member: true };
const report = {
  runs: [],
  screenshots: [],
  scope:
    "Fixture-only callback redirect and rendered continuation; no real Google or working database writes"
};

async function settle(page) {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog || dialog.querySelector('[aria-busy="true"]')) return false;
    const content = dialog.querySelector(
      "[data-member-account-flow], [data-member-account-chooser]"
    );
    if (!content) return false;
    // Inactive locale/decorative controls intentionally retain partial opacity.
    // Wait for the actual field/action and its transitioning ancestors instead.
    const probe = content.querySelector("input, button");
    if (!probe) return false;
    for (
      let element = probe;
      element && element !== dialog;
      element = element.parentElement
    )
      if (Number(getComputedStyle(element).opacity) < 0.99) return false;
    return true;
  });
}

try {
  for (const [profile, viewport] of [
    ["desktop", { width: 1280, height: 900 }],
    ["short-mobile", { width: 390, height: 650 }]
  ]) {
    const context = await browser.newContext({ viewport });
    let status = anonymous;
    let statusReads = 0;
    let googleRequests = 0;
    let externalRequests = 0;
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== base.origin) {
        externalRequests++;
        return route.abort();
      }
      if (url.pathname === "/api/member/status") {
        statusReads++;
        return route.fulfill({ json: { success: true, data: status } });
      }
      if (url.pathname === "/api/auth/sign-in/social") {
        googleRequests++;
        const body = request.postDataJSON();
        assert.equal(body.provider, "google");
        assert.equal(body.callbackURL, "/account/continue");
        status = pending;
        return route.fulfill({
          json: {
            url: `${base.origin}/account/continue`,
            redirect: true
          }
        });
      }
      if (
        url.pathname === "/api/member/identify" &&
        request.method() === "DELETE"
      )
        return route.fulfill({
          json: { success: true, data: { identified: false } }
        });
      if (url.pathname.startsWith("/api/"))
        return route.fulfill({
          status: 503,
          json: { success: false, error: { code: "UNAVAILABLE" } }
        });
      return route.continue();
    });
    const page = await context.newPage();
    try {
      await page.goto(`${base.origin}/account`);
      await page
        .getByRole("heading", { name: "Welcome", exact: true })
        .waitFor();
      assert.equal(statusReads, 0);
      await page.getByRole("button", { name: "Sign up", exact: true }).click();
      await page
        .getByRole("button", { name: "Continue with Google", exact: true })
        .click();
      await page.waitForURL(`${base.origin}/account/continue`);
      await page
        .getByRole("heading", {
          name: "Finish setting up your account",
          exact: true
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("textbox", { name: "Phone number", exact: true })
          .count(),
        0
      );
      await page.getByRole("button", { name: "Continue registration", exact: true }).waitFor();
      await settle(page);
      const gateImage = resolve(directory, `${profile}-setup-gate.png`);
      await page.screenshot({ path: gateImage });
      report.screenshots.push(gateImage);
      await page
        .getByRole("button", { name: "Continue registration", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Phone number", exact: true })
        .waitFor();
      await page.waitForFunction(() => document.activeElement?.id === "member-phone-heading");
      assert.equal(googleRequests, 1);
      assert.equal(
        await page
          .getByRole("heading", { name: "Welcome", exact: true })
          .count(),
        0
      );
      assert.equal(
        await page
          .getByRole("heading", { name: "Account ready", exact: true })
          .count(),
        0
      );
      await settle(page);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        ),
        true
      );
      const frame = await page.getByRole("dialog").boundingBox();
      assert.ok(
        frame &&
          frame.x >= -1 &&
          frame.y >= -1 &&
          frame.x + frame.width <= viewport.width + 1 &&
          frame.y + frame.height <= viewport.height + 1
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("textbox", { name: "Phone number", exact: true })
        .waitFor();
      for (let tab = 0; tab < 6; tab++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await page.evaluate(() =>
            Boolean(document.activeElement?.closest('[role="dialog"]'))
          ),
          true
        );
      }
      const image = resolve(
        directory,
        `${profile}-google-phone-continuation.png`
      );
      await page.screenshot({ path: image });
      report.screenshots.push(image);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page
        .getByRole("heading", { name: "Welcome", exact: true })
        .waitFor();
      await settle(page);
      assert.equal(
        await page
          .getByRole("textbox", { name: "Phone number", exact: true })
          .count(),
        0
      );

      status = active;
      await page.goto(`${base.origin}/account/continue`);
      await page
        .getByRole("button", { name: "Add a passkey", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("heading", { name: "Account ready", exact: true })
          .count(),
        1
      );
      status = anonymous;
      await page.goto(`${base.origin}/account/continue`);
      await page.getByRole("textbox", { name: "Email", exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("heading", { name: "Account ready", exact: true })
          .count(),
        0
      );
      assert.equal(
        await page
          .getByRole("textbox", { name: "Phone number", exact: true })
          .count(),
        0
      );
      assert.equal(externalRequests, 0);
      report.runs.push({
        profile,
        passed: true,
        googleRequests,
        externalRequests
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(
    resolve(directory, "report.json"),
    JSON.stringify(report, null, 2)
  );
}
console.log(JSON.stringify(report));
