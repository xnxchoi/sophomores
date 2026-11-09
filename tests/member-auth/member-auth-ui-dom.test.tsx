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
const anonymous: MemberStatus = {
  authenticated: false,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities: { emailOtp: true, magicLink: true, google: true, passkey: true }
};
const active: MemberStatus = {
  ...anonymous,
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
async function choose(
  name: "Log in" | "Sign up",
  c: ReturnType<typeof client>
) {
  const rendered = ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name }));
  await ui.waitFor(() =>
    assert.equal(
      (ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).disabled,
      false
    )
  );
  return rendered;
}
test("login requires explicit registration continuation for an incomplete authenticated account", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  const server = phoneServer();
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.queryByRole("heading", {
        name: "Finish setting up your account"
      })
    )
  );
  const setupHeading = ui.screen.getByRole("heading", {
    name: "Finish setting up your account"
  });
  for (const token of ["mt-0!", "mb-2!", "pl-14"]) {
    assert.ok(setupHeading.classList.contains(token), "the setup intro groups its title with the description while clearing the corner icon");
  }
  assert.equal(setupHeading.classList.contains("text-center"), false, "the title remains aligned with its body and primary action");
  assert.equal(setupHeading.classList.contains("pr-14"), false, "clearance follows the left-side dismissal control");
  const setupDescription = await ui.screen.findByText("Verify your phone to finish.");
  assert.ok(setupDescription.parentElement?.classList.contains("[&>p:first-child]:pl-14"), "the grouped setup instruction shares its heading's left clearance");
  assert.equal(setupDescription.classList.contains("text-center"), false);
  const setupSwitch = ui.screen.getByRole("button", { name: "Switch account" });
  assert.ok(setupSwitch.classList.contains("w-full"), "the setup intro centers its secondary footer across the content width");
  assert.ok(setupSwitch.classList.contains("justify-center"));
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.equal(document.querySelector("[data-member-phone-step]"), null);
  assert.equal(server.calls.length, 0);
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.queryByRole("button", { name: "Continue registration" })
    )
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Continue registration" })
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }))
  );
  assert.equal(ui.screen.getByRole("button", { name: "Switch account" }).classList.contains("w-full"), false,
    "the intro-only footer treatment must not change the phone form");
  const phoneHeading = ui.screen.getByRole("heading", { name: "Verify your phone to finish" });
  assert.equal(phoneHeading.classList.contains("mt-0!"), false);
  assert.equal(phoneHeading.classList.contains("mb-2!"), false);
  await ui.waitFor(() => assert.equal(document.activeElement?.id, "member-phone-heading"));
  assert.equal(
    server.calls.length,
    0,
    "continuing must not issue a challenge automatically"
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
  assert.equal(server.calls.length, 0, "closing must not create a phone challenge");
});

test("provider return defaults to an explicit setup gate, not automatic phone verification", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  const server = phoneServer();
  const route = await readFile(
    new URL("../../src/app/(site)/account/continue/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(route, /initialFlow="login"/);
  ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.queryByRole("heading", {
        name: "Finish setting up your account"
      })
    )
  );
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.equal(server.calls.length, 0);
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Switch account" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("heading", { name: "Log in" }))
  );
  assert.ok(c.calls.some(([name]) => name === "signout"));
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
});

test("Switch account clears the confirmed signup identity and retains only the same-address resend cooldown", async () => {
  const c = client();
  await choose("Sign up", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "previous@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  ui.fireEvent.change(ui.screen.getByLabelText(/^(?:Verification|Email) code$/), {
    target: { value: "A1B2C3" }
  });
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Switch account" })));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await ui.waitFor(() => {
    const email = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(email.value, "");
    assert.equal(email.disabled, false);
  });
  assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/) === null);
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "PREVIOUS@example.com" }
  });
  assert.equal(document.querySelector<HTMLButtonElement>("[data-phase-action=submit]")?.disabled, true);
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  assert.deepEqual(c.calls.filter(([name]) => name === "code"), [["code", "previous@example.com"]]);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "next@example.com" } });
  assert.equal(document.querySelector<HTMLButtonElement>("[data-phase-action=submit]")?.disabled, false);
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  await ui.screen.findByLabelText(/^(?:Verification|Email) code$/);
  assert.deepEqual(c.calls.filter(([name]) => name === "code"), [["code", "previous@example.com"], ["code", "next@example.com"]]);
});

test("ordinary login and sign-out never expose phone account lookup", async () => {
  const c = client();
  await choose("Log in", c);
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Sign out" })));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText("Email address")));
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
  assert.equal(c.calls.filter(([name]) => name === "identify").length, 0);
});

