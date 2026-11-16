import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";
import { MemberAuthActionError } from "@/lib/member-auth/client";

// ADR-0013: the welcome page works for any signed-in member, with or without
// passkeys. Its one action registers an ordinary sign-in passkey through the
// member client (better-auth's passkey plugin); nothing binds a wallet owner.

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Welcome: typeof import("@/components/membership/welcome").Welcome;
let WelcomeLink: typeof import("@/components/membership/welcome").WelcomeLink;
const previous = new Map<string, PropertyDescriptor | undefined>();

function install(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const supportPasskeys = () =>
  Object.defineProperty(dom.window, "PublicKeyCredential", {
    configurable: true,
    value: function PublicKeyCredential() {}
  });

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/welcome"
  });
  for (const key of ["window", "document", "navigator", "HTMLElement", "Node", "MutationObserver", "Event", "DOMException"])
    install(key, key === "window" ? dom.window : dom.window[key as keyof typeof dom.window]);
  install("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  ({ Welcome, WelcomeLink } = await import("@/components/membership/welcome"));
});
afterEach(() => {
  ui.cleanup();
  Reflect.deleteProperty(dom.window, "PublicKeyCredential");
});
after(() => {
  dom.window.close();
  for (const [key, value] of previous)
    value ? Object.defineProperty(globalThis, key, value) : Reflect.deleteProperty(globalThis, key);
});

const welcome = (extra: Partial<Extract<WelcomeView, { state: "welcome" }>> = {}): WelcomeView => ({
  state: "welcome",
  signet: "pending",
  passkeys: 0,
  canAddPasskey: true,
  ...extra
});
function render(view: WelcomeView, addPasskey: () => Promise<void> = async () => undefined) {
  const calls: number[] = [];
  const client = { addPasskey: async () => { calls.push(1); await addPasskey(); } };
  ui.render(
    <EnglishMessages>
      <Welcome initialView={view} client={client} />
    </EnglishMessages>
  );
  return calls;
}
const text = () => document.body.textContent ?? "";
const status = () => ui.screen.getByRole("status").textContent;

test("every state renders with its next step", () => {
  const cases: [WelcomeView, RegExp, string | null][] = [
    [{ state: "signed_out" }, /Sign in to see your membership\./, "Sign in"],
    [{ state: "unavailable" }, /We couldn’t load your membership/, null],
    [welcome({ signet: "pending" }), /Your Signet is on its way\./, null],
    [welcome({ signet: "issued" }), /Your Signet has been issued\./, null],
    [welcome({ signet: "on_hold" }), /Your Signet is on hold/, null],
    [welcome({ signet: "none" }), /doesn’t have a membership yet/, null]
  ];
  for (const [view, body, link] of cases) {
    render(view);
    assert.match(text(), body, view.state);
    if (link) assert.equal(ui.screen.getByRole("link", { name: link }).getAttribute("href"), "/account");
    ui.cleanup();
  }
  render({ state: "unavailable" });
  assert.ok(ui.screen.getByRole("button", { name: "Try again" }));
});

