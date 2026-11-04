import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "../../lib/member-auth/client";
import type { TicketPreviewCatalogue, TicketPreviewQuote } from "../../components/tickets/ticket-selection";
import { readTicketSelectionDraft, saveTicketSelectionDraft, TICKET_DRAFT_RETENTION_MS, TICKET_SELECTION_DRAFT_KEY } from "../../lib/tickets/selection-draft";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Tickets: typeof import("../../components/tickets/ticket-selection").TicketSelection;
let storageDescriptor: PropertyDescriptor;
const previous = new Map<string, PropertyDescriptor | undefined>();
const anonymous: MemberStatus = { authenticated: false, emailVerified: false, phoneBound: false, member: false,
  capabilities: { emailOtp: true, magicLink: true, google: false, passkey: true } };
const noAction = async () => {};
const memberActions: Omit<MemberClient, "status"> = {
  clearPhoneIdentifier: noAction, identifyPhone: noAction, sendEmailCode: noAction,
  sendMagicLink: noAction, signInGoogle: noAction, verifyEmailCode: noAction,
  signInPasskey: noAction, addPasskey: noAction, bindPhone: noAction, signOut: noAction
};
const member: MemberStatus = { ...anonymous, authenticated: true, emailVerified: true, phoneBound: true, member: true };
const catalogue: TicketPreviewCatalogue = { kind: "test", version: "fixture-v1", currency: "KRW", maximumTotalQuantity: 6,
  ticketTypes: [{ id: "first-night-preview", label: "Test admission", minimumQuantity: 1, maximumQuantity: 6 },
    { id: "other-test", label: "Other test admission", minimumQuantity: 2, maximumQuantity: 4 },
    { id: "unavailable-test", label: "Unavailable test admission", minimumQuantity: 1, maximumQuantity: 2, available: false }] };
function quote(quantity = 1): TicketPreviewQuote {
  return { catalogueVersion: catalogue.version, currency: "KRW", items: [{ ticketTypeId: "first-night-preview", quantity,
    unitAmountMinor: 12345, totalAmountMinor: quantity * 12345 }], totalAmountMinor: quantity * 12345,
    issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(), reservation: "none", checkoutAvailable: false };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/tickets", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  storageDescriptor = Object.getOwnPropertyDescriptor(win, "localStorage")!;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "SVGElement", "Element", "Node", "NodeFilter", "NodeList", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" ? win : win[key as keyof typeof win];
    Object.defineProperty(globalThis, key, { configurable: true, writable: true,
      value: typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(win) : value });
  }
  previous.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, writable: true, value: true });
  win.matchMedia = () => ({ matches: false, media: "", addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false, onchange: null });
  previous.set("ResizeObserver", Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver"));
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, writable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
  win.scrollTo = () => {};
  Object.defineProperty(win.HTMLElement.prototype, "scrollIntoView", { value() {} });
  ui = await import("@testing-library/react/pure");
  Tickets = (await import("../../components/tickets/ticket-selection")).TicketSelection;
});
afterEach(async () => { Object.defineProperty(dom.window, "localStorage", storageDescriptor); ui?.cleanup(); await new Promise((resolve) => setTimeout(resolve, 40)); dom.window.localStorage.clear(); });
after(() => { dom.window.close(); for (const [key, value] of previous) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); } });

