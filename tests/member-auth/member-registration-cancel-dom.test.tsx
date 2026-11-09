import { MemberAuthProviders } from "./fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { useRef, useState } from "react";
import { JSDOM } from "jsdom";
import { MemberAuthActionError, type MemberClient, type MemberStatus } from "@/lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let Dialog: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountDialog;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/tickets", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Element", "Node", "NodeFilter", "NodeList", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    const value = (key === "window" || key === "self") ? win : win[key as keyof typeof win];
    globalValue(key, typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(win) : value);
  }
  win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, media: "", onchange: null });
  win.scrollTo = () => {};
  Object.defineProperty(win.HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => null });
  globalValue("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  globalValue("fetch", async () => { throw new Error("Unexpected provider request in registration cancellation test"); });
  for (const key of ["scrollIntoView", "setPointerCapture", "releasePointerCapture"])
    Object.defineProperty(win.HTMLElement.prototype, key, { value() {} });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", { value() { return false; } });
  ui = await import("@testing-library/react/pure");
  const account = await import("@/components/Authentication/member-auth/account-study");
  Study = account.MemberAccountStudy;
  Dialog = account.MemberAccountDialog;
});
afterEach(() => ui.cleanup());
after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

const anonymous: MemberStatus = { authenticated: false, phoneBindingAuth: "anonymous" as const, emailVerified: false, phoneBound: false, member: false,
  capabilities: { emailOtp: true, magicLink: true, google: false, passkey: false } };
const pending: MemberStatus = { ...anonymous, authenticated: true, phoneBindingAuth: "ready" as const, emailVerified: true };
const member: MemberStatus = { ...pending, phoneBound: true, member: true };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function client(initial: MemberStatus = pending) {
  let status = initial;
  const calls: string[] = [];
  const action = (name: string) => async () => { calls.push(name); };
  const value: MemberClient = {
    status: async () => { calls.push("status"); return status; },
    clearPhoneIdentifier: action("clear-identifier"), identifyPhone: action("identify-phone"),
    sendEmailCode: action("send-code"), sendMagicLink: action("send-link"), signInGoogle: action("google"),
    verifyEmailCode: action("verify-code"), signInPasskey: action("passkey"), addPasskey: action("add-passkey"),
    bindPhone: action("bind-phone"),
    signOut: async () => { calls.push("sign-out"); status = anonymous; },
  };
  return { value, calls, setStatus: (next: MemberStatus) => { status = next; } };
}
async function registration(c = client()) {
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  const phone = await ui.screen.findByRole("textbox", { name: "Phone number" }) as HTMLInputElement;
  return { c, phone };
}
function TicketCaller({ client: value }: { client: MemberClient }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <main><h1>Ticket selection</h1><input aria-label="Ticket quantity" value="3" readOnly />
    <button ref={trigger} onClick={() => setOpen(true)}>Finish account setup</button>
    <Dialog open={open} onOpenChange={setOpen} returnFocusRef={trigger} client={value} initialFlow="signup" />
  </main>;
}

test("known unfinished registration Cancel closes directly without a guard, logout or chooser", async () => {
  const { c, phone } = await registration();
  ui.fireEvent.change(phone, { target: { value: "01012345678" } });
  phone.focus();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  await ui.waitFor(() => assert.equal(Boolean(document.querySelector("[data-verification-sheet]")), false, "Cancel must close the surface directly"));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: /I[’']ll do it later/i }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Use a different email" }) === null);
  assert.ok(document.querySelector("[data-member-registration-guard]") === null);
  assert.equal(phone.isConnected, false, "closing disposes the private phone flow rather than hiding an intermediate step");
  const trigger = ui.screen.getByRole("button", { name: "Open account options" });
  await ui.waitFor(() => assert.ok(document.activeElement === trigger));
  assert.equal(c.calls.some((name) => /code|link|sign-out|bind/.test(name)), false);
  ui.fireEvent.click(trigger);
  const reopened = await ui.screen.findByRole("textbox", { name: "Phone number" }) as HTMLInputElement;
  assert.equal(reopened.value, "", "closing does not promise durable private phone input");
  assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null, "reopening uses the retained canonical identity");
  assert.equal(c.calls.includes("sign-out"), false);
});