test("a member without passkeys can add a sign-in passkey on this phone", async () => {
  supportPasskeys();
  const calls = render(welcome());
  assert.match(text(), /Your phone goes everywhere with you/);
  assert.doesNotMatch(text(), /You already have a passkey/);
  await ui.act(async () => ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add a passkey" })));
  assert.equal(calls.length, 1);
  assert.equal(status(), "Passkey added. You can use it to sign in.");
  assert.match(text(), /You already have a passkey/, "the count moves on after adding one");
});

test("a member who already has passkeys is told to add one here if theirs is elsewhere", () => {
  render(welcome({ passkeys: 2 }));
  assert.match(text(), /You already have a passkey\. If it’s on another device/);
  assert.ok(ui.screen.getByRole("button", { name: "Add a passkey" }));
});

test("a signed-in member who can't add a passkey yet is sent to finish setup, with nothing to press here", () => {
  render(welcome({ canAddPasskey: false }));
  assert.equal(ui.screen.queryByRole("button", { name: "Add a passkey" }) === null, true);
  assert.equal(ui.screen.getByRole("link", { name: "Finish setting up your account" }).getAttribute("href"), "/account");
});

test("each add-passkey outcome reads in the reserved status slot; an unknown result stays unknown", async () => {
  supportPasskeys();
  const outcomes: [MemberAuthActionError | Error, string][] = [
    [new MemberAuthActionError("passkey-cancelled"), "The passkey request was cancelled or timed out. Try again when you’re ready."],
    [new MemberAuthActionError("rate-limited"), "Too many attempts. Wait a few minutes, then try again."],
    [new MemberAuthActionError("timeout"), "We couldn’t confirm the passkey was added. Reload this page to check before you try again."],
    [new MemberAuthActionError("network"), "We couldn’t confirm the passkey was added. Reload this page to check before you try again."],
    [new MemberAuthActionError("unavailable"), "We couldn’t add the passkey. Try again."],
    [new Error("boom"), "We couldn’t add the passkey. Try again."]
  ];
  for (const [error, message] of outcomes) {
    render(welcome(), async () => { throw error; });
    await ui.act(async () => ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add a passkey" })));
    assert.equal(status(), message);
    assert.equal(ui.screen.getByRole("button", { name: "Add a passkey" }).hasAttribute("disabled"), false);
    ui.cleanup();
  }
});

test("a session that ended reads as signed out", async () => {
  supportPasskeys();
  render(welcome(), async () => { throw new MemberAuthActionError("unauthenticated"); });
  await ui.act(async () => ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add a passkey" })));
  assert.match(text(), /Sign in to see your membership\./);
});

test("a browser without passkeys is told so without a prompt", async () => {
  const calls = render(welcome());
  await ui.act(async () => ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add a passkey" })));
  assert.equal(calls.length, 0);
  assert.equal(status(), "This browser can’t use passkeys. Open this page in an up-to-date browser on your phone.");
});

test("while the prompt is open the button is busy and can't be pressed twice", async () => {
  supportPasskeys();
  let release!: () => void;
  const calls = render(welcome(), () => new Promise<void>((resolve) => { release = resolve; }));
  const button = () => ui.screen.getByRole("button", { name: /Add a passkey|Waiting for your passkey…/ });
  await ui.act(async () => ui.fireEvent.click(button()));
  assert.equal(button().textContent, "Waiting for your passkey…");
  assert.equal(button().hasAttribute("disabled"), true);
  await ui.act(async () => ui.fireEvent.click(button()));
  assert.equal(calls.length, 1);
  await ui.act(async () => release());
  assert.equal(status(), "Passkey added. You can use it to sign in.");
});

test("the account page links to the welcome page; the confirmation pages no longer carry an activation entry", () => {
  ui.render(<EnglishMessages><WelcomeLink /></EnglishMessages>);
  assert.equal(ui.screen.getByRole("link", { name: "Your membership" }).getAttribute("href"), "/welcome");
  assert.match(readFileSync("src/components/tickets/ticket-account-entry.tsx", "utf8"), /memberAction=\{welcomeLink \? <WelcomeLink \/> : undefined\}/);
  assert.match(readFileSync("src/app/(site)/account/page.tsx", "utf8"), /welcomeLink/);
  for (const file of ["src/components/commerce/payment.tsx", "src/components/tickets/portone-payment-result.tsx"])
    assert.doesNotMatch(readFileSync(file, "utf8"), /Activation|activate|welcome/i, file);
});

test("the passkey step registers an ordinary sign-in passkey through the shared member client", () => {
  const source = readFileSync("src/components/membership/welcome.tsx", "utf8");
  assert.match(source, /createMemberClient\(\)/);
  assert.doesNotMatch(source, /member\/wallet|navigator\.credentials|bind/);
  const client = readFileSync("src/lib/member-auth/client.ts", "utf8");
  assert.match(client, /auth\.passkey\.addPasskey\(/);
});
