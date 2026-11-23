import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { NextRequest } from "next/server";
import { isPrivatePagePath, privatePagePrefixes } from "@/lib/member-auth/private-pages";
import { clearMemberBrowserCopies, commercePaymentIntentPrefix, leaveAfterSignOut } from "@/lib/member-auth/browser-copies";
import { GUEST_CART_STORAGE_KEY } from "@/lib/commerce/browser-cart";
import { TICKET_SELECTION_DRAFT_KEY } from "@/lib/tickets/selection-draft";
import { checkoutIntentKey } from "@/components/tickets/_shared/checkout-intent";

// Owner, 23 Nov: standard web security is the baseline for pages with personal data. These check that OUR code does
// it: the private list, the no-store header, the restore guard, clearing on sign-out and query keys without
// personal data. They do not check how a browser behaves.
const site = "src/app/(site)";
const read = (file: string) => fs.readFileSync(file, "utf8");
const routeDir = (prefix: string) => path.join(site, prefix);
const pages = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(directory, entry.name);
  if (entry.isDirectory()) return entry.name.startsWith("_") ? [] : pages(full);
  return entry.name === "page.tsx" ? [full] : [];
});
// "src/app/(site)/me/orders/[id]/page.tsx" -> "/me/orders/[id]"
const routeOf = (file: string) => "/" + path.relative(site, path.dirname(file)).split(path.sep).filter((part) => !/^\(.*\)$/.test(part)).join("/");
// The layouts from the site root down to a page's own folder.
const layoutsAbove = (file: string) => {
  const parts = path.relative(site, path.dirname(file)).split(path.sep);
  return parts.map((_, index) => path.join(site, ...parts.slice(0, index + 1), "layout.tsx")).filter((layout) => fs.existsSync(layout));
};

test("private paths match whole segments only", () => {
  for (const pathname of ["/me", "/me/orders", "/me/orders/2f7c", "/account", "/account/continue", "/shop/checkout", "/shop/orders/x", "/tickets/payment"]) {
    assert.equal(isPrivatePagePath(pathname), true, pathname);
  }
  for (const pathname of ["/", "/meet", "/accounts", "/shop", "/shop/checkoutx", "/tickets", "/music"]) {
    assert.equal(isPrivatePagePath(pathname), false, pathname);
  }
});

// Public pages that read the signed-in member for a personal detail, outside this sweep, named here so a new one
// fails the test until someone decides. Raised with the coordinator (23 Nov).
const publicPagesReadingTheMember: Record<string, string> = {
  "/setlists/[slug]": "public setlist (music lane); the member's own slot state only"
};

test("every private page renders per request with the guard, and every page that reads the member is private", () => {
  // PrivateRoute is the one mount: connection() (per request, so Next also sends no-store) plus PrivatePageGuard.
  const route = read("src/components/auth/private-route.tsx");
  assert.match(route, /await connection\(\);\s*return <PrivatePageGuard \/>;/);
  for (const prefix of privatePagePrefixes) {
    assert.ok(fs.existsSync(routeDir(prefix)), `${prefix} is a route`);
    for (const page of pages(routeDir(prefix))) {
      const chain = [...layoutsAbove(page), page].map(read);
      assert.equal(chain.some((source) => /<PrivateRoute \/>/.test(source)), true, `${routeOf(page)} mounts PrivateRoute`);
    }
  }
  // A page that reads the signed-in member shows that member's data, so it has to be on the list.
  for (const page of pages(site)) {
    const route = routeOf(page);
    if (/\bcurrentUser\(|payload\.auth\(|getSession\(/.test(read(page)) && !(route in publicPagesReadingTheMember)) {
      assert.equal(isPrivatePagePath(route), true, `${route} reads the member and must be in privatePagePrefixes`);
    }
  }
});

test("private pages are sent private, no-store, as documents and as RSC payloads; public pages are not", async (t) => {
  const previous = process.env.PREVIEW_AUTH_MODE;
  t.after(() => { if (previous === undefined) delete process.env.PREVIEW_AUTH_MODE; else process.env.PREVIEW_AUTH_MODE = previous; });
  process.env.PREVIEW_AUTH_MODE = "public";
  const { proxy } = await import("../../src/proxy");
  const call = (pathname: string, headers: Record<string, string>) => proxy(new NextRequest(`https://sophomores.co${pathname}`, { headers }));
  for (const headers of [{ accept: "text/html" }, { rsc: "1" }] as Record<string, string>[]) {
    for (const pathname of ["/me", "/me/settings/account", "/account", "/shop/checkout", "/shop/payment", "/shop/orders/2f7c", "/tickets/payment"]) {
      assert.equal(call(pathname, headers).headers.get("cache-control"), "private, no-store", `${pathname} ${JSON.stringify(headers)}`);
    }
    for (const pathname of ["/", "/shop", "/tickets", "/meet"]) {
      assert.equal(call(pathname, headers).headers.get("cache-control"), null, pathname);
    }
  }
});

test("private pages read no personal data from their URL", () => {
  // The only query values the private pages read: a provider error flag, an allow-listed return path, a product ID and
  // a payment ID. Personal data (email, phone, name, address) never travels in a URL.
  const allowed = new Set(["error", "next", "product", "paymentId"]);
  for (const prefix of privatePagePrefixes) {
    for (const page of pages(routeDir(prefix))) {
      const source = read(page);
      const keys = [...source.matchAll(/\b(?:query|searchParams\)?)\??\.([A-Za-z_]+)/g)].map((match) => match[1]).filter((key) => key !== "then");
      for (const key of keys) assert.equal(allowed.has(key), true, `${routeOf(page)} reads ?${key}`);
      assert.doesNotMatch(source, /[?&](?:email|phone|name|address|tel)=/i, routeOf(page));
    }
  }
});

function fakeStore(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    get length() { return data.size; },
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key); }
  };
}

