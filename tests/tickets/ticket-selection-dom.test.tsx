import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { MemberAuthActionError } from "@/lib/member-auth/client";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";
import type { TicketPreviewCatalogue, TicketPreviewQuote } from "@/components/tickets/ticket-selection";
import { readTicketSelectionDraft, saveTicketSelectionDraft, TICKET_DRAFT_RETENTION_MS, TICKET_SELECTION_DRAFT_KEY } from "@/lib/tickets/selection-draft";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Tickets: typeof import("@/components/tickets/ticket-selection").TicketSelection;
let storageDescriptor: PropertyDescriptor;
const previous = new Map<string, PropertyDescriptor | undefined>();
const anonymous: MemberStatus = { authenticated: false, phoneBindingAuth: "anonymous" as const, emailVerified: false, phoneBound: false, member: false,
  capabilities: { emailOtp: true, magicLink: true, google: false, passkey: true } };
const noAction = async () => {};
const memberActions: Omit<MemberClient, "status"> = {
  lookupEmail: async () => ({ account: "existing" }),
  clearPhoneIdentifier: noAction, identifyPhone: noAction, sendEmailCode: noAction,
  sendMagicLink: noAction, signInGoogle: noAction, verifyEmailCode: noAction,
  signInPasskey: noAction, addPasskey: noAction, bindPhone: noAction, signOut: noAction
};
const member: MemberStatus = { ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true, phoneBound: true, member: true };
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
async function completeSignupEmail() {
  const email = await ui.screen.findByRole("textbox", { name: "Email address" });
  await ui.waitFor(() => assert.equal((email as HTMLInputElement).disabled, false));
  ui.fireEvent.change(email, { target: { value: "ticket+entry@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByRole("button", { name: /^(?:Send sign-in code|Create account & send code)$/ });
  ui.fireEvent.submit(email.closest("form")!);
  const otp = await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  ui.fireEvent.change(otp, { target: { value: "A1B2C3" } });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/tickets", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  // JSDOM has no LockManager. Model the native nonqueued exclusive contract,
  // including holding ownership until the asynchronous SDK callback settles.
  const heldLocks = new Set<string>();
  Object.defineProperty(win.navigator, "locks", { configurable: true, value: {
    request: async (name: string, options: LockOptions, callback: (lock: { name: string; mode: "exclusive" } | null) => Promise<unknown>) => {
      assert.equal(options.mode, "exclusive");
      assert.equal(options.ifAvailable, true);
      if (heldLocks.has(name)) return callback(null);
      heldLocks.add(name);
      try { return await callback({ name, mode: "exclusive" }); }
      finally { heldLocks.delete(name); }
    },
  } });
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
  Tickets = (await import("@/components/tickets/ticket-selection")).TicketSelection;
});
afterEach(async () => { Object.defineProperty(dom.window, "localStorage", storageDescriptor); ui?.cleanup(); await new Promise((resolve) => setTimeout(resolve, 40)); dom.window.localStorage.clear(); dom.window.sessionStorage.clear(); });
after(() => { dom.window.close(); for (const [key, value] of previous) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); } });

test("ticket entry starts inline email-first with no dialog, chooser, or delivery from typing", async () => {
  let sent = 0;
  const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous, sendEmailCode: async () => { sent++; } }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal(ui.screen.queryByRole("dialog") === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }) === null, true);
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  const email = ui.screen.getByRole("textbox", { name: "Email address" });
  assert.equal(email.classList.contains("tracking-normal!"), true, "email addresses use normal tracking rather than the OTP input treatment");
  const emailLabel = email.closest("form")?.querySelector<HTMLLabelElement>('label[for="' + email.id + '"]');
  assert.equal(emailLabel?.classList.contains("sr-only"), true, "checkout retains its accessible email label without repeating it visually");
  assert.equal(emailLabel?.htmlFor === email.id, true);
  assert.equal(email.getAttribute("placeholder"), null, "the email prompt is not repeated as placeholder copy");
  ui.fireEvent.change(email, { target: { value: "existing@example.com" } });
  ui.fireEvent.blur(email);
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  assert.equal(sent, 0);
  assert.equal((email as HTMLInputElement).value, "existing@example.com");
  view.rerender(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous, sendEmailCode: async () => { sent++; } }} /></EnglishMessages>);
  assert.equal(sent, 0);
});

