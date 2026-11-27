import messages from "../../messages/en.json";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { untilAsserted } from "../support/dom-state";
import { MemberAuthActionError, type MemberClient, type MemberStatus } from "@/lib/member-auth/client";

// The /sign-in page as composed (Review-B, 26 Nov): every way in at once with no chooser, the page h1 as the one
// heading, the new-visitor note from the providers actually on, the email looked up before a code is offered, an
// account in setup finishing inline, one redirect to the validated `next`, and recovery reachable.
let MemberAuthProviders: typeof import("./fixtures/providers").MemberAuthProviders;
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Page: typeof import("@/components/Authentication/member-auth/account-study").MemberSignInPage;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/sign-in", pretendToBeVisual: true });
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
  Page = (await import("@/components/Authentication/member-auth/account-study")).MemberSignInPage;
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

const capabilities = { apple: true, kakao: false, emailOtp: true, magicLink: true, google: true, passkey: true };
const anonymous: MemberStatus = { phoneBindingAuth: "anonymous", authenticated: false, emailVerified: false, phoneBound: false, member: false, capabilities };
const member: MemberStatus = { ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true, phoneBound: true, member: true };
function client(initial: MemberStatus = anonymous) {
  let status = initial;
  const calls: Array<[string, ...unknown[]]> = [];
  const action = (name: string) => async (...args: unknown[]) => { calls.push([name, ...args]); };
  const value: MemberClient = {
    status: async () => { calls.push(["status"]); return status; },
    clearPhoneIdentifier: action("clear"),
    identifyPhone: action("identify"),
    lookupEmail: async (email) => { calls.push(["lookup", email]); return { account: "existing" }; },
    sendEmailCode: action("code"),
    sendMagicLink: action("link"),
    signInSocial: action("social"),
    verifyEmailCode: action("verify"),
    signInPasskey: async () => { calls.push(["passkey"]); status = member; },
    addPasskey: action("add-passkey"),
    bindPhone: action("bind"),
    signOut: async () => { calls.push(["signout"]); status = anonymous; }
  };
  return { value, calls, named: (name: string) => calls.filter(([call]) => call === name) };
}
function render(c: ReturnType<typeof client>, options: { next?: string; initial?: MemberStatus["capabilities"] } = {}) {
  const visits: string[] = [];
  ui.render(<Page next={options.next ?? "/shop"} client={c.value} initialCapabilities={options.initial ?? capabilities} navigate={(url) => visits.push(url)} />, { wrapper: MemberAuthProviders });
  return visits;
}
const email = () => ui.screen.getByLabelText("Email address") as HTMLInputElement;
const ready = () => untilAsserted(ui, () => assert.equal(email().disabled, false));

test("every way in at once: no chooser, and the page h1 is the one 'Sign in' heading", async () => {
  render(client());
  await ready();
  assert.equal(ui.screen.getAllByRole("heading", { name: messages.MemberAuth.logIn }).length, 1);
  assert.equal(ui.screen.getByRole("heading", { name: messages.MemberAuth.logIn }).tagName, "H1");
  assert.equal(ui.screen.queryByRole("button", { name: messages.MemberAuth.signUp }), null, "no Sign up chooser button");
  assert.equal(ui.screen.queryByRole("button", { name: messages.MemberAuth.logIn }), null, "no Sign in chooser button");
  assert.ok(ui.screen.getByRole("button", { name: /apple/i }));
  assert.ok(ui.screen.getByRole("button", { name: /google/i }));
  assert.ok(ui.screen.getByRole("button", { name: /passkey/i }));
  const target = document.querySelector<HTMLElement>("[data-phase-focus]");
  assert.ok(target, "the entry step keeps a focus target");
  assert.equal(target.tagName === "DIV" && target.tabIndex === -1, true, "and it is not a heading");
});

test("the new-visitor note names only the providers that are on, and says so when sign-up is off", async () => {
  render(client({ ...anonymous, capabilities: { ...capabilities, apple: false } }), { initial: { ...capabilities, apple: false } });
  await ready();
  assert.ok(ui.screen.getByText("New here? Use Google to create an account."));
  ui.cleanup();
  const withKakao = { ...capabilities, kakao: true };
  render(client({ ...anonymous, capabilities: withKakao }), { initial: withKakao });
  await ready();
  assert.ok(ui.screen.getByText("New here? Use Apple, Google, or Kakao to create an account."));
  ui.cleanup();
  const off = { ...capabilities, apple: false, google: false, kakao: false };
  render(client({ ...anonymous, capabilities: off }), { initial: off });
  await ready();
  assert.ok(ui.screen.getByText(messages.MemberAuth.signUpIsUnavailableTryAgainShortly));
});

