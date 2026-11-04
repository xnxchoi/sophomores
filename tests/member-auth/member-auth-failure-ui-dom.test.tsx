import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import {
  MemberAuthActionError,
  type MemberClient,
  type MemberStatus
} from "../../lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("../../components/Authentication/member-auth/account-study").MemberAccountStudy;
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
  Study = (await import("../../components/Authentication/member-auth/account-study"))
    .MemberAccountStudy;
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
      (ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement)
        .disabled,
      false
    )
  );
  return rendered;
}
for (const kind of [
  "invalid-code",
  "expired-code",
  "attempts-exhausted",
  "network",
  "timeout"
] as const) {
  test(`connected ${kind} recovery keeps real verification state and never grants membership`, async () => {
    const c = client();
    let reject!: (error: Error) => void;
    c.value.verifyEmailCode = async (email, code) => {
      c.calls.push(["verify", email, code]);
      return new Promise<void>((_resolve, fail) => {
        reject = fail;
      });
    };
    await choose("Log in", c);
    ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
      target: { value: "member@example.com" }
    });
    ui.fireEvent.submit(
      ui.screen.getByLabelText("Email address").closest("form")!
    );
    await ui.waitFor(() =>
      assert.ok(ui.screen.queryByLabelText("Verification code"))
    );
    const input = ui.screen.getByLabelText(
      "Verification code"
    ) as HTMLInputElement;
    assert.equal(
      (
        ui.screen.getByRole("button", {
          name: "Verify code"
        }) as HTMLButtonElement
      ).disabled,
      true
    );
    ui.fireEvent.change(input, { target: { value: "A1B2C" } });
    assert.equal(
      (
        ui.screen.getByRole("button", {
          name: "Verify code"
        }) as HTMLButtonElement
      ).disabled,
      true
    );
    ui.fireEvent.change(input, { target: { value: "A1B2C3" } });
    assert.equal(c.calls.filter(([action]) => action === "verify").length, 1);
    ui.fireEvent.submit(input.closest("form")!);
    assert.equal(c.calls.filter(([action]) => action === "verify").length, 1);
    await ui.act(async () => reject(new MemberAuthActionError(kind)));
    assert.ok(ui.screen.queryByRole("alert"));
    assert.equal(
      input.disabled,
      kind === "expired-code" || kind === "attempts-exhausted"
    );
    assert.equal(
      input.getAttribute("aria-invalid"),
      kind === "invalid-code" ? "true" : "false"
    );
    assert.equal(document.querySelector("[data-phase-completion]"), null);
    assert.equal(document.querySelector("[data-member-phone-step]"), null);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Verify code" }));
    if (kind === "expired-code" || kind === "attempts-exhausted") {
      assert.equal(c.calls.filter(([action]) => action === "verify").length, 1);
    } else {
      assert.equal(c.calls.filter(([action]) => action === "verify").length, 2);
      await ui.act(async () => reject(new MemberAuthActionError(kind)));
    }
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Change email" }));
    await ui.waitFor(() =>
      assert.ok(ui.screen.queryByLabelText("Email address"))
    );
    assert.equal(ui.screen.queryByLabelText("Verification code"), null);
  });
}

for (const recovery of ["expired-code", "attempts-exhausted"] as const) {
  test(`${recovery} lock survives failed refresh and failed resend with visible recovery guidance`, async (t) => {
    let now = Date.now();
    t.mock.method(Date, "now", () => now);
    const c = client();
    c.value.verifyEmailCode = async (...args) => {
      c.calls.push(["verify", ...args]);
      throw new MemberAuthActionError(recovery);
    };
    await choose("Log in", c);
    ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
      target: { value: "member@example.com" }
    });
    ui.fireEvent.submit(
      ui.screen.getByLabelText("Email address").closest("form")!
    );
    await ui.waitFor(() =>
      assert.ok(ui.screen.queryByLabelText("Verification code"))
    );
    const input = ui.screen.getByLabelText(
      "Verification code"
    ) as HTMLInputElement;
    ui.fireEvent.change(input, { target: { value: "A1B2C3" } });
    await ui.waitFor(() => assert.equal(input.disabled, true));
    assert.equal(ui.screen.queryByRole("button", { name: "Refresh account status" }), null);
    c.value.sendEmailCode = async () => { throw new MemberAuthActionError("network"); };
    now += 31_000;
    await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    ui.fireEvent.click(ui.screen.getByRole("button", { name: /Send new code/ }));
    await ui.waitFor(() => assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" })));
    c.value.status = async () => {
      throw new MemberAuthActionError("network");
    };
    ui.fireEvent.click(
      ui.screen.getByRole("button", { name: "Refresh account status" })
    );
    await ui.waitFor(() =>
      assert.match(
        ui.screen.getByRole("alert").textContent!,
        /connect|connection/i
      )
    );
    assert.equal(input.disabled, true);
    assert.equal(
      (
        ui.screen.getByRole("button", {
          name: "Verify code"
        }) as HTMLButtonElement
      ).disabled,
      true
    );
    assert.match(
      document.getElementById(input.getAttribute("aria-describedby")!)!
        .textContent!,
      /new code/i
    );
    let rejectResend!: (error: Error) => void;
    c.value.sendEmailCode = async () =>
      new Promise<void>((_resolve, reject) => {
        rejectResend = reject;
      });
    now += 31_000;
    await ui.act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    ui.fireEvent.click(
      ui.screen.getByRole("button", { name: /Send new code/ })
    );
    await ui.act(async () =>
      rejectResend(new MemberAuthActionError("network"))
    );
    assert.equal(input.disabled, true);
    assert.equal(
      (
        ui.screen.getByRole("button", {
          name: "Verify code"
        }) as HTMLButtonElement
      ).disabled,
      true
    );
    assert.match(
      document.getElementById(input.getAttribute("aria-describedby")!)!
        .textContent!,
      /new code/i
    );
    assert.match(
      ui.screen.getByRole("alert").textContent!,
      /connect|connection/i
    );
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Verify code" }));
    assert.equal(c.calls.filter(([action]) => action === "verify").length, 1);
    assert.equal(document.querySelector("[data-phase-completion]"), null);
    c.value.sendEmailCode = async () => {};
    ui.fireEvent.click(ui.screen.getByRole("button", { name: /Send new code/ }));
    await ui.waitFor(() => {
      assert.equal(input.disabled, false);
      assert.equal(input.value, "", "a successful fresh delivery removes the stale code");
    });
  });
}