for (const failure of ["request", "authenticated-status", "status-request", "identifier-clear"] as const) {
  test(`Switch account preserves the identity until sign-out is confirmed: ${failure}`, async () => {
    const c = client();
    await choose("Log in", c);
    ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
      target: { value: "retained@example.com" }
    });
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Sign out" })));
    const signOut = c.value.signOut;
    const status = c.value.status;
    const clear = c.value.clearPhoneIdentifier;
    let release!: () => void;
    c.value.signOut = async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      if (failure === "request") throw Error("private sign-out failure");
      if (failure !== "authenticated-status") await signOut();
    };
    if (failure === "status-request") c.value.status = async () => { throw Error("private status failure"); };
    if (failure === "identifier-clear") c.value.clearPhoneIdentifier = async () => { throw Error("private clear failure"); };
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
    assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }));
    assert.ok(ui.screen.queryByLabelText("Email address") === null);
    await ui.act(async () => release());
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("alert")));
    assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }));
    assert.doesNotMatch(ui.screen.getByRole("alert").textContent!, /private/);
    c.value.status = status;
    c.value.clearPhoneIdentifier = clear;
    c.setStatus(anonymous);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Refresh account status" }));
    await ui.waitFor(() =>
      assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).value, "retained@example.com")
    );
  });
}

test("a disposed sign-out cannot clear the next flow's identity", async () => {
  const c = client();
  await choose("Log in", c);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Sign out" })));
  let release!: () => void;
  c.value.signOut = () => new Promise<void>((resolve) => { release = resolve; });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  c.setStatus(anonymous);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Open account options" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() =>
    assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).disabled, false)
  );
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "next-flow@example.com" }
  });
  await ui.act(async () => release());
  assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).value, "next-flow@example.com");
});

