import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient } from "@/lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let MemberAuthProviders: typeof import("../member-auth/fixtures/providers").MemberAuthProviders;
let Customer: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let Trial: typeof import("@/components/Authentication/phone-verification/phone-verification-trial").TrialVerificationView;
let VerificationProvider: typeof import("@/components/Authentication/phone-verification/phone-verification").VerificationProvider;
const previous = new Map<string, PropertyDescriptor | undefined>();

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
    const raw = key === "window" || key === "self" ? win : key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "ResizeObserver" ? class { observe() {} unobserve() {} disconnect() {} } : win[key as keyof typeof win];
    const value = typeof raw === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? raw.bind(win) : raw;
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  ui = await import("@testing-library/react/pure");
  MemberAuthProviders = (await import("../member-auth/fixtures/providers")).MemberAuthProviders;
  Customer = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountStudy;
  Trial = (await import("@/components/Authentication/phone-verification/phone-verification-trial")).TrialVerificationView;
  VerificationProvider = (await import("@/components/Authentication/phone-verification/phone-verification")).VerificationProvider;
});

afterEach(() => ui.cleanup());
after(() => {
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

const noAction = async () => {};
const chromeClient: MemberClient = {
  status: async () => ({ authenticated: false, phoneBindingAuth: "anonymous", emailVerified: false, phoneBound: false, member: false, capabilities: { emailOtp: true, magicLink: true, google: false, passkey: true } }),
  clearPhoneIdentifier: noAction, identifyPhone: noAction, sendEmailCode: noAction, sendMagicLink: noAction,
  signInGoogle: noAction, verifyEmailCode: noAction, signInPasskey: noAction, addPasskey: noAction, bindPhone: noAction, signOut: noAction
};

test("chooser selection leaves the enabled email field focused instead of a parent heading steal", async (t) => {
  const trace: string[] = [];
  const original = window.HTMLElement.prototype.focus;
  t.mock.method(window.HTMLElement.prototype, "focus", function (this: HTMLElement, options?: FocusOptions) {
    if (this.closest("[data-verification-sheet]")) trace.push(this.tagName === "INPUT" ? "email" : this.textContent?.trim() ?? "");
    original.call(this, options);
  });
  ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const input = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(input.disabled, false));
  assert.ok(document.activeElement === input, "phase input must own focus; observed focus calls: " + trace.join(" → "));
  assert.equal(trace.at(-1), "email");
});

for (const moveFocus of [false, true]) {
  test(`direct deferred login ${moveFocus ? "preserves user focus" : "hands its initial heading fallback to the enabled input once"}`, async (t) => {
    let resolve!: (value: Awaited<ReturnType<MemberClient["status"]>>) => void;
    const pending = new Promise<Awaited<ReturnType<MemberClient["status"]>>>((done) => { resolve = done; });
    const trace: string[] = [];
    const original = window.HTMLElement.prototype.focus;
    t.mock.method(window.HTMLElement.prototype, "focus", function (this: HTMLElement, options?: FocusOptions) {
      if (this.closest("[data-verification-sheet]")) trace.push(this.tagName === "INPUT" ? "email" : this.textContent?.trim() || this.getAttribute("aria-label") || "other");
      original.call(this, options);
    });
    ui.render(<Customer client={{ ...chromeClient, status: () => pending }} initialFlow="login" />, { wrapper: MemberAuthProviders });
    const heading = await ui.screen.findByRole("heading", { name: "Log in" });
    const input = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(input.disabled, true);
    assert.ok(document.activeElement === heading, "disabled initial fields use the phase heading as fallback; observed: " + trace.join(" → ") + "; active: " + document.activeElement?.tagName);
    const cancel = ui.screen.getByRole("button", { name: "Cancel" });
    if (moveFocus) cancel.focus();
    const before = trace.length;
    await ui.act(async () => resolve(await chromeClient.status()));
    await ui.waitFor(() => assert.equal(input.disabled, false));
    assert.ok(document.activeElement === (moveFocus ? cancel : input), "initial loading may hand off only while the phase still owns its fallback");
    assert.equal(trace.length - before, moveFocus ? 0 : 1, "initial enablement gets at most one owned handoff");
  });
}

test("cooldown expiry stays quiet and an owned locked retry returns to a usable heading", async (t) => {
  const { MemberAuthActionError } = await import("@/lib/member-auth/client");
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const trace: string[] = [];
  const original = window.HTMLElement.prototype.focus;
  t.mock.method(window.HTMLElement.prototype, "focus", function (this: HTMLElement, options?: FocusOptions) {
    if (this.closest("[data-verification-sheet]")) trace.push(this.tagName);
    original.call(this, options);
  });
  ui.render(<Customer client={{ ...chromeClient, status: async () => { throw new MemberAuthActionError("rate-limited", 2); } }} initialFlow="login" />, { wrapper: MemberAuthProviders });
  const retry = await ui.screen.findByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
  now += 3_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  retry.focus();
  const before = trace.length;
  ui.fireEvent.click(retry);
  await ui.waitFor(() => assert.equal(retry.getAttribute("aria-busy"), "false"));
  assert.equal(trace.length, before + 1, "a renewed rate limit cannot leave focus on its disabled retry control");
  assert.ok(document.activeElement === ui.screen.getByRole("heading", { name: "Log in" }));
});

test("code entry owns initial focus but verification feedback does not steal user-moved focus", async (t) => {
  const { MemberAuthActionError } = await import("@/lib/member-auth/client");
  let reject!: (error: Error) => void;
  const client: MemberClient = { ...chromeClient, verifyEmailCode: () => new Promise((_resolve, fail) => { reject = fail; }) };
  const trace: string[] = [];
  const original = window.HTMLElement.prototype.focus;
  t.mock.method(window.HTMLElement.prototype, "focus", function (this: HTMLElement, options?: FocusOptions) {
    if (this.closest("[data-verification-sheet]")) trace.push(this.tagName);
    original.call(this, options);
  });
  ui.render(<Customer client={client} initialFlow="login" />, { wrapper: MemberAuthProviders });
  const email = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(email.disabled, false));
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  ui.fireEvent.submit(email.closest("form")!);
  const code = await ui.screen.findByLabelText("Verification code") as HTMLInputElement;
  assert.ok(document.activeElement === code, "the incoming code phase owns its enabled field");
  ui.fireEvent.change(code, { target: { value: "A1B2C3" } });
  await ui.waitFor(() => assert.ok(reject, "verification request has started"));
  const cancel = ui.screen.getByRole("button", { name: "Cancel" });
  cancel.focus();
  const before = trace.length;
  await ui.act(async () => reject(new MemberAuthActionError("invalid-code")));
  assert.ok(document.activeElement === cancel, "a late verification response must not steal focus back");
  assert.equal(trace.length, before);
});

