// Local UI-only acceptance. Never submits email, phone, OTP, or provider actions.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3217");
assert.ok(
  ["localhost", "127.0.0.1"].includes(base.hostname),
  "Use a loopback preview only"
);
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
    : "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
    : {})
});
const artifacts = resolve(
  process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-chooser-layout"
);
await mkdir(artifacts, { recursive: true });
const report = {
  scope:
    "Chooser layout corrections only; no backend, OTP submission, or revised focused Back/Cancel acceptance",
  runs: []
};

async function settle(page) {
  await page.evaluate(async () => {
    const start = performance.now();
    let previous = "";
    let stable = 0;
    while (performance.now() - start < 3000 && stable < 12) {
      await new Promise(requestAnimationFrame);
      const element = document.querySelector("[data-verification-sheet]");
      const rect = element?.getBoundingClientRect();
      const next = rect
        ? [rect.x, rect.y, rect.width, rect.height]
            .map((value) => Math.round(value * 10))
            .join()
        : "closed";
      stable = next === previous ? stable + 1 : 0;
      previous = next;
    }
  });
}

try {
  for (const viewport of [
    { width: 714, height: 890 },
    { width: 390, height: 844 },
    { width: 319, height: 560 }
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    const apiCalls = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
        if (url.pathname.startsWith("/api/")) apiCalls.push(url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    let metrics;
    try {
      await page.goto(new URL("/studies/verification", base).href);
      const chooser = page.locator("[data-authentication-entry]");
      await chooser.waitFor();
      await settle(page);
      const sheet = page.locator("[data-verification-sheet]");
      const originalSheet = await sheet.elementHandle();
      assert.deepEqual(
        await chooser
          .locator("[data-authentication-choice]")
          .evaluateAll((elements) =>
            elements.map((element) => element.dataset.authenticationChoice)
          ),
        ["signup", "login"]
      );
      metrics = await sheet.evaluate((element) => {
        const rect = (target) => {
          const value = target.getBoundingClientRect();
          return {
            top: value.top,
            right: value.right,
            bottom: value.bottom,
            left: value.left,
            width: value.width,
            height: value.height
          };
        };
        const signup = element.querySelector(
          '[data-authentication-choice="signup"]'
        );
        const login = element.querySelector(
          '[data-authentication-choice="login"]'
        );
        const separator = element.querySelector(
          "[data-authentication-alternative]"
        );
        const language = element.querySelector("[data-authentication-locale]");
        const close = element.querySelector("[data-authentication-close]");
        const title = element.querySelector("h2");
        const closeDisc = close?.querySelector(
          "[data-authentication-close-disc]"
        );
        const localeSelect = language?.querySelector("select");
        if (
          !signup ||
          !login ||
          !separator ||
          !language ||
          !close ||
          !closeDisc ||
          !title ||
          !localeSelect
        )
          return { missing: true };
        let header = title.parentElement;
        while (header && getComputedStyle(header).position !== "sticky")
          header = header.parentElement;
        if (!header) return { missing: true };
        const signupStyle = getComputedStyle(signup);
        const loginStyle = getComputedStyle(login);
        return {
          sheet: rect(element),
          header: rect(header),
          surfaceRadius: getComputedStyle(element).borderTopLeftRadius,
          titleFontSize: getComputedStyle(title).fontSize,
          titleFontWeight: getComputedStyle(title).fontWeight,
          signupRadius: signupStyle.borderTopLeftRadius,
          loginRadius: loginStyle.borderTopLeftRadius,
          signupFontSize: signupStyle.fontSize,
          loginFontSize: loginStyle.fontSize,
          signupAlignment: signupStyle.justifyContent,
          loginAlignment: loginStyle.justifyContent,
          signup: rect(signup),
          login: rect(login),
          separator: rect(separator),
          language: rect(language),
          close: rect(close),
          closeDisc: rect(closeDisc),
          title: rect(title),
          localeSelect: rect(localeSelect),
          signupText: signup.textContent.trim(),
          loginText: login.textContent.trim(),
          trayWordmark:
            Boolean(element.querySelector("[data-brand-mark]")) ||
            /sophomores/i.test(element.textContent),
          titleInPanel: Boolean(title.closest("[data-authentication-entry]")),
          separatorDecorations: separator.querySelectorAll(
            '[aria-hidden="true"]'
          ).length,
          localeButtons: language.querySelectorAll("button").length,
          separatorText: separator.textContent.trim(),
          primaryWhite: signup.classList.contains("bg-white"),
          secondaryWhite: login.classList.contains("bg-white"),
          horizontalOverflow:
            element.scrollWidth > element.clientWidth + 1 ||
            document.documentElement.scrollWidth > innerWidth + 1
        };
      });
      assert.equal(
        metrics.missing,
        undefined,
        "All chooser layout landmarks must exist"
      );
      const leftInset = metrics.signup.left - metrics.sheet.left;
      const rightInset = metrics.sheet.right - metrics.signup.right;
      assert.ok(
        Math.abs(leftInset - rightInset) <= 1,
        "action gutters must be symmetric, with no reserved scrollbar gap"
      );
      assert.ok(
        Math.abs(leftInset - 16) <= 1 && Math.abs(rightInset - 16) <= 1,
        "actions use equal 16px surface insets"
      );
      assert.ok(
        Math.abs(metrics.login.left - metrics.signup.left) <= 1 &&
          Math.abs(metrics.login.right - metrics.signup.right) <= 1,
        "both actions share the same content edges"
      );
      // Bare heading text needs more optical inset than a rounded action surface.
      // This intentional 24px/16px distinction follows the user's latest feedback.
      assert.ok(
        Math.abs(metrics.title.left - metrics.sheet.left - 24) <= 1,
        "bare title uses a deliberate 24px optical inset, not the 16px button edge"
      );
      assert.ok(
        Math.abs(metrics.header.height - 72) <= 1,
        "header leaves the requested 72px breathing space around the bare title"
      );
      assert.equal(metrics.surfaceRadius, "32px");
      assert.equal(metrics.titleFontSize, "18px");
      assert.equal(metrics.titleFontWeight, "500");
      for (const kind of ["signup", "login"]) {
        assert.ok(
          Math.abs(metrics[kind].height - 52) <= 1,
          "actions match at 52px high"
        );
        assert.equal(metrics[`${kind}Radius`], "16px");
        assert.equal(metrics[`${kind}FontSize`], "15px");
        assert.equal(metrics[`${kind}Alignment`], "center");
      }
      assert.ok(
        Math.abs(metrics.separator.height - 24) <= 1,
        "Or uses a restrained 24px divider gap"
      );
      assert.ok(
        Math.abs(metrics.sheet.bottom - metrics.language.bottom - 8) <= 1,
        "locale utility leaves only an 8px bottom inset"
      );
      assert.ok(
        Math.abs(metrics.sheet.right - metrics.close.right - 6) <= 1 &&
          Math.abs(metrics.close.top - metrics.sheet.top - 6) <= 1,
        "close hit area sits at the 6px corner inset"
      );
      assert.ok(
        Math.abs(metrics.closeDisc.width - 28) <= 1 &&
          Math.abs(metrics.closeDisc.height - 28) <= 1,
        "close visually uses a restrained 28px inner disc without shrinking its hit target"
      );
      assert.equal(metrics.primaryWhite, true);
      assert.equal(metrics.secondaryWhite, false);
      assert.equal(metrics.separatorText, "Or");
      assert.equal(
        metrics.separatorDecorations,
        0,
        "Or is text-only, not a lined rule"
      );
      assert.equal(
        metrics.trayWordmark,
        false,
        "no wordmark belongs in the authentication tray"
      );
      assert.equal(
        metrics.titleInPanel,
        false,
        "Welcome belongs in the same header row as Close"
      );
      assert.equal(metrics.signupText, "회원가입");
      assert.equal(metrics.loginText, "로그인");
      assert.equal(
        metrics.localeButtons,
        0,
        "language selection is a quiet select, not two competing actions"
      );
      assert.ok(
        metrics.localeSelect.height >= 44,
        "locale select retains a 44px touch target"
      );
      assert.ok(
        Math.abs(
          metrics.title.top +
            metrics.title.height / 2 -
            (metrics.close.top + metrics.close.height / 2)
        ) <= 8,
        "title and Close align in one header row"
      );
      assert.ok(
        metrics.signup.bottom <= metrics.separator.top + 1,
        "Or follows the primary signup row"
      );
      assert.ok(
        metrics.separator.bottom <= metrics.login.top + 1,
        "Or precedes the secondary login row"
      );
      assert.ok(
        metrics.login.bottom <= metrics.language.top + 1,
        "Language belongs below the actions"
      );
      assert.ok(
        metrics.close.width >= 44 && metrics.close.height >= 44,
        "Close keeps a 44px hit target"
      );
      assert.ok(
        metrics.sheet.right - metrics.close.right >= -1 &&
          metrics.sheet.right - metrics.close.right <= 12.5,
        "Close is near the outer right edge"
      );
      assert.ok(
        metrics.close.top - metrics.sheet.top >= -1 &&
          metrics.close.top - metrics.sheet.top <= 12.5,
        "Close is near the outer top edge"
      );
      assert.equal(metrics.horizontalOverflow, false);
      await page.screenshot({
        path: resolve(artifacts, `chooser-${viewport.width}.png`)
      });
      await page
        .getByRole("combobox", { name: "언어", exact: true })
        .selectOption("en");
      await page
        .getByRole("button", { name: "Sign up", exact: true })
        .waitFor();
      await page
        .getByRole("combobox", { name: "Language", exact: true })
        .selectOption("ko");
      await page
        .getByRole("button", { name: "회원가입", exact: true })
        .waitFor();
      await chooser.locator('[data-authentication-choice="signup"]').click();
      await page.locator("#pv-phone").waitFor();
      await settle(page);
      assert.equal(await sheet.locator("[data-brand-mark]").count(), 0);
      assert.equal(/sophomores/i.test(await sheet.textContent()), false);
      assert.equal(
        await sheet.evaluate(
          (node, original) => node === original,
          originalSheet
        ),
        true,
        "Signup retains the same Vaul surface"
      );
      await page.screenshot({
        path: resolve(artifacts, `signup-${viewport.width}.png`)
      });
      await page.locator("[data-authentication-cancel]").click();
      await chooser.waitFor();
      await settle(page);
      await chooser.locator('[data-authentication-choice="login"]').click();
      await page
        .getByRole("textbox", { name: "이메일 주소", exact: true })
        .waitFor();
      await settle(page);
      assert.equal(await sheet.locator("[data-brand-mark]").count(), 0);
      assert.equal(/sophomores/i.test(await sheet.textContent()), false);
      assert.equal(
        await sheet.evaluate(
          (node, original) => node === original,
          originalSheet
        ),
        true,
        "Login retains the same Vaul surface"
      );
      await page.screenshot({
        path: resolve(artifacts, `login-${viewport.width}.png`)
      });
      await page.locator("[data-authentication-cancel]").click();
      await chooser.waitFor();
      await settle(page);
      await page.locator("[data-authentication-close]").click();
      await sheet.waitFor({ state: "detached" });
      await page
        .getByRole("button", { name: "로그인 / 회원가입", exact: true })
        .click();
      await chooser.waitFor();
      await page.keyboard.press("Escape");
      await sheet.waitFor({ state: "detached" });
      assert.deepEqual(errors, []);
      assert.deepEqual(apiCalls, []);
      report.runs.push({
        viewport,
        result: "PASS",
        metrics,
        pageErrors: errors,
        apiCalls
      });
    } catch (error) {
      await page.screenshot({
        path: resolve(artifacts, `failure-${viewport.width}.png`)
      });
      report.runs.push({
        viewport,
        result: "FAIL",
        metrics,
        error: String(error),
        pageErrors: errors,
        apiCalls
      });
      throw error;
    } finally {
      await context.close();
    }
  }
  console.log(
    JSON.stringify(
      report.runs.map(({ viewport, result }) => ({ viewport, result })),
      null,
      2
    )
  );
} finally {
  await writeFile(
    resolve(artifacts, "results.json"),
    JSON.stringify(report, null, 2)
  );
  await browser.close();
}
