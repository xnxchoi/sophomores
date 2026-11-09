import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";

let MemberAuthProviders: typeof import("./fixtures/providers").MemberAuthProviders;
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Recovery: typeof import("@/components/Authentication/member-auth/account-recovery-view").AccountRecoveryView;
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Element", "Node", "NodeFilter", "NodeList", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    const value = (key === "window" || key === "self") ? win : win[key as keyof typeof win];
    globalValue(key, typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(win) : value);
  }
  win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, media: "", onchange: null });
  win.scrollTo = () => {};
  globalValue("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  for (const name of ["scrollIntoView", "setPointerCapture", "releasePointerCapture"]) Object.defineProperty(win.HTMLElement.prototype, name, { value() {} });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", { value() { return false; } });
  MemberAuthProviders = (await import("./fixtures/providers")).MemberAuthProviders;
  ui = await import("@testing-library/react/pure");
  Recovery = (await import("@/components/Authentication/member-auth/account-recovery-view")).AccountRecoveryView;
  Study = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountStudy;
});
afterEach(() => ui.cleanup());
after(async () => {
  await new Promise((done) => setTimeout(done, 250));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
const capabilities = { emailOtp: true, magicLink: true, passkey: true, google: true };
const props = { headingId: "recovery-heading", onBack() {} };
const receipt = { success: true, data: { status: "pending_staff_review" } };
async function requestForm() {
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText("Registered mobile number")));
}
function fill() {
  ui.fireEvent.change(ui.screen.getByLabelText("Registered mobile number"), { target: { value: "01012345678" } });
  ui.fireEvent.change(ui.screen.getByLabelText("Contact email"), { target: { value: "contact@example.com" } });
}
function submit() { ui.fireEvent.submit(ui.screen.getByLabelText("Contact email").closest("form")!); }

test("recovery starts staff-review intake without repeating exhausted sign-in methods", async () => {
  const calls: string[] = [];
  ui.render(<Recovery {...props} onBack={() => calls.push("back")} />, { wrapper: MemberAuthProviders });
  assert.ok(ui.screen.queryByRole("heading", { name: "Account recovery" }));
  assert.ok(document.activeElement === ui.screen.getByLabelText("Registered mobile number"));
  assert.ok(!ui.screen.queryByRole("button", { name: /Use email sign-in|Use a passkey|Continue with linked Google|I can’t access my email/ }));
  assert.ok(!ui.screen.queryByText("What can you still access?"));
  assert.doesNotMatch(document.body.textContent!, /Reset password|Phone verified|Account ready/);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Back to Log in" }));
  assert.deepEqual(calls, ["back"]);
});

test("request validates unverified claims and pending submission grants no account proof", async () => {
  const calls: Array<[string, RequestInit]> = [];
  let resolve!: (value: Response) => void;
  globalValue("fetch", (path: string, init: RequestInit) => { calls.push([path, init]); return new Promise<Response>((done) => { resolve = done; }); });
  ui.render(<Recovery {...props} />, { wrapper: MemberAuthProviders });
  await requestForm();
  const phone = ui.screen.getByLabelText("Registered mobile number");
  assert.ok(document.activeElement === phone);
  assert.equal(phone.getAttribute("placeholder"), "010-1234-5678");
  assert.ok(phone.classList.contains("tracking-normal!"));
  assert.ok(ui.screen.getByLabelText("Contact email").classList.contains("tracking-normal!"));
  assert.ok(ui.screen.queryByText("Details are unverified. This request won’t change your account. Staff must verify ownership; restoration isn’t guaranteed."));
  submit();
  assert.equal(calls.length, 0);
  assert.equal(phone.getAttribute("aria-invalid"), "true");
  assert.ok(phone.getAttribute("aria-describedby"));
  fill(); submit(); submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/member/recovery");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(JSON.parse(calls[0][1].body as string), { phone: "+821012345678", contactEmail: "contact@example.com" });
  assert.ok(ui.screen.queryByRole("button", { name: "Submitting request…" }));
  assert.ok(!ui.screen.queryByRole("heading", { name: "Request received" }));
  assert.doesNotMatch(document.body.textContent!, /Phone verified|Account ready|Request sent/);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("heading", { name: "Request received" })));
  assert.ok(document.activeElement === ui.screen.getByRole("heading", { name: "Request received" }));
  assert.ok(ui.screen.queryByRole("status", { name: "" }));
  assert.ok(ui.screen.queryByText("Pending staff review"));
  assert.match(document.body.textContent!, /account is unchanged/i);
  assert.match(document.body.textContent!, /ownership has not been verified/i);
  assert.doesNotMatch(document.body.textContent!, /contact@example.com|01012345678|821012345678/);
  assert.ok(!ui.screen.queryByRole("textbox"));
});