test("inline email entry makes no phone promise and offers recovery without a dialog or extra primary option", async () => {
  let sent = 0;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous, sendEmailCode: async () => { sent++; } }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal(ui.screen.queryByText("Email, then your mobile number.") === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Sign in with a passkey" }) === null, true);
  const email = ui.screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  ui.fireEvent.change(email, { target: { value: "returning@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await ui.screen.findByRole("textbox", { name: "Registered mobile number" });
  assert.equal(ui.screen.queryByRole("dialog") === null, true);
  assert.equal(sent, 0);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Back to Log in" }));
  const resumedEmail = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  assert.equal(resumedEmail.value, "returning@example.com");
  assert.equal(ui.screen.queryByText("Email, then your mobile number.") === null, true);
  assert.equal(ui.screen.queryByRole("dialog") === null, true);
  assert.equal(sent, 0);
});

test("recovery detachment cannot leave a stale focus marker that steals focus after later verification", async () => {
  const pending = deferred<MemberStatus>();
  let verified = false;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => verified ? pending.promise : anonymous, verifyEmailCode: async () => { verified = true; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  ui.fireEvent.change(email, { target: { value: "retained@example.com" } });
  const help = ui.screen.getByRole("button", { name: "Can’t sign in?" });
  help.focus();
  ui.fireEvent.click(help);
  await ui.screen.findByRole("textbox", { name: "Registered mobile number" });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Back to Log in" }));
  const resumedEmail = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  assert.equal(resumedEmail.value, "retained@example.com");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByRole("button", { name: "Send sign-in code" });
  ui.fireEvent.submit(resumedEmail.closest("form")!);
  const proof = await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  ui.fireEvent.change(proof, { target: { value: "A1B2C3" } });
  const back = ui.screen.getByRole("link", { name: "Back" });
  back.focus();
  await ui.act(async () => pending.resolve(member));
  await ui.screen.findByRole("heading", { name: "Your selection" });
  assert.equal(document.activeElement === back, true, "a prior recovery detach cannot steal later outside focus");
});

test("only explicit Continue classifies email and a separate send confirms delivery", async () => {
  const stale = deferred<{ account: "existing" | "new" }>();
  const lookups: string[] = [];
  const delivered: string[] = [];
  const client: MemberClient = { ...memberActions, status: async () => anonymous,
    lookupEmail: async (email) => { lookups.push(email); return email === "a@example.com" ? stale.promise : { account: "new" }; },
    sendEmailCode: async (email) => { delivered.push(email); } };
  const view = ui.render(<EnglishMessages><Tickets memberClient={client} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  ui.fireEvent.change(email, { target: { value: "A@example.com" } });
  ui.fireEvent.blur(email);
  view.rerender(<EnglishMessages><Tickets memberClient={client} /></EnglishMessages>);
  await ui.act(async () => { window.dispatchEvent(new Event("focus")); await new Promise((resolve) => setTimeout(resolve, 450)); });
  assert.deepEqual(lookups, [], "typing, blur, rerender and focus do not query accounts");
  assert.deepEqual(delivered, []);
  const continuation = ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  assert.equal(continuation.disabled, false);
  ui.fireEvent.click(continuation);
  await ui.waitFor(() => assert.deepEqual(lookups, ["a@example.com"]));
  assert.equal(continuation.disabled, true);
  ui.fireEvent.click(continuation);
  assert.deepEqual(lookups, ["a@example.com"], "duplicate Continue is blocked while pending");
  assert.deepEqual(delivered, []);
  ui.fireEvent.change(email, { target: { value: "b@example.com" } });
  await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  assert.deepEqual(lookups, ["a@example.com"], "editing requires a new explicit Continue");
  await ui.act(async () => stale.resolve({ account: "existing" }));
  assert.equal(ui.screen.queryByRole("button", { name: "Send sign-in code" }) === null, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  const confirm = await ui.screen.findByRole("button", { name: "Create account & send code" });
  assert.deepEqual(lookups, ["a@example.com", "b@example.com"]);
  assert.deepEqual(delivered, [], "classification is never a delivery confirmation");
  ui.fireEvent.click(confirm);
  await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  assert.deepEqual(delivered, ["b@example.com"]);
});

test("email lookup feedback reserves one stable slot and trailing footprint through pending error retry and branches", async () => {
  let rejectFirst!: (error: Error) => void;
  const first = new Promise<{ account: "existing" | "new" }>((_resolve, reject) => { rejectFirst = reject; });
  const retry = deferred<{ account: "existing" | "new" }>();
  const next = deferred<{ account: "existing" | "new" }>();
  let lookups = 0;
  let delivered = 0;
  const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous,
    lookupEmail: async () => { lookups++; return lookups === 1 ? first : lookups === 2 ? retry.promise : next.promise; },
    sendEmailCode: async () => { delivered++; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  const entry = view.container.querySelector("[data-account-email-entry]");
  const field = view.container.querySelector("[data-ticket-email-field]");
  const feedback = view.container.querySelector<HTMLElement>("[data-ticket-email-feedback]");
  const adornment = view.container.querySelector<HTMLElement>("[data-ticket-email-adornment]");
  assert.equal(entry !== null && field !== null && feedback !== null && adornment !== null, true, "email entry owns permanent feedback and trailing slots");
  for (const token of ["flex", "flex-col", "gap-6"]) assert.equal(entry!.classList.contains(token), true);
  for (const token of ["grid", "gap-2"]) assert.equal(field!.classList.contains(token), true);
  assert.equal(email.classList.contains("mt-0!"), true);
  for (const token of ["absolute", "inset-y-0", "right-1", "w-11"]) assert.equal(adornment!.classList.contains(token), true);
  assert.equal(feedback!.id.length > 0, true);
  assert.equal(email.getAttribute("aria-describedby"), feedback!.id);
  const feedbackId = feedback!.id;
  function stableSlots(stage: string) {
    assert.equal(view.container.querySelector("[data-ticket-email-feedback]") === feedback, true, stage);
    assert.equal(view.container.querySelector("[data-ticket-email-adornment]") === adornment, true, stage);
    assert.equal(email.getAttribute("aria-describedby"), feedbackId, stage);
    assert.equal(view.container.querySelectorAll("[data-ticket-email-feedback]").length, 1, stage);
    assert.equal(delivered, 0, stage);
  }
  ui.fireEvent.change(email, { target: { value: "existing@example.com" } });
  const initialContinue = ui.screen.getByRole("button", { name: "Continue" });
  initialContinue.focus();
  ui.fireEvent.click(initialContinue);
  assert.equal(document.activeElement === email, true, "explicit lookup returns focus to the stable input before disabling Continue");
  await ui.waitFor(() => assert.equal(lookups, 1));
  stableSlots("pending lookup");
  assert.equal(adornment!.querySelector(".animate-spin") !== null, true);
  await ui.act(async () => rejectFirst(new Error("Synthetic lookup failure")));
  const retryAction = await ui.screen.findByRole("button", { name: "Try email again" });
  assert.equal(adornment!.contains(retryAction), true);
  stableSlots("lookup error");
  assert.match(feedback!.textContent ?? "", /couldn’t check/);
  retryAction.focus();
  ui.fireEvent.click(retryAction);
  assert.equal(document.activeElement === email, true, "retry returns focus to the stable input before removing its icon button");
  await ui.waitFor(() => assert.equal(lookups, 2));
  assert.equal(document.activeElement === email, true, "pending lookup does not steal input focus");
  stableSlots("retry pending");
  await ui.act(async () => retry.resolve({ account: "existing" }));
  await ui.screen.findByRole("button", { name: "Send sign-in code" });
  stableSlots("existing branch");
  assert.equal(document.activeElement === email, true, "lookup resolution does not steal input focus");
  assert.equal(feedback!.classList.contains("min-h-10"), true);
  assert.equal(ui.screen.getByRole("button", { name: "Send sign-in code" }).classList.contains("mt-1"), true);
  assert.equal(feedback!.textContent?.trim(), "");
  ui.fireEvent.change(email, { target: { value: "new@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.waitFor(() => assert.equal(lookups, 3));
  stableSlots("new lookup pending");
  await ui.act(async () => next.resolve({ account: "new" }));
  await ui.screen.findByRole("button", { name: "Create account & send code" });
  stableSlots("new branch");
  assert.equal(feedback!.textContent?.trim(), "");
});

test("lookup branches existing and new email without delivery until a separate explicit confirmation", async () => {
  const calls: string[] = [];
  let resolveOld!: (value: { account: "existing" | "new" }) => void;
  const old = new Promise<{ account: "existing" | "new" }>((resolve) => { resolveOld = resolve; });
  const client: MemberClient = { ...memberActions, status: async () => anonymous,
    lookupEmail: async (email) => { calls.push("lookup:" + email); return email === "old@example.com" ? old : { account: email === "new@example.com" ? "new" : "existing" }; },
    sendEmailCode: async (email) => { calls.push("send:" + email); } };
  ui.render(<EnglishMessages><Tickets memberClient={client} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" });
  await ui.waitFor(() => assert.equal((email as HTMLInputElement).disabled, false));
  ui.fireEvent.change(email, { target: { value: "OLD@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.waitFor(() => assert.equal(calls.includes("lookup:old@example.com"), true));
  ui.fireEvent.change(email, { target: { value: "new@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  assert.equal(ui.screen.queryByRole("button", { name: "Send sign-in code" }) === null, true);
  await ui.screen.findByRole("button", { name: "Create account & send code" });
  await ui.act(async () => resolveOld({ account: "existing" }));
  assert.equal(ui.screen.queryByRole("button", { name: "Send sign-in code" }) === null, true);
  assert.equal(calls.some((call) => call.startsWith("send:")), false);
  ui.fireEvent.change(email, { target: { value: "returning@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  assert.equal(ui.screen.queryByRole("button", { name: "Create account & send code" }) === null, true);
  const confirm = await ui.screen.findByRole("button", { name: "Send sign-in code" });
  assert.equal(calls.some((call) => call.startsWith("send:")), false);
  ui.fireEvent.click(confirm);
  await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  assert.deepEqual(calls.filter((call) => call.startsWith("send:")), ["send:returning@example.com"]);
});

test("lookup failures and missing lookup capability never assume a new account", async () => {
  const { lookupEmail: _lookup, ...withoutLookup } = memberActions;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...withoutLookup, status: async () => anonymous }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" });
  await ui.waitFor(() => assert.equal((email as HTMLInputElement).disabled, false));
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByText("We couldn’t check this email. Try again.");
  assert.equal(ui.screen.queryByRole("button", { name: "Create account & send code" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Send sign-in code" }) === null, true);
  assert.equal((ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled, true);
});

test("lookup Retry-After survives address edits but does not disable independent Google", async () => {
  let lookups = 0;
  let google = 0;
  const status = { ...anonymous, capabilities: { ...anonymous.capabilities, google: true } };
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => status,
    lookupEmail: async () => { lookups++; throw new MemberAuthActionError("rate-limited", 60); },
    signInGoogle: async () => { google++; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" });
  await ui.waitFor(() => assert.equal((email as HTMLInputElement).disabled, false));
  ui.fireEvent.change(email, { target: { value: "a@gmail.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByText("Too many attempts. Wait before trying again.");
  ui.fireEvent.change(email, { target: { value: "b@gmail.com" } });
  await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  assert.equal(lookups, 1);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  assert.equal(lookups, 1, "explicit Continue also cannot bypass the shared lookup Retry-After");
  const blockedAction = await ui.screen.findByRole("button", { name: "Try email again" }) as HTMLButtonElement;
  assert.equal(blockedAction.disabled, true);
  const googleAction = ui.screen.getByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
  assert.equal(googleAction.disabled, false);
  ui.fireEvent.click(googleAction);
  await ui.waitFor(() => assert.equal(google, 1));
});

test("switching checkout email permits B first code while preserving A resend deadline", async () => {
  const sent: string[] = [];
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous, sendEmailCode: async (email) => { sent.push(email); } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" });
  await ui.waitFor(() => assert.equal((email as HTMLInputElement).disabled, false));
  ui.fireEvent.change(email, { target: { value: "a@example.com" } });
  const lookupActionFirst = ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  assert.equal(lookupActionFirst.disabled, false, "local delivery cooldown does not block classification");
  ui.fireEvent.click(lookupActionFirst);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Send sign-in code" }));
  await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Change email" }));
  const nextEmail = ui.screen.getByRole("textbox", { name: "Email address" });
  ui.fireEvent.change(nextEmail, { target: { value: "b@example.com" } });
  const lookupActionB = ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  assert.equal(lookupActionB.disabled, false, "local delivery cooldown does not block classification");
  ui.fireEvent.click(lookupActionB);
  const sendB = await ui.screen.findByRole("button", { name: "Send sign-in code" }) as HTMLButtonElement;
  assert.equal(sendB.disabled, false);
  ui.fireEvent.click(sendB);
  await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  assert.deepEqual(sent, ["a@example.com", "b@example.com"]);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Change email" }));
  ui.fireEvent.change(ui.screen.getByRole("textbox", { name: "Email address" }), { target: { value: "A@EXAMPLE.COM" } });
  const lookupActionA = ui.screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  assert.equal(lookupActionA.disabled, false, "local delivery cooldown does not block classification");
  ui.fireEvent.click(lookupActionA);
  const sendA = await ui.screen.findByRole("button", { name: "Send sign-in code" }) as HTMLButtonElement;
  assert.equal(sendA.disabled, true);
  ui.fireEvent.click(sendA);
  assert.deepEqual(sent, ["a@example.com", "b@example.com"]);
});

test("Google availability follows only exact Gmail domains without querying or delivering while typing", async () => {
  let lookups = 0;
  let delivered = 0;
  const status = { ...anonymous, capabilities: { ...anonymous.capabilities, google: true } };
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => status,
    lookupEmail: async (email) => { lookups++; return { account: email.startsWith("new") ? "new" : "existing" }; },
    sendEmailCode: async () => { delivered++; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  for (const [value, visible] of [
    ["", true], ["incomplete@", true], ["not an email", true],
    ["customer@example.com", false], ["customer@gmail.com.evil.test", false],
    ["customer@notgmail.com", false], ["customer@sub.gmail.com", false],
    ["  EXISTING@GMAIL.COM  ", true], ["alias@GoogleMail.com", true], ["", true]
  ] as const) {
    ui.fireEvent.change(email, { target: { value } });
    ui.fireEvent.blur(email);
    assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) !== null, visible, value);
  }
  assert.equal(lookups, 0);
  assert.equal(delivered, 0);
  ui.fireEvent.change(email, { target: { value: "existing@gmail.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByRole("button", { name: "Send sign-in code" });
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) !== null, true);
  ui.fireEvent.change(email, { target: { value: "new@googlemail.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByRole("button", { name: "Create account & send code" });
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) !== null, true);
  assert.equal(lookups, 2);
  assert.equal(delivered, 0);
});

test("configured Google collapses in a retained motion shell and hidden controls cannot act or take focus", async () => {
  let lookups = 0;
  let deliveries = 0;
  let googleCalls = 0;
  const status = { ...anonymous, capabilities: { ...anonymous.capabilities, google: true } };
  const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => status,
    lookupEmail: async () => { lookups++; return { account: "existing" }; },
    sendEmailCode: async () => { deliveries++; }, signInGoogle: async () => { googleCalls++; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  const shell = view.container.querySelector<HTMLElement>("[data-account-alternatives-shell]");
  const row = view.container.querySelector<HTMLElement>("[data-account-entry-alternatives]");
  const google = ui.screen.getByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
  assert.equal(shell !== null && row !== null, true, "provider row has its own persistent collapsing motion shell");
  assert.equal(shell!.getAttribute("data-expanded"), "true");
  ui.fireEvent.change(email, { target: { value: "customer@example.com" } });
  assert.equal(view.container.querySelector("[data-account-alternatives-shell]") === shell, true);
  assert.equal(view.container.querySelector("[data-account-entry-alternatives]") === row, true);
  assert.equal(google.isConnected, true);
  assert.equal(shell!.getAttribute("data-expanded"), "false");
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) === null, true);
  assert.equal(google.disabled, true);
  assert.equal(google.closest("[inert]") !== null, true);
  assert.equal(google.closest('[aria-hidden="true"]') !== null, true);
  email.focus();
  google.focus();
  assert.equal(document.activeElement === email, true, "collapsed provider cannot take keyboard focus");
  ui.fireEvent.click(google);
  assert.equal(googleCalls, 0);
  assert.equal(lookups, 0);
  assert.equal(deliveries, 0);
  ui.fireEvent.change(email, { target: { value: "customer@gmail.com" } });
  assert.equal(view.container.querySelector("[data-account-alternatives-shell]") === shell, true);
  assert.equal(shell!.getAttribute("data-expanded"), "true");
  assert.equal(ui.screen.getByRole("button", { name: "Continue with Google" }) === google, true);
  assert.equal(google.disabled, false);
  assert.equal(google.closest("[inert]") === null, true);
  assert.equal(google.closest('[aria-hidden="true"]') === null, true);
  assert.equal(lookups, 0);
  assert.equal(deliveries, 0);
});

test("registered ticket entry bypasses inline identity without extra confirmation or delivery", async () => {
  let sent = 0;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member, sendEmailCode: async () => { sent++; } }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Your tickets" });
  assert.equal(ui.screen.queryByRole("textbox", { name: "Email address" }) === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Account ready" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Done" }) === null, true);
  assert.equal(sent, 0);
});

test("inline Google is explicit and does not submit or disclose the typed email", async () => {
  let google = 0;
  let sent = 0;
  const status = { ...anonymous, capabilities: { ...anonymous.capabilities, google: true } };
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => status, signInGoogle: async () => { google++; }, sendEmailCode: async () => { sent++; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" });
  await ui.waitFor(() => assert.equal((email as HTMLInputElement).disabled, false));
  ui.fireEvent.change(email, { target: { value: "someone@gmail.com" } });
  ui.fireEvent.blur(email);
  assert.equal(google, 0);
  assert.equal(sent, 0);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue with Google" }));
  await ui.waitFor(() => assert.equal(google, 1));
  assert.equal(sent, 0);
  assert.doesNotMatch(document.body.textContent ?? "", /account (?:exists|found|not found)|new account|existing account/i);
});

test("known member pending refresh and outage retain identity without exposing a new registration step", async () => {
  const pending = deferred<MemberStatus>();
  let checks = 0;
  let retryFails = false;
  let revoked = false;
  const knownMember = { ...member, capabilities: { ...member.capabilities, google: true } };
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => {
    checks++;
    if (checks === 2) return pending.promise;
    if (retryFails) throw new Error("private refresh detail");
    return revoked ? anonymous : knownMember;
  } }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Your tickets" });
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  await ui.waitFor(() => assert.equal(ui.screen.getAllByRole("status").some((node) => node.textContent?.includes("Checking your account…")), true));
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  assert.equal(ui.screen.queryByRole("textbox", { name: "Email address" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Enter your email" }) === null, true);
  retryFails = true;
  // A malformed fresh status is an outage, never evidence that the known member became anonymous.
  await ui.act(async () => pending.resolve({ ...anonymous, member: true }));
  const retry = await ui.screen.findByRole("button", { name: "Refresh account status" });
  assert.equal(ui.screen.queryByRole("textbox", { name: "Email address" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Continue with Google" }) === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Account ready" }) === null, true);
  ui.fireEvent.click(retry);
  await ui.screen.findByRole("alert");
  assert.equal(ui.screen.queryByRole("textbox", { name: "Email address" }) === null, true);
  assert.doesNotMatch(document.body.textContent ?? "", /private refresh detail/);
  retryFails = false;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Refresh account status" }));
  await ui.screen.findByRole("heading", { name: "Your tickets" });
  revoked = true;
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
});

for (const state of ["loading", "error", "incomplete", "malformed"] as const) {
  test("registration gate fails closed for " + state, async () => {
    let requests = 0;
    const status = state === "loading" ? () => new Promise<MemberStatus>(() => {}) : state === "error" ? async () => { throw new Error("private account details"); } : async () => state === "malformed" ? { ...anonymous, member: true } : { ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true };
    const view = ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status }} quoteAdapter={{ request: async () => { requests++; return quote(); } }} /></EnglishMessages>);
    if (state === "error" || state === "malformed") await ui.screen.findByRole("button", { name: "Refresh account status" });
    if (state === "incomplete") await ui.screen.findByRole("heading", { name: "Verify your phone to finish" });
    assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
    assert.equal(ui.screen.queryByRole("button", { name: "Get test quote" }) === null, true);
    const purchase = view.container.querySelector("[inert]");
    assert.equal(purchase?.hasAttribute("hidden"), true);
    assert.equal(purchase?.classList.contains("hidden"), true);
    assert.equal(requests, 0);
  });
}

test("registered default is a bounded selection preview with unknown price and no checkout", async () => {
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }} /></EnglishMessages>);
  assert.ok(ui.screen.getByRole("heading", { name: "Tickets", level: 1 }));
  assert.ok(ui.screen.getByText("Price to be announced"));
  assert.ok(ui.screen.getByText(/not on sale yet/));
  await ui.screen.findByText("Account verified");
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  assert.equal(count.value, "1");
  assert.equal((ui.screen.getByRole("button", { name: "Remove one ticket" }) as HTMLButtonElement).disabled, true);
  for (let i = 0; i < 8; i++) ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  assert.equal(count.value, "6");
  assert.equal((ui.screen.getByRole("button", { name: "Add one ticket" }) as HTMLButtonElement).disabled, true);
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("ticket preview uses shared rails and balanced content-sized panels", async () => {
  const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }} /></EnglishMessages>);
  await ui.screen.findByText("Account verified");
  const header = view.container.querySelector("main > header");
  assert.ok(header);
  assert.ok(header.classList.contains("max-w-[960px]"), "header and content use the same outer rail");
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
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  const unknown = ui.screen.getByText("Price to be announced");
  assert.ok(unknown.classList.contains("text-[18px]"));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  const amount = await ui.screen.findByText("₩12,345");
  for (const token of ["text-[27px]", "leading-[34px]", "font-medium", "tabular-nums"]) assert.ok(amount.classList.contains(token));
  assert.ok(!amount.classList.contains("text-neutral-300"));
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("a configured sandbox offer shows its price and quantity without bypassing the checkout readiness gate", async () => {
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }}
    checkoutCatalogue={{ orderName: "Synthetic sandbox admission", unitAmount: 12345, currency: "KRW",
      maximumQuantity: 3, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2099-01-01T00:00:00Z" }}
    checkoutReady={false} /></EnglishMessages>);
  await ui.waitFor(() => assert.ok(ui.screen.getByText("Account verified")));
  assert.ok(ui.screen.getAllByText("Synthetic sandbox admission").length > 0);
  assert.ok(ui.screen.getByText("Sandbox checkout"));
  assert.ok(ui.screen.getByText(/12,345/));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  assert.ok(ui.screen.getByText(/24,690/));
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
});

test("account refresh during a payment keeps the same attempt and quantity snapshot mounted", async (t) => {
  const sdk = deferred<undefined>();
  const refresh = deferred<MemberStatus>();
  let checks = 0;
  let opened = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, data: {
    storeId: "store-fixture", channelKey: "channel-fixture", paymentId: "91b6495b479b430698f183b729807aea",
    orderName: "Synthetic sandbox admission", totalAmount: 12345, currency: "KRW", recovered: false,
    redirectUrl: window.location.origin + "/tickets/payment", customer: { customerId: "fixture-customer" }
  } }));
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => ++checks === 1 ? member : refresh.promise }}
    checkoutCatalogue={{ orderName: "Synthetic sandbox admission", unitAmount: 12345, currency: "KRW",
      maximumQuantity: 3, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2099-01-01T00:00:00Z" }}
    checkoutReady checkoutRequestPayment={async () => { opened++; return sdk.promise; }} /></EnglishMessages>);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Pay by card" })));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.waitFor(() => assert.equal(opened, 1));
  const attempt = ui.screen.getByRole("button", { name: "Opening payment…" });
  ui.fireEvent(window, new Event("focus"));
  await ui.waitFor(() => assert.equal(checks, 2));
  assert.equal(attempt.isConnected, true, "account revalidation must not discard an open payment");
  refresh.resolve(member);
  sdk.resolve(undefined);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Check payment status" })));
  assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).disabled, true);
  assert.equal(opened, 1);
});

test("cross-tab drafts cannot change an untouched selection during a pending or retained payment", async (t) => {
  const sdk = deferred<undefined>();
  let opened = 0;
  const prepare = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, data: {
    storeId: "store-fixture", channelKey: "channel-fixture", paymentId: "91b6495b479b430698f183b729807aea",
    orderName: "Synthetic sandbox admission", totalAmount: 12345, currency: "KRW", recovered: false,
    redirectUrl: window.location.origin + "/tickets/payment", customer: { customerId: "fixture-customer" }
  } }));
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }}
    checkoutCatalogue={{ orderName: "Synthetic sandbox admission", unitAmount: 12345, currency: "KRW",
      maximumQuantity: 3, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2099-01-01T00:00:00Z" }}
    checkoutReady checkoutRequestPayment={async () => { opened++; return sdk.promise; }} /></EnglishMessages>);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Pay by card" }) !== null));
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  const summary = ui.screen.getByRole("heading", { name: "Your selection" }).closest("section");
  assert.ok(summary);
  assert.equal(count.value, "1");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.waitFor(() => assert.equal(opened, 1));
  await ui.act(async () => {
    saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night", quantity: 2 }]);
    dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: TICKET_SELECTION_DRAFT_KEY }));
  });
  assert.equal(count.value, "1");
  assert.ok(summary.textContent?.includes("₩12,345"));
  assert.ok(!summary.textContent?.includes("₩24,690"));
  await ui.act(async () => { sdk.resolve(undefined); });
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Check payment status" }) !== null));
  await ui.act(async () => {
    saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night", quantity: 3 }]);
    dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: TICKET_SELECTION_DRAFT_KEY }));
  });
  assert.equal(count.value, "1");
  assert.equal(count.disabled, true);
  assert.ok(summary.textContent?.includes("₩12,345"));
  assert.ok(!summary.textContent?.includes("₩37,035"));
  assert.equal(prepare.mock.callCount(), 1);
  assert.equal(opened, 1);
});

test("restored payment intent anchors the parent quantity and total without reopening checkout", async (t) => {
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({
    schemaVersion: 1, attemptId: "91b6495b-479b-4306-98f1-83b729807aeb", quantity: 2,
    order: { paymentId: "91b6495b479b430698f183b729807aea", quantity: 2, totalAmount: 24690, currency: "KRW" }
  }));
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("No prepare on restoration"); });
  let opened = 0;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }}
    checkoutCatalogue={{ orderName: "Synthetic sandbox admission", unitAmount: 12345, currency: "KRW",
      maximumQuantity: 3, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2099-01-01T00:00:00Z" }}
    checkoutReady checkoutRequestPayment={async () => { opened++; return undefined; }} /></EnglishMessages>);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Check payment status" }) !== null));
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  assert.equal(count.value, "2");
  assert.equal(count.disabled, true);
  const summary = ui.screen.getByRole("heading", { name: "Your selection" }).closest("section");
  assert.ok(summary);
  assert.ok(summary.textContent?.includes("₩24,690"));
  assert.ok(!summary.textContent?.includes("₩12,345"));
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(opened, 0);
});

test("retained payment recovery ignores new-sale limits and keeps its original amount and currency", async () => {
  for (const offer of [
    { unitAmount: 12345, currency: "KRW" as const, maximumQuantity: 1, checkoutReady: true },
    { unitAmount: 500, currency: "USD" as const, maximumQuantity: 3, checkoutReady: false }
  ]) {
    dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({
      schemaVersion: 1, attemptId: "91b6495b-479b-4306-98f1-83b729807aeb", quantity: 2,
      order: { paymentId: "91b6495b479b430698f183b729807aea", quantity: 2, totalAmount: 24690, currency: "KRW" }
    }));
    const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }}
      checkoutCatalogue={{ orderName: "Synthetic sandbox admission", unitAmount: offer.unitAmount, currency: offer.currency,
        maximumQuantity: offer.maximumQuantity, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2099-01-01T00:00:00Z" }}
      checkoutReady={offer.checkoutReady} /></EnglishMessages>);
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Check payment status" }) !== null));
    const check = ui.screen.getByRole("button", { name: "Check payment status" }) as HTMLButtonElement;
    await ui.waitFor(() => assert.equal(check.disabled, false));
    const summary = ui.screen.getByRole("heading", { name: "Your selection" }).closest("section");
    assert.ok(summary);
    assert.ok(summary.textContent?.includes("2 tickets"));
    assert.ok(!summary.textContent?.includes("Choose quantity"));
    assert.ok(!summary.textContent?.includes("$10.00"));
    assert.ok(!summary.textContent?.includes("$246.90"));
    assert.ok(summary.textContent?.includes("₩24,690"));
    assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).getAttribute("aria-invalid"), "false");
    assert.ok(ui.screen.queryByText(/Enter a whole number/) === null);
    assert.ok(ui.screen.queryByText("Tickets are not on sale yet.") === null);
    view.unmount();
    dom.window.sessionStorage.clear();
  }
});

