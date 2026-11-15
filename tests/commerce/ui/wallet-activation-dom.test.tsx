import { EnglishMessages } from "../../fixtures/english-messages";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { WalletActivationView } from "@/lib/member-auth/wallet/read";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let WalletActivation: typeof import("@/components/commerce/wallet-activation").WalletActivation;
let WalletActivationLink: typeof import("@/components/commerce/wallet-activation-link").WalletActivationLink;
let Result: typeof import("@/components/tickets/portone-payment-result").PortOnePaymentResult;
const previous = new Map<string, PropertyDescriptor | undefined>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const credential = { id: "Y3JlZGVudGlhbC1pZA", kind: "sign_in" as const };

function install(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
/** A browser WebAuthn JSON bridge whose prompt outcome each test chooses. */
function passkeys(outcome: "ok" | DOMException) {
  const calls: string[] = [];
  Object.defineProperty(dom.window, "PublicKeyCredential", { configurable: true, value: {
    parseCreationOptionsFromJSON: (options: unknown) => options, parseRequestOptionsFromJSON: (options: unknown) => options } });
  const prompt = (kind: string) => async () => {
    calls.push(kind);
    if (outcome !== "ok") throw outcome;
    return { toJSON: () => ({ id: credential.id, kind }) };
  };
  Object.defineProperty(dom.window.navigator, "credentials", { configurable: true, value: { create: prompt("create"), get: prompt("get") } });
  return calls;
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account/activate" });
  for (const key of ["window", "document", "navigator", "HTMLElement", "Node", "MutationObserver", "Event", "DOMException"]) install(key, key === "window" ? dom.window : dom.window[key as keyof typeof dom.window]);
  install("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  WalletActivation = (await import("@/components/commerce/wallet-activation")).WalletActivation;
  WalletActivationLink = (await import("@/components/commerce/wallet-activation-link")).WalletActivationLink;
  Result = (await import("@/components/tickets/portone-payment-result")).PortOnePaymentResult;
});
afterEach(() => { ui.cleanup(); Reflect.deleteProperty(dom.window, "PublicKeyCredential"); });
after(() => {
  dom.window.close();
  for (const [key, value] of previous) value ? Object.defineProperty(globalThis, key, value) : Reflect.deleteProperty(globalThis, key);
});

const render = (view: WalletActivationView) => ui.render(<EnglishMessages><WalletActivation initialView={view} /></EnglishMessages>);
const heading = () => ui.screen.getByRole("heading", { level: 1 }).textContent;

test("the page renders every activation state with its next step", () => {
  const cases: [WalletActivationView, string, RegExp, string | null][] = [
    [{ state: "signed_out" }, "Activate your membership", /Sign in to activate/, "Sign in"],
    [{ state: "unavailable" }, "Activation isn’t available", /couldn’t load your activation/, "Check again"],
    [{ state: "not_eligible" }, "Nothing to activate", /doesn’t have a membership/, "View tickets"],
    [{ state: "activation_required", passkeys: "compatible", credentials: [credential], freshSession: true }, "Activate your membership", /passkey you already have/, "Approve with passkey"],
    [{ state: "activation_required", passkeys: "none", credentials: [], freshSession: true }, "Activate your membership", /Create a passkey to activate/, "Create passkey"],
    [{ state: "activation_required", passkeys: "incompatible", credentials: [], freshSession: true }, "Activate your membership", /saved passkey can’t hold a key/, "Create passkey"],
    [{ state: "activation_required", passkeys: "none", credentials: [], freshSession: false }, "Activate your membership", /Sign in again before creating/, "Sign out and sign in again"],
    [{ state: "approval_pending", credentials: [{ ...credential, kind: "wallet" }], freshSession: false }, "Activate your membership", /once more to finish/, "Approve with passkey"],
    [{ state: "key_pending" }, "Membership activated", /will be issued to your passkey/, null],
    [{ state: "key_issued" }, "Membership activated", /has been issued/, null],
    [{ state: "on_hold" }, "Your key is on hold", /being reviewed/, null],
  ];
  for (const [view, title, body, action] of cases) {
    render(view);
    assert.equal(heading(), title, view.state);
    assert.ok(ui.screen.getByText(body), view.state);
    if (action) assert.ok(ui.screen.getByRole(/^(Sign in|View tickets)$/.test(action) ? "link" : "button", { name: action }), `${view.state}: ${action}`);
    else assert.equal(ui.screen.queryAllByRole("button").length, 0, `${view.state} offers no action`);
    assert.equal(ui.screen.getByRole("link", { name: "Back to your account" }).getAttribute("href"), "/account");
    ui.cleanup();
  }
});

test("approving with a compatible passkey binds through the wallet routes, then shows the activated state", async (t) => {
  const prompts = passkeys("ok");
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    paths.push(path);
    if (path.endsWith("/bind/options")) {
      assert.equal(init?.method, "POST");
      assert.equal(init?.credentials, "same-origin");
      assert.deepEqual(JSON.parse(String(init?.body)), { credentialId: credential.id });
      return json({ success: true, data: { challenge: "c" } });
    }
    if (path.endsWith("/bind/verify")) return json({ success: true, data: { status: "active" } });
    return json({ success: true, data: { state: "key_pending" } });
  });
  render({ state: "activation_required", passkeys: "compatible", credentials: [credential], freshSession: true });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Approve with passkey" }));
  await ui.screen.findByText("Membership activated");
  assert.deepEqual(paths, ["/api/member/wallet/bind/options", "/api/member/wallet/bind/verify", "/api/member/wallet/status"]);
  assert.deepEqual(prompts, ["get"]);
});

