import assert from "node:assert/strict";
import { test } from "node:test";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import en from "../../messages/en.json";
import { BusinessFooterView } from "@/app/(site)/_commerce/business-footer";

// The footer's links go through the site's transition router, which needs a mounted app router.
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;
const render = (locale: "en" | "ko") => renderToStaticMarkup(
  <AppRouterContext.Provider value={router}>
    <NextIntlClientProvider locale={locale} timeZone="Asia/Seoul" messages={en}><BusinessFooterView /></NextIntlClientProvider>
  </AppRouterContext.Provider>
);
const button = (html: string, label: string) => html.match(new RegExp(`<button[^>]*>(?:<span[^>]*>)?${label}(?:</span>)?</button>`))?.[0] ?? "";

test("every page footer offers EN / KO, with the current language marked and not pressable", () => {
  for (const [locale, active, other] of [["en", "EN", "KO"], ["ko", "KO", "EN"]] as const) {
    const html = render(locale);
    assert.match(html, /role="group" aria-label="Language"/);
    assert.match(button(html, active), /aria-pressed="true"/);
    assert.match(button(html, active), /disabled=""/);
    assert.match(button(html, other), /aria-pressed="false"/);
    assert.doesNotMatch(button(html, other), / disabled=""/);
  }
});

test("pressing the other language sets the NEXT_LOCALE cookie through setUserLocale; the current one does nothing", async () => {
  // The real switch and the real setUserLocale, with Next's request cookies swapped for a recording store.
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/help", pretendToBeVisual: true });
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "Event"]) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value: key === "window" ? dom.window : (dom.window as never as Record<string, unknown>)[key], configurable: true, writable: true });
  }
  saved.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true, writable: true });
  const headers = require("next/headers") as { cookies: unknown };
  const realCookies = headers.cookies;
  const set: Array<[string, string, { path?: string }]> = [];
  headers.cookies = async () => ({ set: (name: string, value: string, options: { path?: string }) => { set.push([name, value, options]); } });
  const ui = await import("@testing-library/react/pure");
  const { FooterLocaleSwitch } = await import("@/app/(site)/_commerce/footer-locale-switch");
  try {
    ui.render(<NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={en}><FooterLocaleSwitch /></NextIntlClientProvider>);
    await ui.act(async () => { ui.fireEvent.click(ui.screen.getByRole("button", { name: "EN" })); });
    assert.equal(set.length, 0, "the current language is inert");
    await ui.act(async () => { ui.fireEvent.click(ui.screen.getByRole("button", { name: "KO" })); });
    assert.equal(set.length, 1);
    assert.deepEqual([set[0][0], set[0][1], set[0][2].path], ["NEXT_LOCALE", "ko", "/"]);
  } finally {
    ui.cleanup();
    headers.cookies = realCookies;
    dom.window.close();
    for (const [key, value] of saved) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); }
  }
});