test("unknown-reference recovery ignores fresh-sale gates but preserves canonical catalogue rejection", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const intent = { schemaVersion: 1, attemptId: "91b6495b-479b-4306-98f1-83b729807aeb", quantity: 2 };
  let rejectRecovery = false;
  const prepare = t.mock.method(globalThis, "fetch", async () => rejectRecovery
    ? Response.json({ success: false }, { status: 409 }) : Response.json({ success: true, data: {
    storeId: "store-fixture", channelKey: "channel-fixture", paymentId: "91b6495b479b430698f183b729807aea",
    orderName: "Original sandbox admission", totalAmount: 24690, currency: "KRW", recovered: true,
    redirectUrl: window.location.origin + "/tickets/payment", customer: { customerId: "fixture-customer" }
  } }));
  let opened = 0;
  for (const offer of [
    { maximumQuantity: 3, unitAmount: 12345, currency: "KRW" as const, checkoutReady: false, saleEndsAt: "2020-01-02T00:00:00Z", reject: false },
    { maximumQuantity: 1, unitAmount: 500, currency: "USD" as const, checkoutReady: true, saleEndsAt: "2099-01-01T00:00:00Z", reject: true }
  ]) {
    rejectRecovery = offer.reject;
    dom.window.sessionStorage.setItem(key, JSON.stringify(intent));
    const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }}
      checkoutCatalogue={{ orderName: "Original sandbox admission", unitAmount: offer.unitAmount, currency: offer.currency,
        maximumQuantity: offer.maximumQuantity, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: offer.saleEndsAt }}
      checkoutReady={offer.checkoutReady} checkoutRequestPayment={async () => { opened++; return undefined; }} /></EnglishMessages>);
    await ui.waitFor(() => assert.ok(ui.screen.getByText("Account verified")));
    const recover = ui.screen.getByRole("button", { name: "Recover checkout" }) as HTMLButtonElement;
    assert.equal(recover.disabled, false);
    const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
    assert.equal(count.value, "2");
    assert.equal(count.disabled, true);
    assert.equal(count.getAttribute("aria-invalid"), "false");
    const summary = ui.screen.getByRole("heading", { name: "Your selection" }).closest("section")!;
    assert.ok(summary.textContent?.includes("2 tickets"));
    assert.ok(summary.textContent?.includes("Total pending confirmation"));
    assert.ok(!summary.textContent?.includes("Choose quantity"));
    assert.ok(!summary.textContent?.includes("Price to be announced"));
    assert.ok(!summary.textContent?.includes("$10.00"));
    assert.ok(!summary.textContent?.includes("₩24,690"), "the original total is unknown until canonical recovery succeeds");
    assert.ok(ui.screen.queryByText(/Enter a whole number/) === null);
    assert.ok(ui.screen.queryByText("Tickets are not on sale yet.") === null);
    ui.fireEvent.click(recover);
    if (offer.reject) {
      await ui.screen.findByText("Checkout could not be opened. Recover it before trying another payment.");
      assert.ok(ui.screen.queryByRole("button", { name: "Check payment status" }) === null);
      assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(key)!), intent);
      assert.ok(summary.textContent?.includes("Total pending confirmation"));
      assert.ok(!summary.textContent?.includes("₩24,690"));
    } else {
      await ui.screen.findByRole("button", { name: "Check payment status" });
      assert.ok(summary.textContent?.includes("₩24,690"));
      assert.ok(ui.screen.queryByText("Total pending confirmation") === null);
    }
    assert.ok(summary.textContent?.includes("2 tickets"));
    assert.ok(!summary.textContent?.includes("$10.00"));
    assert.equal(count.disabled, true);
    assert.equal(count.getAttribute("aria-invalid"), "false");
    assert.ok(ui.screen.queryByText(/Enter a whole number/) === null);
    assert.ok(ui.screen.queryByText("Tickets are not on sale yet.") === null);
    assert.deepEqual(JSON.parse(String(prepare.mock.calls.at(-1)?.arguments[1]?.body)), { attemptId: intent.attemptId, quantity: 2 });
    assert.equal(opened, 0);
    view.unmount();
    dom.window.sessionStorage.clear();
  }
  assert.equal(prepare.mock.callCount(), 2);
});

