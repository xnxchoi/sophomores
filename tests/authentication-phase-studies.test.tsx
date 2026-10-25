import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createRef } from "react";
import { JSDOM } from "jsdom";
import type {
  AccountPhase,
  PhaseAction,
  PhaseNavigation
} from "../components/authentication-studies/_shared/account-phase-types";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("../components/authentication-studies/account-phase-study").AccountPhaseStudy;
const previous = new Map<string, PropertyDescriptor | undefined>();
const requests: unknown[][] = [];
const copied: string[] = [];

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
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "SVGElement",
    "Element",
    "Node",
    "NodeFilter",
    "MutationObserver",
    "CustomEvent",
    "Event",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ]) {
    const raw = key === "window" ? win : win[key as keyof typeof win];
    const value =
      typeof raw === "function" &&
      [
        "getComputedStyle",
        "requestAnimationFrame",
        "cancelAnimationFrame"
      ].includes(key)
        ? raw.bind(win)
        : raw;
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value
    });
  }
  previous.set(
    "IS_REACT_ACT_ENVIRONMENT",
    Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT")
  );
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    writable: true,
    value: true
  });
  const fetch = async (...args: unknown[]) => {
    requests.push(args);
    throw new Error("Phase studies must not make requests");
  };
  previous.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: fetch
  });
  win.fetch = fetch;
  Object.defineProperty(win.navigator, "credentials", {
    configurable: true,
    value: {
      create: fetch,
      get: fetch
    }
  });
  ui = await import("@testing-library/react/pure");
  Study = (
    await import("../components/authentication-studies/account-phase-study")
  ).AccountPhaseStudy;
});

afterEach(() => {
  const hasComposerLink =
    document.querySelector(
      'a[href^="sms:"], a[href^="tel:"], a[href^="mailto:"]'
    ) !== null;
  const requestCount = requests.splice(0).length;
  copied.splice(0);
  ui?.cleanup();
  Reflect.deleteProperty(document, "visibilityState");
  assert.ok(
    !hasComposerLink,
    "the simulation never launches a native composer"
  );
  assert.equal(requestCount, 0, "no authentication or provider requests");
  assert.equal(dom.window.localStorage.length, 0, "no fixture data persisted");
  assert.equal(
    dom.window.sessionStorage.length,
    0,
    "no fixture session persisted"
  );
});

after(async () => {
  // input-otp schedules native selection updates at 0/10/50 ms.
  await new Promise((resolve) => setTimeout(resolve, 60));
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function renderStudy({
  flow = "login",
  locale = "en",
  initialPhase,
  onPhaseChange
}: {
  flow?: "login" | "signup";
  locale?: "en" | "ko";
  initialPhase?: AccountPhase;
  onPhaseChange?: (phase: AccountPhase) => void;
} = {}) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        copied.push(value);
      }
    }
  });
  const navigationRef = createRef<PhaseNavigation>();
  const notices: string[] = [];
  const result = ui.render(
    <Study
      flow={flow}
      locale={locale}
      headingId="phase-heading"
      navigationRef={navigationRef}
      initialPhase={initialPhase}
      onPhaseChange={onPhaseChange}
      onPreviewNotice={(notice) => notices.push(notice)}
    />
  );
  return { ...result, navigationRef, notices };
}

function phase(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>("[data-account-phase]");
  assert.ok(element, "one explicit local phase is rendered");
  return element.dataset.accountPhase;
}

function field(container: HTMLElement, selector: string) {
  const input = container.querySelector<HTMLInputElement>(selector);
  assert.ok(input, `phase provides ${selector}`);
  return input;
}

function action(container: HTMLElement, name: PhaseAction) {
  const button = container.querySelector<HTMLButtonElement>(
    `[data-phase-action="${name}"]`
  );
  assert.ok(button, `phase provides ${name}`);
  return button;
}

function submit(container: HTMLElement) {
  const form = container.querySelector("form");
  assert.ok(form, "entry has a semantic form");
  ui.fireEvent.submit(form);
}

