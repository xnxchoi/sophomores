import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { NextRequest } from "next/server";
import { isNoStorePagePath, isPrivatePagePath, privatePagePrefixes } from "@/lib/member-auth/private-pages";
import { clearMemberBrowserCopies, commercePaymentIntentPrefix, leaveAfterSignOut, signOutAndLeave } from "@/lib/member-auth/browser-copies";
import { readSignedInMemberID } from "@/lib/member-auth/private-view";
import { createMemberSession } from "@/components/Authentication/member-auth/_shared/session";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";
import { GUEST_CART_STORAGE_KEY } from "@/lib/commerce/browser-cart";
import { TICKET_SELECTION_DRAFT_KEY } from "@/lib/tickets/selection-draft";
import { checkoutIntentKey } from "@/components/tickets/_shared/checkout-intent";
import { EnglishMessages } from "../fixtures/english-messages";

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

// Public pages that read the signed-in member: sent private, no-store, without the guard (coordinator, 23 Nov: no
// personal data such as an address or phone). A new one fails the test until someone decides.
const publicPagesReadingTheMember: Record<string, string> = {
  "/setlists/[slug]": "public setlist (music lane); the member's own slot state only",
  "/music": "renders the featured setlist (SetlistPage)",
  "/essays": "the member's reading slots (load-reading)",
  "/essays/[slug]": "the member's reading slots (load-reading)",
  "/essays/in": "the member's reading slots (load-reading)",
  "/essays/in/[pageNumber]": "the member's reading slots (load-reading)"
};
// Reads a staff session only in draft mode, which Next never caches; not a member's page.
const staffDraftOnly = new Set(["/"]);