test("known-reference recovery remains discoverable without a current catalogue or fresh preparation", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const record = JSON.stringify({ schemaVersion: 1, attemptId: "91b6495b-479b-4306-98f1-83b729807aeb", quantity: 2,
    order: { paymentId: "91b6495b479b430698f183b729807aea", quantity: 2, totalAmount: 24690, currency: "KRW" } });
  dom.window.sessionStorage.setItem(key, record);
  const prepare = t.mock.method(globalThis, "fetch", async () => { throw new Error("Status-only recovery must not prepare"); });
  let opened = 0;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }} checkoutCatalogue={null}
    checkoutRequestPayment={async () => { opened++; return undefined; }} /></EnglishMessages>);
  const recovery = await ui.screen.findByRole("button", { name: "Check payment status" }) as HTMLButtonElement;
  await ui.waitFor(() => assert.equal(recovery.disabled, false));
  const count = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  assert.equal(count.value, "2");
  assert.equal(count.disabled, true);
  const summary = ui.screen.getByRole("heading", { name: "Your selection" }).closest("section")!;
  assert.ok(summary.textContent?.includes("2 tickets"));
  assert.ok(summary.textContent?.includes("₩24,690"));
  assert.ok(ui.screen.getByText("Checkout recovery"));
  assert.ok(ui.screen.getAllByText("Previous checkout").length > 0);
  assert.ok(ui.screen.getByRole("radio", { name: "Previous checkout" }));
  assert.ok(ui.screen.getByText("Payment status only."));
  assert.ok(ui.screen.queryByText("First night") === null);
  assert.ok(ui.screen.queryByText("Selection preview") === null);
  assert.ok(ui.screen.queryByText(/Preview range 1–6/) === null);
  assert.ok(ui.screen.queryByText("No reservation or payment is made.") === null);
  assert.ok(ui.screen.queryByText("Tickets are not on sale yet.") === null);
  assert.equal(dom.window.sessionStorage.getItem(key), record);
  assert.equal(prepare.mock.callCount(), 0);
  assert.equal(opened, 0);
});

