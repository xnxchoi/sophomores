import messages from "../../messages/en.json";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";

let MemberAuthProviders: typeof import("./fixtures/providers").MemberAuthProviders;
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let View: typeof import("@/components/Authentication/member-auth/account-view").MemberAccountView;
let Phone: typeof import("@/components/Authentication/member-auth/phone-step").MemberPhoneStep;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/account",
    pretendToBeVisual: true
  });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  for (const key of [
    "window", "self",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "Element",
    "Node",
    "NodeFilter",
    "NodeList",
    "MutationObserver",
    "CustomEvent",
    "Event",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ]) {
    const value = (key === "window" || key === "self") ? win : win[key as keyof typeof win];
    globalValue(
      key,
      typeof value === "function" &&
        [
          "getComputedStyle",
          "requestAnimationFrame",
          "cancelAnimationFrame"
        ].includes(key)
        ? value.bind(win)
        : value
    );
  }
  win.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
    media: "",
    onchange: null
  });
  win.scrollTo = () => {};
  globalValue(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(win.HTMLElement.prototype, "scrollIntoView", {
    value() {}
  });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", {
    value() {
      return false;
    }
  });
  Object.defineProperty(win.HTMLElement.prototype, "setPointerCapture", {
    value() {}
  });
  Object.defineProperty(win.HTMLElement.prototype, "releasePointerCapture", {
    value() {}
  });
  MemberAuthProviders = (await import("./fixtures/providers")).MemberAuthProviders;
  ui = await import("@testing-library/react/pure");
  Study = (await import("@/components/Authentication/member-auth/account-study"))
    .MemberAccountStudy;
  View = (await import("@/components/Authentication/member-auth/account-view")).MemberAccountView;
  Phone = (await import("@/components/Authentication/member-auth/phone-step"))
    .MemberPhoneStep;
});
afterEach(() => ui.cleanup());