test("actual default is a bounded selection preview with unknown price and no checkout", async () => {
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  assert.ok(ui.screen.getByRole("heading", { name: "Tickets", level: 1 }));
  assert.ok(ui.screen.getByText("Price to be announced"));
  assert.ok(ui.screen.getByText(/not on sale yet/));
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("button", { name: "Continue with account" }) as HTMLButtonElement).disabled, false));
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  assert.equal(count.value, "1");
  assert.equal((ui.screen.getByRole("button", { name: "Remove one ticket" }) as HTMLButtonElement).disabled, true);
  for (let i = 0; i < 8; i++) ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  assert.equal(count.value, "6");
  assert.equal((ui.screen.getByRole("button", { name: "Add one ticket" }) as HTMLButtonElement).disabled, true);
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("ticket preview uses shared rails and balanced content-sized panels", async () => {
  const view = ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  await ui.screen.findByRole("button", { name: "Continue with account" });
  const header = view.container.querySelector("main > header");
  assert.ok(header?.classList.contains("max-w-[960px]"), "header and content use the same outer rail");
  assert.ok(header.nextElementSibling?.classList.contains("max-w-[960px]"));
  const choiceHeading = ui.screen.getByRole("heading", { name: "Your tickets" });
  const summaryHeading = ui.screen.getByRole("heading", { name: "Your selection" });
  const choice = choiceHeading.closest("section")!;
  const summary = summaryHeading.closest("section")!;
  const grid = choice.parentElement!;
  assert.ok(grid.classList.contains("min-[800px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"));
  assert.ok(grid.classList.contains("items-start"), "panel height remains content-sized rather than stretched");
  for (const panel of [choice, summary]) {
    assert.ok(panel.classList.contains("bg-neutral-900/50"));
    assert.ok(![...panel.classList].some((value) => /^(?:shadow-|h-|min-h-)/.test(value)), "no extra shadow, filler height or fixed panel height");
  }
  for (const heading of [choiceHeading, summaryHeading]) {
    for (const token of ["text-[16px]", "leading-6", "font-medium", "text-neutral-100"]) {
      assert.ok(heading.classList.contains(token), "both section headings share the same visual hierarchy");
    }
  }
  const price = ui.screen.getByText("Price to be announced");
  for (const token of ["text-[18px]", "leading-6", "text-neutral-300"]) assert.ok(price.classList.contains(token));
  assert.ok(!price.classList.contains("text-[27px]"), "unknown pricing is not styled like an actual monetary total");
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("an actual test quote retains monetary emphasis without enabling checkout", async () => {
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} />);
  const unknown = ui.screen.getByText("Price to be announced");
  assert.ok(unknown.classList.contains("text-[18px]"));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  const amount = await ui.screen.findByText("₩12,345");
  for (const token of ["text-[27px]", "leading-[34px]", "font-medium", "tabular-nums"]) assert.ok(amount.classList.contains(token));
  assert.ok(!amount.classList.contains("text-neutral-300"));
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("account chooser overlays the retained ticket selection without changing URL or history", async (t) => {
  const push = t.mock.method(window.history, "pushState");
  const replace = t.mock.method(window.history, "replaceState");
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  const main = document.querySelector("main");
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  ui.fireEvent.keyDown(count, { key: "ArrowUp" });
  await ui.waitFor(() => assert.equal(count.value, "2"));
  const trigger = await ui.screen.findByRole("button", { name: "Continue with account" });
  ui.fireEvent.click(trigger);
  await ui.screen.findByRole("heading", { name: "Welcome" });
  assert.ok(document.querySelector("main") === main, "the actual caller stays mounted, not a synthetic account page");
  assert.equal(document.querySelectorAll("main").length, 1);
  assert.ok(count.isConnected);
  assert.equal(count.value, "2");
  assert.ok(ui.screen.queryByRole("link", { name: "Back to tickets" }) === null);
  assert.equal(document.querySelector('a[href="/account"],a[href="/account/continue"]'), null);
  assert.equal(window.location.pathname, "/tickets");
  assert.equal(push.mock.calls.length + replace.mock.calls.length, 0);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Close account options" }));
  await ui.waitFor(() => assert.ok(document.activeElement === trigger));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(document.querySelector("main") === main);
  assert.equal(count.value, "2");
  const saved = readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(saved.status, "ready");
  if (saved.status === "ready") assert.deepEqual(saved.draft.items, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
  assert.doesNotMatch(JSON.stringify(saved), /price|owner|email|token|quote|reservation/i);
});

test("a pending account opens local continuation and contextual defer returns to its ticket selection", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 4 }], { returnToTickets: true });
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => ({ ...anonymous, authenticated: true, emailVerified: true }) }} />);
  const trigger = await ui.screen.findByRole("button", { name: "Finish account setup" });
  const count = ui.screen.getByRole("textbox") as HTMLInputElement;
  assert.equal(count.value, "4");
  ui.fireEvent.click(trigger);
  await ui.screen.findByRole("heading", { name: "Finish setting up your account" });
  ui.fireEvent.keyDown(document, { key: "Escape" });
  assert.ok(ui.screen.getByRole("heading", { name: "Finish setting up your account" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("heading", { name: "Finish setting up your account" }) === null));
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: /I[’']ll do it later/ }) === null);
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.equal(window.location.pathname, "/tickets");
  await ui.waitFor(() => assert.ok(document.activeElement === trigger));
  assert.equal(count.value, "4");
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("blocked storage has a local Continue without saving opener and keeps in-memory selection", async (t) => {
  const getter = Object.getOwnPropertyDescriptor(dom.window, "localStorage")!;
  Object.defineProperty(dom.window, "localStorage", { configurable: true, get() { throw new Error("private storage detail"); } });
  t.after(() => Object.defineProperty(dom.window, "localStorage", getter));
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Add one ticket" }));
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  assert.equal(count.value, "2");
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue with account" }));
  assert.match(ui.screen.getByRole("alert").textContent ?? "", /couldn’t save/);
  const fallback = ui.screen.getByRole("button", { name: "Continue without saving" });
  ui.fireEvent.click(fallback);
  await ui.screen.findByRole("heading", { name: "Welcome" });
  assert.equal(window.location.pathname, "/tickets");
  assert.equal(count.value, "2");
  assert.doesNotMatch(document.body.textContent ?? "", /private storage detail/);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Close account options" }));
  await ui.waitFor(() => assert.ok(document.activeElement === fallback));
  assert.equal(count.value, "2");
});

test("Done closes locally and rechecks authoritative parent membership before exposing test quotes", async () => {
  let current = anonymous;
  let reads = 0;
  const client: MemberClient = { ...memberActions, status: async () => { reads++; return current; },
    signInPasskey: async () => { current = member; } };
  ui.render(<Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async () => quote() }} />);
  const trigger = await ui.screen.findByRole("button", { name: "Continue with account" });
  ui.fireEvent.click(trigger);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Sign in with a passkey" }));
  await ui.screen.findByRole("heading", { name: "Account ready" });
  const beforeDone = reads;
  assert.ok(ui.screen.queryByRole("link", { name: "Return to tickets" }) === null);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Done" }));
  await ui.screen.findByRole("button", { name: "Get test quote" });
  assert.ok(reads > beforeDone, "closure is not membership authority: parent reads the server again");
  assert.equal(window.location.pathname, "/tickets");
  assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }) === null);
});