test("expired sessions can reauthenticate retained checkouts beyond current limits without writing a new sale draft", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const prepare = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false }, { status: 409 }));
  let opened = 0;
  for (const knownReference of [true, false]) {
    const record = JSON.stringify({ schemaVersion: 1, attemptId: "91b6495b-479b-4306-98f1-83b729807aeb", quantity: 2,
      ...(knownReference ? { order: { paymentId: "91b6495b479b430698f183b729807aea", quantity: 2, totalAmount: 24690, currency: "KRW" } } : {}) });
    dom.window.sessionStorage.setItem(key, record);
    saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night", quantity: 1 }]);
    const draft = dom.window.localStorage.getItem(TICKET_SELECTION_DRAFT_KEY);
    let current: MemberStatus = anonymous;
    const callsBefore = prepare.mock.callCount();
    const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => current }}
      checkoutCatalogue={{ orderName: "Changed sandbox admission", unitAmount: 500, currency: "USD",
        maximumQuantity: 1, saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2020-01-02T00:00:00Z" }}
      checkoutReady={false} checkoutRequestPayment={async () => { opened++; return undefined; }} /></EnglishMessages>);
    await ui.screen.findByRole("heading", { name: "Enter your email" });
    const recovery = [...view.container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === (knownReference ? "Check payment status" : "Recover checkout"))!;
    assert.equal(recovery.closest("[hidden]") !== null, true);
    assert.equal(recovery.disabled, true, "expired sessions must not bypass the canonical account gate");
    const count = view.container.querySelector<HTMLInputElement>('input[aria-label="Ticket quantity"]')!;
    assert.equal(count.value, "2");
    assert.equal(count.disabled, true);
    assert.equal(dom.window.sessionStorage.getItem(key), record);
    assert.equal(dom.window.localStorage.getItem(TICKET_SELECTION_DRAFT_KEY), draft);
    current = member;
    await ui.act(async () => window.dispatchEvent(new Event("focus")));
    await ui.waitFor(() => assert.ok(ui.screen.getByText("Account verified")));
    assert.equal(recovery.disabled, false);
    assert.equal(count.value, "2");
    assert.equal(dom.window.localStorage.getItem(TICKET_SELECTION_DRAFT_KEY), draft);
    assert.equal(dom.window.sessionStorage.getItem(key), record);
    assert.equal(prepare.mock.callCount(), callsBefore, "account recovery must not prepare a payment");
    if (!knownReference) {
      ui.fireEvent.click(recovery);
      await ui.screen.findByText("Checkout could not be opened. Recover it before trying another payment.");
      assert.equal(dom.window.sessionStorage.getItem(key), record, "changed-catalogue rejection remains fail closed after sign-in");
    }
    assert.equal(opened, 0);
    view.unmount();
    dom.window.sessionStorage.clear();
    dom.window.localStorage.clear();
  }
});