test("Cancel returns straight to the caller with its selection, session and trigger focus intact", async () => {
  const c = client();
  ui.render(<TicketCaller client={c.value} />, { wrapper: MemberAuthProviders });
  const quantity = ui.screen.getByRole("textbox", { name: "Ticket quantity" }) as HTMLInputElement;
  const trigger = ui.screen.getByRole("button", { name: "Finish account setup" });
  ui.fireEvent.click(trigger);
  await ui.screen.findByRole("textbox", { name: "Phone number" });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  await ui.waitFor(() => assert.ok(document.activeElement === trigger));
  assert.equal(window.location.pathname, "/tickets");
  assert.ok(quantity.isConnected);
  assert.equal(quantity.value, "3");
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: /I[’']ll do it later/i }) === null);
  assert.equal(c.calls.includes("sign-out"), false);
  assert.equal(c.calls.includes("bind-phone"), false);
});

test("Switch account still waits for canonical logout and anonymous status before email entry", async () => {
  const c = client();
  const logout = deferred<void>();
  c.value.signOut = async () => { c.calls.push("sign-out"); await logout.promise; c.setStatus(anonymous); };
  await registration(c);
  const switchAccount = ui.screen.getByRole("button", { name: "Switch account" }) as HTMLButtonElement;
  ui.fireEvent.click(switchAccount);
  await ui.waitFor(() => assert.equal(c.calls.filter((name) => name === "sign-out").length, 1));
  assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null);
  assert.equal(switchAccount.disabled, true);
  ui.fireEvent.click(switchAccount);
  assert.equal(c.calls.filter((name) => name === "sign-out").length, 1);
  await ui.act(async () => logout.resolve());
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).disabled, false));
  const signedOut = c.calls.indexOf("sign-out");
  assert.ok(c.calls.indexOf("status", signedOut + 1) > signedOut);
  assert.ok(c.calls.indexOf("clear-identifier", signedOut + 1) > signedOut);
});

test("failed Switch account retains registration input and a recoverable error", async () => {
  const c = client();
  c.value.signOut = async () => { c.calls.push("sign-out"); throw new MemberAuthActionError("network"); };
  const { phone } = await registration(c);
  ui.fireEvent.change(phone, { target: { value: "01087654321" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("alert").textContent ?? "", /connect|try again|sign.out/i));
  assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null);
  assert.equal((ui.screen.getByRole("button", { name: "Switch account" }) as HTMLButtonElement).disabled, false);
  assert.ok(ui.screen.getByRole("textbox", { name: "Phone number" }) === phone);
  assert.equal(phone.value, "01087654321");
});

test("logout success without authoritative anonymous status cannot expose another email", async () => {
  const c = client();
  c.value.signOut = async () => { c.calls.push("sign-out"); };
  await registration(c);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("alert")));
  assert.ok(ui.screen.getByRole("textbox", { name: "Phone number" }));
  assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null);
  assert.equal(c.calls.includes("clear-identifier"), false);
});

test("unauthenticated Cancel still returns to the ordinary chooser", async () => {
  const c = client(anonymous);
  ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).disabled, false));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.screen.findByRole("heading", { name: "Welcome" });
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Log in" }));
  assert.ok(ui.screen.getByRole("button", { name: "Sign up" }));
});

test("a late known-identity response cannot replace an already cancelled anonymous chooser", async () => {
  const c = client();
  const status = deferred<MemberStatus>();
  c.value.status = async () => { c.calls.push("status"); return status.promise; };
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.screen.findByRole("heading", { name: "Welcome" });
  await ui.act(async () => status.resolve(pending));
  assert.ok(ui.screen.getByRole("heading", { name: "Welcome" }));
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null);
  assert.deepEqual(c.calls, ["status"]);
});

test("a submitted binding may settle after Cancel without reopening the disposed flow", async (t) => {
  const c = client();
  const binding = deferred<void>();
  c.value.bindPhone = async () => { c.calls.push("bind-phone"); await binding.promise; c.setStatus(member); };
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  t.mock.method(globalThis, "fetch", async (_path: RequestInfo | URL, init: RequestInit = {}) => {
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json({ success: true, data: init.method === "POST"
      ? { id: "cancel-fixture", recipient: "verify@example.invalid", body: "CANCEL FIXTURE", expiresAt, mode: "trial" }
      : { id: "cancel-fixture", expiresAt, mode: "trial", state: "verified" } });
  });
  const { phone } = await registration(c);
  ui.fireEvent.change(phone, { target: { value: "01012345678" } });
  ui.fireEvent.submit(phone.closest("form")!);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Check status" }));
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Finish registration" }));
  await ui.waitFor(() => assert.ok(c.calls.includes("bind-phone")));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("heading", { name: "Verify your phone to finish" }) === null));
  await ui.act(async () => binding.resolve());
  assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
  assert.equal(c.calls.includes("sign-out"), false);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Open account options" }));
  await ui.screen.findByRole("heading", { name: "Account ready" });
});

test("Cancel during an explicit account switch never reopens the closed surface when logout settles", async () => {
  const c = client();
  const logout = deferred<void>();
  c.value.signOut = async () => { c.calls.push("sign-out"); await logout.promise; c.setStatus(anonymous); };
  await registration(c);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await ui.waitFor(() => assert.ok(c.calls.includes("sign-out")));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  await ui.act(async () => logout.resolve());
  assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null);
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
});

for (const [name, status, heading] of [
  ["member", member, "Account ready"],
  ["unverified email", { ...pending, emailVerified: false }, "Email verification needed"],
] as const) {
  test(`known ${name} Cancel returns directly to the caller rather than a generic chooser`, async () => {
    const c = client(status);
    ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
    await ui.screen.findByRole("heading", { name: heading });
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("heading", { name: heading }) === null));
    assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
    assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
    assert.equal(c.calls.includes("sign-out"), false);
  });
}
