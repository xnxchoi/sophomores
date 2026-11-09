import { AuthenticationMessages } from "../fixtures/authentication-messages";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createRef } from "react";
import { JSDOM } from "jsdom";
import type { MemberAuthFailureKind } from "@/lib/member-auth/client";
import type {
  AccountPhase,
  PhaseAction,
  PhaseNavigation
} from "@/components/Authentication/_shared/account-phase-types";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("@/components/Authentication/account-phase-study").AccountPhaseStudy;
const previous = new Map<string, PropertyDescriptor | undefined>();
const requests: unknown[][] = [];

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/studies/authentication/compositions",
    pretendToBeVisual: true
  });
  const win = dom.window;
  Object.defineProperty(win.document, "elementFromPoint", {
    configurable: true,
    value: () => null
  });
  for (const key of [
    "window", "document", "navigator", "HTMLElement", "HTMLInputElement",
    "HTMLButtonElement", "SVGElement", "Element", "Node", "NodeList", "NodeFilter",
    "MutationObserver", "CustomEvent", "Event", "getComputedStyle",
    "requestAnimationFrame", "cancelAnimationFrame"
  ]) {
    const raw = key === "window" ? win : win[key as keyof typeof win];
    const value = typeof raw === "function" && [
      "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"
    ].includes(key) ? raw.bind(win) : raw;
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true, writable: true, value
    });
  }
  for (const [key, value] of [
    ["IS_REACT_ACT_ENVIRONMENT", true],
    ["fetch", async (...args: unknown[]) => {
      requests.push(args);
      throw new Error("Authentication failure studies must stay disconnected");
    }]
  ] as const) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true, writable: true, value
    });
  }
  win.fetch = globalThis.fetch;
  Object.defineProperty(win.navigator, "credentials", {
    configurable: true,
    value: { create: globalThis.fetch, get: globalThis.fetch }
  });
  ui = await import("@testing-library/react/pure");
  Study = (await import("@/components/Authentication/account-phase-study")).AccountPhaseStudy;
});

afterEach(() => {
  const requestCount = requests.splice(0).length;
  const composer = document.querySelector('a[href^="sms:"],a[href^="tel:"],a[href^="mailto:"]');
  ui?.cleanup();
  Reflect.deleteProperty(document, "visibilityState");
  assert.equal(requestCount, 0, "no provider, email, passkey or authentication requests");
  assert.ok(composer === null, "failure recovery never launches a composer");
  assert.equal(dom.window.localStorage.length, 0);
  assert.equal(dom.window.sessionStorage.length, 0);
});