test("inline account retains ticket selection and intent without URL or history navigation", async (t) => {
  const push = t.mock.method(window.history, "pushState");
  const replace = t.mock.method(window.history, "replaceState");
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous }} /></EnglishMessages>);
  const main = document.querySelector("main");
  const count = document.querySelector<HTMLInputElement>('input[aria-label="Ticket quantity"]')!;
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal(count.closest("[hidden]") !== null, true);
  assert.equal(count.value, "2");
  assert.equal(document.querySelector("main") === main, true);
  assert.equal(document.querySelectorAll("main").length, 1);
  assert.equal(ui.screen.queryByRole("dialog") === null, true);
  assert.equal(window.location.pathname, "/tickets");
  assert.equal(push.mock.calls.length + replace.mock.calls.length, 0);
  await ui.waitFor(() => { const saved = readTicketSelectionDraft(dom.window.localStorage); assert.equal(saved.status === "ready" && saved.draft.returnToTickets, true); });
  const saved = readTicketSelectionDraft(dom.window.localStorage);
  if (saved.status === "ready") assert.deepEqual(saved.draft.items, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
  assert.doesNotMatch(JSON.stringify(saved), /price|owner|email|token|quote|reservation/i);
});

test("known incomplete account resumes inline phone binding and Escape cannot discard progress", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 4 }], { returnToTickets: true });
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => ({ ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true }) }} /></EnglishMessages>);
  const phone = await ui.screen.findByRole("textbox", { name: "Phone number" }) as HTMLInputElement;
  ui.fireEvent.change(phone, { target: { value: "01012345678" } });
  ui.fireEvent.keyDown(document, { key: "Escape" });
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  assert.equal(ui.screen.getByRole("textbox", { name: "Phone number" }) === phone, true);
  assert.equal(phone.value, "01012345678");
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }) === null, true);
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  assert.equal((document.querySelector('input[aria-label="Ticket quantity"]') as HTMLInputElement).value, "4");
});

test("blocked storage does not block inline email entry or leak private failure details", async (t) => {
  const getter = Object.getOwnPropertyDescriptor(dom.window, "localStorage")!;
  Object.defineProperty(dom.window, "localStorage", { configurable: true, get() { throw new Error("private storage detail"); } });
  t.after(() => Object.defineProperty(dom.window, "localStorage", getter));
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal((ui.screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement).disabled, false);
  assert.doesNotMatch(document.body.textContent ?? "", /private storage detail/);
  assert.match(ui.screen.getByText(/continue without saving/).textContent ?? "", /couldn’t save/);
});

test("verified existing account advances automatically using one session-owned authoritative status", async () => {
  let current = anonymous;
  let reads = 0;
  const client: MemberClient = { ...memberActions, status: async () => { reads++; return current; }, verifyEmailCode: async () => { current = member; } };
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  await completeSignupEmail();
  await ui.screen.findByRole("button", { name: "Get test quote" });
  assert.equal(reads, 2, "initialize and post-verification status are the only reads");
  assert.equal(ui.screen.queryByRole("button", { name: "Done" }) === null, true);
  assert.equal(ui.screen.queryByRole("heading", { name: "Account ready" }) === null, true);
  assert.equal(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null, true);
  assert.equal(window.location.pathname, "/tickets");
});