test("explicit signup resumes phone verification and Cancel returns directly to its caller", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  const server = phoneServer();
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }))
  );
  assert.ok(
    ui.screen.queryByRole("heading", { name: "Verify your phone to finish" })
  );
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.equal(
    document
      .querySelector("[data-verification-sheet]")
      ?.getAttribute("data-authentication-mode"),
    "focused"
  );
  assert.equal(
    server.calls.length,
    0,
    "resuming does not create a phone challenge"
  );
  assert.ok(
    c.calls.every(([name]) => name === "status"),
    "return uses only authoritative status reads"
  );

  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
});
test("authenticated returning member resumes the account screen without repeating signup", async () => {
  const c = client();
  c.setStatus(active);
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }))
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Add a passkey" }))
  );
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.ok(c.calls.every(([name]) => name === "status"));
});
test("anonymous direct continuation never grants authentication or membership", async () => {
  const c = client();
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await ui.waitFor(() =>
    assert.equal(
      (ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).disabled,
      false
    )
  );
  assert.ok(ui.screen.queryByRole("heading", { name: "Create your account" }));
  assert.equal(
    ui.screen.queryByRole("heading", { name: "Account ready" }),
    null
  );
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.ok(c.calls.every(([name]) => ["status", "clear"].includes(name)));
});
test("Cancel during continuation disposes a late authenticated status response", async () => {
  const c = client();
  let resolve!: (status: MemberStatus) => void;
  c.value.status = () =>
    new Promise((done) => {
      resolve = done;
    });
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  assert.equal(document.querySelector("[data-phase-action=submit]")?.getAttribute("aria-busy"), "false");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.act(async () => resolve(active));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }));
  assert.equal(
    ui.screen.queryByRole("heading", { name: "Account ready" }),
    null
  );
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.equal(
    c.calls.length,
    0,
    "disposed continuation never clears selector state"
  );
});
test("one Vaul surface morphs from dismissible chooser to locked flow; Cancel clears private input", async () => {
  const c = client();
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  const surface = document.querySelector("[data-verification-sheet]");
  assert.ok(surface, "account begins inside the existing Vaul shell");
  assert.equal(surface.getAttribute("data-authentication-mode"), "chooser");
  assert.equal(
    c.calls.length,
    0,
    "chooser does not initialize a credential session"
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/)));
  assert.ok(document.querySelector("[data-verification-sheet]") === surface);
  assert.equal(surface.getAttribute("data-authentication-mode"), "focused");
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "private@example.com" }
  });
  ui.fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
  assert.equal(surface.getAttribute("data-authentication-mode"), "focused");
  assert.equal(
    ui.screen
      .getByRole("button", { name: "Close account options", hidden: true })
      .hasAttribute("disabled"),
    true
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  assert.equal(surface.getAttribute("data-authentication-mode"), "chooser");
  assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign up" }));
  await ui.waitFor(() =>
    assert.equal(
      (ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).value,
      ""
    )
  );
});
test("chooser closes and reopens while focused account actions preserve real email-code state", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Close account options" })
  );
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("dialog") === null));
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Open account options" })
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  await ui.waitFor(() =>
    assert.equal(
      (ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).disabled,
      false
    )
  );
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "member@gmail.com" }
  });
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Continue with Google" })
  );
  await ui.waitFor(() =>
    assert.ok(c.calls.some(([name]) => name === "google"))
  );
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  ui.fireEvent.change(ui.screen.getByLabelText(/^(?:Verification|Email) code$/), {
    target: { value: "a1b2c" }
  });
  assert.equal(
    (ui.screen.getByLabelText(/^(?:Verification|Email) code$/) as HTMLInputElement).value,
    "A1B2C"
  );
  now += 31_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: /Send (?:a )?new code/ })
  );
  await ui.waitFor(() =>
    assert.equal(c.calls.filter(([name]) => name === "code").length, 2)
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Change email" }));
  assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/) === null);
  now += 31_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  ui.fireEvent.change(ui.screen.getByLabelText(/^(?:Verification|Email) code$/), {
    target: { value: "D4E5F6" }
  });
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.queryByRole("heading", {
        name: "Finish setting up your account"
      })
    )
  );
  assert.ok(
    c.calls.some(
      ([name, email, code]) =>
        name === "verify" &&
        email === "member@gmail.com" &&
        code === "D4E5F6"
    )
  );
});
test("completing an email code verifies once, exposes pending and failure, and retries only after editing", async () => {
  const c = client();
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  c.value.verifyEmailCode = (...args) => {
    c.calls.push(["verify", ...args]);
    return new Promise<void>((done, fail) => {
      resolve = done;
      reject = fail;
    });
  };
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  const input = ui.screen.getByLabelText(/^(?:Verification|Email) code$/) as HTMLInputElement;
  ui.fireEvent.change(input, { target: { value: "a1b2c" } });
  ui.fireEvent.submit(input.closest("form")!);
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 0);
  ui.fireEvent.change(input, { target: { value: "a1b2c3" } });
  assert.deepEqual(c.calls.filter(([name]) => name === "verify"), [
    ["verify", "member@example.com", "A1B2C3"]
  ]);
  assert.ok(ui.screen.queryByRole("button", { name: "Verifying code…" }));
  assert.equal(input.disabled, true);
  assert.equal(
    document.querySelector("[data-phase-action=submit]")?.getAttribute("aria-busy"),
    "true"
  );
  ui.fireEvent.submit(input.closest("form")!);
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  await ui.act(async () => reject(Error("private invalid code")));
  assert.ok(ui.screen.queryByRole("alert"));
  assert.doesNotMatch(document.body.textContent!, /private invalid code/);
  assert.equal(input.disabled, false);
  assert.equal(
    document.querySelector("[data-phase-action=submit]")?.getAttribute("aria-busy"),
    "false"
  );
  await ui.act(async () => {});
  ui.fireEvent.change(input, { target: { value: "A1B2C3!" } });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  ui.fireEvent.change(input, { target: { value: "D4E5F" } });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  ui.fireEvent.change(input, { target: { value: "D4E5F6" } });
  assert.deepEqual(c.calls.filter(([name]) => name === "verify"), [
    ["verify", "member@example.com", "A1B2C3"],
    ["verify", "member@example.com", "D4E5F6"]
  ]);
  await ui.act(async () => reject(Error("still invalid")));
  assert.ok(ui.screen.queryByRole("button", { name: "Verify code" }));
  ui.fireEvent.change(input, { target: { value: "X7Y8Z9" } });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 2);
  ui.fireEvent.change(input, { target: { value: "X7Y8Z" } });
  ui.fireEvent.change(input, { target: { value: "X7Y8Z9" } });
  assert.deepEqual(c.calls.filter(([name]) => name === "verify").at(-1), [
    "verify", "member@example.com", "X7Y8Z9"
  ]);
  await ui.act(async () => reject(Error("temporary failure")));
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 3);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Verify code" }));
  assert.deepEqual(c.calls.filter(([name]) => name === "verify").at(-1), [
    "verify", "member@example.com", "X7Y8Z9"
  ]);
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  await ui.act(async () => resolve());
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("heading", { name: "Finish setting up your account" }))
  );
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 4);
});
test("Cancel disposes an automatic code verification before its late result", async () => {
  const c = client();
  let resolve!: () => void;
  c.value.verifyEmailCode = (...args) => {
    c.calls.push(["verify", ...args]);
    return new Promise<void>((done) => { resolve = done; });
  };
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "private@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  ui.fireEvent.change(ui.screen.getByLabelText(/^(?:Verification|Email) code$/), {
    target: { value: "A1B2C3" }
  });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  c.setStatus(active);
  await ui.act(async () => resolve());
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }));
  assert.ok(!ui.screen.queryByRole("heading", { name: "Account ready" }));
  assert.ok(!ui.screen.queryByLabelText(/^(?:Verification|Email) code$/));
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
});
test("passkey failure preserves the email fallback without introducing phone lookup", async () => {
  const c = client();
  c.value.signInPasskey = async () => { throw Error("private credential cancelled"); };
  await choose("Log in", c);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("alert").textContent!, /Sign-in is unavailable/));
  assert.doesNotMatch(document.body.textContent!, /private credential/);
  assert.ok(ui.screen.queryByLabelText("Email address"));
  assert.ok(ui.screen.queryByRole("button", { name: "More options" }) === null);
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null);
  assert.equal(c.calls.filter(([name]) => name === "identify").length, 0);
});
test("returning passkey member can add passkey and sign out without routine refresh clutter", async () => {
  const c = client();
  await choose("Log in", c);
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Sign in with a passkey" })
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Add a passkey" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add a passkey" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByText("Passkey added to this local account."))
  );
  assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null);
  await ui.waitFor(() =>
    assert.equal(
      ui.screen
        .getByRole("button", { name: "Sign out" })
        .hasAttribute("disabled"),
      false
    )
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/)));
  assert.ok(c.calls.some(([name]) => name === "add-passkey"));
  assert.ok(c.calls.some(([name]) => name === "signout"));
});
test("leaving a flow disposes pending requests so a late result cannot restore private state", async () => {
  const c = client();
  let resolve!: (status: MemberStatus) => void;
  c.value.status = () =>
    new Promise((done) => {
      resolve = done;
    });
  const rendered = ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  assert.equal(document.querySelector("[data-phase-action=submit]")?.getAttribute("aria-busy"), "false");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.act(async () => resolve(active));
  assert.equal(ui.screen.queryByText("Account ready"), null);
  assert.equal(
    c.calls.length,
    0,
    "disposed initialization never clears a later browser intent"
  );
  rendered.unmount();
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
test("phone UI starts only by explicit submission, refreshes real proof and binds the captured normalized phone", async () => {
  const server = phoneServer({ verified: true });
  const bound: unknown[][] = [];
  ui.render(<Phone busy={false} onBind={(...args) => bound.push(args)} />, { wrapper: MemberAuthProviders });
  assert.equal(server.calls.length, 0);
  await startPhone();
  assert.deepEqual(JSON.parse(server.calls[0][2] as string), {
    phone: "+821012345678"
  });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Finish registration" })
  );
  assert.deepEqual(bound, [[server.challenge.id, "+821012345678"]]);
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Start again" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Start again" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }))
  );
  assert.equal(
    ui.screen.queryByRole("button", { name: "Finish registration" }),
    null
  );
  assert.ok(server.calls.some(([, method]) => method === "DELETE"));
});
test("phone UI refuses elapsed proof at click-time, even before the expiry timer runs", async () => {
  const server = phoneServer({ verified: true });
  let binds = 0;
  ui.render(
    <Phone
      busy={false}
      onBind={() => {
        binds++;
      }}
    />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  const original = Date.now;
  try {
    Date.now = () => Date.parse(server.challenge.expiresAt) + 1;
    ui.fireEvent.click(
      ui.screen.getByRole("button", { name: "Finish registration" })
    );
  } finally {
    Date.now = original;
  }
  assert.equal(binds, 0);
  assert.match(
    ui.screen.getByText(/phone proof expired/).textContent!,
    /Start a new challenge/
  );
  assert.ok(
    ui.screen
      .getByRole("button", { name: "Finish registration" })
      .hasAttribute("disabled")
  );
});
test("phone UI timer expires verified proof and pending challenge without granting membership", async () => {
  phoneServer({ verified: true, lifetime: 600 });
  const first = ui.render(
    <Phone busy={false} onBind={() => assert.fail("expired proof bound")} />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  await ui.waitFor(
    () => assert.ok(ui.screen.queryByText(/phone proof expired/)),
    { timeout: 1500 }
  );
  await ui.waitFor(() => {
    assert.ok(ui.screen.getByRole("heading", { name: "Verification expired" }));
    assert.equal(
      ui.screen.queryByRole("heading", { name: "Phone verified" }),
      null
    );
    assert.equal(
      ui.screen.queryByText("Message verified", { exact: true }),
      null
    );
  });
  assert.equal(
    (
      ui.screen.getByRole("button", {
        name: "Finish registration"
      }) as HTMLButtonElement
    ).disabled,
    true
  );
  first.unmount();
  phoneServer({ lifetime: 600 });
  ui.render(
    <Phone busy={false} onBind={() => assert.fail("pending challenge bound")} />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  await ui.waitFor(
    () => assert.ok(ui.screen.queryByText("Verification expired")),
    {
      timeout: 2000
    }
  );
  assert.equal(
    ui.screen.queryByRole("button", { name: "Finish registration" }),
    null
  );
});
test("phone UI handles network errors truthfully and cancels on disposal", async () => {
  phoneServer({ failCreate: true });
  const first = ui.render(
    <Phone busy={false} onBind={() => assert.fail("failed challenge bound")} />, { wrapper: MemberAuthProviders }
  );
  ui.fireEvent.change(
    ui.screen.getByRole("textbox", { name: "Phone number" }),
    { target: { value: "01012345678" } }
  );
  ui.fireEvent.submit(
    ui.screen.getByRole("textbox", { name: "Phone number" }).closest("form")!
  );
  await ui.waitFor(() =>
    assert.match(ui.screen.getByRole("alert").textContent!, /couldn't prepare/)
  );
  assert.doesNotMatch(document.body.textContent!, /private network failure/);
  first.unmount();
  const server = phoneServer({ failStatus: true });
  const second = ui.render(
    <Phone
      busy={false}
      onBind={() => assert.fail("unconfirmed challenge bound")}
    />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() =>
    assert.match(ui.screen.getByRole("alert").textContent!, /couldn't check/)
  );
  second.unmount();
  await ui.waitFor(() =>
    assert.ok(server.calls.some(([, method]) => method === "DELETE"))
  );
});

test("pending account completes phone verification then refreshes server-confirmed membership", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  phoneServer({ verified: true });
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign up" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }))
  );
  const accountHeading = ui.screen.getByRole("heading", {
    name: "Verify your phone to finish"
  });
  assert.ok(
    accountHeading.classList.contains("sr-only"),
    "account label remains accessible without duplicating the embedded primary heading"
  );
  assert.equal(
    ui.screen
      .getAllByRole("heading")
      .filter((heading) => !heading.classList.contains("sr-only")).length,
    1
  );
  const phoneSurface = document.querySelector("[data-member-phone-step]");
  assert.ok(phoneSurface, "embedded verifier has an owned layout context");
  assert.equal(
    phoneSurface.classList.contains("border"),
    false,
    "no nested phone card chrome"
  );
  assert.ok(
    phoneSurface.className.includes("[&>section]:!px-0"),
    "embedded shared panel uses the outer account padding only"
  );
  assert.equal(
    ui.screen.queryByText("Email confirmed. Verify your phone to finish."),
    null
  );
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }));
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Finish registration" })
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Add a passkey" }))
  );
  assert.ok(
    c.calls.some(
      ([name, id, phone]) =>
        name === "bind" && id === "dom-challenge" && phone === "+821012345678"
    )
  );
  assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }));
});