async function waitForPhase(container: HTMLElement, expected: AccountPhase) {
  await ui.waitFor(() => assert.equal(phase(container), expected), {
    timeout: 1500
  });
}

for (const flow of ["login", "signup"] as const) {
  test(`${flow}: editable synthetic email focuses and invalid input never advances`, async () => {
    const { container } = renderStudy({ flow });
    const email = field(container, 'input[type="email"]');
    assert.equal(email.value, "you@example.com");
    assert.ok(!email.readOnly);
    await ui.waitFor(() => assert.ok(document.activeElement === email));
    for (const value of ["", "not-an-email", "💥' OR 1=1", "a".repeat(10000)]) {
      ui.fireEvent.change(email, { target: { value } });
      submit(container);
      assert.equal(phase(container), "entry");
      assert.equal(email.getAttribute("aria-invalid"), "true");
    }
    ui.fireEvent.change(email, { target: { value: "fixture@example.com" } });
    submit(container);
    await waitForPhase(container, "email-code");
    assert.ok(container.textContent?.includes("fixture@example.com"));
    assert.ok(container.querySelector('input[type="password"]') === null);
  });
}

test("email code uses six OTP slots with one labelled alphanumeric autofill input", async () => {
  const { container } = renderStudy({ initialPhase: "email-code" });
  const code = field(container, 'input[autocomplete="one-time-code"]');
  const slots = container.querySelectorAll('[data-slot="input-otp-slot"]');

  assert.equal(slots.length, 6);
  assert.equal(container.querySelectorAll("input").length, 1);
  assert.ok(ui.within(container).getByLabelText(/^Verification code$/) === code);
  assert.equal(code.getAttribute("inputmode"), "text");
  assert.equal(code.getAttribute("autocapitalize"), "characters");
  assert.equal(code.maxLength, 6);
  ui.fireEvent.change(code, { target: { value: "a1b2c3d" } });
  assert.equal(
    code.value,
    "A1B2C3",
    "input uppercases and truncates to six characters"
  );
  assert.ok(action(container, "submit").disabled, "six characters auto-start verification");
  assert.equal(action(container, "submit").textContent?.trim(), "Verifying code…");
  await waitForPhase(container, "complete");
});

test("OTP partial edits never submit; formatted paste verifies once despite manual activation while busy", async () => {
  const { container } = renderStudy({ initialPhase: "email-code" });
  const code = field(container, 'input[autocomplete="one-time-code"]');
  await ui.waitFor(() => assert.ok(document.activeElement === code));
  for (const value of ["", "a", "a1b2", "a1b2c"]) {
    ui.fireEvent.change(code, { target: { value } });
    assert.equal(code.value, value.toUpperCase());
    assert.ok(action(container, "submit").disabled, "partial input cannot be submitted");
  }
  for (const value of ["A1B2C!", "Ａ1B2C3", "A1B2C💥", "A1B2Cé"]) {
    ui.fireEvent.change(code, { target: { value } });
    assert.equal(code.value, "A1B2C", "non-ASCII and punctuation are rejected");
  }
  await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  assert.equal(phase(container), "email-code", "partial input never advances");
  code.setSelectionRange(0, 5);
  ui.fireEvent.paste(code, { clipboardData: { getData: () => " a1b-2c3 " } });
  assert.equal(code.value, "A1B2C3");
  assert.deepEqual(Array.from(container.querySelectorAll('[data-slot="input-otp-slot"]'),
    (slot) => slot.textContent), Array.from("A1B2C3"));
  const verify = action(container, "submit");
  assert.ok(verify.disabled);
  assert.equal(verify.getAttribute("aria-busy"), "true");
  assert.equal(verify.textContent?.trim(), "Verifying code…");
  ui.fireEvent.click(verify);
  submit(container);
  await waitForPhase(container, "complete");
  await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  assert.equal(phase(container), "complete", "duplicate manual activation cannot restart verification");
});