test("contextual signup retains tickets through email OTP, verified phone binding, and authoritative Done refresh", async (t) => {
  const push = t.mock.method(window.history, "pushState");
  const replace = t.mock.method(window.history, "replaceState");
  const originalUrl = window.location.href;
  const originalHistoryLength = window.history.length;
  const parentStatus = deferred<MemberStatus>();
  const binding = deferred<void>();
  let current = anonymous;
  let refreshingParent = false;
  let reads = 0;
  const calls: Array<[string, ...unknown[]]> = [];
  const client: MemberClient = { ...memberActions,
    status: async () => { reads++; return refreshingParent ? parentStatus.promise : current; },
    sendEmailCode: async (...args) => { calls.push(["send", ...args]); },
    verifyEmailCode: async (...args) => {
      calls.push(["verify", ...args]);
      current = { ...anonymous, authenticated: true, emailVerified: true };
    },
    bindPhone: async (...args) => {
      calls.push(["bind", ...args]);
      await binding.promise;
      current = member;
    }
  };
  const challenge = { id: "ticket-signup-challenge", recipient: "verify@sophomores.co", body: "SPHMRS DOM-ONLY",
    expiresAt: new Date(Date.now() + 60_000).toISOString(), mode: "trial" };
  const phoneRequests: Array<[string, string, unknown]> = [];
  t.mock.method(globalThis, "fetch", async (path: RequestInfo | URL, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    phoneRequests.push([String(path), method, init.body]);
    assert.equal(init.credentials, "same-origin");
    if (method === "POST") {
      assert.equal(path, "/api/phone-verification/challenges");
      return Response.json({ success: true, data: challenge });
    }
    assert.equal(path, "/api/phone-verification/challenges/" + challenge.id);
    if (method === "DELETE") return new Response(null, { status: 204 });
    assert.equal(method, "GET");
    return Response.json({ success: true, data: { id: challenge.id, expiresAt: challenge.expiresAt, mode: "trial", state: "verified" } });
  });
  const quoteRequests: unknown[] = [];
  const view = ui.render(<Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async (input) => {
    quoteRequests.push(input); return quote(2);
  } }} />);
  // Unmount while the scoped fetch mock still owns challenge-disposal requests.
  t.after(() => view.unmount());
  const main = document.querySelector("main")!;
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  function retained(stage: string) {
    assert.equal(document.querySelector("main"), main, stage);
    assert.equal(document.querySelectorAll("main").length, 1, stage);
    assert.equal(document.getElementById(count.id), count, stage);
    assert.equal(count.isConnected, true, stage);
    assert.equal(count.value, "2", stage);
    assert.equal(window.location.href, originalUrl, stage);
    assert.equal(window.history.length, originalHistoryLength, stage);
    assert.equal(push.mock.calls.length + replace.mock.calls.length, 0, stage);
    assert.equal((ui.within(main).getByText("Checkout unavailable").closest("button") as HTMLButtonElement).disabled, true, stage);
  }
  function ineligible(stage: string) {
    retained(stage);
    assert.equal(ui.within(main).queryByText("Get test quote"), null, stage);
    assert.equal(ui.within(main).queryByText("Account verified"), null, stage);
    assert.equal(quoteRequests.length, 0, stage);
  }
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue with account" }));
  await ui.screen.findByRole("heading", { name: "Welcome" });
  ineligible("chooser");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign up" }));
  const email = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  assert.equal(phoneRequests.length, 0, "signup does not automatically issue a phone challenge");
  ui.fireEvent.change(email, { target: { value: "ticket+signup@example.com" } });
  ui.fireEvent.submit(email.closest("form")!);
  const otp = await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  assert.deepEqual(calls, [["send", "ticket+signup@example.com"]]);
  ineligible("email OTP requested");
  ui.fireEvent.change(otp, { target: { value: "A1B2C3" } });
  const phone = await ui.screen.findByRole("textbox", { name: "Phone number" });
  assert.deepEqual(calls[1], ["verify", "ticket+signup@example.com", "A1B2C3"]);
  assert.equal(phoneRequests.length, 0, "email verification alone does not issue phone proof");
  ineligible("email confirmed, phone unverified");
  ui.fireEvent.change(phone, { target: { value: "01012345678" } });
  ui.fireEvent.submit(phone.closest("form")!);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Check status" }));
  const finish = await ui.screen.findByRole("button", { name: "Finish registration" });
  assert.deepEqual(phoneRequests.slice(0, 2).map(([path, method]) => [path, method]), [
    ["/api/phone-verification/challenges", "POST"],
    ["/api/phone-verification/challenges/" + challenge.id, "GET"]
  ]);
  assert.deepEqual(JSON.parse(phoneRequests[0][2] as string), { phone: "+821012345678" });
  assert.equal(calls.filter(([name]) => name === "bind").length, 0, "verified phone proof still needs explicit binding");
  ineligible("verified proof before binding");
  ui.fireEvent.click(finish);
  await ui.screen.findByRole("button", { name: "Finishing…" });
  assert.deepEqual(calls[2], ["bind", challenge.id, "+821012345678"]);
  assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }) === null);
  ineligible("binding pending");
  await ui.act(async () => binding.resolve());
  await ui.screen.findByRole("heading", { name: "Account ready" });
  const done = await ui.screen.findByRole("button", { name: "Done" });
  ineligible("modal account ready is not parent membership authority");
  const beforeDone = reads;
  refreshingParent = true;
  ui.fireEvent.click(done);
  await ui.screen.findByRole("button", { name: "Checking account…" });
  assert.ok(reads > beforeDone, "Done must read server status again");
  assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }) === null);
  ineligible("authoritative parent refresh pending");
  await ui.act(async () => parentStatus.resolve(member));
  const getQuote = await ui.screen.findByRole("button", { name: "Get test quote" });
  retained("authoritative membership restored");
  assert.equal(quoteRequests.length, 0, "account completion never requests a quote automatically");
  ui.fireEvent.click(getQuote);
  await ui.screen.findByText("₩24,690");
  assert.equal(quoteRequests.length, 1);
  assert.deepEqual(quoteRequests[0], { catalogueVersion: catalogue.version, items: [{ ticketTypeId: "first-night-preview", quantity: 2 }] });
  retained("test quote ready, checkout still unavailable");
});

