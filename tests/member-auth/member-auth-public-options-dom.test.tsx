import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import { saveTicketSelectionDraft } from "@/lib/tickets/selection-draft";

let MemberAuthProviders: typeof import("./fixtures/providers").MemberAuthProviders;
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let TicketEntry: typeof import("@/components/tickets/ticket-account-entry").TicketAccountEntry;
let Tickets: typeof import("@/components/tickets/ticket-selection").TicketSelection;
const previous = new Map<string, PropertyDescriptor | undefined>();
const configured: Readonly<MemberCapabilities> = Object.freeze({ emailOtp: true, magicLink: true, google: true, passkey: true });
const anonymous: MemberStatus = { authenticated: false, emailVerified: false, phoneBound: false, member: false, capabilities: configured };
const noop = async () => {};
const actions: Omit<MemberClient, "status"> = { clearPhoneIdentifier: noop, identifyPhone: noop, sendEmailCode: noop, sendMagicLink: noop, signInGoogle: noop, verifyEmailCode: noop, signInPasskey: noop, addPasskey: noop, bindPhone: noop, signOut: noop };

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  win.matchMedia = (query) => ({ matches: query.includes("min-width"), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  win.scrollTo = () => {};
  for (const key of ["scrollIntoView", "setPointerCapture", "releasePointerCapture"]) Object.defineProperty(win.HTMLElement.prototype, key, { value() {} });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", { value() { return false; } });
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "SVGElement", "Element", "Node", "NodeList", "NodeFilter", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const raw = (key === "window" || key === "self") ? win : key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "ResizeObserver" ? class { observe() {} unobserve() {} disconnect() {} } : win[key as keyof typeof win];
    const value = typeof raw === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? raw.bind(win) : raw;
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  MemberAuthProviders = (await import("./fixtures/providers")).MemberAuthProviders;
  ui = await import("@testing-library/react/pure");
  Study = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountStudy;
  TicketEntry = (await import("@/components/tickets/ticket-account-entry")).TicketAccountEntry;
  Tickets = (await import("@/components/tickets/ticket-selection")).TicketSelection;
});
afterEach(() => { ui.cleanup(); dom.window.localStorage.clear(); });
after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 60));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

for (const entry of ["account", "ticket account"] as const) {
  test(`${entry} keeps configured options mounted and locked through status and identifier cleanup`, async () => {
    let resolveStatus!: (value: MemberStatus) => void;
    let resolveCleanup!: () => void;
    const status = new Promise<MemberStatus>((resolve) => { resolveStatus = resolve; });
    const cleanup = new Promise<void>((resolve) => { resolveCleanup = resolve; });
    const calls: string[] = [];
    const client: MemberClient = {
      ...actions, status: () => status,
      clearPhoneIdentifier: async () => { calls.push("cleanup"); await cleanup; },
      signInPasskey: async () => { calls.push("passkey"); },
      signInGoogle: async () => { calls.push("google"); },
      sendEmailCode: async () => { calls.push("code"); }
    };
    const Entry = entry === "account" ? Study : TicketEntry;
    ui.render(<Entry client={client} initialFlow="login" initialCapabilities={configured} />, { wrapper: MemberAuthProviders });
    const passkey = ui.screen.getByRole("button", { name: "Sign in with a passkey" }) as HTMLButtonElement;
    const google = ui.screen.getByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
    const submit = ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    assert.equal(passkey.disabled, true);
    assert.equal(google.disabled, true);
    assert.equal(submit.disabled, true);
    assert.equal(submit.textContent?.trim(), "Continue");
    assert.ok(!submit.querySelector("svg"), "initial readiness must not animate the credential action");
    const announcement = ui.screen.getByRole("status");
    assert.match(announcement.textContent!, /Checking sign-in options/);
    assert.ok(announcement.classList.contains("sr-only"), "readiness has one nonvisual announcement");
    ui.fireEvent.click(passkey);
    ui.fireEvent.click(google);
    ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
    assert.deepEqual(calls, []);
    await ui.act(async () => resolveStatus(anonymous));
    assert.deepEqual(calls, ["cleanup"]);
    assert.ok(ui.screen.getByRole("button", { name: "Sign in with a passkey" }) === passkey);
    assert.ok(ui.screen.getByRole("button", { name: "Continue with Google" }) === google);
    assert.ok(ui.screen.getByRole("button", { name: "Continue" }) === submit);
    assert.equal(passkey.disabled, true);
    assert.equal(google.disabled, true);
    assert.equal(submit.disabled, true);
    assert.ok(ui.screen.getByRole("status") === announcement);
    ui.fireEvent.click(passkey);
    ui.fireEvent.click(google);
    assert.deepEqual(calls, ["cleanup"], "public options must not bypass identifier cleanup");
    await ui.act(async () => resolveCleanup());
    await ui.waitFor(() => assert.equal(passkey.disabled, false));
    assert.equal(google.disabled, false);
    assert.equal(submit.disabled, false);
    assert.ok(ui.screen.getByRole("button", { name: "Sign in with a passkey" }) === passkey);
    assert.ok(ui.screen.getByRole("button", { name: "Continue" }) === submit);
    assert.ok(!ui.screen.queryByRole("heading", { name: "Account ready" }));
    assert.ok(!ui.screen.queryByRole("heading", { name: "Finish setting up your account" }));
  });
}