test("code recovery exposes one question-labelled resend link without a separate action pair", () => {
  const { container } = renderStudy({ initialPhase: "email-code" });
  const resend = action(container, "retry");
  assert.ok(
    ui.within(container).getByRole("button", { name: /didn.t get a code.*send new code/i }) === resend
  );
  assert.equal(resend.textContent?.trim(), "Didn’t get a code?");
  assert.ok(ui.within(container).queryByText("Send new code", { exact: true }) === null);
  assert.ok(!resend.disabled);
  assert.ok(container.querySelector('[data-phase-action="edit-email"]') === null);
  assert.ok(ui.within(container).queryByRole("button", { name: /change email/i }) === null);
  assert.ok(ui.within(document.body).queryByRole("menu") === null);
  assert.ok(ui.within(document.body).queryByRole("dialog") === null);
  assert.equal(phase(container), "email-code");
});

test("recovery actions retain internal horizontal padding", () => {
  for (const [initialPhase, actions] of [
    ["email-code", ["retry"]],
    ["waiting", ["check", "edit-phone"]],
    ["entry", ["google"]]
  ] as const) {
    const { container, unmount } = renderStudy({ initialPhase });
    for (const name of actions) {
      const button = action(container, name);
      assert.ok(
        button.classList.contains("px-3"),
        `${name} has internal padding`
      );
      assert.ok(!button.classList.contains("px-0"));
      assert.ok(button.classList.contains("min-h-11"));
    }
    unmount();
  }
});

test("wrong full codes show pending then inline error; full-length edits and manual fallback can retry", async () => {
  const { container } = renderStudy({ initialPhase: "email-code" });
  const code = field(container, 'input[autocomplete="one-time-code"]');
  for (const value of ["", "A1B2C", "Ａ１Ｂ２Ｃ３"]) {
    ui.fireEvent.change(code, { target: { value } });
    submit(container);
    assert.equal(code.getAttribute("aria-invalid"), "true");
    assert.equal(phase(container), "email-code");
  }
  for (const value of ["AAAAAA", "BBBBBB", "abcdef", "000000", "000001"]) {
    ui.fireEvent.change(code, { target: { value } });
    assert.equal(code.value, value.toUpperCase());
    assert.ok(action(container, "submit").disabled, "even a wrong full code starts pending");
    assert.equal(code.getAttribute("aria-invalid"), "false", "no error before validation finishes");
    assert.equal(action(container, "submit").textContent?.trim(), "Verifying code…");
    await ui.waitFor(() => {
      assert.ok(!action(container, "submit").disabled);
      assert.equal(code.getAttribute("aria-invalid"), "true");
    });
    const feedback = document.getElementById(code.getAttribute("aria-describedby")!);
    assert.ok(feedback?.textContent?.trim(), "failed code has inline feedback");
    assert.equal(phase(container), "email-code");
  }
  ui.fireEvent.click(action(container, "submit"));
  assert.ok(action(container, "submit").disabled, "Verify remains an unchanged-code manual fallback");
  await ui.waitFor(() => assert.ok(!action(container, "submit").disabled));
  assert.equal(code.getAttribute("aria-invalid"), "true");
  ui.fireEvent.change(code, { target: { value: "A1B2C" } });
  assert.equal(code.value, "A1B2C", "backspace keeps corrections editable");
  ui.fireEvent.change(code, { target: { value: "a1b2c3" } });
  assert.ok(action(container, "submit").disabled);
  await waitForPhase(container, "complete");
  assert.ok(ui.within(container).getByRole("heading", { name: "Preview complete" }));
  assert.doesNotMatch(container.textContent ?? "", /you are signed in|account created|로그인되었습니다|계정이 생성/i);
});