test("setup and member headings own phase entry while the embedded phone phase retains its own owner", async () => {
  const { MemberAccountView } = await import("@/components/Authentication/member-auth/account-view");
  const { emptyMemberSnapshot } = await import("@/components/Authentication/member-auth/_shared/session");
  const status = { ...(await chromeClient.status()), authenticated: true, emailVerified: true };
  const noop = () => {};
  const props = {
    headingId: "focus-member-heading", snapshot: { ...emptyMemberSnapshot, status }, identifierMode: "email" as const,
    email: "member@example.com", phone: "", otp: "", onContinueRegistration: noop,
    onPasskey: noop, onGoogle: noop, onCode: noop, onLink: noop, onVerify: noop, onEditEmail: noop,
    onIdentifier: noop, onClearIdentifier: noop, onAddPasskey: noop, onSignOut: noop, onRefresh: noop,
    onMode: noop, onEmail: noop, onPhone: noop, onOtp: noop,
    phoneStep: <VerificationProvider initialLocale="en"><Trial headingId="focus-phone-heading" platform="ios" snapshot={{ challenge: null, status: null, busy: false, error: null }} onStart={noop} onRefresh={noop} onReset={noop} onExpire={noop} /></VerificationProvider>
  };
  const rendered = ui.render(<MemberAccountView {...props} />, { wrapper: MemberAuthProviders });
  const setup = await ui.screen.findByRole("heading", { name: "Finish setting up your account" });
  assert.ok(document.activeElement === setup);
  rendered.rerender(<MemberAccountView {...props} registrationRequested />);
  const phone = await ui.screen.findByRole("heading", { name: "Verify your phone" });
  assert.ok(document.activeElement === phone, "phone focus must not go to the parent's visually hidden heading");
  rendered.rerender(<MemberAccountView {...props} snapshot={{ ...props.snapshot, status: { ...status, member: true, phoneBound: true } }} />);
  const member = await ui.screen.findByRole("heading", { name: "Account ready" });
  assert.ok(document.activeElement === member);
});