after(async () => {
  // Let unmounted Motion/Vaul animation cleanup settle before removing browser globals.
  await new Promise((resolve) => setTimeout(resolve, 250));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
function phoneServer(
  options: {
    verified?: boolean;
    lifetime?: number;
    failCreate?: boolean;
    failStatus?: boolean;
  } = {}
) {
  const calls: Array<[string, string, unknown]> = [];
  const challenge = {
    id: "dom-challenge",
    recipient: "verify@sophomores.co",
    body: "SPHMRS DOM-ONLY",
    expiresAt: new Date(
      Date.now() + (options.lifetime ?? 60_000)
    ).toISOString(),
    mode: "trial"
  };
  globalValue("fetch", async (path: string, init: RequestInit = {}) => {
    calls.push([path, init.method ?? "GET", init.body]);
    if (
      (options.failCreate && init.method === "POST") ||
      (options.failStatus && init.method === "GET")
    )
      throw Error("private network failure");
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    const data =
      init.method === "POST"
        ? challenge
        : {
            id: challenge.id,
            expiresAt: challenge.expiresAt,
            mode: "trial",
            state: options.verified ? "verified" : "pending"
          };
    return Response.json({ success: true, data });
  });
  return { calls, challenge };
}
async function startPhone() {
  ui.fireEvent.change(
    ui.screen.getByRole("textbox", { name: "Phone number" }),
    { target: { value: "01012345678" } }
  );
  ui.fireEvent.submit(
    ui.screen.getByRole("textbox", { name: "Phone number" }).closest("form")!
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Check status" }))
  );
}

test("registration challenge waits for the authoritative preparation gate", async () => {
  const server = phoneServer();
  let release!: (ready: boolean) => void;
  let preparations = 0;
  ui.render(<Phone busy={false} onPrepare={() => { preparations += 1; return new Promise(resolve => { release = resolve; }); }} onBind={() => {}} />, { wrapper: MemberAuthProviders });
  const input = ui.screen.getByRole("textbox", { name: "Phone number" });
  ui.fireEvent.change(input, { target: { value: "01012345678" } });
  ui.fireEvent.submit(input.closest("form")!);
  assert.equal(preparations, 1);
  assert.equal(server.calls.length, 0, "no phone challenge before fresh authentication status");
  await ui.act(async () => release(false));
  assert.equal(server.calls.length, 0, "failed preparation never creates a challenge");
  assert.equal((input as HTMLInputElement).value, "01012345678");
});

test("verified registration has one finish action inside the success composition", async () => {
  phoneServer({ verified: true });
  const bound: unknown[][] = [];
  ui.render(<Phone busy={false} onPrepare={async () => true} bindingError="Please try again." onBind={(...args) => bound.push(args)} />, { wrapper: MemberAuthProviders });
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Finish registration" })), true));
  const finish = ui.screen.getByRole("button", { name: "Finish registration" });
  assert.equal(Boolean(finish.closest('[data-trial-phase="verified"]')), true, "finish belongs to the shared verified phase, not an appended panel");
  const successHeading = document.getElementById("member-phone-heading")!;
  assert.equal(successHeading.classList.contains("justify-center"), true, "the compact verified cluster shares the action-column center");
  assert.equal(successHeading.classList.contains("pl-14"), false, "verified status does not retain input-form corner clearance");
  assert.equal(ui.screen.getAllByRole("button", { name: "Finish registration" }).length, 1);
  assert.equal(document.querySelector('[data-member-phone-binding-description]') === null, true);
  assert.equal(ui.screen.getAllByText("Please try again.").length, 1);
  assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Use a different phone" })), true);
  ui.fireEvent.click(finish);
  assert.deepEqual(bound, [["dom-challenge", "+821012345678"]]);
});

test("reauth proof invalidation keeps the entered phone but cannot reuse verified proof", async () => {
  const server = phoneServer({ verified: true });
  const props = { busy: false, onPrepare: async () => true, onBind: () => {} };
  const rendered = ui.render(<Phone {...props} proofResetKey={0} />, { wrapper: MemberAuthProviders });
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Finish registration" })), true));
  rendered.rerender(<Phone {...props} proofResetKey={1} />);
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
  const input = ui.screen.getByRole("textbox", { name: "Phone number" }) as HTMLInputElement;
  assert.equal(input.value, "01012345678");
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  assert.equal(server.calls.filter(([, method]) => method === "POST").length, 1, "reauth never creates a new challenge automatically");
});
const anonymous: MemberStatus = {
  phoneBindingAuth: "anonymous",
  authenticated: false,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities: { emailOtp: true, magicLink: true, google: true, passkey: true }
};
const active: MemberStatus = {
  ...anonymous,
  phoneBindingAuth: "ready",
  authenticated: true,
  emailVerified: true,
  phoneBound: true,
  member: true
};
function client() {
  let status = anonymous;
  const calls: Array<[string, ...unknown[]]> = [];
  const action =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  const value: MemberClient = {
    status: async () => {
      calls.push(["status"]);
      return status;
    },
    clearPhoneIdentifier: action("clear"),
    identifyPhone: action("identify"),
    sendEmailCode: action("code"),
    sendMagicLink: action("link"),
    signInGoogle: action("google"),
    verifyEmailCode: async (...args) => {
      calls.push(["verify", ...args]);
      status = { ...anonymous, authenticated: true, emailVerified: true };
    },
    signInPasskey: async () => {
      calls.push(["signin-passkey"]);
      status = active;
    },
    addPasskey: action("add-passkey"),
    bindPhone: async (...args) => {
      calls.push(["bind", ...args]);
      status = active;
    },
    signOut: async () => {
      calls.push(["signout"]);
      status = anonymous;
    }
  };
  return {
    value,
    calls,
    setStatus: (next: MemberStatus) => {
      status = next;
    }
  };
}

test("contextual reauth preserves the phone subtree on cancellation and invalidates proof only after explicit successful sign-in", async () => {
  const { MemberAuthActionError } = await import("@/lib/member-auth/client");
  const c = client();
  const ready: MemberStatus = { ...anonymous, authenticated: true, emailVerified: true, phoneBindingAuth: "ready" };
  c.setStatus(ready);
  c.value.bindPhone = async () => { throw new MemberAuthActionError("unauthenticated"); };
  c.value.signInPasskey = async () => { throw new MemberAuthActionError("passkey-cancelled"); };
  const server = phoneServer({ verified: true });
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Finish registration" })), true));
  const phoneNode = document.querySelector('[data-member-phone-step]')!;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Finish registration" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in again" })), true));
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  const recoveryHeading = ui.screen.getByRole("heading", { name: "Sign in again" });
  assert.equal(recoveryHeading.classList.contains("text-center"), true);
  assert.equal(recoveryHeading.classList.contains("text-[24px]"), true);
  assert.equal(recoveryHeading.classList.contains("sm:text-[24px]"), true, "recovery keeps the same 24px title size on desktop");
  assert.equal(recoveryHeading.classList.contains("pl-14"), false);
  const recoveryDescription = ui.screen.getByText(messages.MemberAuth.continueRegistrationAfterSigningIn);
  assert.equal(recoveryDescription.classList.contains("text-center"), true);
  assert.equal(recoveryDescription.classList.contains("pl-14"), false);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in again" }));
  assert.equal(document.querySelector('[data-member-phone-step]') === phoneNode, true);
  assert.equal(Boolean(phoneNode.closest('[hidden][inert]')), true);
  assert.equal(ui.screen.queryByText("Welcome") === null, true);
  assert.equal(c.calls.filter(([name]) => name === "code" || name === "signout").length, 0);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByText(messages.MemberAuth.failures["passkey-cancelled"])), true));
  assert.equal(document.querySelector('[data-member-phone-step]') === phoneNode, true);
  assert.equal(Boolean(document.querySelector('[data-trial-phase="verified"]')), true, "cancellation retains context without granting access to finish");
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  c.value.signInPasskey = async () => { c.setStatus({ ...ready }); };
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
  assert.equal(document.querySelector('[data-member-phone-step]') === phoneNode, true);
  assert.equal((ui.screen.getByRole("textbox", { name: "Phone number" }) as HTMLInputElement).value, "01012345678");
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  assert.equal(server.calls.filter(([, method]) => method === "POST").length, 1);
});