test("inline new-account purchase retains tickets through OTP and phone binding until canonical status confirms", async (t) => {
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
      current = { ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true };
    },
    bindPhone: async (...args) => {
      calls.push(["bind", ...args]);
      await binding.promise;
      current = member;
      refreshingParent = true;
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
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }]);
  const view = ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async (input) => {
    quoteRequests.push(input); return quote(2);
  } }} /></EnglishMessages>);
  // Unmount while the scoped fetch mock still owns challenge-disposal requests.
  t.after(() => view.unmount());
  const main = document.querySelector("main")!;
  const count = document.querySelector<HTMLInputElement>('input[aria-label="Ticket quantity"]')!;
  function retained(stage: string) {
    assert.ok(document.querySelector("main") === main, stage);
    assert.equal(document.querySelectorAll("main").length, 1, stage);
    assert.ok(document.getElementById(count.id) === count, stage);
    assert.equal(count.isConnected, true, stage);
    assert.equal(count.value, "2", stage);
    assert.equal(window.location.href, originalUrl, stage);
    assert.equal(window.history.length, originalHistoryLength, stage);
    assert.equal(push.mock.calls.length + replace.mock.calls.length, 0, stage);
    assert.equal((ui.within(main).getByText("Checkout unavailable").closest("button") as HTMLButtonElement).disabled, true, stage);
  }
  function ineligible(stage: string) {
    retained(stage);
    assert.ok(ui.within(main).queryByText("Get test quote") === null, stage);
    assert.ok(ui.within(main).queryByText("Account verified") === null, stage);
    assert.equal(quoteRequests.length, 0, stage);
  }
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  ineligible("direct signup");
  const email = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  assert.equal(phoneRequests.length, 0, "signup does not automatically issue a phone challenge");
  ui.fireEvent.change(email, { target: { value: "ticket+signup@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByRole("button", { name: /^(?:Send sign-in code|Create account & send code)$/ });
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
  await ui.waitFor(() => assert.ok(reads >= 3, "binding reads authoritative status"));
  assert.equal(ui.screen.queryByRole("button", { name: "Done" }) === null, true);
  ineligible("canonical status after binding remains pending");
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

test("automatic verified advance transfers focused inline proof to the visible ticket summary", async () => {
  const pending = deferred<MemberStatus>();
  let verified = false;
  const client: MemberClient = { ...memberActions, status: async () => verified ? pending.promise : anonymous, verifyEmailCode: async () => { verified = true; } };
  ui.render(<EnglishMessages><Tickets memberClient={client} /></EnglishMessages>);
  await completeSignupEmail();
  const proof = ui.screen.getByLabelText(/^(?:Verification|Email) code$/);
  proof.focus();
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  await ui.act(async () => pending.resolve(member));
  const summary = await ui.screen.findByRole("heading", { name: "Your selection" });
  assert.equal(document.activeElement === summary, true);
});

test("automatic verified advance does not steal focus moved outside the account panel", async () => {
  const pending = deferred<MemberStatus>();
  let verified = false;
  const client: MemberClient = { ...memberActions, status: async () => verified ? pending.promise : anonymous, verifyEmailCode: async () => { verified = true; } };
  ui.render(<EnglishMessages><Tickets memberClient={client} /></EnglishMessages>);
  await completeSignupEmail();
  const proof = ui.screen.getByLabelText(/^(?:Verification|Email) code$/);
  proof.focus();
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  const back = ui.screen.getByRole("link", { name: "Back" });
  back.focus();
  await ui.act(async () => pending.resolve(member));
  const summary = await ui.screen.findByRole("heading", { name: "Your selection" });
  assert.equal(document.activeElement === back, true);
});

test("failed post-verification status cannot advance inline purchase", async () => {
  let verified = false;
  const client: MemberClient = { ...memberActions, status: async () => { if (verified) throw new Error("private status error"); return anonymous; }, verifyEmailCode: async () => { verified = true; } };
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  await completeSignupEmail();
  await ui.screen.findByRole("alert");
  assert.equal(ui.screen.queryByRole("button", { name: "Get test quote" }) === null, true);
  assert.doesNotMatch(document.body.textContent ?? "", /private status error/);
});

test("focus refresh preserves inline email and proof without a chooser or repeat delivery", async () => {
  let sent = 0;
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous, sendEmailCode: async () => { sent++; } }} /></EnglishMessages>);
  const email = await ui.screen.findByRole("textbox", { name: "Email address" }) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  ui.fireEvent.change(email, { target: { value: "private+customer@example.com" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue" }));
  await ui.screen.findByRole("button", { name: /^(?:Send sign-in code|Create account & send code)$/ });
  ui.fireEvent.submit(email.closest("form")!);
  const code = await ui.screen.findByLabelText(/^(?:Verification|Email) code$/) as HTMLInputElement;
  ui.fireEvent.change(code, { target: { value: "A1" } });
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  assert.equal(ui.screen.getByLabelText(/^(?:Verification|Email) code$/) === code, true);
  assert.equal(code.value, "A1");
  assert.equal(sent, 1);
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }) === null, true);
});

test("authoritative member refresh can revoke a previously exposed purchase without duplicate session owners", async () => {
  let current = member;
  let reads = 0;
  const client: MemberClient = { ...memberActions, status: async () => { reads++; return current; } };
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={client} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  await ui.screen.findByRole("button", { name: "Get test quote" });
  assert.equal(reads, 1);
  current = anonymous;
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal(reads, 2);
  assert.equal(ui.screen.queryByRole("button", { name: "Get test quote" }) === null, true);
});

test("test quotes require authoritative membership, keep checkout disabled, and invalidate on selection edits", async () => {
  let calls = 0;
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => { calls++; return quote(); } }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  assert.equal(calls, 1);
  assert.match(ui.screen.getByRole("status").textContent ?? "", /Test quote updated.*₩12,345.*No reservation/);
  assert.ok(ui.screen.getByText(/Test prices.*not an offer/));
  assert.equal((ui.screen.getByRole("button", { name: "Checkout unavailable" }) as HTMLButtonElement).disabled, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  assert.ok(ui.screen.queryByText("₩12,345") === null);
  assert.ok(ui.screen.getByRole("button", { name: "Get test quote" }));
});

test("late quote responses cannot replace changed selections or later requests", async () => {
  const first = deferred<TicketPreviewQuote>();
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (input) => input.items[0].quantity === 1 ? first.promise : quote(2) }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  assert.equal((ui.screen.getByRole("button", { name: "Updating quote…" }) as HTMLButtonElement).getAttribute("aria-busy"), "true");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add one ticket" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩24,690")));
  await ui.act(async () => first.resolve(quote()));
  assert.ok(ui.screen.queryByText("₩12,345") === null);
  assert.ok(ui.screen.getByText("₩24,690"));
});

test("membership refresh hides a previously eligible quote and rejects stale account reads", async () => {
  let current = member;
  let reads = 0;
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => { reads++; return current; } }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  current = anonymous;
  await ui.act(async () => dom.window.dispatchEvent(new dom.window.Event("focus")));
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Continue" })));
  assert.ok(ui.screen.queryByText("₩12,345") === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Get test quote" }) === null);
  assert.ok(reads >= 2);
});

for (const defect of ["currency", "selection", "arithmetic", "checkout", "future"] as const) {
  test("rejects untrusted quote " + defect + " instead of displaying a trusted total", async () => {
    const result = quote();
    const invalid = defect === "currency" ? { ...result, currency: "USD" } : defect === "selection" ? { ...result, items: [{ ...result.items[0], quantity: 2 }] } : defect === "arithmetic" ? { ...result, totalAmountMinor: 1 } : defect === "checkout" ? { ...result, checkoutAvailable: true } : { ...result, issuedAt: new Date(Date.now() + 20_000).toISOString() };
    ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => invalid as TicketPreviewQuote }} /></EnglishMessages>);
    ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
    await ui.waitFor(() => assert.match(ui.screen.getByRole("alert").textContent ?? "", /couldn’t update/));
    assert.ok(ui.screen.queryByText("₩12,345") === null);
  });
}

test("expired quotes are hidden after hidden-tab wall time and can be refreshed", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  now += 61_000;
  await ui.act(async () => document.dispatchEvent(new dom.window.Event("visibilitychange")));
  await ui.waitFor(() => assert.ok(ui.screen.queryByText("₩12,345") === null));
  assert.ok(ui.screen.getByRole("button", { name: /test quote/ }));
});