test("verification cooldown survives hidden time without unrelated status refresh", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  let settleVerification!: () => void;
  c.value.verifyEmailCode = async (...args) => {
    c.calls.push(["verify", ...args]);
    if (c.calls.filter(([action]) => action === "verify").length <= 2) {
      await new Promise<void>((resolve) => { settleVerification = resolve; });
      throw new MemberAuthActionError("rate-limited", 2);
    }
  };
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(
    ui.screen.getByLabelText("Email address").closest("form")!
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByLabelText("Verification code"))
  );
  const input = ui.screen.getByLabelText(
    "Verification code"
  ) as HTMLInputElement;
  ui.fireEvent.change(input, { target: { value: "A1B2C3" } });
  await ui.waitFor(() => {
    assert.ok(ui.screen.queryByRole("button", { name: "Verifying code…" }));
    assert.equal(input.disabled, true, "pending verification also locks input");
  });
  await ui.act(async () => settleVerification());
  await ui.waitFor(() => {
    const verify = ui.screen.getByRole("button", { name: "Verify code" });
    assert.equal(verify.getAttribute("aria-busy"), "false");
    assert.equal(input.disabled, true, "settled rate limit owns the cooldown lock");
    assert.match(document.getElementById(input.getAttribute("aria-describedby")!)!.textContent!, /Try again in/);
  });
  now += 3_000;
  await ui.act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(input.disabled, false);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Verify code" }));
  await ui.waitFor(() => {
    assert.ok(ui.screen.queryByRole("button", { name: "Verifying code…" }));
    assert.equal(input.disabled, true, "pending verification also locks input");
  });
  await ui.act(async () => settleVerification());
  await ui.waitFor(() => {
    const verify = ui.screen.getByRole("button", { name: "Verify code" });
    assert.equal(verify.getAttribute("aria-busy"), "false");
    assert.equal(input.disabled, true, "settled rate limit owns the cooldown lock");
    assert.match(document.getElementById(input.getAttribute("aria-describedby")!)!.textContent!, /Try again in/);
  });
  assert.equal(ui.screen.queryByRole("button", { name: "Refresh account status" }), null);
  assert.equal(input.disabled, true);
  assert.equal(
    (
      ui.screen.getByRole("button", {
        name: "Verify code"
      }) as HTMLButtonElement
    ).disabled,
    true
  );
  assert.match(
    document.getElementById(input.getAttribute("aria-describedby")!)!
      .textContent!,
    /Try again in/
  );
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden"
  });
  await ui.act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  now += 3_000;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible"
  });
  await ui.act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(input.disabled, false);
  assert.equal(
    (
      ui.screen.getByRole("button", {
        name: "Verify code"
      }) as HTMLButtonElement
    ).disabled,
    false
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Verify code" }));
  await ui.waitFor(() =>
    assert.equal(c.calls.filter(([action]) => action === "verify").length, 3)
  );
  await ui.waitFor(() => {
    assert.equal(ui.screen.getByRole("button", { name: "Verify code" }).getAttribute("aria-busy"), "false");
  });
  Reflect.deleteProperty(document, "visibilityState");
});

