import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient, MemberStatus } from "../../lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("../../components/member-auth/account-study").MemberAccountStudy;
let Phone: typeof import("../../components/member-auth/phone-step").MemberPhoneStep;
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
    "window",
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
    const value = key === "window" ? win : win[key as keyof typeof win];
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
  ui = await import("@testing-library/react/pure");
  Study = (await import("../../components/member-auth/account-study"))
    .MemberAccountStudy;
  Phone = (await import("../../components/member-auth/phone-step"))
    .MemberPhoneStep;
});
afterEach(() => ui.cleanup());
after(() => {
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
  const rendered = ui.render(<Study client={c.value} />);
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
  ui.render(<Study client={c.value} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
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
  await ui.waitFor(() => assert.equal(document.activeElement?.id, "member-phone-heading"));
  assert.equal(
    server.calls.length,
    0,
    "continuing must not issue a challenge automatically"
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
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
});

test("provider return defaults to an explicit setup gate, not automatic phone verification", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  const server = phoneServer();
  const route = await readFile(
    new URL("../../app/(site)/account/continue/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(route, /initialFlow="login"/);
  ui.render(<Study client={c.value} initialFlow="login" />);
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

test("explicit signup resumes phone verification and Cancel stays at the chooser", async () => {
  const c = client();
  c.setStatus({ ...anonymous, authenticated: true, emailVerified: true });
  const server = phoneServer();
  ui.render(<Study client={c.value} initialFlow="signup" />);
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }))
  );
  assert.ok(
    ui.screen.queryByRole("heading", { name: "Verify your phone to finish" })
  );
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
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
  await ui.act(async () => {});
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }));
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.equal(
    document
      .querySelector("[data-verification-sheet]")
      ?.getAttribute("data-authentication-mode"),
    "chooser"
  );
});
test("authenticated returning member resumes the account screen without repeating signup", async () => {
  const c = client();
  c.setStatus(active);
  ui.render(<Study client={c.value} initialFlow="signup" />);
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }))
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByRole("button", { name: "Add a passkey" }))
  );
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
  assert.ok(c.calls.every(([name]) => name === "status"));
});
test("anonymous direct continuation never grants authentication or membership", async () => {
  const c = client();
  ui.render(<Study client={c.value} initialFlow="signup" />);
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
  ui.render(<Study client={c.value} initialFlow="signup" />);
  assert.ok(ui.screen.queryByText("Checking sign-in options…"));
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
  ui.render(<Study client={c.value} />);
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
  assert.equal(ui.screen.queryByLabelText(/^Email(?: address)?$/), null);
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
  ui.render(<Study client={c.value} />);
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Close account options" })
  );
  await ui.waitFor(() => assert.equal(ui.screen.queryByRole("dialog"), null));
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
    target: { value: "member@example.com" }
  });
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Send a magic link" })
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByText(/Check your inbox for a sign-in link/))
  );
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
  assert.equal(ui.screen.queryByLabelText(/^(?:Verification|Email) code$/), null);
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
        email === "member@example.com" &&
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
    document.querySelector("[data-member-account-flow]")?.getAttribute("aria-busy"),
    "true"
  );
  ui.fireEvent.submit(input.closest("form")!);
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  await ui.act(async () => reject(Error("private invalid code")));
  assert.ok(ui.screen.queryByRole("alert"));
  assert.doesNotMatch(document.body.textContent!, /private invalid code/);
  assert.equal(input.disabled, false);
  assert.equal(
    document.querySelector("[data-member-account-flow]")?.getAttribute("aria-busy"),
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
test("phone selection needs an independent credential, can be cleared, and passkey failures remain errors", async () => {
  const c = client();
  c.value.signInPasskey = async () => {
    throw Error("private credential cancelled");
  };
  await choose("Log in", c);
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Sign in with a passkey" })
  );
  await ui.waitFor(() =>
    assert.match(ui.screen.getByRole("alert").textContent!, /Sign-in is unavailable/)
  );
  assert.doesNotMatch(document.body.textContent!, /private credential/);
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Use phone to identify account" })
  );
  ui.fireEvent.change(ui.screen.getByLabelText("Phone number"), {
    target: { value: "01012345678" }
  });
  ui.fireEvent.submit(
    ui.screen.getByLabelText("Phone number").closest("form")!
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByText(/Phone selected. Enter your email/))
  );
  assert.ok(
    c.calls.some(
      ([name, phone]) => name === "identify" && phone === "01012345678"
    )
  );
  assert.equal(ui.screen.queryByText("Account ready"), null);
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Change identifier" })
  );
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.queryByRole("button", { name: "Use phone to identify account" })
    )
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Use phone to identify account" })
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Use email instead" })
  );
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/)));
});
test("returning passkey member can add passkey, refresh authoritative status and sign out", async () => {
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
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Refresh account status" })
  );
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
  const rendered = ui.render(<Study client={c.value} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  assert.ok(ui.screen.queryByText("Checking sign-in options…"));
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
  ui.render(<Phone busy={false} onBind={(...args) => bound.push(args)} />);
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
    />
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
    <Phone busy={false} onBind={() => assert.fail("expired proof bound")} />
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
    <Phone busy={false} onBind={() => assert.fail("pending challenge bound")} />
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
    <Phone busy={false} onBind={() => assert.fail("failed challenge bound")} />
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
    />
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
  ui.render(<Study client={c.value} />);
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

test("failed identifier clearing stays in phone mode and keeps feedback generic", async () => {
  const c = client();
  await choose("Log in", c);
  c.value.clearPhoneIdentifier = async () => {
    throw Error("private clearing failure");
  };
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Use phone to identify account" })
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Use email instead" })
  );
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("alert")));
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }));
  assert.equal(ui.screen.queryByLabelText(/^Email(?: address)?$/), null);
  assert.doesNotMatch(
    ui.screen.getByRole("alert").textContent!,
    /private clearing failure/
  );
});