test("Google initiation cannot complete contextual reauthentication using a cached ready session", async () => {
  const { MemberAuthActionError } = await import("@/lib/member-auth/client");
  const c = client();
  const ready: MemberStatus = { ...anonymous, authenticated: true, emailVerified: true, phoneBindingAuth: "ready" };
  let statusRequests = 0;
  c.value.status = async () => { statusRequests += 1; return { ...ready }; };
  c.value.bindPhone = async () => { throw new MemberAuthActionError("unauthenticated"); };
  const server = phoneServer({ verified: true });
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Finish registration" })), true));
  const phoneNode = document.querySelector('[data-member-phone-step]')!;
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Finish registration" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in again" })), true));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in again" }));
  const priorRequests = statusRequests;
  // This fake resolves without navigating; OAuth has only been initiated.
  await ui.act(async () => { ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue with Google" })); });
  assert.equal(c.calls.filter(([name]) => name === "google").length, 1);
  assert.equal(statusRequests, priorRequests, "OAuth initiation must not fetch a ready flag as completion evidence");
  assert.equal(document.querySelector('[data-member-phone-step]') === phoneNode, true);
  assert.equal(Boolean(phoneNode.closest('[hidden][inert]')), true);
  assert.equal(Boolean(document.querySelector('[data-trial-phase="verified"]')), true, "the old proof stays hidden, not reset or reusable");
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  assert.equal(Boolean(document.querySelector('[data-member-registration-reauth]')), true);
  assert.equal(server.calls.filter(([, method]) => method === "POST").length, 1);
});

for (const focusLocation of ["reauth", "outside"] as const) {
  test(`successful reauth before a phone challenge restores focus only from the reauth panel: ${focusLocation}`, async () => {
    const c = client();
    let requests = 0;
    let signedInAgain = false;
    const ready: MemberStatus = { ...anonymous, authenticated: true, emailVerified: true, phoneBindingAuth: "ready" };
    c.value.status = async () => {
      requests += 1;
      return { ...ready, phoneBindingAuth: requests === 1 || signedInAgain ? "ready" : "reauth-required" };
    };
    c.value.signInPasskey = async () => { signedInAgain = true; };
    const server = phoneServer();
    ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
    const originalInput = ui.screen.getByRole("textbox", { name: "Phone number" });
    ui.fireEvent.change(originalInput, { target: { value: "01012345678" } });
    ui.fireEvent.submit(originalInput.closest("form")!);
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in again" })), true));
    assert.equal(server.calls.length, 0);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in again" }));
    const passkey = ui.screen.getByRole("button", { name: "Sign in with a passkey" });
    const outside = ui.screen.getByRole("button", { name: "Cancel" });
    if (focusLocation === "reauth") passkey.focus();
    else outside.focus();
    assert.equal(document.activeElement === (focusLocation === "reauth" ? passkey : outside), true, "focus starts at the intended in-scope control");
    {
      await ui.act(async () => { ui.fireEvent.click(passkey); });
      await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
      assert.equal(document.querySelector('[data-member-registration-reauth]') === null, true);
      assert.equal(ui.screen.getByRole("textbox", { name: "Phone number" }) === originalInput, true);
      assert.equal((originalInput as HTMLInputElement).value, "01012345678");
      assert.equal(server.calls.length, 0, "resuming phone entry requires a new explicit challenge submission");
      assert.equal(document.activeElement === (focusLocation === "reauth" ? document.getElementById("member-phone-heading") : outside), true);
    }
  });
}