test("the note follows the live status: Apple off after the page loaded drops it from the note", async () => {
  render(client({ ...anonymous, capabilities: { ...capabilities, apple: false } }));
  await untilAsserted(ui, () => ui.screen.getByText("New here? Use Google to create an account."));
});

test("Continue looks the email up; the code goes only on a separate Send press", async () => {
  const c = client();
  render(c);
  await ready();
  ui.fireEvent.change(email(), { target: { value: "member@example.com" } });
  assert.deepEqual(c.named("lookup"), [], "typing looks nothing up");
  ui.act(() => email().form!.requestSubmit());
  const send = await untilAsserted(ui, () => ui.screen.getByRole("button", { name: messages.MemberAuth.sendSignInCode }));
  assert.deepEqual(c.named("lookup"), [["lookup", "member@example.com"]]);
  assert.deepEqual(c.named("code"), [], "no code before the explicit Send");
  ui.fireEvent.click(send);
  await untilAsserted(ui, () => assert.deepEqual(c.named("code"), [["code", "member@example.com"]]));
  // Review-B, 26 Nov: the code step is the page's step too: its title is the h1, the one heading, and the entry note goes.
  await untilAsserted(ui, () => assert.equal(ui.screen.getByRole("heading", { level: 1 }).textContent, messages.AuthPhase.emailHeading));
  assert.equal(ui.screen.getAllByRole("heading").length, 1, "one heading on the code step");
  assert.equal(ui.screen.queryByText(/New here\?/), null, "no entry note on the code step");
  assert.ok(ui.screen.getByText("member@example.com"), "the code step still shows the email");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: messages.AuthPhase.changeEmail }));
  await untilAsserted(ui, () => assert.equal(ui.screen.getByRole("heading", { level: 1 }).textContent, messages.MemberAuth.logIn));
  assert.ok(ui.screen.getByText(/New here\?/), "back on the entry step the note returns");
});

test("an unregistered email settles on social sign-up, without a Send or code step", async () => {
  const c = client();
  const lookups: string[] = [];
  c.value.lookupEmail = async (address) => {
    lookups.push(address);
    return { account: "new" };
  };
  render(c);
  await ready();
  ui.fireEvent.change(email(), { target: { value: "unregistered@example.net" } });
  ui.act(() => email().form!.requestSubmit());
  await untilAsserted(ui, () => ui.screen.getByText(/There.s no account for this email/));
  assert.ok(ui.screen.getByRole("button", { name: /apple/i }));
  assert.ok(ui.screen.getByRole("button", { name: /google/i }));
  assert.deepEqual(lookups, ["unregistered@example.net"]);
  assert.equal(ui.screen.queryByRole("button", { name: messages.MemberAuth.sendSignInCode }), null);
  assert.equal(ui.screen.queryByLabelText(messages.AuthPhase.code), null);
  assert.deepEqual(c.named("code"), []);
});

test("a delivery refusal leaves standalone sign-in on the email step with an error", async () => {
  const c = client();
  c.value.sendEmailCode = async () => { throw new MemberAuthActionError("delivery-failed"); };
  render(c);
  await ready();
  ui.fireEvent.change(email(), { target: { value: "member@example.net" } });
  ui.act(() => email().form!.requestSubmit());
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: messages.MemberAuth.sendSignInCode })));
  await untilAsserted(ui, () => ui.screen.getByText(/couldn.t send|could not send/i));
  assert.equal(ui.screen.queryByLabelText(messages.AuthPhase.code), null);
  assert.equal(ui.screen.getByRole("heading", { level: 1 }).textContent, messages.MemberAuth.logIn);
});

test("an account in setup finishes it on the page: no visitor note, no redirect", async () => {
  const visits = render(client({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true }));
  await untilAsserted(ui, () => ui.screen.getByRole("heading", { name: messages.MemberAuth.finishSettingUpYourAccount }));
  assert.equal(ui.screen.queryByText(/New here\?/), null);
  assert.deepEqual(visits, []);
});

test("a confirmed member leaves once, for the validated next", async () => {
  const c = client();
  const visits = render(c, { next: "/me/orders" });
  await ready();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: /passkey/i }));
  await untilAsserted(ui, () => assert.deepEqual(visits, ["/me/orders"]));
  await new Promise((done) => setTimeout(done, 50));
  assert.deepEqual(visits, ["/me/orders"], "later snapshots don't navigate again");
});

test("Lost access? opens account recovery on the page", async () => {
  render(client());
  await ready();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: messages.MemberAuth.cantSignIn }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.MemberAuth.registeredMobileNumber)));
});