after(async () => {
  // input-otp schedules native selection work at 0/10/50 ms.
  await new Promise((resolve) => setTimeout(resolve, 60));
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function renderStudy({
  locale = "en", initialPhase = "entry", flow = "login"
}: {
  locale?: "en" | "ko";
  initialPhase?: AccountPhase;
  flow?: "login" | "signup";
} = {}) {
  const navigationRef = createRef<PhaseNavigation>();
  const failures: (MemberAuthFailureKind | null)[] = [];
  const phases: AccountPhase[] = [];
  const result = ui.render(
    <Study flow={flow} locale={locale} headingId="failure-study"
      navigationRef={navigationRef} initialPhase={initialPhase}
      onPhaseChange={(next) => phases.push(next)}
      onFailureChange={(next) => failures.push(next)} />, { wrapper: ({ children }) => <AuthenticationMessages locale={locale}>{children}</AuthenticationMessages> }
  );
  return { ...result, navigationRef, failures, phases };
}

function current(container: HTMLElement) {
  const body = container.querySelector<HTMLElement>('[data-account-phase][aria-hidden="false"]');
  assert.ok(body, "the accepted modal renders an active actual account phase");
  return body;
}

function field(container: HTMLElement, selector = 'input[autocomplete="one-time-code"]') {
  const input = current(container).querySelector<HTMLInputElement>(selector);
  assert.ok(input, `active phase provides ${selector}`);
  return input;
}

function action(container: HTMLElement, name: PhaseAction) {
  const button = current(container).querySelector<HTMLButtonElement>(`[data-phase-action="${name}"]`);
  assert.ok(button, `active phase provides ${name}`);
  return button;
}

function submit(container: HTMLElement) {
  const form = current(container).querySelector("form");
  assert.ok(form, "a semantic form owns verification and email submission");
  ui.fireEvent.submit(form);
}

async function preview(
  result: ReturnType<typeof renderStudy>, kind: MemberAuthFailureKind
) {
  assert.equal(typeof result.navigationRef.current?.previewFailure, "function",
    "the composition matrix can preview each failure in the actual modal");
  ui.act(() => result.navigationRef.current?.previewFailure(kind));
  await ui.waitFor(() => assert.equal(result.failures.at(-1), kind));
}

async function settle() {
  await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
}

const matrix = [
  ["invalid-code", "email-code", /code.*match/i, /일치/],
  ["expired-code", "email-code", /expired.*new/i, /만료/],
  ["attempts-exhausted", "email-code", /attempts.*new code/i, /시도/],
  ["rate-limited", "email-code", /too many.*wait/i, /요청|잠시/],
  ["delivery-failed", "entry", /send.*email.*try again/i, /전송|보내/],
  ["network", "email-code", /connect.*connection/i, /연결/],
  ["timeout", "email-code", /timed out.*try again/i, /시간/],
  ["passkey-cancelled", "passkey", /passkey.*cancelled.*another method/i, /취소/],
  ["provider-denied", "entry", /google.*cancelled/i, /취소|거부/],
  ["unavailable", "email-code", /unavailable.*try again/i, /사용|이용/]
] as const satisfies readonly (readonly [MemberAuthFailureKind, AccountPhase, RegExp, RegExp])[];

for (const locale of ["en", "ko"] as const) {
  for (const [kind, expectedPhase, en] of matrix) {
    test(`${locale}: ${kind} uses canonical inline failure copy with missing-key English fallback`, async () => {
      const result = renderStudy({ locale });
      await preview(result, kind);
      const body = current(result.container);
      assert.equal(body.dataset.accountPhase, expectedPhase);
      const role = kind === "passkey-cancelled" || kind === "provider-denied" || kind === "rate-limited" ? "status" : "alert";
      const feedback = ui.within(body).getByRole(role);
      assert.equal(result.container.querySelector("[data-authentication-provider-locale]")?.getAttribute("data-authentication-provider-locale"), locale);
      assert.match(feedback.textContent ?? "", en, "untranslated AuthPhase uses canonical English under either selected locale");
      assert.equal(ui.within(body).queryAllByRole(role).length, 1, "feedback is not duplicated");
      if (kind === "rate-limited") {
        assert.equal(feedback.hasAttribute("data-rate-limit-status"), true);
        assert.equal(feedback.getAttribute("aria-live"), "polite");
        assert.match(feedback.closest("p")?.textContent ?? "", /0:30/);
        assert.equal(feedback.closest("p")?.classList.contains("min-h-10"), true, "countdown retains its stable feedback slot");
        assert.equal(ui.within(body).queryByRole("alert") === null, true);
      }
      assert.ok(!/Error:|NotAllowedError|access_denied|stack trace|smtp|ECONN|https?:\/\//i.test(feedback.textContent ?? ""),
        "raw provider and transport errors never leak into account copy");
      if (expectedPhase !== "passkey") {
        assert.ok(feedback.closest("form"), "feedback stays inside the existing action form");
      }
      assert.equal(ui.within(document.body).queryAllByRole("dialog").length, 0);
      assert.equal(ui.within(document.body).queryAllByRole("menu").length, 0);
      assert.ok(body.querySelector('input[type="password"]') === null);
      assert.ok(body.querySelector("h3"), "failure keeps the actual phase heading rather than replacing the modal");
    });
  }
}

test("rejected code keeps neutral slot feedback and a content-sized readable message", async () => {
  const result = renderStudy({ initialPhase: "email-code" });
  await preview(result, "invalid-code");
  const body = current(result.container);
  assert.ok(body.classList.contains("[font-family:system-ui]"), "approved typography belongs to the shared view, not only its study shell");
  const group = body.querySelector<HTMLElement>('[data-slot="input-otp-group"]');
  assert.ok(group, "the same six-slot OTP group remains in place");
  assert.ok(group.classList.contains("has-aria-invalid:ring-0"), "invalid input cannot add a red group rectangle");
  assert.ok(group.classList.contains("dark:has-aria-invalid:ring-0"), "the group override also covers dark mode");
  const feedback = ui.within(body).getByRole("alert").closest("p")!;
  for (const token of ["my-2", "text-[13px]", "leading-5", "text-neutral-200"]) {
    assert.ok(feedback.classList.contains(token), `feedback preserves readable spacing and tone: ${token}`);
  }
});

test("wrong code remains editable and a corrected code can verify without resending", async () => {
  const result = renderStudy({ initialPhase: "email-code" });
  ui.fireEvent.change(field(result.container), { target: { value: "ZZZZZ" } });
  await preview(result, "invalid-code");
  assert.equal(field(result.container).value, "ZZZZZ");
  assert.ok(!field(result.container).disabled, "wrong code remains editable");
  assert.ok(action(result.container, "submit").disabled, "partial codes cannot verify");
  ui.fireEvent.change(field(result.container), { target: { value: "A1B2C3" } });
  await ui.waitFor(() => assert.equal(current(result.container).dataset.accountPhase, "complete"));
  assert.equal(result.failures.at(-1), null);
});

for (const kind of ["expired-code", "attempts-exhausted"] as const) {
  test(`${kind}: locked verification ignores autofill and submit until a fresh resend`, async () => {
    const result = renderStudy({ initialPhase: "email-code" });
    ui.fireEvent.change(field(result.container), { target: { value: "A1B2C" } });
    await preview(result, kind);
    assert.equal(field(result.container).value, "A1B2C", "preview preserves the existing code");
    assert.ok(action(result.container, "submit").disabled);
    ui.fireEvent.change(field(result.container), { target: { value: "A1B2C3" } });
    submit(result.container);
    await settle();
    assert.equal(current(result.container).dataset.accountPhase, "email-code");
    assert.equal(result.failures.at(-1), kind);
    ui.fireEvent.click(action(result.container, "retry"));
    await ui.waitFor(() => assert.equal(result.failures.at(-1), null));
    await ui.waitFor(() => assert.ok(!field(result.container).disabled));
    assert.equal(field(result.container).value, "", "only a fresh resend clears the old code");
    assert.ok(action(result.container, "submit").disabled, "a new complete code is required");
    assert.ok(action(result.container, "retry").disabled, "fresh resend starts its existing cooldown");
  });
}

test("rate limit uses the same thirty-second deadline for verify and resend, without automatic retry", async (t) => {
  const intervals = t.mock.method(globalThis, "setInterval");
  const result = renderStudy({ initialPhase: "email-code" });
  ui.fireEvent.change(field(result.container), { target: { value: "A1B2C3" } });
  await preview(result, "rate-limited");
  assert.ok(action(result.container, "submit").disabled);
  assert.ok(action(result.container, "retry").disabled);
  assert.match(current(result.container).textContent ?? "", /0:30/);
  ui.fireEvent.change(field(result.container), { target: { value: "ZZZZZZ" } });
  submit(result.container);
  await settle();
  assert.equal(result.failures.at(-1), "rate-limited");
  const tick = intervals.mock.calls.filter((call) => call.arguments[1] === 1000).at(-1)?.arguments[0];
  assert.ok(typeof tick === "function", "rate limit has a wall-clock ticker");
  const future = Date.now() + 31_000;
  const now = t.mock.method(Date, "now", () => future);
  try {
    ui.act(() => tick());
    assert.ok(!action(result.container, "submit").disabled);
    assert.ok(!action(result.container, "retry").disabled);
    assert.equal(field(result.container).value, "A1B2C3");
    await settle();
    assert.equal(current(result.container).dataset.accountPhase, "email-code", "unlock does not auto-verify retained code");
    submit(result.container);
    await ui.waitFor(() => assert.equal(current(result.container).dataset.accountPhase, "complete"));
  } finally {
    now.mock.restore();
  }
});

for (const kind of ["network", "timeout", "unavailable"] as const) {
  test(`${kind}: retry is manual and retains the entered email and code`, async () => {
    const result = renderStudy();
    ui.fireEvent.change(field(result.container, 'input[type="email"]'), { target: { value: "fixture+member@example.com" } });
    ui.act(() => result.navigationRef.current?.preview("email-code"));
    ui.fireEvent.change(field(result.container), { target: { value: "A1B2C" } });
    await preview(result, kind);
    assert.equal(field(result.container).value, "A1B2C");
    assert.match(current(result.container).textContent ?? "", /fixture\+member@example\.com/);
    assert.ok(!field(result.container).disabled, "retry can edit the retained partial code");
    assert.ok(action(result.container, "submit").disabled, "partial input is not a request");
    await settle();
    assert.equal(current(result.container).dataset.accountPhase, "email-code", "no hidden automatic retry");
    // Complete input may auto-start the explicit retry, as in the accepted OTP flow.
    ui.fireEvent.change(field(result.container), { target: { value: "A1B2C3" } });
    await ui.waitFor(() => assert.equal(current(result.container).dataset.accountPhase, "complete"));
    assert.equal(result.failures.at(-1), null);
  });
}

test("delivery failure keeps the edited email and retries the existing Continue action", async () => {
  const result = renderStudy();
  ui.fireEvent.change(field(result.container, 'input[type="email"]'), { target: { value: "retry+member@example.com" } });
  await preview(result, "delivery-failed");
  assert.equal(field(result.container, 'input[type="email"]').value, "retry+member@example.com");
  submit(result.container);
  await ui.waitFor(() => assert.equal(current(result.container).dataset.accountPhase, "email-code"));
  assert.match(current(result.container).textContent ?? "", /retry\+member@example\.com/);
  assert.equal(result.failures.at(-1), null);
});

test("cancelled passkey falls back to the same email code form without a device request", async () => {
  const result = renderStudy();
  ui.fireEvent.change(field(result.container, 'input[type="email"]'), { target: { value: "fallback@example.com" } });
  await preview(result, "passkey-cancelled");
  assert.ok(!action(result.container, "passkey").disabled, "passkey can be retried");
  ui.fireEvent.click(action(result.container, "email-code"));
  await ui.waitFor(() => assert.equal(current(result.container).dataset.accountPhase, "email-code"));
  assert.match(current(result.container).textContent ?? "", /fallback@example\.com/);
  assert.equal(result.failures.at(-1), null);
});

test("Google denial can retry Google or continue with the retained email", async () => {
  const result = renderStudy();
  ui.fireEvent.change(field(result.container, 'input[type="email"]'), { target: { value: "google-fallback@example.com" } });
  await preview(result, "provider-denied");
  assert.ok(!action(result.container, "google").disabled);
  ui.fireEvent.click(action(result.container, "google"));
  assert.equal(current(result.container).dataset.accountPhase, "entry");
  assert.equal(field(result.container, 'input[type="email"]').value, "google-fallback@example.com");
  await ui.waitFor(() => assert.ok(!action(result.container, "submit").disabled));
  submit(result.container);
  await ui.waitFor(() => assert.equal(current(result.container).dataset.accountPhase, "email-code"));
  assert.match(current(result.container).textContent ?? "", /google-fallback@example\.com/);
  assert.equal(result.failures.at(-1), null);
});

test("previewing a locked failure cancels an already pending successful verification", async () => {
  const result = renderStudy({ initialPhase: "email-code", flow: "signup" });
  ui.fireEvent.change(field(result.container), { target: { value: "A1B2C3" } });
  assert.ok(action(result.container, "submit").disabled, "valid code begins verification");
  await preview(result, "attempts-exhausted");
  await settle();
  assert.equal(current(result.container).dataset.accountPhase, "email-code");
  assert.ok(!result.phases.includes("phone"), "a stale fixture verification cannot advance signup");
  assert.equal(result.failures.at(-1), "attempts-exhausted");
});