test("signup progresses email → phone → waiting and checking never invents verification", async () => {
  const { container } = renderStudy({
    flow: "signup",
    initialPhase: "email-code"
  });
  ui.fireEvent.change(field(container, 'input[autocomplete="one-time-code"]'), {
    target: { value: "A1B2C3" }
  });
  submit(container);
  await waitForPhase(container, "phone");
  const phone = field(container, 'input[type="tel"]');
  assert.equal(phone.value, "010-0000-0000");
  assert.ok(!phone.readOnly);
  for (const value of ["", "1", "not a phone", "010-1234-56789"]) {
    ui.fireEvent.change(phone, { target: { value } });
    submit(container);
    assert.equal(phase(container), "phone");
    assert.equal(phone.getAttribute("aria-invalid"), "true");
  }
  ui.fireEvent.change(phone, { target: { value: "010-1234-5678" } });
  submit(container);
  await waitForPhase(container, "waiting");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    ui.fireEvent.click(action(container, "check"));
    await ui.waitFor(() => assert.ok(!action(container, "check").disabled));
    assert.equal(phase(container), "waiting");
  }
  assert.doesNotMatch(
    container.textContent ?? "",
    /phone verified|verification complete|인증 완료|인증되었습니다/i
  );
});

test("Back retraces the simulated path and yields to the chooser only at entry", async () => {
  const { container, navigationRef } = renderStudy({ flow: "signup" });
  assert.ok(navigationRef.current);
  let handled = true;
  ui.act(() => {
    handled = navigationRef.current!.back();
  });
  assert.ok(!handled, "entry delegates Back to the outer chooser");
  submit(container);
  await waitForPhase(container, "email-code");
  ui.act(() => {
    handled = navigationRef.current!.back();
  });
  assert.ok(handled);
  await waitForPhase(container, "entry");
  submit(container);
  await waitForPhase(container, "email-code");
  ui.fireEvent.change(field(container, 'input[autocomplete="one-time-code"]'), {
    target: { value: "A1B2C3" }
  });
  submit(container);
  await waitForPhase(container, "phone");
  submit(container);
  await waitForPhase(container, "waiting");
  ui.act(() => {
    handled = navigationRef.current!.back();
  });
  assert.ok(handled);
  await waitForPhase(container, "phone");
  ui.act(() => {
    handled = navigationRef.current!.back();
  });
  assert.ok(handled);
  await waitForPhase(container, "email-code");
});

test("manual fixtures are explicit and cannot turn a pending submit into automatic verification", async () => {
  const { container, navigationRef, notices } = renderStudy();
  submit(container);
  for (const next of [
    "review",
    "phone-confirmed",
    "expired",
    "used",
    "error",
    "passkey"
  ] as const) {
    ui.act(() => navigationRef.current!.preview(next));
    await waitForPhase(container, next);
  }
  await ui.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
  assert.equal(
    phase(container),
    "passkey",
    "stale submit timers cannot override explicit scenarios"
  );
  ui.fireEvent.click(action(container, "passkey"));
  await ui.waitFor(() => assert.ok(notices.length > 0));
  assert.equal(
    phase(container),
    "passkey",
    "passkey preview never claims a registered credential"
  );
});

test("waiting copies only a synthetic message and reports clipboard failure", async () => {
  const { container } = renderStudy({
    flow: "signup",
    initialPhase: "waiting"
  });
  ui.fireEvent.click(action(container, "copy"));
  await ui.waitFor(() => assert.equal(copied.length, 1));
  assert.ok(copied[0].trim().length > 0);
  assert.doesNotMatch(
    copied[0],
    /https?:\/\//,
    "fixture message carries no live verification link"
  );
  await ui.waitFor(() =>
    assert.match(container.textContent ?? "", /copied|복사/i)
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("clipboard denied");
      }
    }
  });
  ui.fireEvent.click(action(container, "copy"));
  await ui.waitFor(() =>
    assert.match(
      container.textContent ?? "",
      /could(?: not|n['’]t)|unable|failed|복사.*(?:못|실패)/i
    )
  );
  assert.equal(phase(container), "waiting");
});

test("provider and composer actions explain their local-only boundary", async () => {
  const { container, navigationRef, notices } = renderStudy();
  ui.fireEvent.click(action(container, "google"));
  await ui.waitFor(() => assert.ok(notices.length > 0));
  assert.equal(phase(container), "entry");
  const before = notices.length;
  ui.act(() => navigationRef.current!.preview("waiting"));
  await waitForPhase(container, "waiting");
  ui.fireEvent.click(action(container, "compose"));
  await ui.waitFor(() => assert.ok(notices.length > before));
  assert.equal(phase(container), "waiting");
  assert.match(notices.join(" "), /preview|simulat|미리보기|시뮬레이션/i);
});