test("network failures recover without leaking details and unavailable ticket types cannot be selected", async () => {
  let fail = true;
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => { if (fail) throw new Error("private network detail"); return quote(); } }} /></EnglishMessages>);
  await ui.screen.findByRole("button", { name: "Get test quote" });
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
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }} /></EnglishMessages>);
  await ui.act(async () => {});
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "4"));
  now += TICKET_DRAFT_RETENTION_MS + 1;
  await ui.act(async () => dom.window.dispatchEvent(new dom.window.Event("focus")));
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "1"));
  assert.ok(ui.screen.getByText(/saved selection expired/));
});

test("invalid saved selections are disclosed, and choosing a new option deliberately replaces them", async () => {
  dom.window.localStorage.setItem(TICKET_SELECTION_DRAFT_KEY, "{malformed");
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} /></EnglishMessages>);
  await ui.act(async () => {});
  assert.ok(ui.screen.getByText(/couldn’t be restored/));
  ui.fireEvent.click(ui.screen.getByRole("radio", { name: "Other test admission" }));
  assert.ok(ui.screen.queryByText(/couldn’t be restored/) === null);
  assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "2");
  const stored = readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(stored.status, "ready");
  if (stored.status === "ready") assert.deepEqual(stored.draft.items, [{ ticketTypeId: "other-test", quantity: 2 }]);
});

test("a draft with unknown options or unsupported line count is not silently treated as a current choice", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "unknown-test", quantity: 4 }]);
  const view = ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => member }} /></EnglishMessages>);
  await ui.act(async () => {});
  assert.ok(ui.screen.getByText(/Ticket options changed/));
  assert.equal((ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement).value, "1");
  view.unmount();
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 2 }, { ticketTypeId: "other-test", quantity: 2 }]);
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} /></EnglishMessages>);
  await ui.act(async () => {});
  assert.ok(ui.screen.getByText(/Ticket options changed/));
});

test("storage write rejection leaves inline identity usable without leaking private failure details", async (t) => {
  t.mock.method(dom.window.Storage.prototype, "setItem", () => { throw new Error("private quota details"); });
  ui.render(<EnglishMessages><Tickets memberClient={{ ...memberActions, status: async () => anonymous }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  await ui.waitFor(() => assert.equal(ui.screen.getAllByText(/couldn’t save/).length > 0, true));
  assert.equal((ui.screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement).disabled, false);
  assert.doesNotMatch(document.body.textContent ?? "", /private quota details/);
});

test("catalogue changes abort old quotes and cannot resurrect an earlier matching version", async () => {
  const pending = deferred<TicketPreviewQuote>();
  const client = { ...memberActions, status: async () => member };
  const adapter = { request: async () => pending.promise };
  const view = ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={client} quoteAdapter={adapter} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  const revised = { ...catalogue, version: "fixture-v2" };
  view.rerender(<EnglishMessages><Tickets catalogue={revised} memberClient={client} quoteAdapter={{ request: async () => ({ ...quote(), catalogueVersion: revised.version }) }} /></EnglishMessages>);
  await ui.act(async () => pending.resolve(quote()));
  assert.ok(ui.screen.queryByText("₩12,345") === null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  view.rerender(<EnglishMessages><Tickets catalogue={catalogue} memberClient={client} quoteAdapter={adapter} /></EnglishMessages>);
  assert.ok(ui.screen.queryByText("₩12,345") === null);
});

test("one session serializes focus refresh while initial membership remains pending", async () => {
  const initial = deferred<MemberStatus>();
  let checks = 0;
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => { checks++; return initial.promise; } }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  await ui.act(async () => window.dispatchEvent(new Event("focus")));
  assert.equal(checks, 1);
  assert.equal(ui.screen.queryByRole("button", { name: "Get test quote" }) === null, true);
  await ui.act(async () => initial.resolve(member));
  await ui.screen.findByRole("button", { name: "Get test quote" });
  assert.equal(checks, 1);
});

test("malformed membership and network outages remain recoverable, never eligible", async () => {
  let invalid = true;
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => invalid ? { ...anonymous, member: true } : anonymous }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" })));
  assert.ok(ui.screen.queryByRole("button", { name: "Get test quote" }) === null);
  invalid = false;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Refresh account status" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Continue" })));
});

test("hanging quote requests have a bounded deadline and abort their signal", async (t) => {
  let signal: AbortSignal | undefined;
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (_input, options) => { signal = options?.signal; return new Promise(() => {}); } }} /></EnglishMessages>);
  await ui.waitFor(() => assert.ok(ui.screen.getByRole("button", { name: "Get test quote" })));
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    await ui.act(async () => { ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" })); t.mock.timers.tick(10_000); });
    assert.equal(signal?.aborted, true);
    assert.ok(ui.screen.getByRole("button", { name: "Retry test quote" }));
    assert.ok(ui.screen.queryByText("₩12,345") === null);
  } finally { t.mock.timers.reset(); }
});

test("unmount aborts pending quote work and ignores a later response", async () => {
  const pending = deferred<TicketPreviewQuote>();
  let signal: AbortSignal | undefined;
  const view = ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (_input, options) => { signal = options?.signal; return pending.promise; } }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  view.unmount();
  assert.equal(signal?.aborted, true);
  await ui.act(async () => pending.resolve(quote()));
  assert.ok(document.querySelector("main") === null);
});

test("cross-tab selection A to B to A cannot resurrect canceled pending quote work", async () => {
  const pending = deferred<TicketPreviewQuote>();
  let signal: AbortSignal | undefined;
  let calls = 0;
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 1 }]);
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async (_input, options) => {
    calls++; signal = options?.signal; return calls === 1 ? pending.promise : quote();
  } }} /></EnglishMessages>);
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
  assert.ok(ui.screen.queryByText("₩12,345") === null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
});

test("cross-tab selection A to B to A does not resurrect an earlier ready quote", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity: 1 }]);
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  for (const quantity of [2, 1]) {
    await ui.act(async () => {
      saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "first-night-preview", quantity }]);
      dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: TICKET_SELECTION_DRAFT_KEY }));
    });
  }
  assert.ok(ui.screen.queryByText("₩12,345") === null);
  assert.ok(ui.screen.getByRole("button", { name: "Get test quote" }));
});

test("partial or out-of-range quantity edits invalidate quotes without claiming a storage outage", async () => {
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => quote() }} /></EnglishMessages>);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩12,345")));
  const input = ui.screen.getByRole("textbox", { name: "Ticket quantity" });
  ui.fireEvent.change(input, { target: { value: "" } });
  assert.ok(ui.screen.queryByText("₩12,345") === null);
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
  ui.render(<EnglishMessages><Tickets catalogue={catalogue} memberClient={{ ...memberActions, status: async () => member }} quoteAdapter={{ request: async () => { calls++; return quote(3); } }} /></EnglishMessages>);
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
  assert.ok(ui.screen.queryByText(/Enter a whole number/) === null);
  assert.ok(ui.screen.queryByText("Choose quantity") === null);
  const saved = readTicketSelectionDraft(dom.window.localStorage);
  assert.equal(saved.status, "ready");
  if (saved.status === "ready") assert.equal(saved.draft.items[0].quantity, 3);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Get test quote" }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("₩37,035")));
  assert.equal(calls, 1);
});

test("unavailable catalogue and stale draft cannot block inline identity or overwrite saved intent", async () => {
  saveTicketSelectionDraft(dom.window.localStorage, [{ ticketTypeId: "retired", quantity: 2 }]);
  const before = dom.window.localStorage.getItem(TICKET_SELECTION_DRAFT_KEY);
  ui.render(<EnglishMessages><Tickets catalogue={{ ...catalogue, ticketTypes: catalogue.ticketTypes.map((option) => ({ ...option, available: false })) }} memberClient={{ ...memberActions, status: async () => anonymous }} /></EnglishMessages>);
  await ui.screen.findByRole("heading", { name: "Enter your email" });
  assert.equal(ui.screen.queryByRole("textbox", { name: "Ticket quantity" }) === null, true);
  assert.equal(dom.window.localStorage.getItem(TICKET_SELECTION_DRAFT_KEY), before);
});