test("entry alternatives are compact peer actions without a disclosure or phone lookup", async () => {
  const c = client();
  await choose("Log in", c);
  assert.ok(ui.screen.queryByRole("button", { name: "More options" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null);
  const row = document.querySelector("[data-account-entry-alternatives]");
  assert.equal(row?.querySelectorAll("button").length, 2);
  assert.equal(ui.screen.getAllByRole("button", { name: "Continue with Google" }).length, 1);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue with Google" }));
  await ui.waitFor(() => assert.equal(c.calls.filter(([name]) => name === "google").length, 1));
  assert.equal(c.calls.filter(([name]) => name === "code" || name === "link" || name === "identify").length, 0);
});

test("code-stage sign-in link honors shared cooldown and replaces code instructions", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "member@example.com" } });
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/)));
  const magic = ui.screen.getByRole("button", { name: "Email a sign-in link instead" }) as HTMLButtonElement;
  assert.equal(magic.disabled, true);
  ui.fireEvent.click(magic);
  assert.equal(c.calls.filter(([name]) => name === "link").length, 0);
  now += 31_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  assert.equal(magic.disabled, false);
  ui.fireEvent.click(magic);
  await ui.waitFor(() => assert.ok(ui.screen.queryByText(/Check your inbox for a sign-in link/)));
  assert.ok(c.calls.some(([name, email]) => name === "link" && email === "member@example.com"));
  assert.ok(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  assert.equal(ui.screen.queryByText(/Enter the code sent/), null);
  assert.ok(ui.screen.queryByLabelText("Email address"));
});

