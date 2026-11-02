import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "../../lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Recovery: typeof import("../../components/Authentication/member-auth/account-recovery-view").AccountRecoveryView;
let Study: typeof import("../../components/Authentication/member-auth/account-study").MemberAccountStudy;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Element", "Node", "NodeFilter", "NodeList", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    const value = key === "window" ? win : win[key as keyof typeof win];
    globalValue(key, typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(win) : value);
  }
  win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, media: "", onchange: null });
  win.scrollTo = () => {};
  globalValue("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  for (const name of ["scrollIntoView", "setPointerCapture", "releasePointerCapture"]) Object.defineProperty(win.HTMLElement.prototype, name, { value() {} });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", { value() { return false; } });
  ui = await import("@testing-library/react/pure");
  Recovery = (await import("../../components/Authentication/member-auth/account-recovery-view")).AccountRecoveryView;
  Study = (await import("../../components/Authentication/member-auth/account-study")).MemberAccountStudy;
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
const props = { headingId: "recovery-heading", capabilities, onEmail() {}, onPasskey() {}, onGoogle() {} };
const receipt = { success: true, data: { status: "pending_staff_review" } };
async function requestForm() {
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "I can’t access my email" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText("Registered mobile number")));
}
function fill() {
  ui.fireEvent.change(ui.screen.getByLabelText("Registered mobile number"), { target: { value: "01012345678" } });
  ui.fireEvent.change(ui.screen.getByLabelText("Contact email"), { target: { value: "contact@example.com" } });
}
function submit() { ui.fireEvent.submit(ui.screen.getByLabelText("Contact email").closest("form")!); }

test("help names only available existing routes and never offers password reset or phone lookup", async () => {
  const calls: string[] = [];
  const rendered = ui.render(<Recovery {...props} capabilities={{ ...capabilities, google: false }} onEmail={() => calls.push("email")} onPasskey={() => calls.push("passkey")} />);
  assert.equal(document.activeElement, ui.screen.getByRole("heading", { name: "Can’t sign in?" }));
  assert.ok(ui.screen.queryByText("What can you still access?"));
  assert.equal(ui.screen.queryByText(/passwordless/i), null);
  assert.equal(ui.screen.queryByRole("button", { name: /Google/ }), null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Use a passkey" }));
  assert.deepEqual(calls, ["passkey"]);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Use email sign-in" }));
  assert.deepEqual(calls, ["passkey", "email"]);
  rendered.rerender(<Recovery {...props} capabilities={undefined} />);
  assert.equal(ui.screen.queryByRole("button", { name: "Use email sign-in" }), null);
  assert.equal(ui.screen.queryByRole("button", { name: "Use a passkey" }), null);
  assert.ok(ui.screen.queryByRole("button", { name: "I can’t access my email" }));
  assert.doesNotMatch(document.body.textContent!, /More options|Find account|Reset password/);
});

test("request validates unverified claims and pending submission grants no account proof", async () => {
  const calls: Array<[string, RequestInit]> = [];
  let resolve!: (value: Response) => void;
  globalValue("fetch", (path: string, init: RequestInit) => { calls.push([path, init]); return new Promise<Response>((done) => { resolve = done; }); });
  ui.render(<Recovery {...props} />);
  await requestForm();
  const phone = ui.screen.getByLabelText("Registered mobile number");
  assert.equal(document.activeElement, phone);
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
  assert.equal(ui.screen.queryByRole("heading", { name: "Request received" }), null);
  assert.doesNotMatch(document.body.textContent!, /Phone verified|Account ready|Request sent/);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("heading", { name: "Request received" })));
  assert.equal(document.activeElement, ui.screen.getByRole("heading", { name: "Request received" }));
  assert.ok(ui.screen.queryByRole("status", { name: "" }));
  assert.ok(ui.screen.queryByText("Pending staff review"));
  assert.match(document.body.textContent!, /account is unchanged/i);
  assert.match(document.body.textContent!, /ownership has not been verified/i);
  assert.doesNotMatch(document.body.textContent!, /contact@example.com|01012345678|821012345678/);
  assert.equal(ui.screen.queryByRole("textbox"), null);
});