test("normal code delivery starts a resend cooldown that Back cannot bypass", async () => {
  const { container, navigationRef } = renderStudy();
  submit(container);
  await waitForPhase(container, "email-code");
  const resend = action(container, "retry");
  assert.match(resend.textContent ?? "", /0:30/);
  assert.ok(resend.disabled);
  ui.act(() => navigationRef.current!.back());
  await waitForPhase(container, "entry");
  submit(container);
  await waitForPhase(container, "email-code");
  await ui.act(async () => {
    navigationRef.current!.back();
  });
  await waitForPhase(container, "entry");
  submit(container);
  await waitForPhase(container, "email-code");
  assert.ok(action(container, "retry").disabled);
});

test("resend locks for thirty wall-clock seconds and ignores repeated activation after busy ends", async (t) => {
  const intervals = t.mock.method(globalThis, "setInterval");
  const { container, notices } = renderStudy({ initialPhase: "email-code" });
  const ready = action(container, "retry");
  assert.match(ready.textContent ?? "", /didn.t get a code/i);
  assert.ok(!ready.disabled);
  const before = notices.length;
  ui.fireEvent.click(ready);
  await ui.waitFor(() => assert.equal(notices.length, before + 1));
  await waitForPhase(container, "email-code");
  const cooling = action(container, "retry");
  assert.ok(cooling.disabled);
  assert.match(cooling.textContent ?? "", /0:30/);
  await ui.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
  ui.fireEvent.click(cooling);
  await ui.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
  assert.equal(
    notices.length,
    before + 1,
    "cooldown blocks a second synthetic delivery"
  );

  const tick = intervals.mock.calls
    .filter((call) => call.arguments[1] === 1000)
    .at(-1)?.arguments[0];
  assert.ok(typeof tick === "function", "resend installs a wall-clock ticker");
  const future = Date.now() + 31_000;
  const now = t.mock.method(Date, "now", () => future);
  try {
    ui.act(() => tick());
  } finally {
    now.mock.restore();
  }
  const available = action(container, "retry");
  assert.ok(!available.disabled);
  assert.equal(
    notices.length,
    before + 1,
    "expiry does not send automatically"
  );
});

test("inline resend preserves the OTP input without changing the code view or opening an overlay", async () => {
  const changes: AccountPhase[] = [];
  const { container, notices } = renderStudy({
    initialPhase: "email-code",
    onPhaseChange: (next) => changes.push(next)
  });
  const code = field(container, 'input[autocomplete="one-time-code"]');
  ui.fireEvent.change(code, {
    target: { value: "A1B2C" }
  });
  ui.act(() => action(container, "retry").focus());
  ui.fireEvent.click(action(container, "retry"));
  assert.equal(phase(container), "email-code");
  assert.ok(field(container, 'input[autocomplete="one-time-code"]') === code);
  assert.ok(ui.within(document.body).queryByRole("menu") === null);
  assert.ok(ui.within(document.body).queryByRole("dialog") === null);
  await ui.waitFor(() => assert.equal(notices.length, 1));
  await ui.waitFor(() => assert.ok(document.activeElement === code));
  assert.equal(phase(container), "email-code");
  assert.ok(field(container, 'input[autocomplete="one-time-code"]') === code);
  assert.equal(code.value, "");
  assert.equal(
    container.querySelectorAll('[data-slot="input-otp-slot"]').length,
    6
  );
  assert.ok(changes.every((next) => next === "email-code"));
  assert.ok(ui.within(document.body).queryByRole("menu") === null);
  assert.ok(ui.within(document.body).queryByRole("dialog") === null);
});