for (const [name, response] of [
  ["503", () => Response.json({}, { status: 503 })],
  ["wrong HTTP status", () => Response.json(receipt)],
  ["wrong receipt", () => Response.json({ success: true, data: { status: "recovered" } }, { status: 202 })],
  ["receipt PII", () => Response.json({ ...receipt, phone: "private" }, { status: 202 })],
  ["malformed receipt", () => new Response("{", { status: 202 })],
  ["oversized receipt", () => new Response("x".repeat(4097), { status: 202 })],
  ["network", () => { throw Error("private network detail"); }]
] as const) {
  test(`${name} retains claims and reports retry error without claiming receipt`, async () => {
    globalValue("fetch", async () => response());
    ui.render(<Recovery {...props} />, { wrapper: MemberAuthProviders }); await requestForm(); fill(); submit();
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("alert")));
    assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "contact@example.com");
    assert.equal((ui.screen.getByLabelText("Registered mobile number") as HTMLInputElement).value, "01012345678");
    assert.ok(!ui.screen.queryByRole("heading", { name: "Request received" }));
    assert.doesNotMatch(document.body.textContent!, /private network detail|Request sent/);
    assert.equal((ui.screen.getByRole("button", { name: "Request staff review" }) as HTMLButtonElement).disabled, false);
  });
}

test("leaving pending intake aborts before returning and ignores a stale receipt", async () => {
  let resolve!: (value: Response) => void;
  let signal!: AbortSignal;
  const calls: string[] = [];
  globalValue("fetch", (_path: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
  const rendered = ui.render(<Recovery {...props} onBack={() => calls.push("back")} />, { wrapper: MemberAuthProviders });
  await requestForm(); fill(); submit();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Back to Log in" }));
  assert.equal(signal.aborted, true);
  assert.deepEqual(calls, ["back"]);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  assert.ok(!ui.screen.queryByRole("heading", { name: "Request received" }));
  rendered.unmount();
  ui.render(<Recovery {...props} />, { wrapper: MemberAuthProviders }); await requestForm();
  assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "");
  fill(); submit(); ui.cleanup();
  assert.equal(signal.aborted, true);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
});

for (const [header, expected] of [["2", 2], ["86400", 86400], [null, 60], ["0", 60], ["-1", 60], ["1.5", 60], ["86401", 60], ["NaN", 60]] as const) {
  test(`recovery rate limit uses bounded Retry-After ${String(header)} and never resubmits early`, async (t) => {
    let now = Date.now();
    t.mock.method(Date, "now", () => now);
    let calls = 0;
    globalValue("fetch", async () => { calls++; return Response.json({}, { status: 429, headers: header === null ? {} : { "Retry-After": header } }); });
    ui.render(<Recovery {...props} />, { wrapper: MemberAuthProviders }); await requestForm(); fill();
    t.mock.timers.enable({ apis: ["setTimeout"] });
    try {
      await ui.act(async () => submit());
      const button = ui.screen.getByRole("button", { name: "Request staff review" }) as HTMLButtonElement;
      const timer = ui.screen.getByRole("timer");
      const countdown = `${Math.floor(expected / 60)}:${String(expected % 60).padStart(2, "0")}`;
      assert.match(timer.textContent!, new RegExp(countdown));
      assert.equal(timer.getAttribute("aria-live"), "off");
      assert.ok(!ui.screen.queryByRole("alert"));
      assert.equal(ui.screen.getByRole("status").textContent, "Too many requests.");
      assert.ok(button.disabled);
      assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "contact@example.com");
      submit(); assert.equal(calls, 1);
      now += expected * 1000;
      ui.act(() => t.mock.timers.tick(1000));
      assert.ok(!button.disabled);
      assert.ok(!ui.screen.queryByRole("timer"));
      assert.ok(ui.screen.queryByText("You can try again."));
      assert.ok(ui.screen.getByRole("button", { name: "Request staff review" }) === button);
    } finally { t.mock.timers.reset(); }
  });
}