for (const [name, response] of [
  ["429", () => Response.json({}, { status: 429 })],
  ["503", () => Response.json({}, { status: 503 })],
  ["wrong HTTP status", () => Response.json(receipt)],
  ["wrong receipt", () => Response.json({ success: true, data: { status: "recovered" } }, { status: 202 })],
  ["receipt PII", () => Response.json({ ...receipt, phone: "private" }, { status: 202 })],
  ["network", () => { throw Error("private network detail"); }]
] as const) {
  test(`${name} retains claims and reports retry error without claiming receipt`, async () => {
    globalValue("fetch", async () => response());
    ui.render(<Recovery {...props} />); await requestForm(); fill(); submit();
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("alert")));
    assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "contact@example.com");
    assert.equal((ui.screen.getByLabelText("Registered mobile number") as HTMLInputElement).value, "01012345678");
    assert.equal(ui.screen.queryByRole("heading", { name: "Request received" }), null);
    assert.doesNotMatch(document.body.textContent!, /private network detail|Request sent/);
    assert.equal((ui.screen.getByRole("button", { name: "Request staff review" }) as HTMLButtonElement).disabled, false);
  });
}

test("leaving a pending review aborts and a stale receipt cannot affect a newer flow", async () => {
  let resolve!: (value: Response) => void;
  let signal!: AbortSignal;
  globalValue("fetch", (_path: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
  const rendered = ui.render(<Recovery {...props} />); await requestForm(); fill(); submit();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Back to sign-in options" }));
  assert.equal(signal.aborted, true);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("heading", { name: "Can’t sign in?" })));
  await requestForm();
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "");
  assert.equal(ui.screen.queryByRole("heading", { name: "Request received" }), null);
  fill(); submit(); rendered.unmount();
  assert.equal(signal.aborted, true);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
});

test("deadline releases pending intake honestly and ignores a later receipt", async (t) => {
  let resolve!: (value: Response) => void;
  let signal!: AbortSignal;
  globalValue("fetch", (_path: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
  ui.render(<Recovery {...props} />); await requestForm(); fill();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  submit();
  ui.act(() => t.mock.timers.tick(10_001));
  assert.equal(signal.aborted, true);
  assert.match(ui.screen.getByRole("alert").textContent!, /took too long/);
  assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "contact@example.com");
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  assert.equal(ui.screen.queryByRole("heading", { name: "Request received" }), null);
  t.mock.timers.reset();
});

function client() {
  const calls: string[] = [];
  const status: MemberStatus = { authenticated: false, emailVerified: false, phoneBound: false, member: false, capabilities };
  const action = (name: string) => async () => { calls.push(name); };
  const value: MemberClient = { status: async () => status, clearPhoneIdentifier: action("clear"), identifyPhone: action("identify"), sendEmailCode: action("code"), sendMagicLink: action("link"), signInGoogle: action("google"), signInPasskey: action("passkey"), verifyEmailCode: action("verify"), addPasskey: action("add"), bindPhone: action("bind"), signOut: action("signout") };
  return { calls, value };
}
test("same focused root routes help through canonical handlers; Cancel clears claims but retains caller", async () => {
  const c = client();
  let resolve!: (value: Response) => void;
  let signal!: AbortSignal;
  globalValue("fetch", (_path: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
  ui.render(<><input aria-label="Caller ticket quantity" defaultValue="3" /><Study client={c.value} /></>);
  const caller = ui.screen.getByLabelText("Caller ticket quantity");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).disabled, false));
  const dialog = ui.screen.getByRole("dialog");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Use a passkey" })));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Use a passkey" }));
  await ui.waitFor(() => assert.ok(c.calls.includes("passkey")));
  assert.equal(ui.screen.getByRole("dialog"), dialog);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await requestForm(); fill(); submit();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  assert.equal(signal.aborted, true);
  await ui.act(async () => resolve(Response.json(receipt, { status: 202 })));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }));
  assert.equal(ui.screen.getByRole("dialog"), dialog);
  assert.equal(ui.screen.getByLabelText("Caller ticket quantity"), caller);
  assert.equal((caller as HTMLInputElement).value, "3");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("button", { name: "Can’t sign in?" }) as HTMLButtonElement).disabled, false));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  await requestForm();
  assert.equal((ui.screen.getByLabelText("Contact email") as HTMLInputElement).value, "");
  assert.equal(c.calls.includes("identify"), false);
});

test("email help resets the code step and linked Google uses the existing session handler", async () => {
  const c = client();
  ui.render(<Study client={c.value} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).disabled, false));
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "original@example.com" } });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Use email sign-in" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText("Email address")));
  assert.equal(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/), null);
  assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).value, "original@example.com");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue with linked Google" }));
  await ui.waitFor(() => assert.ok(c.calls.includes("google")));
  assert.equal(c.calls.filter((value) => value === "code").length, 1);
  assert.equal(c.calls.includes("link"), false);
  assert.equal(c.calls.includes("identify"), false);
});