// A page reads the member when it, or a server module it imports directly, calls a session read: one level, so a
// delegated loader (welcome, essays, the setlist page under /music) counts, while a module that only might reach the
// session several imports down (the catalogue's access checks) does not. Client modules and type-only imports are skipped.
const resolveImport = (from: string, specifier: string): string | null => {
  const base = specifier.startsWith("@/") ? path.join("src", specifier.slice(2)) : specifier.startsWith(".") ? path.join(path.dirname(from), specifier) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
};
const memberRead = /\bcurrentUser\(|payload\.auth\(|\bauth\(\{\s*headers|getSession\(|loadMemberWelcome\(|readMemberWelcome\(/;
function readsTheMember(page: string): boolean {
  const source = read(page);
  if (memberRead.test(source)) return true;
  return [...source.matchAll(/(?:import|export)\s(?!type\s)[^;]*?from\s*["']([^"']+)["']/g)]
    .map((match) => resolveImport(page, match[1]))
    .some((file) => file !== null && !/^\s*["']use client["']/.test(read(file)) && memberRead.test(read(file)));
}

test("every private page renders per request with the guard, and every page that reads the member is private", () => {
  // PrivateRoute is the one mount: connection() (per request, so Next also sends no-store) plus PrivatePageGuard,
  // told which member the page was rendered for.
  const route = read("src/components/auth/private-route.tsx");
  assert.match(route, /await connection\(\);[\s\S]*<PrivatePageGuard principal=\{user \? String\(user\.id\) : null\}>\{children\}<\/PrivatePageGuard>/);
  // /welcome shows verification, restriction and wallet state through a delegated loader (Review-A r2).
  assert.equal(isPrivatePagePath("/welcome"), true);
  assert.equal(readsTheMember(`${site}/welcome/page.tsx`), true, "the import walk sees the delegated loader");
  for (const prefix of privatePagePrefixes) {
    assert.ok(fs.existsSync(routeDir(prefix)), `${prefix} is a route`);
    for (const page of pages(routeDir(prefix))) {
      const chain = [...layoutsAbove(page), page].map(read);
      assert.equal(chain.some((source) => /<PrivateRoute>/.test(source)), true, `${routeOf(page)} mounts PrivateRoute`);
    }
  }
  // A page that reads the signed-in member shows that member's data, so it has to be on the list.
  for (const page of pages(site)) {
    const route = routeOf(page);
    if (!readsTheMember(page) || staffDraftOnly.has(route)) continue;
    if (route in publicPagesReadingTheMember) assert.equal(isNoStorePagePath(route.replace(/\[[^\]]+\]/g, "x")), true, `${route} is sent no-store`);
    else assert.equal(isPrivatePagePath(route), true, `${route} reads the member and must be in privatePagePrefixes`);
  }
});

test("private pages are sent private, no-store, as documents and as RSC payloads; public pages are not", async (t) => {
  const previous = process.env.PREVIEW_AUTH_MODE;
  t.after(() => { if (previous === undefined) delete process.env.PREVIEW_AUTH_MODE; else process.env.PREVIEW_AUTH_MODE = previous; });
  process.env.PREVIEW_AUTH_MODE = "public";
  const { proxy } = await import("../../src/proxy");
  const call = (pathname: string, headers: Record<string, string>) => proxy(new NextRequest(`https://sophomores.co${pathname}`, { headers }));
  const requests: Record<string, string>[] = [
    { accept: "text/html" },
    { rsc: "1" },
    // Router prefetches, full and per segment.
    { rsc: "1", "next-router-prefetch": "1" },
    { rsc: "1", "next-router-prefetch": "1", "next-router-segment-prefetch": "/_tree" }
  ];
  for (const headers of requests) {
    for (const pathname of ["/me", "/me/settings/account", "/account", "/shop/checkout", "/shop/payment", "/shop/orders/2f7c", "/tickets/payment", "/welcome"]) {
      assert.equal(call(pathname, headers).headers.get("cache-control"), "private, no-store", `${pathname} ${JSON.stringify(headers)}`);
    }
    for (const pathname of ["/music", "/setlists/spring-2026", "/essays", "/essays/on-wanting", "/essays/in/2"]) {
      assert.equal(call(pathname, headers).headers.get("cache-control"), "private, no-store", `session-varying ${pathname}`);
    }
    for (const pathname of ["/", "/shop", "/tickets", "/meet", "/musical", "/essaysx"]) {
      assert.equal(call(pathname, headers).headers.get("cache-control"), null, pathname);
    }
  }
});

test("private pages read no personal data from their URL (a source check of the page files, not an exhaustive audit)", () => {
  // The query values the private page files read: a provider error flag, an allow-listed return path, a product ID and
  // a payment ID. This checks the page files only, not every client component or link under them.
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

test("settings sign-out clears and leaves only when Better Auth confirms it", async () => {
  const stores = () => ({ session: fakeStore({ [`${commercePaymentIntentPrefix}member-a`]: "{}" }), local: fakeStore({ [GUEST_CART_STORAGE_KEY]: "{}" }) });
  const confirmed = stores();
  const visited: string[] = [];
  assert.equal(await signOutAndLeave(async () => ({ data: { success: true }, error: null }), (url) => visited.push(url), confirmed), true);
  assert.equal(confirmed.session.data.size + confirmed.local.data.size, 0);
  assert.deepEqual(visited, ["/"]);
  // Better Auth's client resolves (does not throw) with { error } when the server refuses: the session lives on.
  const refused = stores();
  assert.equal(await signOutAndLeave(async () => ({ data: null, error: { status: 500, message: "Failed" } }), (url) => visited.push(url), refused), false);
  assert.equal(refused.session.data.size + refused.local.data.size, 2, "nothing cleared while the session lives");
  assert.deepEqual(visited, ["/"], "and no navigation");
  // A missing or malformed acknowledgement is not a sign-out.
  for (const answer of [undefined, null, {}, { data: null, error: null }, { data: { success: false }, error: null }, { data: { success: "yes" }, error: null }]) {
    const unclear = stores();
    assert.equal(await signOutAndLeave(async () => answer, (url) => visited.push(url), unclear), false, JSON.stringify(answer));
    assert.equal(unclear.session.data.size + unclear.local.data.size, 2, JSON.stringify(answer));
  }
  assert.deepEqual(visited, ["/"]);
  const thrown = stores();
  await assert.rejects(signOutAndLeave(async () => { throw new Error("offline"); }, (url) => visited.push(url), thrown));
  assert.equal(thrown.session.data.size + thrown.local.data.size, 2);
  // The page uses it (and no longer a client-side push home).
  const settings = read(`${site}/me/settings/account/page.client.tsx`);
  assert.match(settings, /signOutAndLeave\(\(\) => authClient\.signOut\(\)\)/);
  assert.doesNotMatch(settings, /router\.push/);
  // The payment record's key comes from the one place sign-out clears by.
  assert.match(read("src/components/commerce/payment.tsx"), /commercePaymentIntentPrefix \+ user\.id/);
});

test("the server read of the signed-in member: an ID, null when signed out, undefined when the server cannot say", async () => {
  const answer = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  assert.equal(await readSignedInMemberID(answer(200, { user: { id: 7 } })), "7");
  assert.equal(await readSignedInMemberID(answer(200, { user: null })), null);
  assert.equal(await readSignedInMemberID(answer(500, {})), undefined);
  assert.equal(await readSignedInMemberID(answer(200, { unexpected: true })), undefined);
  assert.equal(await readSignedInMemberID((async () => { throw new Error("offline"); }) as unknown as typeof fetch), undefined);
});

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let PrivatePageGuard: typeof import("@/components/auth/private-page-guard").PrivatePageGuard;
let watchPrivateView: typeof import("@/lib/member-auth/private-view").watchPrivateView;
const saved = new Map<string, PropertyDescriptor | undefined>();
let visibility: DocumentVisibilityState = "visible";
before(async () => {
  dom = new JSDOM("<!doctype html><html><body><main>private</main></body></html>", { url: "https://sophomores.co/me", pretendToBeVisual: true });
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Element", "Node", "NodeFilter", "NodeList", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "PointerEvent", "FocusEvent", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const raw = key === "window" || key === "self" ? dom.window : dom.window[key as keyof typeof dom.window];
    const value = typeof raw === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? raw.bind(dom.window) : raw;
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  dom.window.matchMedia = () => ({ matches: false, media: "", onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }) as unknown as MediaQueryList;
  dom.window.scrollTo = () => {};
  saved.set("ResizeObserver", Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver"));
  Object.defineProperty(globalThis, "ResizeObserver", { value: class { observe() {} unobserve() {} disconnect() {} }, configurable: true, writable: true });
  Object.defineProperty(dom.window.document, "visibilityState", { configurable: true, get: () => visibility });
  saved.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true, writable: true });
  ui = await import("@testing-library/react/pure");
  ({ PrivatePageGuard } = await import("@/components/auth/private-page-guard"));
  ({ watchPrivateView } = await import("@/lib/member-auth/private-view"));
});
afterEach(() => { ui.cleanup(); visibility = "visible"; });
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
const fire = (name: string) => dom.window.dispatchEvent(new dom.window.Event(name));
const settle = () => new Promise((done) => setTimeout(done, 0));

/** A guard whose server answers are scripted: each check takes the next answer. */
type Answer = string | null | undefined;
/** The guard's own wrapper: the only element it ever hides. */
const page = () => dom.window.document.querySelector<HTMLElement>("[data-private-page]")!;
function guard(principal: string | null, answers: Array<Answer | Promise<Answer>>) {
  const state = { reloads: 0, checks: 0 };
  const readPrincipal = async () => { state.checks += 1; return answers.shift(); };
  ui.render(<PrivatePageGuard principal={principal} reload={() => { state.reloads += 1; }} readPrincipal={readPrincipal}><p>private content</p></PrivatePageGuard>);
  return state;
}

test("the page shows again only after the server confirms the same member", async () => {
  const state = guard("member-a", ["member-a", "member-a"]);
  const body = page();
  setVisibility("hidden");
  assert.equal(body.hidden, true, "hidden while the tab is hidden");
  setVisibility("visible");
  assert.equal(body.hidden, true, "still hidden while the server is asked");
  await settle();
  assert.equal(body.hidden, false, "same member: shown again");
  fire("focus");
  await settle();
  assert.equal(body.hidden, false);
  assert.deepEqual(state, { reloads: 0, checks: 2 }, "a refocus asks again");
});

test("a sign-out elsewhere keeps the page hidden and reloads it (visibility return)", async () => {
  const state = guard("member-a", [null]);
  setVisibility("hidden");
  setVisibility("visible");
  await settle();
  assert.equal(page().hidden, true);
  assert.equal(state.reloads, 1);
});

test("a switch to another account hides and reloads the page (focus return, no visibility change)", async () => {
  const state = guard("member-a", ["member-b"]);
  fire("blur");
  assert.equal(page().hidden, false, "a whole page is not hidden on blur");
  fire("focus");
  await settle();
  assert.equal(page().hidden, true);
  assert.equal(state.reloads, 1);
});

test("when the server cannot say, the page stays hidden and reloads", async () => {
  const state = guard("member-a", [undefined]);
  setVisibility("hidden");
  setVisibility("visible");
  await settle();
  assert.equal(page().hidden, true);
  assert.equal(state.reloads, 1);
});

test("an answer that arrives after the page was hidden again does not show it", async () => {
  const state = guard("member-a", ["member-a"]);
  setVisibility("hidden");
  setVisibility("visible");
  setVisibility("hidden");
  await settle();
  assert.equal(page().hidden, true);
  assert.equal(state.reloads, 0);
});

/** An answer the test releases by hand: a request that has not come back. */
function pending() {
  let release!: (value: Answer) => void;
  const answer = new Promise<Answer>((done) => { release = done; });
  return { answer, release };
}

test("a focus check hides the page at once and keeps it hidden while the answer is pending", async () => {
  for (const [late, reloads, hidden] of [[null, 1, true], ["member-b", 1, true], ["member-a", 0, false]] as const) {
    const request = pending();
    const state = guard("member-a", [request.answer]);
    fire("focus");
    assert.equal(page().hidden, true, "hidden before any answer");
    await settle();
    assert.equal(page().hidden, true, "still hidden while the request stalls");
    assert.equal(state.reloads, 0);
    request.release(late);
    await settle();
    assert.equal(page().hidden, hidden, `answer ${late}`);
    assert.equal(state.reloads, reloads, `answer ${late}`);
    ui.cleanup();
  }
});

test("a page rendered signed out shows again only while still signed out; any sign-in since reloads it", async () => {
  const still = guard(null, [null]);
  fire("focus");
  await settle();
  assert.equal(page().hidden, false);
  assert.equal(still.reloads, 0);
  ui.cleanup();
  // A signs in on this page, B replaces the session elsewhere before the first check: the page cannot tell A from
  // B, so it never reveals the inline content; it reloads for whoever is signed in now.
  const signedIn = guard(null, ["member-b"]);
  fire("focus");
  await settle();
  assert.equal(page().hidden, true);
  assert.equal(signedIn.reloads, 1);
});

test("leaving the route mid-check leaves the destination visible; a late reply neither reveals nor reloads", async () => {
  const request = pending();
  const state = guard("member-a", [request.answer]);
  fire("focus");
  assert.equal(page().hidden, true, "the private content is hidden while asked");
  // A same-document Back to a public route: the guard and its wrapper go; the destination renders.
  ui.cleanup();
  const destination = ui.render(<main data-public="">public page</main>);
  const document = dom.window.document;
  assert.equal(document.body.hidden, false, "the shared body was never hidden");
  assert.equal(document.querySelector("[data-private-page]"), null);
  request.release("member-b");
  await settle();
  assert.equal(state.reloads, 0, "no reload from the old guard");
  assert.equal((destination.container.querySelector("[data-public]") as HTMLElement).closest("[hidden]"), null, "the destination stays visible");
  assert.equal(document.body.textContent?.includes("private content"), false, "the old content is gone, not revealed");
});

test("a restored page stays hidden and reloads; a normal show and an unmounted guard do nothing", async () => {
  const state = guard("member-a", []);
  fire("pagehide");
  assert.equal(page().hidden, true, "hidden before the back-forward cache keeps a frame");
  dom.window.dispatchEvent(pageShow(false));
  assert.equal(state.reloads, 0, "a normal load is not a restore");
  dom.window.dispatchEvent(pageShow(true));
  assert.equal(page().hidden, true);
  assert.equal(state.reloads, 1, "restored: reload, so the server re-checks the session");
  ui.cleanup();
  dom.window.dispatchEvent(pageShow(true));
  assert.equal(state.reloads, 1);
});

test("the shared watcher: a restore conceals then reveals; concealOnBlur gates reads; recheckOnFocus re-reads", () => {
  const calls: string[] = [];
  const stop = watchPrivateView({ conceal: () => calls.push("conceal"), reveal: () => calls.push("reveal"), concealOnBlur: true });
  dom.window.dispatchEvent(pageShow(true));
  assert.deepEqual(calls.splice(0), ["conceal", "reveal"]);
  fire("blur");
  setVisibility("visible");
  assert.deepEqual(calls.splice(0), ["conceal"], "no read while the window has no focus");
  fire("focus");
  assert.deepEqual(calls.splice(0), ["reveal"]);
  stop();
  fire("pagehide");
  assert.deepEqual(calls, []);
  const focusCalls: string[] = [];
  const stopFocus = watchPrivateView({ conceal: () => focusCalls.push("conceal"), reveal: () => focusCalls.push("reveal"), recheckOnFocus: true });
  fire("blur");
  fire("focus");
  assert.deepEqual(focusCalls, ["reveal"], "recheckOnFocus: no conceal on blur, a fresh read on focus");
  stopFocus();
});

test("the member-auth session clears the copies only after the server confirms the sign-out", async () => {
  const signedIn = { authenticated: true } as MemberStatus;
  const signedOut = { authenticated: false } as MemberStatus;
  const seed = () => {
    dom.window.sessionStorage.setItem(`${commercePaymentIntentPrefix}member-a`, "{}");
    dom.window.localStorage.setItem(GUEST_CART_STORAGE_KEY, "{}");
  };
  const client = (after: MemberStatus) => ({
    signOut: async () => {}, status: async () => after, clearPhoneIdentifier: async () => {}
  }) as unknown as MemberClient;
  seed();
  await createMemberSession(client(signedOut), () => {}).signOut();
  assert.equal(dom.window.sessionStorage.getItem(`${commercePaymentIntentPrefix}member-a`), null, "confirmed: cleared");
  assert.equal(dom.window.localStorage.getItem(GUEST_CART_STORAGE_KEY), null);
  seed();
  const refused = createMemberSession(client(signedIn), () => {});
  await refused.signOut();
  assert.equal(refused.snapshot().failure !== null, true, "the session reports the refused sign-out");
  assert.equal(dom.window.sessionStorage.getItem(`${commercePaymentIntentPrefix}member-a`), "{}", "refused: kept");
  assert.equal(dom.window.localStorage.getItem(GUEST_CART_STORAGE_KEY), "{}");
  dom.window.sessionStorage.clear();
  dom.window.localStorage.clear();
});

test("one private-view mechanism: the receipt's delivery address uses the shared watcher, with no listeners of its own", () => {
  const receipt = read("src/components/commerce/receipt-delivery.tsx");
  assert.match(receipt, /watchPrivateView\(\{ conceal, reveal: \(\) => \{ void load\(\); \}, concealOnBlur: true \}\)/);
  assert.doesNotMatch(receipt, /addEventListener\(|subscribeVisibility/);
  // Its page, /me/orders/[id], is a private page.
  assert.equal(isPrivatePagePath("/me/orders/2f7c"), true);
});

let VerificationTray: typeof import("@/components/Authentication/phone-verification/verification-tray").VerificationTray;
/** A private page with the sign-in tray open over it, its form showing the visitor's email. */
async function guardedTray(answers: Array<Answer | Promise<Answer>>) {
  VerificationTray ??= (await import("@/components/Authentication/phone-verification/verification-tray")).VerificationTray;
  const state = { reloads: 0 };
  const readPrincipal = async () => answers.shift();
  ui.render(<EnglishMessages><PrivatePageGuard principal="member-a" reload={() => { state.reloads += 1; }} readPrincipal={readPrincipal}>
    <p>private content</p>
    <VerificationTray open onOpenChange={() => {}} headingId="tray-h" descriptionId="tray-d" description="Sign in" closeLabel="Close"
      locale="en" mode="focused" onCancel={() => {}} cancelLabel="Cancel">
      <form data-tray-form=""><input aria-label="Email" defaultValue="member-a@example.invalid" /></form>
    </VerificationTray>
  </PrivatePageGuard></EnglishMessages>);
  await ui.waitFor(() => assert.ok(dom.window.document.querySelector("[data-tray-form]")));
  return state;
}
const trayForm = () => dom.window.document.querySelector("[data-tray-form]");
/** The tray form is present AND it, or an element above it, carries the hidden attribute. A missing form fails. */
const trayHidden = () => {
  const form = trayForm();
  assert.ok(form, "the tray form is still mounted (hidden, not removed)");
  return form.closest("[hidden]") !== null;
};

test("the sign-in tray portals inside the private page's guard, not loose under body", async () => {
  await guardedTray([]);
  assert.ok(trayForm()?.closest("[data-private-portal-host]"), "mounted in the guard's portal host");
  assert.ok(trayForm()?.closest("[data-private-page]"), "and so inside the guarded wrapper");
  assert.equal(trayHidden(), false, "shown while the page is shown");
});

test("the open tray hides with the page: during a pending recheck and on pagehide", async () => {
  const request = pending();
  await guardedTray([request.answer]);
  fire("focus");
  assert.equal(trayHidden(), true, "hidden while the identity check is pending");
  request.release("member-b");
  await settle();
  assert.equal(trayHidden(), true, "and stays hidden for another member");
  ui.cleanup();
  await guardedTray([]);
  fire("pagehide");
  assert.equal(trayHidden(), true, "hidden on pagehide, before a back-forward cache keeps a frame");
});

test("leaving for a public route takes the tray with it", async () => {
  const request = pending();
  const state = await guardedTray([request.answer]);
  fire("focus");
  ui.cleanup();
  ui.render(<main data-public="">public page</main>);
  assert.equal(trayForm(), null, "no tray form left anywhere");
  assert.equal(dom.window.document.body.textContent?.includes("member-a@example.invalid"), false);
  request.release("member-a");
  await settle();
  assert.equal(state.reloads, 0);
  assert.equal(trayForm(), null);
});

test("outside a private page, overlays keep their usual place", async () => {
  VerificationTray ??= (await import("@/components/Authentication/phone-verification/verification-tray")).VerificationTray;
  ui.render(<EnglishMessages><VerificationTray open onOpenChange={() => {}} headingId="tray-h" descriptionId="tray-d" description="Sign in" closeLabel="Close"
    locale="en" mode="focused" onCancel={() => {}} cancelLabel="Cancel"><form data-tray-form="" /></VerificationTray></EnglishMessages>);
  await ui.waitFor(() => assert.ok(trayForm()));
  assert.equal(trayForm()?.closest("[data-private-portal-host]"), null);
  // The shared sheet takes the same host on a private page.
  assert.match(read("src/components/ui/sheet.tsx"), /container=\{container \?\? privatePortal \?\? undefined\}/);
});