test("Done focuses the retained summary while a deferred parent status check disables its original opener", async () => {
  const pending = deferred<MemberStatus>();
  let current = anonymous;
  let finishing = false;
  const client: MemberClient = { ...memberActions,
    status: async () => finishing ? pending.promise : current,
    signInPasskey: async () => { current = member; }
  };
  ui.render(<Tickets memberClient={client} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue with account" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Sign in with a passkey" }));
  const done = await ui.screen.findByRole("button", { name: "Done" });
  const summary = document.getElementById("ticket-summary-heading");
  finishing = true;
  ui.fireEvent.click(done);
  await ui.screen.findByRole("button", { name: "Checking account…" });
  await ui.waitFor(() => assert.ok(document.activeElement === summary), { timeout: 1500 });
  assert.equal(ui.screen.queryByText("Account verified"), null, "modal completion never supplies parent membership authority");
  await ui.act(async () => pending.resolve(member));
  await ui.screen.findByText("Account verified");
  assert.ok(document.activeElement === summary);
});

test("Done keeps quote eligibility closed when the authoritative refresh fails", async () => {
  let current = anonymous;
  let unavailable = false;
  const client: MemberClient = { ...memberActions,
    status: async () => { if (unavailable) throw new Error("private status error"); return current; },
    signInPasskey: async () => { current = member; }
  };
  ui.render(<Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async () => quote() }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue with account" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Sign in with a passkey" }));
  const done = await ui.screen.findByRole("button", { name: "Done" });
  unavailable = true;
  ui.fireEvent.click(done);
  await ui.screen.findByRole("button", { name: "Try account again" });
  assert.ok(ui.screen.queryByRole("button", { name: "Get test quote" }) === null);
  assert.doesNotMatch(document.body.textContent ?? "", /private status error/);
});