for (const google of [false, true]) {
test(`a signup seed excludes passkey and keeps Google ${google ? "visible but locked" : "hidden"}`, () => {
  const status = new Promise<MemberStatus>(() => {});
  ui.render(<Study client={{ ...actions, status: () => status }} initialFlow="signup" initialCapabilities={{ ...configured, google }} />, { wrapper: MemberAuthProviders });
  assert.ok(!ui.screen.queryByRole("button", { name: "Sign in with a passkey" }));
  const option = ui.screen.queryByRole("button", { name: "Continue with Google" }) as HTMLButtonElement | null;
  assert.equal(Boolean(option), google);
  if (option) assert.equal(option.disabled, true);
  assert.equal(ui.screen.getByRole("button", { name: "Continue" }).textContent?.trim(), "Continue");
});
}

for (const authoritative of [false, true]) {
  test(`returned capabilities are authoritative over a stale ${authoritative ? "hidden" : "visible"} public seed`, async () => {
    let resolve!: (value: MemberStatus) => void;
    const status = new Promise<MemberStatus>((done) => { resolve = done; });
    ui.render(<Study client={{ ...actions, status: () => status }} initialFlow="login" initialCapabilities={{ ...configured, passkey: !authoritative, google: !authoritative }} />, { wrapper: MemberAuthProviders });
    assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in with a passkey" })), !authoritative);
    assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Continue with Google" })), !authoritative);
    await ui.act(async () => resolve({ ...anonymous, capabilities: { ...configured, passkey: authoritative, google: authoritative } }));
    await ui.waitFor(() => assert.equal((ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled, false));
    assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in with a passkey" })), authoritative);
    assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Continue with Google" })), authoritative);
  });
}

test("a failed status seed exposes no identity or membership and cannot invoke configured providers", async () => {
  const calls: string[] = [];
  ui.render(<Study client={{ ...actions, status: async () => { throw new Error("Private readiness failure"); }, signInPasskey: async () => { calls.push("passkey"); }, signInGoogle: async () => { calls.push("google"); }, sendEmailCode: async () => { calls.push("code"); } }} initialFlow="login" initialCapabilities={configured} />, { wrapper: MemberAuthProviders });
  await ui.screen.findByRole("button", { name: "Refresh account status" });
  for (const name of ["Sign in with a passkey", "Continue with Google", "Continue"]) {
    const button = ui.screen.getByRole("button", { name }) as HTMLButtonElement;
    assert.equal(button.disabled, true);
    ui.fireEvent.click(button);
  }
  const email = ui.screen.getByLabelText("Email address");
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  ui.fireEvent.submit(email.closest("form")!);
  assert.deepEqual(calls, []);
  assert.ok(!ui.screen.queryByRole("heading", { name: "Account ready" }));
  assert.ok(!ui.screen.queryByRole("heading", { name: "Finish setting up your account" }));
  assert.ok(!ui.screen.queryByText("member@example.com"));
  assert.doesNotMatch(document.body.textContent!, /Private readiness failure/);
});

test("identifier cleanup failure keeps seeded options locked after a successful anonymous status response", async () => {
  let rejectCleanup!: (error: Error) => void;
  const cleanup = new Promise<void>((_resolve, reject) => { rejectCleanup = reject; });
  ui.render(<Study client={{ ...actions, status: async () => anonymous, clearPhoneIdentifier: () => cleanup }} initialFlow="login" initialCapabilities={configured} />, { wrapper: MemberAuthProviders });
  const passkey = ui.screen.getByRole("button", { name: "Sign in with a passkey" }) as HTMLButtonElement;
  assert.equal(passkey.disabled, true);
  await ui.act(async () => rejectCleanup(new Error("Private cleanup failure")));
  await ui.screen.findByRole("button", { name: "Refresh account status" });
  assert.ok(ui.screen.getByRole("button", { name: "Sign in with a passkey" }) === passkey);
  assert.equal(passkey.disabled, true);
  assert.equal((ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled, true);
  assert.ok(!ui.screen.queryByRole("heading", { name: "Account ready" }));
  assert.doesNotMatch(document.body.textContent!, /Private cleanup failure/);
});

test("customer email-domain filtering leaves passkey available and cannot enable unconfigured Google", async () => {
  const view = ui.render(<Study client={{ ...actions, status: async () => anonymous }} initialFlow="login" initialCapabilities={configured} />, { wrapper: MemberAuthProviders });
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  const passkey = ui.screen.getByRole("button", { name: "Sign in with a passkey" });
  const google = ui.screen.getByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
  const shell = document.querySelector("[data-account-alternatives-shell]");
  const row = document.querySelector<HTMLElement>("[data-account-entry-alternatives]");
  assert.equal(shell !== null && row !== null, true);
  ui.fireEvent.change(email, { target: { value: "customer@example.com" } });
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) === null, true);
  assert.equal(ui.screen.getByRole("button", { name: "Sign in with a passkey" }) === passkey, true);
  assert.equal((passkey as HTMLButtonElement).disabled, false);
  assert.equal(document.querySelector("[data-account-alternatives-shell]") === shell, true);
  assert.equal(document.querySelector("[data-account-entry-alternatives]") === row, true);
  assert.equal(shell!.getAttribute("data-expanded"), "true", "passkey keeps the provider row expanded");
  assert.equal(google.isConnected, true);
  assert.equal(google.disabled, true);
  assert.equal(google.closest("[inert]") !== null, true);
  await ui.waitFor(() => assert.equal(row!.style.columnGap, "0px"), { timeout: 1500 });
  ui.fireEvent.change(email, { target: { value: "  CUSTOMER@GOOGLEMAIL.COM  " } });
  assert.equal(ui.screen.getByRole("button", { name: "Continue with Google" }) === google, true);
  await ui.waitFor(() => assert.equal(row!.style.columnGap, "8px"), { timeout: 1500 });
  assert.equal(ui.screen.getByRole("button", { name: "Sign in with a passkey" }) === passkey, true);
  view.rerender(<Study client={{ ...actions, status: async () => ({ ...anonymous, capabilities: { ...configured, google: false } }) }} initialFlow="login" initialCapabilities={{ ...configured, google: false }} />);
  await ui.waitFor(() => assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) === null, true));
  assert.equal(ui.screen.queryByRole("button", { name: "Sign in with a passkey" }) !== null, true);
  assert.equal(document.querySelector('button[aria-label="Continue with Google"]') === null, true, "unconfigured Google is not mounted");
});