test("resend clears invalid code and changing email returns to an editable entry", async () => {
  const { container, navigationRef, notices } = renderStudy({
    initialPhase: "email-code"
  });
  let code = field(container, 'input[autocomplete="one-time-code"]');
  ui.fireEvent.change(code, { target: { value: "000000" } });
  submit(container);
  await ui.waitFor(() => assert.equal(code.getAttribute("aria-invalid"), "true"));
  ui.fireEvent.click(action(container, "retry"));
  await waitForPhase(container, "email-code");
  code = field(container, 'input[autocomplete="one-time-code"]');
  await ui.waitFor(() => {
    assert.equal(code.value, "");
    assert.equal(code.getAttribute("aria-invalid"), "false");
  });
  assert.equal(phase(container), "email-code");
  assert.ok(notices.some((notice) => /A1B2C3.*No email was sent/.test(notice)));
  ui.fireEvent.change(code, { target: { value: "1234" } });
  ui.act(() => navigationRef.current!.back());
  await waitForPhase(container, "entry");
  const email = field(container, 'input[type="email"]');
  ui.fireEvent.change(email, { target: { value: "changed@example.com" } });
  submit(container);
  await waitForPhase(container, "email-code");
  assert.ok(container.textContent?.includes("changed@example.com"));
  assert.equal(
    field(container, 'input[autocomplete="one-time-code"]').value,
    ""
  );
});

test("changing phone returns to editable phone and starts a fresh waiting session", async () => {
  const { container } = renderStudy({
    flow: "signup",
    initialPhase: "waiting"
  });
  ui.fireEvent.click(action(container, "check"));
  await ui.waitFor(() => assert.ok(!action(container, "check").disabled));
  ui.fireEvent.click(action(container, "edit-phone"));
  await waitForPhase(container, "phone");
  const phone = field(container, 'input[type="tel"]');
  ui.fireEvent.change(phone, { target: { value: "010-2222-3333" } });
  submit(container);
  await waitForPhase(container, "waiting");
  assert.ok(container.textContent?.includes("010-2222-3333"));
  assert.match(container.textContent ?? "", /3:00/);
});

test("only an explicit phone-confirmed fixture can finish and restart the local preview", async () => {
  const { container } = renderStudy({
    flow: "signup",
    initialPhase: "phone-confirmed"
  });
  ui.fireEvent.click(action(container, "finish"));
  await waitForPhase(container, "complete");
  assert.ok(
    ui.within(container).getByRole("heading", { name: "Preview complete" })
  );
  const completion = container.querySelector<HTMLElement>("[data-phase-completion]");
  assert.ok(completion, "success uses a dedicated completion hierarchy");
  assert.ok(completion.classList.contains("text-center") && completion.classList.contains("items-center"));
  const heading = completion.querySelector("h3");
  const icon = completion.querySelector("svg");
  assert.ok(heading?.classList.contains("text-[28px]") && heading.classList.contains("leading-[34px]"));
  assert.equal(icon?.getAttribute("width"), "32");
  assert.equal(icon?.getAttribute("height"), "32");
  assert.ok(icon && heading && (icon.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING));
  assert.ok(completion.querySelector("p") === null, "completed modal has no supporting subtitle");
  assert.doesNotMatch(container.textContent ?? "", /No account was created or signed in/);
  ui.fireEvent.click(action(container, "retry"));
  await waitForPhase(container, "entry");
  assert.equal(
    field(container, 'input[type="email"]').value,
    "you@example.com"
  );
  assert.ok(container.querySelector('[data-phase-action="finish"]') === null);
});

test("review, expired, used and error fixtures recover through editable phone entry", async () => {
  for (const initialPhase of ["review", "expired", "used", "error"] as const) {
    const { container, unmount } = renderStudy({
      flow: "signup",
      initialPhase
    });
    ui.fireEvent.click(action(container, "retry"));
    await waitForPhase(container, "phone");
    assert.ok(!field(container, 'input[type="tel"]').readOnly);
    assert.ok(container.querySelector('[data-phase-action="finish"]') === null);
    unmount();
  }
});

test("passkey fallback returns to email code without invoking device authentication", async () => {
  const { container } = renderStudy({ initialPhase: "passkey" });
  ui.fireEvent.click(action(container, "email-code"));
  await waitForPhase(container, "email-code");
  assert.equal(
    field(container, 'input[autocomplete="one-time-code"]').value,
    ""
  );
});