test("signup exposes the email-link alternative only after requesting an email code", async () => {
  const c = client();
  await choose("Sign up", c);
  assert.ok(ui.screen.queryByRole("button", { name: "Sign in with a passkey" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "new@example.com" } });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" })));
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
});


test("recovery remains available after a nonbusy status failure but disables during pending work", async () => {
  const { emptyMemberSnapshot } = await import("@/components/Authentication/member-auth/_shared/session");
  let recoveries = 0;
  const props = {
    snapshot: { ...emptyMemberSnapshot, status: null, busy: false, error: "Account status is unavailable.", failure: "unavailable" as const },
    identifierMode: "email" as const,
    flow: "login" as const,
    email: "member@example.com", phone: "", otp: "", phoneStep: null,
    onRecover: () => { recoveries += 1; },
    onContinueRegistration: () => {}, onPasskey: () => {}, onGoogle: () => {},
    onCode: () => {}, onLink: () => {}, onVerify: () => {}, onEditEmail: () => {},
    onIdentifier: () => {}, onClearIdentifier: () => {}, onAddPasskey: () => {},
    onSignOut: () => {}, onRefresh: () => {}, onMode: () => {}, onEmail: () => {},
    onPhone: () => {}, onOtp: () => {}
  };
  const rendered = ui.render(<View {...props} />, { wrapper: MemberAuthProviders });
  const recovery = ui.screen.getByRole("button", { name: "Can’t sign in?" }) as HTMLButtonElement;
  assert.equal(recovery.type, "button");
  assert.equal(recovery.disabled, false, "review intake does not depend on authentication status");
  assert.equal(document.querySelector<HTMLButtonElement>("[data-phase-action=submit]")?.disabled, true, "credential actions remain gated without status");
  ui.fireEvent.click(recovery);
  assert.equal(recoveries, 1);
  rendered.rerender(<View {...props} snapshot={{ ...props.snapshot, busy: true, pendingAction: "send-code" }} />);
  assert.equal(recovery.disabled, true);
  ui.fireEvent.click(recovery);
  assert.equal(recoveries, 1);
});