test("connected email validation is actionable and never invokes email providers for invalid input", async () => {
  const c = client();
  await choose("Log in", c);
  const email = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  for (const value of ["", "not-an-email", "a@@example.com"]) {
    ui.fireEvent.change(email, { target: { value } });
    ui.fireEvent.submit(email.closest("form")!);
    assert.equal(email.getAttribute("aria-invalid"), "true");
    assert.match(ui.screen.getByRole("alert").textContent!, /valid email/i);
    assert.equal(c.calls.filter(([name]) => name === "code" || name === "link").length, 0);
    assert.equal(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }), null);
    assert.equal(ui.screen.queryByRole("button", { name: "Send a magic link" }), null);
    assert.equal(ui.screen.queryByRole("button", { name: "More options" }), null);
  }
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  assert.equal(email.getAttribute("aria-invalid"), "false");
  ui.fireEvent.submit(email.closest("form")!);
  await ui.waitFor(() => assert.ok(ui.screen.queryByLabelText("Verification code")));
  assert.equal(c.calls.filter(([name]) => name === "code").length, 1);
});

test("rate-limit retry counts down without assertive churn and retires stale wait text after hidden time", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  c.value.sendEmailCode = async () => {
    throw new MemberAuthActionError("rate-limited", 2);
  };
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(
    ui.screen.getByLabelText("Email address").closest("form")!
  );
  const timer = await ui.screen.findByRole("timer");
  assert.match(timer.textContent!, /0:02/);
  assert.equal(timer.getAttribute("aria-live"), "off");
  assert.ok(!ui.screen.queryByRole("alert"), "each countdown tick must not update an assertive message");
  const submit = ui.screen.getByRole("button", {
    name: "Continue"
  }) as HTMLButtonElement;
  assert.equal(submit.disabled, true);
  now += 1_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  assert.match(timer.textContent!, /0:01/);
  assert.ok(ui.screen.getByRole("timer") === timer, "ticks update the existing compact feedback slot");
  const visibility = Object.getOwnPropertyDescriptor(
    document,
    "visibilityState"
  );
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden"
  });
  await ui.act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  now += 3_000;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible"
  });
  await ui.act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(submit.disabled, false);
  assert.ok(!ui.screen.queryByRole("timer"));
  assert.doesNotMatch(document.body.textContent!, /Wait before trying again|Try again in/);
  if (visibility)
    Object.defineProperty(document, "visibilityState", visibility);
  else Reflect.deleteProperty(document, "visibilityState");
});

test("startup status rate-limit offers a deadline-gated refresh without an automatic request loop", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  let attempts = 0;
  c.value.status = async () => {
    attempts += 1;
    if (attempts === 1) throw new MemberAuthActionError("rate-limited", 2);
    return anonymous;
  };
  ui.render(<Study client={c.value} initialFlow="login" />);
  const refresh = await ui.screen.findByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
  assert.equal(refresh.disabled, true);
  assert.match(ui.screen.getByRole("timer").textContent!, /0:02/);
  ui.fireEvent.click(refresh);
  assert.equal(attempts, 1, "a cooling-down status request cannot be retried");
  now += 3_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  assert.equal(refresh.disabled, false);
  assert.equal(attempts, 1, "expiry permits a deliberate retry but does not poll");
  assert.ok(!ui.screen.queryByRole("timer"));
  ui.fireEvent.click(refresh);
  await ui.waitFor(() => assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).disabled, false));
  assert.equal(attempts, 2);
  assert.ok(!ui.screen.queryByRole("button", { name: "Refresh account status" }));
});

test("initial sending and resending report delivery work, never verification", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  let finish!: () => void;
  c.value.sendEmailCode = async () =>
    new Promise<void>((resolve) => {
      finish = resolve;
    });
  await choose("Log in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(
    ui.screen.getByLabelText("Email address").closest("form")!
  );
  assert.ok(ui.screen.queryByRole("button", { name: "Sending code…" }));
  assert.equal(
    ui.screen.queryByRole("button", { name: "Verifying code…" }),
    null
  );
  await ui.act(async () => finish());
  await ui.waitFor(() =>
    assert.ok(ui.screen.queryByLabelText("Verification code"))
  );
  assert.equal(
    (
      ui.screen.getByRole("button", {
        name: "Verify code"
      }) as HTMLButtonElement
    ).disabled,
    true
  );
  now += 31_000;
  await ui.act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: /Send new code/ }));
  assert.ok(ui.screen.queryByRole("button", { name: "Sending code…" }));
  assert.equal(
    ui.screen.queryByRole("button", { name: "Verifying code…" }),
    null
  );
  await ui.act(async () => finish());
});

test("Google denial callback becomes neutral static feedback only after status is checked", async () => {
  const c = client();
  dom.reconfigure({
    url: "http://localhost/account?error=access_denied&error_description=PRIVATE_CALLBACK_TEXT"
  });
  try {
    await choose("Log in", c);
    await ui.waitFor(() => assert.match(document.body.textContent!, /Google/));
    assert.equal(ui.screen.queryByRole("alert"), null);
    assert.ok(ui.screen.queryAllByRole("status").length > 0);
    assert.doesNotMatch(
      document.body.textContent!,
      /PRIVATE_CALLBACK_TEXT|access_denied/
    );
    assert.equal(document.querySelector("[data-phase-completion]"), null);
  } finally {
    dom.reconfigure({ url: "http://localhost/account" });
  }
});