test("a new passkey is created, then approved once more", async (t) => {
  const prompts = passkeys("ok");
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    return json({ success: true, data: path.endsWith("/status") ? { state: "key_pending" } : { challenge: "c" } });
  });
  render({ state: "activation_required", passkeys: "none", credentials: [], freshSession: true });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Create passkey" }));
  await ui.screen.findByText("Membership activated");
  assert.deepEqual(paths, ["/api/member/wallet/register/options", "/api/member/wallet/register/verify", "/api/member/wallet/bind/verify", "/api/member/wallet/status"]);
  assert.deepEqual(prompts, ["create", "get"]);
});

test("a cancelled prompt, an RS256-only authenticator and an unsupported browser each explain the next step", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => json({ success: true, data: String(input).endsWith("/status")
    ? { state: "activation_required", passkeys: "compatible", credentials: [credential], freshSession: true } : { challenge: "c" } }));
  const view: WalletActivationView = { state: "activation_required", passkeys: "compatible", credentials: [credential], freshSession: true };
  passkeys(new DOMException("cancelled", "NotAllowedError"));
  render(view);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Approve with passkey" }));
  await ui.screen.findByText(/cancelled or timed out/);
  ui.cleanup();
  passkeys(new DOMException("no ES256", "NotSupportedError"));
  render(view);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Create a new passkey instead" }));
  await ui.screen.findByText(/can’t hold a key. Try again with a phone or a security key/);
  ui.cleanup();
  Reflect.deleteProperty(dom.window, "PublicKeyCredential");
  render(view);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Approve with passkey" }));
  await ui.screen.findByText(/This browser can’t use passkeys here/);
});

test("a different active wallet and an expired sign-in come back as their own states", async (t) => {
  passkeys("ok");
  let next = "WALLET_CONFLICT";
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => String(input).endsWith("/status")
    ? json({ success: true, data: { state: "key_pending" } })
    : json({ success: false, error: { code: next } }, next === "WALLET_CONFLICT" ? 409 : 401));
  render({ state: "activation_required", passkeys: "compatible", credentials: [credential], freshSession: true });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Approve with passkey" }));
  await ui.screen.findByText(/already activated with a different passkey/);
  ui.cleanup();
  next = "FRESH_AUTH_REQUIRED";
  render({ state: "activation_required", passkeys: "none", credentials: [], freshSession: true });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Create passkey" }));
  await ui.screen.findByRole("button", { name: "Sign out and sign in again" });
});