test("account phase commits destination heading and body in one immediate replacement", async () => {
  const { emptyMemberSnapshot } = await import("@/components/Authentication/member-auth/_shared/session");
  const setup = { ...anonymous, authenticated: true, emailVerified: true };
  const noop = () => {};
  const props = {
    snapshot: { ...emptyMemberSnapshot, status: setup },
    identifierMode: "email" as const, flow: "login" as const,
    email: "member@example.com", phone: "", otp: "",
    phoneStep: <label>Phone phase<input aria-label="Phone phase" defaultValue="01012345678" /></label>,
    onContinueRegistration: noop, onPasskey: noop, onGoogle: noop,
    onCode: noop, onLink: noop, onVerify: noop, onEditEmail: noop,
    onIdentifier: noop, onClearIdentifier: noop, onAddPasskey: noop,
    onSignOut: noop, onRefresh: noop, onMode: noop, onEmail: noop,
    onPhone: noop, onOtp: noop
  };
  const rendered = ui.render(<View {...props} />, { wrapper: MemberAuthProviders });
  const oldHeading = ui.screen.getByRole("heading", { name: "Finish setting up your account" });
  const oldAction = ui.screen.getByRole("button", { name: "Continue registration" });
  rendered.rerender(<View {...props} registrationRequested />);
  assert.equal(oldAction.isConnected, false, "old body must not wait for an exit before the destination mounts");
  assert.equal(oldHeading.isConnected, false, "the heading replaces atomically with its phase body");
  const input = ui.screen.getByLabelText("Phone phase") as HTMLInputElement;
  const phoneHeading = document.getElementById("member-account-heading")!;
  assert.ok(phoneHeading.closest("[data-member-account-phase]")?.contains(input), "one keyed phase owns heading and body");
  input.focus();
  rendered.rerender(<View {...props} registrationRequested snapshot={{ ...props.snapshot, busy: true }} />);
  assert.ok(ui.screen.getByLabelText("Phone phase") === input, "same-phase updates retain the mounted input");
  assert.equal(input.value, "01012345678");
  assert.ok(document.activeElement === input);
  rendered.rerender(<View {...props} snapshot={{ ...props.snapshot, status: active }} />);
  assert.equal(input.isConnected, false);
  assert.ok(ui.screen.getByRole("heading", { name: "Account ready" }));
  assert.ok(ui.screen.getByText("Email and phone confirmed."));
  assert.ok(ui.screen.queryByRole("button", { name: "Continue registration" }) === null);
});