for (const focusLocation of ["reauth", "outside"] as const) {
  test(`successful reauth invalidates verified proof without stealing outside focus: ${focusLocation}`, async () => {
    const { MemberAuthActionError } = await import("@/lib/member-auth/client");
    const c = client();
    const ready: MemberStatus = { ...anonymous, authenticated: true, emailVerified: true, phoneBindingAuth: "ready" };
    c.setStatus(ready);
    c.value.bindPhone = async () => { throw new MemberAuthActionError("unauthenticated"); };
    c.value.signInPasskey = async () => { c.setStatus({ ...ready }); };
    const server = phoneServer({ verified: true });
    ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
    await startPhone();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Finish registration" })), true));
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Finish registration" }));
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in again" })), true));
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in again" }));
    const passkey = ui.screen.getByRole("button", { name: "Sign in with a passkey" });
    const outside = ui.screen.getByRole("button", { name: "Cancel" });
    (focusLocation === "reauth" ? passkey : outside).focus();
    assert.equal(document.activeElement === (focusLocation === "reauth" ? passkey : outside), true);
    await ui.act(async () => { ui.fireEvent.click(passkey); });
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
    assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
    assert.equal(document.activeElement === (focusLocation === "reauth" ? document.getElementById("member-phone-heading") : outside), true);
    assert.equal(server.calls.filter(([, method]) => method === "POST").length, 1);
    // A later explicit challenge is a real step change and retains normal focus behavior.
    const phone = ui.screen.getByRole("textbox", { name: "Phone number" });
    await ui.act(async () => { ui.fireEvent.submit(phone.closest("form")!); });
    await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Check status" })), true));
    assert.equal(document.activeElement === document.getElementById("member-phone-heading"), true);
  });
}

test("contextual sign-in centers its own intro and suppresses only the stale binding failure", async () => {
  const { MemberAuthActionError } = await import("@/lib/member-auth/client");
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true, phoneBindingAuth: "ready" });
  const bindingFailure = new MemberAuthActionError("unauthenticated");
  c.value.bindPhone = async () => { throw bindingFailure; };
  c.value.signInPasskey = async () => { throw new MemberAuthActionError("network"); };
  phoneServer({ verified: true });
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("textbox", { name: "Phone number" })), true));
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Finish registration" })), true));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Finish registration" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("button", { name: "Sign in again" })), true));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in again" }));
  const intro = document.querySelector('[data-member-registration-reauth]')!;
  const heading = intro.querySelector('h2')!;
  assert.equal(heading.classList.contains("text-center"), true);
  assert.equal(heading.classList.contains("text-[24px]"), true);
  assert.equal(heading.classList.contains("sm:text-[24px]"), true);
  assert.equal(heading.classList.contains("pl-14"), false);
  const description = intro.querySelector("p")!;
  assert.equal(description.textContent, messages.MemberAuth.continueRegistrationAfterSigningIn);
  assert.equal(description.classList.contains("text-center"), true);
  assert.equal(description.classList.contains("pl-14"), false);
  assert.equal(intro.textContent?.includes(bindingFailure.message), false, "the explicit sign-in form does not repeat the old binding failure");
  assert.equal(ui.screen.queryByRole("alert") === null, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await ui.waitFor(() => assert.equal(Boolean(ui.screen.queryByRole("alert")), true));
  const message = ui.screen.getByRole("alert").textContent ?? "";
  assert.notEqual(message.trim(), "");
  assert.notEqual(message, bindingFailure.message, "a new authentication failure remains visible");
  assert.equal(Boolean(document.querySelector('[data-member-registration-reauth]')), true);
});