test("closing and reopening the retained dialog starts a fresh private flow", async () => {
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  const trigger = await ui.screen.findByRole("button", { name: "Continue with account" });
  ui.fireEvent.click(trigger);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const email = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  ui.fireEvent.change(email, { target: { value: "private+고객@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Close account options" }));
  await ui.waitFor(() => assert.ok(document.activeElement === trigger));
  ui.fireEvent.click(trigger);
  await ui.screen.findByRole("heading", { name: "Welcome" });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  const reopened = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  assert.equal(reopened.value, "");
  assert.ok(reopened !== email, "private session content was disposed while the caller and dialog owner remained mounted");
});

test("successful login followed by direct Cancel rechecks parent membership too", async () => {
  let current = anonymous;
  let reads = 0;
  const client: MemberClient = { ...memberActions,
    status: async () => { reads++; return current; },
    signInPasskey: async () => { current = member; }
  };
  ui.render(<Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async () => quote() }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue with account" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Sign in with a passkey" }));
  await ui.screen.findByRole("button", { name: "Done" });
  const beforeClose = reads;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  await ui.screen.findByRole("button", { name: "Get test quote" });
  assert.ok(reads > beforeClose);
});

test("test quotes require authoritative membership, keep checkout disabled, and invalidate on selection edits", async () => {
  let calls = 0;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => { calls++; return quote(); } }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  assert.equal(calls, 1);
  assert.match(ui.screen.getByRole("status").textContent ?? "", /Test quote updated.*₩12,345.*No reservation/);
  assert.ok(ui.screen.getByText(/Test prices.*not an offer/));
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  assert.ok(ui.screen.getByRole("button", { name: "Get test quote" }));
});