test("inline authentication feedback changes natural height without a nested height animation", async () => {
  const { emptyMemberSnapshot } = await import("@/components/Authentication/member-auth/_shared/session");
  const noop = () => {};
  const props = {
    snapshot: { ...emptyMemberSnapshot, status: anonymous },
    identifierMode: "email" as const, flow: "login" as const,
    headingId: "atomic-feedback", email: "member@example.com", phone: "", otp: "", phoneStep: null,
    onContinueRegistration: noop, onPasskey: noop, onGoogle: noop,
    onCode: noop, onLink: noop, onVerify: noop, onEditEmail: noop,
    onIdentifier: noop, onClearIdentifier: noop, onAddPasskey: noop,
    onSignOut: noop, onRefresh: noop, onMode: noop, onEmail: noop,
    onPhone: noop, onOtp: noop
  };
  const rendered = ui.render(<View {...props} />, { wrapper: MemberAuthProviders });
  const input = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  input.focus();
  const feedback = document.getElementById("atomic-feedback-feedback")!;
  assert.equal(feedback.style.height, "", "hidden feedback must not introduce its own intrinsic-height tween");
  rendered.rerender(<View {...props} snapshot={{ ...props.snapshot, failure: "delivery-failed", error: "Mail unavailable" }} />);
  assert.equal(feedback.style.height, "", "visible feedback leaves geometry to the owning surface");
  assert.ok(ui.screen.getByRole("alert"));
  assert.ok(ui.screen.getByLabelText("Email address") === input);
  assert.ok(document.activeElement === input);
  assert.equal(input.value, "member@example.com");
});


test("status retry keeps its action, feedback slot and input mounted through its own pending request", async () => {
  const c = client();
  await choose("Log in", c);
  const input = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  ui.fireEvent.change(input, { target: { value: "retained@example.com" } });
  c.value.sendEmailCode = async () => { throw new Error("Private delivery outage"); };
  ui.fireEvent.submit(input.closest("form")!);
  await ui.screen.findByRole("button", { name: "Refresh account status" });
  const retry = ui.screen.getByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
  const feedback = document.getElementById(input.getAttribute("aria-describedby")!)!;
  const icon = retry.querySelector<HTMLElement>("[data-account-refresh-icon]");
  assert.ok(retry.classList.contains("size-11"), "inline retry is a full 44px fine-pointer icon action");
  assert.equal(retry.classList.contains("underline"), false);
  assert.ok(icon?.classList.contains("size-4"), "the idle and busy icons share one fixed footprint");
  assert.ok(icon?.querySelector(".lucide-refresh-cw"));
  assert.ok(feedback.parentElement?.classList.contains("min-h-11"), "the fixed-size inline action anchors its compact feedback row");
  let reject!: (error: Error) => void;
  let calls = 0;
  c.value.status = () => { calls += 1; return new Promise((_resolve, fail) => { reject = fail; }); };
  input.focus();
  ui.fireEvent.click(retry);
  assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === retry, "retry must not disappear while its request clears the previous error");
  assert.equal(retry.disabled, true);
  assert.equal(retry.getAttribute("aria-busy"), "true");
  const pendingStatus = ui.screen.getByRole("status");
  assert.ok(pendingStatus.closest('[aria-busy="true"]') === null, "assistive technology must receive pending status outside the busy subtree");
  assert.match(pendingStatus.textContent!, /Checking sign-in options/);
  const primary = document.querySelector<HTMLButtonElement>("[data-phase-action=submit]")!;
  assert.equal(primary.textContent?.trim(), "Continue", "a status refresh must not relabel the unrelated primary action");
  assert.ok(primary.querySelector("svg") === null, "only the initiating refresh control spins");
  assert.equal(primary.disabled, true, "credential submission stays locked during the status request");
  assert.ok(retry.querySelector("[data-account-refresh-icon]") === icon);
  assert.ok(icon?.querySelector(".lucide-loader-circle"));
  assert.ok(feedback.isConnected && feedback.parentElement?.classList.contains("min-h-11"));
  assert.equal(feedback.classList.contains("sr-only"), false);
  assert.ok(ui.screen.queryByRole("alert") === null, "the previous outage is not announced during the fresh request");
  assert.ok(ui.screen.getByLabelText("Email address") === input);
  assert.equal(input.value, "retained@example.com");
  assert.ok(document.activeElement === input);
  ui.fireEvent.click(retry);
  assert.equal(calls, 1, "disabled retry cannot issue a duplicate status request");
  await ui.act(async () => reject(new Error("Private status outage")));
  await ui.waitFor(() => assert.equal(retry.disabled, false));
  assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === retry);
  assert.equal(retry.getAttribute("aria-busy"), "false");
  assert.ok(icon?.querySelector(".lucide-refresh-cw"));
  assert.ok(ui.screen.getByRole("alert"));
  assert.ok(ui.screen.getByLabelText("Email address") === input);
  assert.equal(input.value, "retained@example.com");
  c.value.status = async () => anonymous;
  ui.fireEvent.click(retry);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null));
  assert.equal(feedback.parentElement?.classList.contains("min-h-11"), false, "irrelevant outage space collapses after recovery");
  assert.equal(feedback.classList.contains("sr-only"), true);
  assert.ok(ui.screen.getByLabelText("Email address") === input);
});

