import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient } from "../../lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Entry: typeof import("../../components/Authentication/phone-verification/authentication-entry").AuthenticationEntry;
let Customer: typeof import("../../components/Authentication/member-auth/account-study").MemberAccountStudy;
let Tray: typeof import("../../components/Authentication/phone-verification/verification-tray").VerificationTray;
let TrayTitle: typeof import("../../components/Authentication/phone-verification/verification-tray").VerificationTrayTitle;
const previous = new Map<string, PropertyDescriptor | undefined>();
let finePointer = false;
const pointerListeners = new Set<() => void>();

test("the actual site stylesheet generates important desktop modal animation overrides", async () => {
  const { default: tailwind } = await import("@tailwindcss/postcss");
  const localRequire = createRequire(import.meta.url);
  const tailwindRequire = createRequire(localRequire.resolve("@tailwindcss/postcss"));
  const postcss = tailwindRequire("postcss") as (plugins: ReturnType<typeof tailwind>[]) => {
    process(source: string, options: { from: string }): Promise<{ css: string }>;
  };
  const path = new URL("../../styles/globals.css", import.meta.url);
  const compiled = await postcss([tailwind({ optimize: false })]).process(await readFile(path, "utf8"), { from: path.pathname });
  for (const state of ["open", "closed"]) {
    const utility = state === "open" ? "animate-in" : "animate-out";
    const selector = ".data-\\[authentication-presentation\\=modal\\]\\:data-\\[state\\=" + state + "\\]\\:" + utility + "\\!";
    const position = compiled.css.indexOf(selector);
    assert.ok(position >= 0, "the desktop " + state + " utility is compiled from the actual owner");
    const rule = compiled.css.slice(position, position + 700);
    assert.match(rule, /\[data-authentication-presentation="modal"\]/);
    assert.match(rule, /animation:\s*(?:enter|exit)[^;]*!important/);
  }
  assert.match(compiled.css, /@keyframes enter/);
  assert.match(compiled.css, /@keyframes exit/);

});

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
    "NodeList",
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
  win.matchMedia = (query) => ({
    get matches() { return query === "(hover: hover) and (pointer: fine)" ? finePointer : win.innerWidth >= 640; },
    addListener() {},
    removeListener() {},
    addEventListener(_type: string, listener: unknown) {
      if (query === "(hover: hover) and (pointer: fine)" && typeof listener === "function") pointerListeners.add(listener as () => void);
    },
    removeEventListener(_type: string, listener: unknown) {
      if (typeof listener === "function") pointerListeners.delete(listener as () => void);
    },
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
    await import("../../components/Authentication/phone-verification/authentication-entry")
  ).AuthenticationEntry;
  Customer = (await import("../../components/Authentication/member-auth/account-study")).MemberAccountStudy;
  ({ VerificationTray: Tray, VerificationTrayTitle: TrayTitle } = await import("../../components/Authentication/phone-verification/verification-tray"));
});

const noAction = async () => {};
const chromeClient: MemberClient = {
  status: async () => ({ authenticated: false, emailVerified: false, phoneBound: false, member: false,
    capabilities: { emailOtp: true, magicLink: true, google: false, passkey: true } }),
  clearPhoneIdentifier: noAction, identifyPhone: noAction, sendEmailCode: noAction,
  sendMagicLink: noAction, signInGoogle: noAction, verifyEmailCode: noAction,
  signInPasskey: noAction, addPasskey: noAction, bindPhone: noAction, signOut: noAction,
};

test("standalone verification keeps its own header space rather than inheriting customer chrome", async () => {
  ui.render(<Tray open onOpenChange={() => {}} onCancel={() => {}} cancelLabel="Cancel"
    headingId="standard-verify-heading" descriptionId="standard-verify-description"
    description="Verify a phone number" closeLabel="Close verification" locale="en">
    <TrayTitle><h2 id="standard-verify-heading">Verify your phone</h2></TrayTitle>
  </Tray>);
  const heading = await ui.screen.findByRole("heading", { name: "Verify your phone" });
  const header = heading.closest("[data-verification-sheet]")?.querySelector("[data-verification-content]")?.firstElementChild;
  assert.ok(header);
 assert.ok(header.classList.contains("min-h-18"));
  assert.equal(header.classList.contains("h-0"), false);
  assert.ok(header.classList.contains("font-message"), "standalone typography remains its own presentation");
  assert.equal(header.classList.contains("[font-family:system-ui]"), false);
  const standardClose = heading.closest("[data-verification-sheet]")?.querySelector("[data-authentication-close]")?.parentElement?.parentElement;
  for (const token of ["top-1.5", "right-1.5", "size-11"]) assert.ok(standardClose?.classList.contains(token), "standalone control positioning is unchanged");
});