test("checking again reports a still-unavailable read in place", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json({ success: false, error: { code: "UNAVAILABLE" } }, 503));
  render({ state: "unavailable" });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check again" }));
  await ui.screen.findByText("We still couldn’t load your activation. Try again in a moment.");
  assert.equal(heading(), "Activation isn’t available");
});

test("a member sent to sign in again finds the activation link on the account page once signed in", async (t) => {
  let signedIn = false;
  t.mock.method(globalThis, "fetch", async () => json({ success: true, data: signedIn
    ? { state: "activation_required", passkeys: "none", credentials: [], freshSession: true } : { state: "signed_out" } }));
  const signOut = t.mock.fn(async () => undefined);
  ui.render(<EnglishMessages><WalletActivation initialView={{ state: "activation_required", passkeys: "none", credentials: [], freshSession: false }} client={{ signOut }} /></EnglishMessages>);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out and sign in again" }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(signOut.mock.callCount(), 1);
  assert.equal(dom.window.sessionStorage.getItem("sphmrs:wallet-activation-return"), "1");
  ui.cleanup();
  // The account page was rendered signed out; sign-in then happens in place.
  ui.render(<EnglishMessages><WalletActivationLink /></EnglishMessages>);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(ui.screen.queryByRole("link", { name: "Activate your membership" }), null);
  signedIn = true;
  dom.window.dispatchEvent(new dom.window.Event("focus"));
  assert.equal((await ui.screen.findByRole("link", { name: "Activate your membership" })).getAttribute("href"), "/account/activate");
  assert.equal(dom.window.sessionStorage.getItem("sphmrs:wallet-activation-return"), null, "the flag clears once the state is known");
});

test("the account page and both order confirmations link to activation", async (t) => {
  let view: WalletActivationView = { state: "activation_required", passkeys: "none", credentials: [], freshSession: true };
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => String(input).endsWith("/api/member/wallet/status")
    ? json({ success: true, data: view }) : json({ success: true, data: { orderId: "019a313f-c922-7000-8000-000000000001", status: "paid" } }));
  for (const next of [view, { state: "approval_pending", credentials: [], freshSession: true }] as WalletActivationView[]) {
    view = next;
    ui.render(<EnglishMessages><WalletActivationLink /></EnglishMessages>);
    assert.equal((await ui.screen.findByRole("link", { name: "Activate your membership" })).getAttribute("href"), "/account/activate");
    ui.cleanup();
  }
  for (const next of [{ state: "signed_out" }, { state: "key_issued" }, { state: "not_eligible" }] as WalletActivationView[]) {
    view = next;
    const { container } = ui.render(<EnglishMessages><WalletActivationLink /></EnglishMessages>);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(container.childElementCount, 0, next.state);
    ui.cleanup();
  }
  const account = readFileSync(new URL("../../../src/app/(site)/account/page.tsx", import.meta.url), "utf8");
  assert.match(account, /<WalletActivationLink \/>/);

  ui.render(<EnglishMessages><Result paymentId="019a313fc92270008000000000000001" /></EnglishMessages>);
  await ui.screen.findByText("Payment confirmed");
  assert.equal(ui.screen.getByRole("link", { name: "Activate your membership" }).getAttribute("href"), "/account/activate");
  assert.ok(ui.screen.getByText(/You can do this now or later/));
  const shop = readFileSync(new URL("../../../src/components/commerce/payment.tsx", import.meta.url), "utf8");
  assert.match(shop, /href="\/account\/activate"[^>]*>\{activation\('accountLink'\)\}/);
});