test("late quote responses cannot replace changed selections or later requests", async () => {
  const first = deferred<TicketPreviewQuote>();
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (input) => input.items[0].quantity === 1 ? first.promise : quote(2) }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  assert.equal((ui.screen.getByRole("button", { name: "Updating quote…" }) as HTMLButtonElement).getAttribute("aria-busy"), "true");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩24,690")));
  await ui.act(async () => first.resolve(quote()));
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  assert.ok(ui.screen.getByText("₩24,690"));
});

test("membership refresh hides a previously eligible quote and rejects stale account reads", async () => {
  let current = member;
  let reads = 0;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => { reads++; return current; } }} quoteAdapter={{ request: async () => quote() }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  current = anonymous;
  await ui.act(async () => dom.window.dispatchEvent(new dom.window.Event("focus")));
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Continue with account" })));
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  assert.ok(ui.screen.queryByRole("button", { name: "Get test quote" }) === null);
  assert.ok(reads >= 2);
});

for (const defect of ["currency", "selection", "arithmetic", "checkout", "future"] as const) {
  test("rejects untrusted quote " + defect + " instead of displaying a trusted total", async () => {
    const result = quote();
    const invalid = defect === "currency" ? { ...result, currency: "USD" } : defect === "selection" ? { ...result, items: [{ ...result.items[0], quantity: 2 }] } : defect === "arithmetic" ? { ...result, totalAmountMinor: 1 } : defect === "checkout" ? { ...result, checkoutAvailable: true } : { ...result, issuedAt: new Date(Date.now() + 20_000).toISOString() };
    ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => invalid as TicketPreviewQuote }} />);
    ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
    await ui.waitFor(() => assert.match(ui.screen.getByRole("alert").textContent ?? "", /couldn’t update/));
    assert.equal(ui.screen.queryByText("₩12,345"), null);
  });
}

test("expired quotes are hidden after hidden-tab wall time and can be refreshed", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  now += 61_000;
  await ui.act(async () => document.dispatchEvent(new dom.window.Event("visibilitychange")));
  await ui.waitFor(() => assert.equal(ui.screen.queryByText("₩12,345"), null));
  assert.ok(ui.screen.getByRole("button", { name: /test quote/ }));
});

test("network failures recover without leaking details and unavailable ticket types cannot be selected", async () => {
  let fail = true;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => { if (fail) throw new Error("private network detail"); return quote(); } }} />);
  assert.equal((ui.screen.getByRole("radio", { name: /Unavailable test admission/ }) as HTMLInputElement).disabled, true);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("alert").textContent ?? "", /couldn’t update/));
  assert.doesNotMatch(document.body.textContent ?? "", /private network detail/);
  fail = false;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Retry test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
});

test("mounted saved drafts expire on focus even when the stored JSON has not changed", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 4 }]);
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  await ui.act(async () => {});
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "4"));
  now += TICKET_DRAFT_RETENTION_MS + 1;
  await ui.act(async () => dom.window.dispatchEvent(new dom.window.Event("focus")));
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "1"));
  assert.ok(ui.screen.getByText(/saved selection expired/));
});

test("invalid saved selections are disclosed, and choosing a new option deliberately replaces them", async () => {
  dom.window.localStorage.setItem(TICKET_SELECTION_DRAFT_KEY, "{malformed");
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => anonymous }} />);
  await ui.act(async () => {});
  assert.ok(ui.screen.getByText(/couldn’t be restored/));
  ui.fireEvent.click(ui.screen.getByRole("radio", { name: "Other test admission" }));
  assert.equal(ui.screen.queryByText(/couldn’t be restored/), null);
  assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "2");
  const stored = readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(stored.status, "ready");
  if (stored.status === "ready") assert.deepEqual(stored.draft.items, [{ ticketTypeId: "other-test", quantity: 2 }]);
});

test("a draft with unknown options or unsupported line count is not silently treated as a current choice", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "unknown-test", quantity: 4 }]);
  const view = ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  await ui.act(async () => {});
  assert.ok(ui.screen.getByText(/Ticket options changed/));
  assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "1");
  view.unmount();
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }, { ticketTypeId: "other-test", quantity: 2 }]);
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => anonymous }} />);
  await ui.act(async () => {});
  assert.ok(ui.screen.getByText(/Ticket options changed/));
});