test("active customer chooser puts its title in useful chrome and aligns both plain choices", async () => {
  ui.render(<Customer client={chromeClient} />);
  const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = heading.closest("[data-verification-sheet]");
  const chrome = sheet?.querySelector("[data-authentication-chrome]");
  assert.ok(chrome?.contains(heading), "the chooser header must carry its title rather than empty space");
  assert.ok(chrome?.classList.contains("[font-family:system-ui]"));
  assert.ok(chrome?.classList.contains("pt-6!"));
  assert.equal(chrome?.classList.contains("h-16"), false, "the title uses natural chrome rather than an empty fixed strip");
  assert.ok(heading.classList.contains("text-[24px]!"));
  assert.ok(heading.classList.contains("leading-[30px]!"));
  assert.ok(heading.classList.contains("text-center!"));
  const panel = sheet?.querySelector("[data-member-account-chooser]");
  assert.ok(panel);
  assert.ok(panel.classList.contains("[font-family:system-ui]"));
  assert.ok(panel.classList.contains("pt-6!"));
  assert.ok(panel.classList.contains("pb-8!"));
  const intro = heading.closest<HTMLElement>("[data-member-account-intro]");
  assert.ok(intro && chrome?.contains(intro), "one vertical header intro owns both heading and explanation");
  assert.ok(intro.classList.contains("flex-col") && intro.classList.contains("gap-2"));
  const description = ui.within(intro).getByText("Log in or create an account.");
  assert.equal(panel.contains(description), false, "the action panel contains actions, not a separated explanation");
  assert.ok(description.classList.contains("m-0!"));
  assert.ok(description.classList.contains("text-center"));
  for (const label of ["Log in", "Sign up"]) {
    const button: HTMLElement = ui.within(panel as HTMLElement).getByRole("button", { name: label });
    assert.equal(button.textContent?.trim(), label);
    assert.ok(button.classList.contains("justify-center"), "chooser actions have centered labels");
    assert.ok(button.classList.contains("h-12") && button.classList.contains("min-h-12"), "both choices are 48px, including their minimum height");
    assert.ok(button.classList.contains("leading-5"));
    assert.ok(button.classList.contains("py-0"), "fixed-height choices have no padding competing with vertical centering");
  }
  assert.ok(ui.within(panel as HTMLElement).getByRole("button", { name: "Sign up" }).classList.contains("mb-0"));
  const handle = sheet?.querySelector("[data-vaul-handle]");
  assert.ok(handle?.classList.contains("hidden!"), "desktop has no draggable drawer handle");
  for (const token of ["data-[authentication-presentation=modal]:data-[state=open]:animate-in!", "data-[authentication-presentation=modal]:data-[state=closed]:animate-out!", "data-[authentication-presentation=modal]:zoom-in-95", "data-[authentication-presentation=modal]:zoom-out-95", "data-[authentication-presentation=modal]:fade-in-0", "data-[authentication-presentation=modal]:fade-out-0", "data-[authentication-presentation=modal]:animation-duration-200", "data-[authentication-presentation=modal]:fill-mode-both"]) {
    assert.ok(sheet?.classList.contains(token), "desktop entrance and exit use the installed modal animation utility " + token);
  }
});