for (const userMoved of [false, true]) {
test(`an explicit failed Verify ${userMoved ? "does not steal focus after a new pointer interaction" : "recovers its owned invalid code after Chromium blurs the disabled submit"}`, async (t) => {
  const { AccountPhaseViews } = await import("@/components/Authentication/account-phase-views");
  const noop = () => {};
  const props = {
    phase: "email-code" as const, flow: "login" as const, locale: "en" as const, headingId: "focus-explicit-code",
    email: "member@example.com", phone: "", code: "A1B2C3", invalid: null, busy: false,
    copied: false, copyFailed: false, remaining: "", resendRemaining: 0, checked: false, visible: true,
    recipient: "", message: "", onField: noop, onCodeComplete: noop, onAction: noop
  };
  const rendered = ui.render(<AccountPhaseViews {...props} />, { wrapper: MemberAuthProviders });
  const input = ui.screen.getByLabelText("Verification code") as HTMLInputElement;
  const submit = ui.screen.getByRole("button", { name: "Verify code" });
  submit.focus();
  document.body.tabIndex = -1;
  const setAttribute = window.Element.prototype.setAttribute;
  t.mock.method(window.Element.prototype, "setAttribute", function (this: Element, name: string, value: string) {
    setAttribute.call(this, name, value);
    // Chromium blurs a focused control synchronously when React disables it,
    // before the parent can install event handlers with its new busy closure.
    if (this === submit && name === "disabled" && document.activeElement === submit) document.body.focus();
  });
  rendered.rerender(<AccountPhaseViews {...props} busy pendingAction="verify-code" />);
  assert.ok(document.activeElement === document.body, "simulate Chromium blurring the newly disabled submit control");
  if (userMoved) ui.fireEvent.pointerDown(document.body);
  rendered.rerender(<AccountPhaseViews {...props} failure="invalid-code" />);
  assert.ok(document.activeElement === (userMoved ? document.body : input));
  if (!userMoved) {
    assert.equal(input.selectionStart, 0);
    assert.equal(input.selectionEnd, 6);
  }
  document.body.removeAttribute("tabindex");
});
}

test("pending intent listeners are removed on initial settlement and unmount", async (t) => {
  const added = t.mock.method(document, "addEventListener");
  const removed = t.mock.method(document, "removeEventListener");
  for (const finish of ["settle", "unmount"]) {
    let resolve!: (value: Awaited<ReturnType<MemberClient["status"]>>) => void;
    const pending = new Promise<Awaited<ReturnType<MemberClient["status"]>>>((done) => { resolve = done; });
    const before = added.mock.calls.length;
    const rendered = ui.render(<Customer client={{ ...chromeClient, status: () => pending }} initialFlow="login" />, { wrapper: MemberAuthProviders });
    await ui.screen.findByRole("heading", { name: "Log in" });
    const owned = added.mock.calls.slice(before).filter((call) => {
      const listener = call.arguments[1];
      return typeof listener === "function" && ["onFocus", "onPointer", "onKey"].includes(listener.name);
    });
    assert.equal(owned.length, 3, "only the busy phase installs the three temporary intent listeners");
    if (finish === "settle") await ui.act(async () => resolve(await chromeClient.status()));
    rendered.unmount();
    for (const call of owned) assert.ok(removed.mock.calls.some((entry) => entry.arguments[0] === call.arguments[0] && entry.arguments[1] === call.arguments[1]), "each pending-only listener is cleaned up on " + finish);
  }
});

test("standalone trial phases focus once with preventScroll rather than scrolling the sheet", async (t) => {
  const calls: Array<{ text: string; preventScroll: boolean }> = [];
  const original = window.HTMLElement.prototype.focus;
  t.mock.method(window.HTMLElement.prototype, "focus", function (this: HTMLElement, options?: FocusOptions) {
    if (this.tagName === "H2") calls.push({ text: this.textContent?.trim() ?? "", preventScroll: options?.preventScroll === true });
    original.call(this, options);
  });
  const challenge = { id: "focus-trial", recipient: "verify@example.com", body: "TEST", expiresAt: "2041-01-01T00:05:00.000Z", mode: "trial" as const };
  const phone = (active: boolean, error: "status" | null = null) => (
    <VerificationProvider initialLocale="en"><Trial presentation="registration" platform="ios" snapshot={{ challenge: active ? challenge : null, status: active ? { id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" } : null, busy: false, error }} onStart={() => {}} onRefresh={() => {}} onReset={() => {}} onExpire={() => {}} /></VerificationProvider>
  );
  const rendered = ui.render(phone(false), { wrapper: MemberAuthProviders });
  const initial = await ui.screen.findByRole("heading", { name: "Verify your phone" });
  assert.ok(document.activeElement === initial);
  rendered.rerender(phone(true));
  const waiting = await ui.screen.findByRole("heading", { name: "Send verification message" });
  assert.ok(document.activeElement === waiting);
  const before = calls.length;
  rendered.rerender(phone(true, "status"));
  assert.equal(calls.length, before, "feedback within one trial phase must not refocus");
  assert.ok(calls.length >= 2 && calls.every((call) => call.preventScroll), "every trial phase focus must avoid scrolling");
});