test("storage write rejection blocks handoff without leaking private failure details", async (t) => {
  t.mock.method(dom.window.Storage.prototype, "setItem", () => { throw new Error("private quota details"); });
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue with account" }));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.match(ui.screen.getByRole("alert").textContent ?? "", /couldn’t save/);
  assert.doesNotMatch(document.body.textContent ?? "", /private quota details/);
});

test("catalogue changes abort old quotes and cannot resurrect an earlier matching version", async () => {
  const pending = deferred<TicketPreviewQuote>();
  const client = { ...memberActions, status: async () => member };
  const adapter = { request: async () => pending.promise };
  const view = ui.render(<Tickets catalogue={catalogue} memberClient={client} quoteAdapter={adapter} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  const revised = { ...catalogue, version: "fixture-v2" };
  view.rerender(<Tickets catalogue={revised} memberClient={client} quoteAdapter={{ request: async () => ({ ...quote(), catalogueVersion: revised.version }) }} />);
  await ui.act(async () => pending.resolve(quote()));
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  view.rerender(<Tickets catalogue={catalogue} memberClient={client} quoteAdapter={adapter} />);
  assert.equal(ui.screen.queryByText("₩12,345"), null);
});

test("late membership replies cannot overwrite a newer account check", async () => {
  const initial = deferred<MemberStatus>();
  let reads = 0;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => ++reads === 1 ? initial.promise : member }} quoteAdapter={{ request: async () => quote() }} />);
  await ui.act(async () => dom.window.dispatchEvent(new dom.window.Event("focus")));
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Get test quote" })));
  await ui.act(async () => initial.resolve(anonymous));
  assert.ok(ui.screen.getByRole("button", { name: "Get test quote" }));
  assert.ok(ui.screen.queryByRole("button", { name: "Continue with account" }) === null);
});

test("malformed membership and network outages remain recoverable, never eligible", async () => {
  let invalid = true;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => invalid ? { ...anonymous, member: true } : anonymous }} quoteAdapter={{ request: async () => quote() }} />);
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Try account again" })));
  assert.ok(ui.screen.queryByRole("button", { name: "Get test quote" }) === null);
  invalid = false;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Try account again" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Continue with account" })));
});

test("hanging quote requests have a bounded deadline and abort their signal", async (t) => {
  let signal: AbortSignal | undefined;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (_input, options) => { signal = options?.signal; return new Promise(() => {}); } }} />);
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Get test quote" })));
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    await ui.act(async () => { ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" })); t.mock.timers.tick(10_000); });
    assert.equal(signal?.aborted, true);
    assert.ok(ui.screen.getByRole("button", { name: "Retry test quote" }));
    assert.equal(ui.screen.queryByText("₩12,345"), null);
  } finally { t.mock.timers.reset(); }
});

test("unmount aborts pending quote work and ignores a later response", async () => {
  const pending = deferred<TicketPreviewQuote>();
  let signal: AbortSignal | undefined;
  const view = ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (_input, options) => { signal = options?.signal; return pending.promise; } }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  view.unmount();
  assert.equal(signal?.aborted, true);
  await ui.act(async () => pending.resolve(quote()));
  assert.equal(document.querySelector("main"), null);
});

test("cross-tab selection A to B to A cannot resurrect canceled pending quote work", async () => {
  const pending = deferred<TicketPreviewQuote>();
  let signal: AbortSignal | undefined;
  let calls = 0;
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 1 }]);
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (_input, options) => {
    calls++; signal = options?.signal; return calls === 1 ? pending.promise : quote();
  } }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.act(async () => {
    saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
    dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: TICKET_SELECTION_DRAFT_KEY }));
  });
  assert.equal(signal?.aborted, true);
  await ui.act(async () => {
    saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 1 }]);
    dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: TICKET_SELECTION_DRAFT_KEY }));
  });
  assert.ok(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.act(async () => pending.resolve(quote()));
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
});

