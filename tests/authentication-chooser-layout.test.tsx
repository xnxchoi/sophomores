import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Entry: typeof import("../components/phone-verification/authentication-entry").AuthenticationEntry;
const previous = new Map<string, PropertyDescriptor | undefined>();

function expose(key: string, value: unknown) {
  previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/studies/verification",
    pretendToBeVisual: true
  });
  const win = dom.window;
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
    const value = key === "window" ? win : win[key as keyof typeof win];
    expose(
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
  expose(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  expose("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(win.HTMLElement.prototype, "scrollIntoView", {
    value() {}
  });
  ui = await import("@testing-library/react/pure");
  Entry = (
    await import("../components/phone-verification/authentication-entry")
  ).AuthenticationEntry;
});
afterEach(() => ui.cleanup());
after(() => {
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("chooser leads with primary Sign up, separates Or, and makes Log in secondary", async () => {
  ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />);
  const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = heading.closest("[data-verification-sheet]");
  const panel = sheet?.querySelector<HTMLElement>(
    "[data-authentication-entry]"
  );
  assert.ok(panel);
  assert.ok(
    !panel.contains(heading),
    "chooser title belongs in the tray header, not a second content row"
  );
  const choices = [
    ...panel.querySelectorAll<HTMLButtonElement>("[data-authentication-choice]")
  ];
  assert.deepEqual(
    choices.map((button) => button.dataset.authenticationChoice),
    ["signup", "login"]
  );
  assert.ok(
    choices[0].classList.contains("bg-white"),
    "Sign up is the white primary action"
  );
  assert.ok(
    !choices[1].classList.contains("bg-white"),
    "Log in is visually secondary"
  );
  const separator = ui.within(panel).getByText("Or", { exact: true });
  assert.ok(
    choices[0].compareDocumentPosition(separator) &
      Node.DOCUMENT_POSITION_FOLLOWING
  );
  assert.ok(
    separator.compareDocumentPosition(choices[1]) &
      Node.DOCUMENT_POSITION_FOLLOWING
  );
  assert.equal(
    ui.within(panel).queryByText("Log in or create an account."),
    null
  );
});

test("language is a compact native footer select, not a pair of competing actions", async () => {
  ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />);
  await ui.screen.findByRole("heading", { name: "Welcome" });
  const language = ui.screen.queryByRole("combobox", { name: "Language" });
  assert.ok(language, "native language select must be available");
  assert.equal(language.tagName, "SELECT");
  assert.equal((language as HTMLSelectElement).value, "en");
  const footer = language.closest("[data-authentication-locale]");
  assert.ok(footer);
  assert.equal(footer.querySelectorAll("button").length, 0);
  const login = ui.screen.getByRole("button", { name: "Log in" });
  assert.ok(
    login.compareDocumentPosition(language) & Node.DOCUMENT_POSITION_FOLLOWING
  );
  ui.fireEvent.change(language, { target: { value: "ko" } });
  assert.ok(await ui.screen.findByRole("button", { name: "회원가입" }));
  assert.ok(ui.screen.getByRole("button", { name: "로그인" }));
  const korean = ui.screen.getByRole("combobox", { name: "언어" });
  assert.equal((korean as HTMLSelectElement).value, "ko");
  ui.fireEvent.change(korean, { target: { value: "en" } });
  assert.ok(await ui.screen.findByRole("button", { name: "Sign up" }));
});

test("chooser uses plain matching action labels and a text-only alternative divider, with no tray wordmark", async () => {
  ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />);
  const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = heading.closest("[data-verification-sheet]");
  assert.ok(sheet);
  assert.equal(sheet.querySelector("[data-brand-mark]"), null);
  assert.doesNotMatch(sheet.textContent ?? "", /sophomores/i);
  for (const [choice, label] of [
    ["signup", "Sign up"],
    ["login", "Log in"]
  ]) {
    const button: HTMLButtonElement | null =
      sheet.querySelector<HTMLButtonElement>(
        `[data-authentication-choice="${choice}"]`
      );
    assert.ok(button);
    assert.equal(
      button.textContent?.trim(),
      label,
      "both action labels must stand alone without mismatched icons"
    );
  }
  const separator = sheet.querySelector("[data-authentication-alternative]");
  assert.ok(separator);
  assert.equal(separator.textContent?.trim(), "Or");
  assert.equal(
    separator.querySelectorAll('[aria-hidden="true"]').length,
    0,
    "no ornamental divider rules"
  );
});

test("chooser close remains a native dismiss action with a localized accessible name", async () => {
  const changes: boolean[] = [];
  ui.render(
    <Entry
      open
      onOpenChange={(open) => changes.push(open)}
      initialLocale="en"
    />
  );
  const close = await ui.screen.findByRole("button", {
    name: "Close account options"
  });
  assert.equal(close.getAttribute("type"), "button");
  ui.fireEvent.click(close);
  assert.deepEqual(changes, [false]);
});

for (const [choice, heading] of [
  ["Sign up", "Verify your phone"],
  ["Log in", "Log in"]
] as const) {
  test(`${choice} still opens its own focused flow and restores the selected action on return`, async () => {
    ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />);
    const action = await ui.screen.findByRole("button", { name: choice });
    ui.fireEvent.click(action);
    const focusedHeading = await ui.screen.findByRole("heading", {
      name: heading
    });
    const sheet = focusedHeading.closest("[data-verification-sheet]");
    assert.ok(sheet);
    assert.equal(sheet.querySelector("[data-brand-mark]"), null);
    assert.doesNotMatch(sheet.textContent ?? "", /sophomores/i);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
    const restored = await ui.screen.findByRole("button", { name: choice });
    await ui.waitFor(() => assert.equal(document.activeElement, restored));
  });
}