test("waiting deadline expires without checking or verifying a phone", async (t) => {
  const intervals = t.mock.method(globalThis, "setInterval");
  const { container } = renderStudy({
    flow: "signup",
    initialPhase: "waiting"
  });
  const tick = intervals.mock.calls.find((call) => call.arguments[1] === 1000)
    ?.arguments[0];
  assert.ok(typeof tick === "function", "waiting installs its deadline ticker");
  const future = Date.now() + 180_001;
  const now = t.mock.method(Date, "now", () => future);
  try {
    // Restore wall time before any asynchronous React/testing-library work.
    ui.act(() => tick());
  } finally {
    now.mock.restore();
  }
  await waitForPhase(container, "expired");
  assert.ok(container.querySelector('[data-phase-action="finish"]') === null);
  ui.fireEvent.click(action(container, "retry"));
  await waitForPhase(container, "phone");
});

test("unmount cancels a pending transition and waiting visibility timers", async (t) => {
  const changes: AccountPhase[] = [];
  const pending = renderStudy({ onPhaseChange: (next) => changes.push(next) });
  submit(pending.container);
  pending.unmount();
  const before = changes.length;
  await ui.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
  assert.equal(
    changes.length,
    before,
    "unmounted submit does not emit a late phase"
  );
  const added = t.mock.method(document, "addEventListener");
  const removed = t.mock.method(document, "removeEventListener");
  const waiting = renderStudy({
    initialPhase: "waiting",
    onPhaseChange: (next) => changes.push(next)
  });
  const visibilityListeners = added.mock.calls
    .filter((call) => call.arguments[0] === "visibilitychange")
    .map((call) => call.arguments[1]);
  assert.ok(visibilityListeners.length > 0, "waiting observes page visibility");
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden"
  });
  ui.fireEvent(document, new Event("visibilitychange"));
  waiting.unmount();
  for (const listener of visibilityListeners) {
    assert.ok(
      removed.mock.calls.some(
        (call) =>
          call.arguments[0] === "visibilitychange" &&
          call.arguments[1] === listener
      ),
      "waiting removes its visibility listener on unmount"
    );
  }
  const afterUnmount = changes.length;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible"
  });
  ui.fireEvent(document, new Event("visibilitychange"));
  assert.equal(
    changes.length,
    afterUnmount,
    "visibility changes after unmount do not revive a phase"
  );
  Reflect.deleteProperty(document, "visibilityState");
});

for (const interrupt of ["back", "unmount"] as const) {
  test(`OTP ${interrupt} cancels pending auto-verification without late completion`, async () => {
    const changes: AccountPhase[] = [];
    const { container, navigationRef, unmount } = renderStudy({
      initialPhase: "email-code", onPhaseChange: (next) => changes.push(next)
    });
    ui.fireEvent.change(field(container, 'input[autocomplete="one-time-code"]'), {
      target: { value: "A1B2C3" }
    });
    assert.ok(action(container, "submit").disabled);
    if (interrupt === "back") ui.act(() => navigationRef.current!.back());
    else unmount();
    await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
    assert.ok(!changes.includes("complete"), "cancelled validation cannot emit success");
    if (interrupt === "back") assert.equal(phase(container), "entry");
    else assert.equal(container.textContent, "");
  });
}

test("terminal completion consumes Back without replaying prior verification for either flow", async () => {
  for (const [flow, locale] of [["login", "en"], ["signup", "ko"]] as const) {
    const { container, navigationRef, unmount } = renderStudy({ flow, locale, initialPhase: "complete" });
    assert.doesNotMatch(container.textContent ?? "", /No account was created or signed in|계정 생성이나 로그인은 이루어지지 않았어요/);
    let handled = false;
    ui.act(() => { handled = navigationRef.current!.back(); });
    assert.ok(handled, "terminal Back is consumed rather than opening the chooser");
    await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
    assert.equal(phase(container), "complete", "terminal Back never replays verification");
    unmount();
  }
});