test("a disposed status retry cannot clear a later flow's pending retry", async () => {
  const c = client();
  c.value.sendEmailCode = async () => { throw new Error("Private delivery outage"); };
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "first@example.com" } });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  const first = await ui.screen.findByRole("button", { name: "Refresh account status" });
  let oldReject!: (error: Error) => void;
  c.value.status = () => new Promise((_resolve, reject) => { oldReject = reject; });
  ui.fireEvent.click(first);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  c.value.status = async () => anonymous;
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const input = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(input.disabled, false));
  ui.fireEvent.change(input, { target: { value: "next@example.com" } });
  ui.fireEvent.submit(input.closest("form")!);
  const next = await ui.screen.findByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
  let release!: (status: MemberStatus) => void;
  c.value.status = () => new Promise((resolve) => { release = resolve; });
  ui.fireEvent.click(next);
  await ui.act(async () => oldReject(new Error("Disposed request failed")));
  assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === next);
  assert.equal(next.disabled, true);
  assert.equal(next.getAttribute("aria-busy"), "true", "disposed lifetime cannot clear the next retry state");
  assert.equal(input.value, "next@example.com");
  await ui.act(async () => release(anonymous));
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null));
});


test("capability outage feedback keeps the same compact slot during refresh and failure", async () => {
  const c = client();
  c.setStatus({ ...anonymous, capabilities: { ...anonymous.capabilities, emailOtp: false } });
  const rendered = ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  const retry = await ui.screen.findByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
  const input = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  const feedback = document.getElementById(input.getAttribute("aria-describedby")!)!;
  assert.ok(feedback.parentElement?.classList.contains("min-h-11"), "capability outages share the same phase-owned status slot as request failures");
  assert.match(feedback.textContent!, /Email sign-in is unavailable/);
  assert.equal(ui.screen.getAllByText(/Email sign-in is unavailable/).length, 1);
  let reject!: (error: Error) => void;
  c.value.status = () => new Promise((_resolve, fail) => { reject = fail; });
  ui.fireEvent.click(retry);
  assert.ok(feedback.isConnected && feedback.parentElement?.classList.contains("min-h-11"));
  assert.match(feedback.textContent!, /Email sign-in is unavailable/, "the prior outage remains visible during retry");
  assert.ok(ui.screen.queryByRole("alert") === null);
  await ui.act(async () => reject(new Error("Private status failure")));
  await ui.waitFor(() => assert.equal(retry.disabled, false));
  assert.ok(feedback.isConnected && feedback.parentElement?.classList.contains("min-h-11"));
  assert.match(feedback.textContent!, /Sign-in is unavailable/);
  rendered.unmount();
});


test("embedded phone entry has only the trial phase as its incoming fade owner", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Continue registration" }));
  const accountPhase = document.querySelector<HTMLElement>('[data-member-account-phase="phone"]')!;
  const trialPhase = accountPhase.querySelector<HTMLElement>('[data-trial-phase="number"]')!;
  assert.ok(accountPhase && trialPhase, "the real phone controller renders inside the account phase");
  assert.equal(accountPhase.style.opacity, "1", "the outer phone phase must not multiply the trial's incoming fade");
  assert.equal(trialPhase.style.opacity, "0", "the actual trial phase remains the sole incoming fade owner");
  assert.ok(ui.screen.getByRole("heading", { name: "Verify your phone" }));
});