test("a 496px fine-pointer desktop uses only X while a 390px coarse chooser uses only the handle", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 496 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1649 });
  finePointer = true;
  ui.render(<Customer client={chromeClient} />);
  const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = heading.closest<HTMLElement>("[data-verification-sheet]")!;
  assert.equal(sheet.dataset.authenticationPresentation, "modal");
  assert.ok(sheet.querySelector("[data-vaul-handle]")?.classList.contains("hidden!"));
  const close = ui.screen.getByRole("button", { name: "Close account options" });
  assert.equal(close.classList.contains("opacity-0"), false);
  assert.ok(close.classList.contains("focus-visible:outline-none"), "compact keyboard focus stays on the inset disc, not the clipped outer target");
  const disc = close.querySelector("[data-authentication-close-disc]");
  for (const token of ["group-focus-visible:ring-2", "group-focus-visible:ring-inset", "group-focus-visible:ring-neutral-100"]) assert.ok(disc?.classList.contains(token));
  for (const token of ["top-0", "right-0", "size-11"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token), "desktop Close is a 44px corner control independent of the intro");
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 825));
  await ui.act(async () => {
    finePointer = false;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    for (const listener of pointerListeners) listener();
  });
  assert.equal(sheet.dataset.authenticationPresentation, "tray");
  const touchChrome = sheet.querySelector("[data-authentication-chrome]");
  assert.ok(touchChrome?.classList.contains("pt-8!"), "a touch chooser leaves breathing room between its handle and grouped intro");
  assert.equal(touchChrome?.classList.contains("pt-6!"), false);
  for (const token of ["top-0", "right-0", "size-11"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token), "focus-revealed touch Close uses the same higher corner position");
  assert.equal(sheet.querySelector("[data-vaul-handle]")?.classList.contains("hidden!"), false);
  assert.ok(close.classList.contains("opacity-0"), "touch chooser has no redundant visible X; accessible Close remains");
  assert.ok(close.classList.contains("focus:opacity-100"), "any focus reveals the same 44px Close target");
  assert.ok(close.classList.contains("focus:pointer-events-auto"));
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 12));
  close.focus();
  ui.fireEvent.click(close);
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
});

test("resizing between tray and modal preserves the chosen flow and entered email", async () => {
  ui.render(<Customer client={chromeClient} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const input = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(input.disabled, false));
  ui.fireEvent.change(input, { target: { value: "member@example.com" } });
  for (const width of [390, 1280, 639, 640]) {
    await ui.act(async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      window.dispatchEvent(new Event("resize"));
      finePointer = !finePointer;
      for (const listener of pointerListeners) listener();
    });
    assert.equal(ui.screen.getByLabelText("Email address"), input);
    assert.equal(input.value, "member@example.com");
    assert.ok(ui.screen.getByRole("heading", { name: "Log in" }));
  }
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
});

test("a height-clipped touch chooser replaces its handle with the existing visible Close target", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 240 });
  const originalBounds = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.hasAttribute("data-verification-content")
      ? new dom.window.DOMRect(0, 0, 366, 300)
      : originalBounds.call(this);
  };
  try {
    ui.render(<Customer client={chromeClient} />);
    const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
    const sheet = heading.closest<HTMLElement>("[data-verification-sheet]")!;
    assert.equal(sheet.dataset.authenticationPresentation, "tray", "overflow does not switch or remount the tray primitive");
    assert.ok(sheet.querySelector("[data-vaul-handle]")?.classList.contains("hidden!"), "only one visible dismissal affordance remains");
    const close = ui.screen.getByRole("button", { name: "Close account options" });
    for (const token of ["top-0", "right-0", "size-11"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token), "clipped touch chooser keeps its visible Close at the same higher corner");
    assert.equal(close.classList.contains("opacity-0"), false, "short viewports retain a visible 44px tap target rather than only a 12px backdrop strip");
    ui.fireEvent.click(close);
    assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
  } finally {
    ui.cleanup();
    window.HTMLElement.prototype.getBoundingClientRect = originalBounds;
  }
});

test("active focused chrome collapses while Cancel preserves the chooser and its focus return", async () => {
  ui.render(<Customer client={chromeClient} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const heading = await ui.screen.findByRole("heading", { name: "Log in" });
  const sheet = heading.closest<HTMLElement>("[data-verification-sheet]");
  assert.ok(sheet);
  const chrome = sheet.querySelector<HTMLElement>("[data-authentication-chrome]");
  assert.ok(chrome?.classList.contains("h-0"), "focused content must not inherit an empty toolbar strip");
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.width)), 420));
  const cancel = ui.screen.getByRole("button", { name: "Cancel" });
  assert.ok(cancel.classList.contains("text-sm"));
  for (const token of ["top-4", "right-4", "h-11", "w-14"]) assert.ok(cancel.parentElement?.classList.contains(token), "focused Cancel positioning is unchanged");
  ui.fireEvent.keyDown(document, { key: "Escape" });
  assert.ok(ui.screen.getByRole("heading", { name: "Log in" }));
  ui.fireEvent.click(cancel);
  const restored = await ui.screen.findByRole("button", { name: "Log in" });
  await ui.waitFor(() => assert.equal(document.activeElement, restored));
});
afterEach(() => {
  ui.cleanup();
  finePointer = false;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
});
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