test("cross-tab selection A to B to A does not resurrect an earlier ready quote", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 1 }]);
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  for (const quantity of [2, 1]) {
    await ui.act(async () => {
      saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity }]);
      dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: TICKET_SELECTION_DRAFT_KEY }));
    });
  }
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  assert.ok(ui.screen.getByRole("button", { name: "Get test quote" }));
});

test("partial or out-of-range quantity edits invalidate quotes without claiming a storage outage", async () => {
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  const input = ui.screen.getByRole("textbox", { name: "Ticket quantity" });
  ui.fireEvent.change(input, { target: { value: "" } });
  assert.equal(ui.screen.queryByText("₩12,345"), null);
  assert.equal((ui.screen.getByRole("button", { name: "Get test quote" }) as HTMLButtonElement).disabled, true);
  ui.fireEvent.change(input, { target: { value: "0" } });
  assert.ok(ui.screen.queryByRole("alert") === null);
  ui.fireEvent.blur(input);
  assert.equal((input as HTMLInputElement).value, "1");
  assert.equal((ui.screen.getByRole("button", { name: "Get test quote" }) as HTMLButtonElement).disabled, false);
});

test("fractional typing and paste explain whole-number recovery without saving or quoting invalid quantities", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
  let calls = 0;
  ui.render(<Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => { calls++; return quote(3); } }} />);
  await ui.screen.findByRole("button", { name: "Get test quote" });
  const input = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  for (const interaction of ["type", "paste"] as const) {
    if (interaction === "type") ui.fireEvent.change(input, { target: { value: "1.5" } });
    else { ui.act(() => input.select()); ui.fireEvent.paste(input, { clipboardData: { getData: () => "2.5" } }); }
    ui.fireEvent.blur(input);
    assert.equal(input.getAttribute("aria-invalid"), "true", interaction);
    const helper = ui.screen.getByRole("alert");
    assert.match(helper.textContent ?? "", /Enter a whole number from 1 to 6/);
    assert.equal(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent, helper.textContent);
    assert.equal(ui.screen.getAllByText(/Enter a whole number/).length, 1);
    assert.ok(ui.screen.getByText("Choose quantity"));
    assert.doesNotMatch(ui.screen.getByRole("region", { name: "Your selection" }).textContent ?? "", /[12]\.5 tickets/);
    assert.equal((ui.screen.getByRole("button", { name: "Get test quote" }) as HTMLButtonElement).disabled, true);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
    assert.equal(calls, 0);
    const saved = readTicketSelectionDraft(dom.window.localStorage);
    assert.equal(saved.status, "ready");
    if (saved.status === "ready") assert.equal(saved.draft.items[0].quantity, 2);
    assert.doesNotMatch(ui.screen.getByRole("status").textContent ?? "", /whole number/);
  }
  ui.fireEvent.change(input, { target: { value: "3" } });
  ui.fireEvent.blur(input);
  assert.equal(input.getAttribute("aria-invalid"), "false");
  assert.equal(ui.screen.queryByText(/Enter a whole number/), null);
  assert.equal(ui.screen.queryByText("Choose quantity"), null);
  const saved = readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(saved.status, "ready");
  if (saved.status === "ready") assert.equal(saved.draft.items[0].quantity, 3);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩37,035")));
  assert.equal(calls, 1);
});

test("fractional quantities cannot navigate an anonymous account handoff or overwrite its valid draft", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
  ui.render(<Tickets memberClient={{ ...memberActions, status: async () => anonymous }} />);
  await ui.screen.findByRole("button", { name: "Continue with account" });
  const input = ui.screen.getByRole("textbox", { name: "Ticket quantity" });
  ui.fireEvent.change(input, { target: { value: "1.5" } });
  ui.fireEvent.blur(input);
  assert.equal((ui.screen.getByRole("button", { name: "Continue with account" }) as HTMLButtonElement).disabled, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue with account" }));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  const saved = readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(saved.status, "ready");
  if (saved.status === "ready") { assert.equal(saved.draft.items[0].quantity, 2); assert.equal(saved.draft.returnToTickets, false); }
  assert.match(ui.screen.getByRole("alert").textContent ?? "", /Enter a whole number/);
});