test("sign-out clears every copy of the account and its purchases, and nothing else", () => {
  const session = fakeStore({ [`${commercePaymentIntentPrefix}member-a`]: "{}", [`${commercePaymentIntentPrefix}member-b`]: "{}", [checkoutIntentKey]: "{}", "sphmrs.unrelated": "1" });
  const local = fakeStore({ [GUEST_CART_STORAGE_KEY]: "{}", [TICKET_SELECTION_DRAFT_KEY]: "{}", "sphmrs.theme": "dark" });
  const visited: string[] = [];
  leaveAfterSignOut((url) => visited.push(url), { local, session });
  assert.deepEqual([...session.data.keys()], ["sphmrs.unrelated"]);
  assert.deepEqual([...local.data.keys()], ["sphmrs.theme"]);
  assert.deepEqual(visited, ["/"], "then a full navigation home, which drops cached pages and in-memory state");
  // Storage that refuses access is not an error.
  const refusing = { get length(): number { throw new Error("denied"); }, key: () => null, removeItem: () => {} };
  assert.doesNotThrow(() => clearMemberBrowserCopies({ local: refusing, session: refusing }));
});

test("both sign-out paths clear the copies", () => {
  const settings = read(`${site}/me/settings/account/page.client.tsx`);
  assert.match(settings, /await authClient\.signOut\(\);\s*leaveAfterSignOut\(\);/);
  assert.doesNotMatch(settings, /router\.push\("\/"\)/);
  const session = read("src/components/Authentication/member-auth/_shared/session.ts");
  assert.match(session, /if \(status\.authenticated\) throw new Error\("Sign-out was not confirmed"\);[\s\S]{0,160}clearMemberBrowserCopies\(\);/);
  // The payment record's key comes from the one place sign-out clears by.
  assert.match(read("src/components/commerce/payment.tsx"), /commercePaymentIntentPrefix \+ user\.id/);
});

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let PrivatePageGuard: typeof import("@/components/auth/private-page-guard").PrivatePageGuard;
let watchPrivateView: typeof import("@/lib/member-auth/private-view").watchPrivateView;
const saved = new Map<string, PropertyDescriptor | undefined>();
let visibility: DocumentVisibilityState = "visible";
before(async () => {
  dom = new JSDOM("<!doctype html><html><body><main>private</main></body></html>", { url: "https://sophomores.co/me", pretendToBeVisual: true });
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "Element", "Node", "Event"]) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" || key === "self" ? dom.window : dom.window[key as keyof typeof dom.window];
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  Object.defineProperty(dom.window.document, "visibilityState", { configurable: true, get: () => visibility });
  saved.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true, writable: true });
  ui = await import("@testing-library/react/pure");
  ({ PrivatePageGuard } = await import("@/components/auth/private-page-guard"));
  ({ watchPrivateView } = await import("@/lib/member-auth/private-view"));
});
afterEach(() => { ui.cleanup(); dom.window.document.body.hidden = false; visibility = "visible"; });
after(() => {
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
  dom.window.close();
});
// jsdom has no PageTransitionEvent: a plain event carrying `persisted`.
const pageShow = (persisted: boolean) => Object.assign(new dom.window.Event("pageshow"), { persisted });
const setVisibility = (state: DocumentVisibilityState) => { visibility = state; dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange")); };

test("the guard hides the page when it is left and while hidden, and a restored page stays hidden and reloads", () => {
  let reloads = 0;
  const reload = () => { reloads += 1; };
  ui.render(<PrivatePageGuard reload={reload} />);
  const body = dom.window.document.body;
  dom.window.dispatchEvent(new dom.window.Event("pagehide"));
  assert.equal(body.hidden, true, "hidden before the back-forward cache keeps a frame");
  setVisibility("visible");
  assert.equal(body.hidden, false);
  setVisibility("hidden");
  assert.equal(body.hidden, true, "hidden while the tab is hidden");
  setVisibility("visible");
  dom.window.dispatchEvent(pageShow(false));
  assert.equal(reloads, 0, "a normal load is not a restore");
  assert.equal(body.hidden, false);
  dom.window.dispatchEvent(pageShow(true));
  assert.equal(body.hidden, true);
  assert.equal(reloads, 1, "restored: reload, so the server re-checks the session");
  setVisibility("visible");
  assert.equal(body.hidden, true, "nothing shows again until the reload");
  ui.cleanup();
  dom.window.dispatchEvent(pageShow(true));
  assert.equal(reloads, 1, "an unmounted guard listens to nothing");
});

test("the shared watcher: a restore conceals then reads afresh; with concealOnBlur, focus gates every read", () => {
  const calls: string[] = [];
  const stop = watchPrivateView({ conceal: () => calls.push("conceal"), reveal: () => calls.push("reveal"), concealOnBlur: true });
  dom.window.dispatchEvent(pageShow(true));
  assert.deepEqual(calls.splice(0), ["conceal", "reveal"]);
  dom.window.dispatchEvent(new dom.window.Event("blur"));
  setVisibility("visible");
  assert.deepEqual(calls.splice(0), ["conceal"], "no read while the window has no focus");
  dom.window.dispatchEvent(new dom.window.Event("focus"));
  assert.deepEqual(calls.splice(0), ["reveal"]);
  stop();
  dom.window.dispatchEvent(new dom.window.Event("pagehide"));
  assert.deepEqual(calls, []);
});
