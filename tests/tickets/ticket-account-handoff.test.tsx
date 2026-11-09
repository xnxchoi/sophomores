import { MemberAuthProviders } from "../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";
import { emptyMemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import { MEMBER_ACCOUNT_CONTINUATION_PATH } from "@/lib/member-auth/paths";

let MemberAccountView: typeof import("@/components/Authentication/member-auth/account-view").MemberAccountView;

const anonymous: MemberStatus = {
  authenticated: false, emailVerified: false, phoneBound: false, member: false,
  capabilities: { emailOtp: true, magicLink: true, google: false, passkey: true }
};
const active: MemberStatus = {
  ...anonymous, authenticated: true, emailVerified: true, phoneBound: true, member: true
};
const noAction = () => {};
const actions = {
  onContinueRegistration: noAction, onPasskey: noAction, onGoogle: noAction,
  onCode: noAction, onLink: noAction, onVerify: noAction, onEditEmail: noAction,
  onIdentifier: noAction, onClearIdentifier: noAction, onAddPasskey: noAction,
  onSignOut: noAction, onRefresh: noAction, onMode: noAction, onEmail: noAction,
  onPhone: noAction, onOtp: noAction
};
function account(status: MemberStatus | null, completionAction?: React.ReactNode) {
  return renderToStaticMarkup(<MemberAuthProviders><MemberAccountView {...actions}
    snapshot={{ ...emptyMemberSnapshot, status }} identifierMode="email"
    email="" phone="" otp="" phoneStep={<p>Existing verification</p>}
    completionAction={completionAction} /></MemberAuthProviders>);
}

test("an optional completion action appears only after authoritative membership and makes passkeys secondary", () => {
  const view = new JSDOM(account(active, <a href="/tickets">Return to tickets</a>));
  try {
    const link = view.window.document.querySelector('a[href="/tickets"]');
    assert.ok(link, "the authenticated continuation belongs inside the completed member view");
    const passkey = [...view.window.document.querySelectorAll("button")].find(e => e.textContent === "Add a passkey");
    assert.ok(passkey);
    assert.equal(passkey.classList.contains("bg-neutral-100"), false);
    assert.match(view.window.document.body.textContent ?? "", /Passkeys are optional/);
  } finally { view.window.close(); }
  for (const status of [null, anonymous, { ...anonymous, authenticated: true, emailVerified: true }]) {
    assert.doesNotMatch(account(status, <a href="/tickets">Return to tickets</a>), /Return to tickets/);
  }
});

test("without a completion action the accepted member confirmation and primary passkey action stay unchanged", () => {
  const html = account(active);
  const view = new JSDOM(html);
  try {
    const passkey = [...view.window.document.querySelectorAll("button")].find(e => e.textContent === "Add a passkey");
    assert.ok(passkey?.classList.contains("bg-neutral-100"));
    assert.match(html, /Email and phone confirmed/);
    assert.doesNotMatch(html, /Return to tickets|Back to tickets/);
  } finally { view.window.close(); }
});

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Entry: typeof import("@/components/tickets/ticket-account-entry").TicketAccountEntry;
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let draft: typeof import("@/lib/tickets/selection-draft");
const previous = new Map<string, PropertyDescriptor | undefined>();
function expose(key: string, value: unknown) {
  previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account", pretendToBeVisual: true });
  const win = dom.window;
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "SVGElement", "Element", "Node", "NodeList", "NodeFilter", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    const value = (key === "window" || key === "self") ? win : win[key as keyof typeof win];
    expose(key, typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(win) : value);
  }
  win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, media: "", onchange: null });
  win.scrollTo = () => {};
  Object.defineProperty(win.HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => null });
  expose("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  expose("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(win.HTMLElement.prototype, "scrollIntoView", { value() {} });
  ui = await import("@testing-library/react/pure");
  MemberAccountView = (await import("@/components/Authentication/member-auth/account-view")).MemberAccountView;
  Study = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountStudy;
});
afterEach(() => { ui.cleanup(); dom.window.localStorage.clear(); });
after(async () => {
  await new Promise(resolve => setTimeout(resolve, 250));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
const noRequest = async () => {};
function client(status = anonymous): MemberClient {
  return {
    status: async () => status,
    clearPhoneIdentifier: noRequest, identifyPhone: noRequest, sendEmailCode: noRequest,
    sendMagicLink: noRequest, signInGoogle: noRequest, verifyEmailCode: noRequest,
    signInPasskey: noRequest, addPasskey: noRequest, bindPhone: noRequest, signOut: noRequest
  };
}
async function loadEntry() {
  Entry = (await import("@/components/tickets/ticket-account-entry")).TicketAccountEntry;
  draft = await import("@/lib/tickets/selection-draft");
}
function saveIntent(returnToTickets = true, now = Date.now()) {
  const result = draft.saveTicketSelectionDraft(dom.window.localStorage,
    [{ ticketTypeId: "first-night-preview", quantity: 3 }], { returnToTickets, now });
  assert.equal(result.status, "ready");
  return result;
}

test("ticket-aware entry is SSR-identical to the existing account shell before browser intent is read", async () => {
  await loadEntry();
  assert.equal(renderToStaticMarkup(<MemberAuthProviders><Entry /></MemberAuthProviders>), renderToStaticMarkup(<MemberAuthProviders><Study /></MemberAuthProviders>));
});

test("no intent, non-return drafts and malformed or expired storage do not add ticket actions", async () => {
  await loadEntry();
  const cases = [null, "not-json", JSON.stringify({ schemaVersion: 100, returnToTickets: true })];
  for (const raw of cases) {
    if (raw !== null) dom.window.localStorage.setItem(draft.TICKET_SELECTION_DRAFT_KEY, raw);
    const view = ui.render(<Entry client={client()} />, { wrapper: MemberAuthProviders });
    await ui.screen.findByRole("heading", { name: "Welcome" });
    assert.equal(ui.screen.queryByRole("link", { name: /tickets/ }) === null, true);
    view.unmount();
    dom.window.localStorage.clear();
  }
  for (const [intent, now] of [[false, Date.now()], [true, Date.now() - 25 * 60 * 60 * 1000]] as const) {
    saveIntent(intent, now);
    const view = ui.render(<Entry client={client()} />, { wrapper: MemberAuthProviders });
    await ui.screen.findByRole("heading", { name: "Welcome" });
    assert.equal(ui.screen.queryByRole("link", { name: /tickets/ }) === null, true);
    view.unmount();
  }
});

test("a standalone chooser has no ticket-return link and focused Cancel only restores its chooser", async () => {
  await loadEntry(); saveIntent();
  ui.render(<Entry client={client()} />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("heading", { name: "Welcome" });
  assert.equal(ui.screen.queryByRole("link", { name: /tickets/ }) === null, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.screen.findByRole("heading", { name: "Log in" });
  assert.equal(ui.screen.queryByRole("link", { name: "Return to tickets" }) === null, true);
  ui.fireEvent.keyDown(document, { key: "Escape" });
  assert.ok(ui.screen.getByRole("heading", { name: "Log in" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.screen.findByRole("heading", { name: "Welcome" });
  const login = ui.screen.getByRole("button", { name: "Log in" });
  await ui.waitFor(() => assert.equal(document.activeElement === login, true));
  assert.equal(ui.screen.queryByRole("link", { name: /tickets/ }) === null, true);
});

test("standalone chooser dismissal never navigates or mutates a retained ticket draft", async (t) => {
  await loadEntry();
  const saved = saveIntent();
  const push = t.mock.method(window.history, "pushState");
  const replace = t.mock.method(window.history, "replaceState");
  ui.render(<Entry client={client()} />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("heading", { name: "Welcome" });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Close account options" }));
  assert.equal(push.mock.calls.length + replace.mock.calls.length, 0);
  assert.equal(window.location.pathname, "/account");
  assert.deepEqual(draft.readTicketSelectionDraft(dom.window.localStorage), saved);
});

test("a provider return offers a fixed completed-member continuation and clears only return intent", async () => {
  await loadEntry(); const saved = saveIntent();
  ui.render(<Entry client={client(active)} initialFlow="login" />, { wrapper: MemberAuthProviders });
  const link = await ui.screen.findByRole("link", { name: "Return to tickets" });
  assert.equal(link.getAttribute("href"), "/tickets");
  assert.equal(ui.screen.queryByRole("link", { name: "Back to tickets" }) === null, true);
  assert.ok(ui.screen.getByRole("heading", { name: "Account ready" }));
  assert.equal(ui.screen.getByRole("button", { name: "Add a passkey" }).classList.contains("bg-neutral-100"), false);
  link.addEventListener("click", event => event.preventDefault());
  ui.fireEvent.click(link);
  const result = draft.readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(result.status, "ready");
  if (result.status === "ready" && saved.status === "ready") {
    assert.equal(result.draft.returnToTickets, false);
    assert.deepEqual(result.draft.items, saved.draft.items);
    assert.equal(result.draft.expiresAt, saved.draft.expiresAt);
  }
});

test("an authenticated but incomplete member cannot see the completed-member ticket continuation", async () => {
  await loadEntry(); saveIntent();
  ui.render(<Entry client={client({ ...anonymous, authenticated: true, emailVerified: true })} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("heading", { name: "Finish setting up your account" });
  assert.equal(ui.screen.queryByRole("link", { name: "Return to tickets" }) === null, true);
  assert.ok(await ui.screen.findByRole("button", { name: "Continue registration" }));
});

test("same-origin cross-tab updates and focus expiry revalidate the intent instead of stale return UI", async (t) => {
  await loadEntry(); let now = Date.now(); t.mock.method(Date, "now", () => now);
  ui.render(<Entry client={client(active)} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("heading", { name: "Account ready" });
  saveIntent(true, now);
  await ui.act(async () => { window.dispatchEvent(new dom.window.StorageEvent("storage", { key: draft.TICKET_SELECTION_DRAFT_KEY, storageArea: dom.window.localStorage })); });
  assert.ok(await ui.screen.findByRole("link", { name: "Return to tickets" }));
  now += 25 * 60 * 60 * 1000;
  await ui.act(async () => { window.dispatchEvent(new dom.window.Event("focus")); });
  assert.equal(ui.screen.queryByRole("link", { name: "Return to tickets" }) === null, true);
});

test("unavailable localStorage never fabricates a ticket return intent", async () => {
  await loadEntry();
  const descriptor = Object.getOwnPropertyDescriptor(dom.window, "localStorage")!;
  Object.defineProperty(dom.window, "localStorage", { configurable: true, get() { throw new Error("Synthetic unavailable storage"); } });
  try {
    ui.render(<Entry client={client()} />, { wrapper: MemberAuthProviders });
    await ui.screen.findByRole("heading", { name: "Welcome" });
    assert.equal(ui.screen.queryByRole("link", { name: /tickets/ }) === null, true);
  } finally {
    ui.cleanup();
    Object.defineProperty(dom.window, "localStorage", descriptor);
  }
});

test("unrelated storage events are ignored and visibility return rechecks cleared intent", async (t) => {
  await loadEntry(); saveIntent();
  const get = t.mock.method(dom.window.Storage.prototype, "getItem");
  ui.render(<Entry client={client(active)} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("link", { name: "Return to tickets" });
  const reads = get.mock.calls.length;
  await ui.act(async () => { window.dispatchEvent(new dom.window.StorageEvent("storage", { key: "unrelated-preference" })); });
  assert.equal(get.mock.calls.length, reads);
  draft.clearTicketReturnIntent(dom.window.localStorage);
  const visibility = Object.getOwnPropertyDescriptor(dom.window.document, "visibilityState");
  try {
    Object.defineProperty(dom.window.document, "visibilityState", { configurable: true, value: "hidden" });
    await ui.act(async () => { document.dispatchEvent(new dom.window.Event("visibilitychange")); });
    assert.ok(ui.screen.getByRole("link", { name: "Return to tickets" }));
    Object.defineProperty(dom.window.document, "visibilityState", { configurable: true, value: "visible" });
    await ui.act(async () => { document.dispatchEvent(new dom.window.Event("visibilitychange")); });
    assert.equal(ui.screen.queryByRole("link", { name: "Return to tickets" }) === null, true);
  } finally {
    if (visibility) Object.defineProperty(dom.window.document, "visibilityState", visibility);
    else Reflect.deleteProperty(dom.window.document, "visibilityState");
  }
});

for (const failure of ["access", "write"] as const) {
  test("intent-clear " + failure + " failures retain safe navigation and truthful recovery", async () => {
    await loadEntry(); saveIntent();
    ui.render(<Entry client={client(active)} initialFlow="login" />, { wrapper: MemberAuthProviders });
    const link = await ui.screen.findByRole("link", { name: "Return to tickets" });
    const descriptor = Object.getOwnPropertyDescriptor(dom.window, "localStorage")!;
    const storage = dom.window.localStorage;
    if (failure === "access") {
      Object.defineProperty(dom.window, "localStorage", { configurable: true, get() { throw new Error("Synthetic blocked property"); } });
    } else {
      // A narrow test storage object models quota failure without changing the
      // actual browser-storage implementation used by other test cases.
      Object.defineProperty(dom.window, "localStorage", { configurable: true, value: { getItem: storage.getItem.bind(storage), setItem() { throw new Error("Synthetic quota failure"); } } });
    }
    try {
      link.addEventListener("click", event => event.preventDefault());
      ui.fireEvent.click(link);
      assert.equal(link.getAttribute("href"), "/tickets");
      assert.match(ui.screen.getByRole("status").textContent ?? "", /selection couldn’t be updated/);
      assert.ok(ui.screen.getByRole("link", { name: "Return to tickets" }));
      assert.doesNotMatch(document.body.textContent ?? "", /reservation|payment confirmed|selection saved/);
    } finally {
      ui.cleanup();
      Object.defineProperty(dom.window, "localStorage", descriptor);
    }
  });
}

test("cross-tab clearing removes a completed-member continuation without changing authentication", async () => {
  await loadEntry(); saveIntent();
  ui.render(<Entry client={client(active)} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("link", { name: "Return to tickets" });
  dom.window.localStorage.clear();
  await ui.act(async () => { window.dispatchEvent(new dom.window.StorageEvent("storage", { key: null })); });
  assert.equal(ui.screen.queryByRole("link", { name: "Return to tickets" }) === null, true);
  assert.ok(ui.screen.getByRole("heading", { name: "Account ready" }));
  assert.ok(ui.screen.getByRole("button", { name: "Add a passkey" }).classList.contains("bg-neutral-100"));
});

test("both account pages use ticket-aware composition and provider callback policy stays pinned", async () => {
  for (const path of ["../../src/app/(site)/account/page.tsx", "../../src/app/(site)/account/continue/page.tsx"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /TicketAccountEntry/);
    assert.doesNotMatch(source, /returnTo|redirect\(/);
  }
  const continuation = await readFile(new URL("../../src/app/(site)/account/continue/page.tsx", import.meta.url), "utf8");
  assert.match(continuation, /initialFlow="login"/);
  const policy = await readFile(new URL("../../src/lib/member-auth/payload-policy.ts", import.meta.url), "utf8");
  assert.match(policy, /MEMBER_ACCOUNT_CONTINUATION_PATH/);
  assert.equal(MEMBER_ACCOUNT_CONTINUATION_PATH, "/account/continue");
});

 test("standalone callback composition has no synthetic chooser navigation", async () => {
  const source = await readFile(new URL("../../src/components/tickets/ticket-account-entry.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Back to tickets|useRouter|router\.replace|onChooserDismiss|chooserReturnAction/);
});