test("inline ticket entry seeds public options while pending and retains quantity through authoritative registration", async () => {
  let requests = 0;
  let lookups = 0;
  let deliveries = 0;
  let resolveInitial!: (value: MemberStatus) => void;
  const pending = new Promise<MemberStatus>((resolve) => { resolveInitial = resolve; });
  let current = anonymous;
  const client: MemberClient = { ...actions, lookupEmail: async () => { lookups++; return { account: "existing" }; }, sendEmailCode: async () => { deliveries++; }, status: () => ++requests === 1 ? pending : Promise.resolve(current) };
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 3 }]);
  const view = ui.render(<Tickets memberClient={client} initialCapabilities={{ ...configured, google: false }} />, { wrapper: MemberAuthProviders });
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  const continuation = ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  assert.equal(email.disabled, true);
  assert.equal(continuation.disabled, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) === null, true);
  assert.equal(ui.screen.queryByRole("dialog") === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }) === null, true);
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  const retainedQuantity = view.container.querySelector<HTMLInputElement>('input[aria-label="Ticket quantity"]')!;
  assert.equal(retainedQuantity.value, "3");
  await ui.act(async () => resolveInitial(anonymous));
  await ui.waitFor(() => assert.equal(email.disabled, false));
  const google = await ui.screen.findByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
  assert.equal(google.disabled, false);
  assert.equal(ui.screen.getByRole("textbox", { name: "Email address" }) === email, true);
  assert.equal(continuation.disabled, false, "status readiness allows explicit lookup, not code delivery");
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  assert.equal(lookups, 0, "typing does not query account existence");
  ui.fireEvent.click(continuation);
  const classifiedAction = await ui.screen.findByRole("button", { name: "Send sign-in code" }) as HTMLButtonElement;
  assert.equal(classifiedAction.disabled, false);
  assert.equal(lookups, 1);
  assert.equal(deliveries, 0, "classification cannot deliver a code");
  assert.equal(requests, 1, "the inline session alone owns initial status");
  current = { ...anonymous, authenticated: true, emailVerified: true, phoneBound: true, member: true };
  await ui.act(async () => document.dispatchEvent(new Event("visibilitychange")));
  const quantity = await ui.screen.findByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  assert.equal(quantity === retainedQuantity, true);
  assert.equal(quantity.value, "3");
  assert.equal(ui.screen.queryByRole("dialog") === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }) === null, true);
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});