test("recovery countdown catches up after hidden time without announcing each second", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  globalValue("fetch", async () => Response.json({}, { status: 429, headers: { "Retry-After": "3" } }));
  ui.render(<Recovery {...props} />, { wrapper: MemberAuthProviders }); await requestForm(); fill();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const visibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
  try {
    await ui.act(async () => submit());
    assert.match(ui.screen.getByRole("timer").textContent!, /0:03/);
    now += 1000; ui.act(() => t.mock.timers.tick(1000));
    assert.match(ui.screen.getByRole("timer").textContent!, /0:02/);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    ui.act(() => document.dispatchEvent(new Event("visibilitychange")));
    now += 3000;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    ui.act(() => document.dispatchEvent(new Event("visibilitychange")));
    assert.ok(!(ui.screen.getByRole("button", { name: "Request staff review" }) as HTMLButtonElement).disabled);
    assert.ok(!ui.screen.queryByRole("timer"));
  } finally {
    t.mock.timers.reset();
    if (visibility) Object.defineProperty(document, "visibilityState", visibility);
    else Reflect.deleteProperty(document, "visibilityState");
  }
});

test("deadline releases pending intake honestly and ignores a later receipt", async (t) => {
  let resolve!: (value: Response) => void;
  let signal!: AbortSignal;
  globalValue("fetch", (_path: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
  ui.render(<Recovery {...props} />, { wrapper: MemberAuthProviders }); await requestForm(); fill();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  submit();
  ui.act(() => t.mock.timers.tick(10_001));
  assert.equal(signal.aborted, true);
  assert.match(ui.screen.getByRole("alert").textContent!, /took too long/);
  assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "contact@example.com");
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  assert.ok(!ui.screen.queryByRole("heading", { name: "Request received" }));
  t.mock.timers.reset();
});

function client() {
  const calls: string[] = [];
  const status: MemberStatus = { authenticated: false, phoneBindingAuth: "anonymous" as const, emailVerified: false, phoneBound: false, member: false, capabilities };
  const action = (name: string) => async () => { calls.push(name); };
  const value: MemberClient = { status: async () => status, clearPhoneIdentifier: action("clear"), identifyPhone: action("identify"), sendEmailCode: action("code"), sendMagicLink: action("link"), signInGoogle: action("google"), signInPasskey: action("passkey"), verifyEmailCode: action("verify"), addPasskey: action("add"), bindPhone: action("bind"), signOut: action("signout") };
  return { calls, value };
}
test("recovery keeps the focused root and Cancel clears claims without losing the caller", async () => {
  const c = client();
  let resolve!: (value: Response) => void;
  let signal!: AbortSignal;
  globalValue("fetch", (_path: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
  ui.render(<><input aria-label="Caller ticket quantity" defaultValue="3" /><Study client={c.value} /></>, { wrapper: MemberAuthProviders });
  const caller = ui.screen.getByLabelText("Caller ticket quantity");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).disabled, false));
  const dialog = ui.screen.getByRole("dialog");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await requestForm(); fill(); submit();
  assert.ok(ui.screen.getByRole("dialog") === dialog);
  assert.ok(!ui.screen.queryByRole("button", { name: /Use a passkey|Use email sign-in|Continue with linked Google/ }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  assert.equal(signal.aborted, true);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }));
  assert.ok(ui.screen.getByRole("dialog") === dialog);
  assert.ok(ui.screen.getByLabelText("Caller ticket quantity") === caller);
  assert.equal((caller as HTMLInputElement).value, "3");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("button", { name: "Can’t sign in?" }) as HTMLButtonElement).disabled, false));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await requestForm();
  assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "");
  assert.equal(c.calls.includes("identify"), false);
});

test("returning from recovery preserves the email code phase, input and resend deadline", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).disabled, false));
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "original@example.com" } });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  ui.fireEvent.change(ui.screen.getByLabelText(/^(?:Verification|Email) code$/), { target: { value: "A1B" } });
  const beforeRecovery = [...c.calls];
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await requestForm();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Back to Log in" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  assert.equal((ui.screen.getByLabelText(/^(?:Verification|Email) code$/) as HTMLInputElement).value, "A1B");
  assert.match(document.body.textContent!, /original@example.com/);
  const resend = ui.screen.getByRole("button", { name: /Resend/ }) as HTMLButtonElement;
  assert.ok(resend.disabled);
  assert.equal(c.calls.filter((value) => value === "code").length, 1);
  assert.equal(c.calls.includes("google"), false);
  assert.equal(c.calls.includes("passkey"), false);
  assert.equal(c.calls.includes("signout"), false);
  assert.deepEqual(c.calls, beforeRecovery);
  now += 60_001;
  ui.act(() => document.dispatchEvent(new Event("visibilitychange")));
  assert.ok(!resend.disabled);
});
