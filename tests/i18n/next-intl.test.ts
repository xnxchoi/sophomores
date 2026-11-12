import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { locales, defaultLocale } from "@/i18n/request";

test("next-intl integration: 2 locales without per-locale path", async (t) => {
  await t.test("strictly defines two supported locales: korean (ko) and english (en)", () => {
    assert.deepEqual([...locales].sort(), ["en", "ko"].sort());
    assert.equal(locales.includes("ko"), true);
    assert.equal(locales.includes("en"), true);
    assert.equal((locales as readonly string[]).includes("fr"), false);
    assert.equal((locales as readonly string[]).includes("ja"), false);
  });

  await t.test("translation message catalogs exist and contain matching required namespaces", () => {
    const rootDir = process.cwd();
    const enPath = path.join(rootDir, "messages", "en.json");
    const koPath = path.join(rootDir, "messages", "ko.json");

    assert.equal(fs.existsSync(enPath), true, "messages/en.json must exist");
    assert.equal(fs.existsSync(koPath), true, "messages/ko.json must exist");

    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const ko = JSON.parse(fs.readFileSync(koPath, "utf8"));

    const requiredNamespaces = ["Navigation", "Common", "Auth", "Settings", "Teaser", "Verification"];
    for (const ns of requiredNamespaces) {
      assert.ok(en[ns], `messages/en.json must contain ${ns} namespace`);
      assert.ok(ko[ns], `messages/ko.json must contain ${ns} namespace`);
    }

    // Verify key parity between en and ko for critical navigation and common actions
    const navKeys = Object.keys(en.Navigation);
    for (const key of navKeys) {
      assert.ok(ko.Navigation[key], `ko.Navigation should have key ${key}`);
    }

    const commonKeys = Object.keys(en.Common);
    for (const key of commonKeys) {
      assert.ok(ko.Common[key], `ko.Common should have key ${key}`);
    }
  });

  await t.test("next.config wraps createNextIntlPlugin without introducing route prefixes", async () => {
    const nextConfigPath = path.join(process.cwd(), "next.config.ts");
    const content = fs.readFileSync(nextConfigPath, "utf8");

    assert.match(content, /createNextIntlPlugin/);
    assert.match(content, /withNextIntl/);
    assert.match(content, /withPayload/);
    // Ensure no rewrites or basePath force a /:locale prefix into all routes
    assert.doesNotMatch(content, /source:\s*["']\/:\w+\//);
  });

  await t.test("app/(site)/layout wraps with NextIntlClientProvider without locale URL segment", async () => {
    const layoutPath = path.join(process.cwd(), "src", "app", "(site)", "layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf8");

    assert.match(content, /NextIntlClientProvider/);
    assert.match(content, /getLocale/);
    assert.match(content, /getMessages/);
    assert.match(content, /<NextIntlClientProvider locale=\{locale\} messages=\{messages\}>/);
  });
});


test("client hooks receive Korean and English fallback through the shared provider catalogue", () => {
  function Messages() {
    const common = useTranslations("Common");
    const member = useTranslations("MemberAuth");
    return createElement("p", null, common("cancel"), " / ", member("accountReady"), " / ", member("retryAfterSeconds", { seconds: 7 }));
  }
  const html = renderToStaticMarkup(createElement(NextIntlClientProvider, {
    locale: "ko", timeZone: "Asia/Seoul", messages: messagesByLocale.ko, children: createElement(Messages),
  }));
  assert.equal(html, "<p>취소 / Account ready / Try again in 7s.</p>");
});

test("server request and all layout providers share the resolved catalogue", () => {
  const request = fs.readFileSync("src/i18n/request.ts", "utf8");
  assert.match(request, /messages:\s*messagesByLocale\[locale as Locale\]/);
  assert.doesNotMatch(request, /messages\/ko\.json/);
});
