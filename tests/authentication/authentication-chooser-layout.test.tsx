import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MemberClient } from "@/lib/member-auth/client";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Entry: typeof import("@/components/Authentication/phone-verification/authentication-entry").AuthenticationEntry;
let MemberAuthProviders: typeof import("../member-auth/fixtures/providers").MemberAuthProviders;
let Customer: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let Tray: typeof import("@/components/Authentication/phone-verification/verification-tray").VerificationTray;
let TrayTitle: typeof import("@/components/Authentication/phone-verification/verification-tray").VerificationTrayTitle;
let Trial: typeof import("@/components/Authentication/phone-verification/phone-verification-trial").TrialVerificationView;
let VerificationProvider: typeof import("@/components/Authentication/phone-verification/phone-verification").VerificationProvider;
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
  const path = new URL("../../src/styles/globals.css", import.meta.url);
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
  win.document.elementFromPoint = () => null;
  for (const key of [
    "window",
    "self",
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
    const value = (key === "window" || key === "self") ? win : win[key as keyof typeof win];
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
  MemberAuthProviders = (await import("../member-auth/fixtures/providers")).MemberAuthProviders;
  ui = await import("@testing-library/react/pure");
  Entry = (
    await import("@/components/Authentication/phone-verification/authentication-entry")
  ).AuthenticationEntry;
  Customer = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountStudy;
  ({ VerificationTray: Tray, VerificationTrayTitle: TrayTitle } = await import("@/components/Authentication/phone-verification/verification-tray"));
  Trial = (await import("@/components/Authentication/phone-verification/phone-verification-trial")).TrialVerificationView;
  VerificationProvider = (await import("@/components/Authentication/phone-verification/phone-verification")).VerificationProvider;
});

const noAction = async () => {};
const chromeClient: MemberClient = {
  status: async () => ({ authenticated: false, phoneBindingAuth: "anonymous", emailVerified: false, phoneBound: false, member: false,
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
  </Tray>, { wrapper: MemberAuthProviders });
  const heading = await ui.screen.findByRole("heading", { name: "Verify your phone" });
  const header = heading.closest("[data-verification-sheet]")?.querySelector("[data-verification-content]")?.firstElementChild;
  assert.ok(header);
 assert.ok(header.classList.contains("min-h-18"));
  assert.equal(header.classList.contains("h-0"), false);
  assert.ok(header.classList.contains("font-message"), "standalone typography remains its own presentation");
  assert.equal(header.classList.contains("[font-family:system-ui]"), false);
  const standardClose = heading.closest("[data-verification-sheet]")?.querySelector("[data-authentication-close]")?.parentElement?.parentElement;
  for (const token of ["top-1.5", "left-1.5", "size-10"]) assert.ok(standardClose?.classList.contains(token), "standalone desktop Close follows the shared left-side dismissal rule");
});

test("active customer chooser puts its title in useful chrome and aligns both plain choices", async () => {
  ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
  const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = heading.closest("[data-verification-sheet]");
  const chrome = sheet?.querySelector("[data-authentication-chrome]");
  assert.ok(chrome?.contains(heading), "the chooser header must carry its title rather than empty space");
  assert.ok(chrome?.classList.contains("[font-family:system-ui]"));
  assert.ok(chrome?.classList.contains("pt-6!"));
  assert.ok(chrome?.classList.contains("pr-6!"), "desktop chooser has symmetric content insets rather than borrowing close clearance");
  assert.equal(chrome?.classList.contains("pr-16"), false);
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

test("a narrow desktop keeps a 40px left Close while touch uses a 48px left Close and handle", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 496 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1649 });
  finePointer = true;
  ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
  const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = heading.closest<HTMLElement>("[data-verification-sheet]")!;
  assert.equal(sheet.dataset.authenticationPresentation, "modal");
  assert.ok(sheet.querySelector("[data-vaul-handle]")?.classList.contains("hidden!"));
  const close = ui.screen.getByRole("button", { name: "Close account options" });
  assert.equal(close.classList.contains("opacity-0"), false);
  assert.ok(close.classList.contains("focus-visible:outline-none"), "compact keyboard focus stays on the inset disc, not the clipped outer target");
  const disc = close.querySelector("[data-authentication-close-disc]");
  for (const token of ["group-focus-visible:ring-2", "group-focus-visible:ring-inset", "group-focus-visible:ring-neutral-100"]) assert.ok(disc?.classList.contains(token));
  for (const token of ["top-2", "left-2", "size-10"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token), "desktop Close is a 40px control at the same 8px edge inset as the focused flow");
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 825));
  await ui.act(async () => {
    finePointer = false;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    for (const listener of pointerListeners) listener();
  });
  assert.equal(sheet.dataset.authenticationPresentation, "tray");
  const touchChrome = sheet.querySelector("[data-authentication-chrome]");
  assert.ok(touchChrome?.classList.contains("pt-14!"), "the touch chooser groups its intro below the shared dismissal rail");
  assert.ok(touchChrome?.classList.contains("pr-6!"), "the intro must center within symmetric content insets");
  assert.equal(touchChrome?.classList.contains("pt-6!"), false);
  for (const token of ["top-2", "left-2", "size-12"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token), "touch Close belongs in the shared top rail");
  const handle = sheet.querySelector("[data-vaul-handle]")!;
  assert.equal(handle.classList.contains("hidden!"), false);
  assert.ok(handle.classList.contains("!w-10"), "the grabber reads as a deliberate 40px horizontal affordance");
  assert.ok(handle.parentElement?.classList.contains("top-3"), "the wider grabber sits closer to the top at 12px");
  for (const token of ["[&>[data-vaul-handle-hitarea]]:!size-12", "[&>[data-vaul-handle-hitarea]]:!top-3"]) assert.ok(handle.classList.contains(token), "the existing Vaul hit area receives 48px without clipping above the sheet");
  assert.ok(close.classList.contains("size-12"), "touch Close itself, not only its wrapper, has a 48px target");
  assert.equal(close.classList.contains("opacity-0"), false, "touch Close stays visible instead of depending on keyboard focus");
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 12));
  close.focus();
  ui.fireEvent.click(close);
  assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
});

for (const [width, pointer, target] of [
  [393, false, "size-12"],
  [496, true, "size-10"],
  [1024, true, "size-10"]
] as const) {
  test(`customer Close at ${width}px paints its whole target and keeps one edge inset across steps`, async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    finePointer = pointer;
    ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
    const close = await ui.screen.findByRole("button", { name: "Close account options" });
    const corner = close.parentElement?.parentElement;
    assert.ok(corner);
    const disc = close.querySelector("[data-authentication-close-disc]");
    assert.ok(disc);
    assert.ok(disc.classList.contains("inset-0"), "the painted circle must fill the 40px/48px interactive button, not an inset miniature");
    assert.ok(!disc.classList.contains("inset-2"));
    for (const token of ["top-2", "left-2", target]) assert.ok(corner.classList.contains(token));
    assert.ok(close.classList.contains(pointer ? "size-10" : "size-12"));
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
    await ui.screen.findByRole("heading", { name: "Log in" });
    const cancel = ui.screen.getByRole("button", { name: "Cancel" });
    assert.ok(cancel.parentElement?.parentElement === corner, "navigation retains the same chrome owner");
    for (const token of ["top-2", "left-2", target]) assert.ok(corner.classList.contains(token), "changing steps cannot change the close inset or target size");
    const cancelDisc = cancel.querySelector("[data-authentication-close-disc]");
    assert.ok(cancelDisc?.classList.contains("inset-0"), "focused Cancel paints the same full-size circle");
    assert.ok(!corner.classList.contains("top-0") && !corner.classList.contains("top-4"));
    assert.ok(!corner.classList.contains("left-0") && !corner.classList.contains("left-4"));
  });
}

for (const [width, pointer] of [[393, false], [496, true], [1024, true]] as const) {
  for (const choice of ["Log in", "Sign up"]) {
    test(`customer ${choice} at ${width}px keeps one shell silhouette and no extra entrance owner`, async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      finePointer = pointer;
      ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
      const welcome = await ui.screen.findByRole("heading", { name: "Welcome" });
      const sheet = welcome.closest<HTMLElement>("[data-verification-sheet]");
      assert.ok(sheet);
      const expectedWidth = Math.min(420, width - 24);
      const assertSilhouette = async () => {
        await ui.waitFor(() => {
          assert.equal(Math.round(parseFloat(sheet.style.width)), expectedWidth);
          assert.equal(Math.round(parseFloat(sheet.style.borderRadius)), 32);
        });
      };
      await assertSilhouette();
      ui.fireEvent.click(ui.screen.getByRole("button", { name: choice }));
      await ui.waitFor(() => assert.ok(sheet.querySelector("[data-member-account-flow]")));
      assert.ok(sheet.isConnected, "flow selection must not remount the shell");
      await assertSilhouette();
      const panel = sheet.querySelector("[data-member-account-flow]");
      assert.ok(panel?.parentElement?.hasAttribute("data-verification-content"), "the account phase mounts directly inside measured content without another blur/y entrance");
    });
  }
}

test("noncompact desktop verification preserves its distinct chooser and focused geometry", async () => {
  const renderTray = (mode: "chooser" | "focused") => (
    <Tray open {...(mode === "focused" ? { mode, cancelLabel: "Cancel" } : { mode })} onOpenChange={() => {}} onCancel={() => {}}
      headingId="standard-geometry-heading" descriptionId="standard-geometry-description"
      description="Verify a phone number" closeLabel="Close verification" locale="en">
      <TrayTitle><h2 id="standard-geometry-heading">Verify your phone</h2></TrayTitle>
    </Tray>
  );
  const rendered = ui.render(renderTray("chooser"), { wrapper: MemberAuthProviders });
  const heading = await ui.screen.findByRole("heading", { name: "Verify your phone" });
  const sheet = heading.closest<HTMLElement>("[data-verification-sheet]");
  assert.ok(sheet);
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.width)), 380));
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.borderRadius)), 32));
  rendered.rerender(renderTray("focused"));
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.width)), 460));
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.borderRadius)), 24));
});

test("focused desktop centers login heading and subtitle without shifting aligned form fields", async () => {
  ui.render(<Customer client={chromeClient} initialFlow="login" />, { wrapper: MemberAuthProviders });
  const heading = await ui.screen.findByRole("heading", { name: "Log in" });
  const intro = heading.closest<HTMLElement>("[data-phase-intro]")!;
  assert.ok(intro.classList.contains("text-center"), "login heading and subtitle share the centered surface axis");
  assert.ok(!intro.classList.contains("pl-14"), "login must not borrow asymmetric close-button clearance");
  assert.ok(intro.firstElementChild?.classList.contains("justify-center"));
  assert.ok(!intro.parentElement?.classList.contains("text-center"), "centering the intro must not center the field labels");
  assert.equal(heading.classList.contains("pr-14"), false);
  const input = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(input.disabled, false));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  const recovery = await ui.screen.findByRole("heading", { name: "Account recovery" });
  assert.ok(recovery.classList.contains("text-center!"));
  assert.equal(recovery.classList.contains("pr-14"), false);
});

test("standalone touch trays retain the shared left 48px dismissal target", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 393 });
  ui.render(<Tray open onOpenChange={() => {}} onCancel={() => {}} cancelLabel="Cancel"
    headingId="standard-touch-heading" descriptionId="standard-touch-description"
    description="Verify a phone number" closeLabel="Close verification" locale="en">
    <TrayTitle><h2 id="standard-touch-heading">Verify your phone</h2></TrayTitle>
  </Tray>, { wrapper: MemberAuthProviders });
  const close = await ui.screen.findByRole("button", { name: "Cancel" });
  assert.ok(close.classList.contains("size-12"));
  for (const token of ["top-1.5", "left-1.5", "size-12"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token));
});

test("resizing between tray and modal preserves the chosen flow and entered email", async () => {
  ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const input = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(input.disabled, false));
  ui.fireEvent.change(input, { target: { value: "member@example.com" } });
  for (const [width, pointer, presentation] of [
    [390, false, "tray"],
    [1280, false, "modal"],
    [639, false, "tray"],
    [639, true, "modal"],
    [640, false, "modal"]
  ] as const) {
    await ui.act(async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      window.dispatchEvent(new Event("resize"));
      finePointer = pointer;
      for (const listener of pointerListeners) listener();
    });
    assert.equal(ui.screen.getByLabelText("Email address"), input);
    assert.equal(input.value, "member@example.com");
    assert.ok(ui.screen.getByRole("heading", { name: "Log in" }));
    const sheet = input.closest<HTMLElement>("[data-verification-sheet]");
    assert.ok(sheet);
    assert.equal(sheet.getAttribute("data-authentication-presentation"), presentation);
    if (presentation === "tray") {
      await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 12));
    }
  }
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
});

test("focused touch auth keeps its dismiss handle above a changing visual viewport", async () => {
  const originalViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");
  const viewport = new window.EventTarget();
  Object.defineProperties(viewport, {
    height: { configurable: true, value: 852 },
    offsetTop: { configurable: true, value: 0 }
  });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 393 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 852 });
  finePointer = false;
  try {
    ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
    const chooser = (await ui.screen.findByRole("heading", { name: "Welcome" })).closest<HTMLElement>("[data-verification-sheet]");
    assert.ok(chooser);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
    const input = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
    await ui.waitFor(() => assert.equal(input.disabled, false));
    const sheet = input.closest<HTMLElement>("[data-verification-sheet]");
    assert.ok(sheet);
    assert.ok(sheet === chooser, "choosing a flow must retain the same Vaul surface");
    assert.equal(sheet.dataset.authenticationMode, "focused");
    assert.equal(sheet.getAttribute("data-authentication-presentation"), "tray");
    await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 12));
    ui.fireEvent.change(input, { target: { value: "member@example.com" } });
    await ui.act(async () => {
      Object.defineProperty(viewport, "height", { configurable: true, value: 400 });
      Object.defineProperty(viewport, "offsetTop", { configurable: true, value: 44 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
      viewport.dispatchEvent(new window.Event("resize"));
      viewport.dispatchEvent(new window.Event("scroll"));
    });
    await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.bottom)), 412));
    await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.maxHeight)), 376));
    assert.ok(ui.screen.getByLabelText("Email address") === input);
    assert.equal(input.value, "member@example.com");
    ui.fireEvent.keyDown(document, { key: "Escape" });
    assert.ok(ui.screen.getByRole("heading", { name: "Log in" }));
    assert.ok(ui.screen.getByRole("button", { name: "Cancel" }));
    const handle = sheet.querySelector("[data-vaul-handle]");
    assert.ok(handle);
    assert.equal(Boolean(handle.closest("[inert]")), false, "focused mobile trays retain their usable swipe handle");
    assert.equal(handle.classList.contains("hidden!"), false);
    const chrome = sheet.querySelector("[data-authentication-chrome]");
    assert.equal(chrome?.classList.contains("h-0"), false, "the 40px native handle hit area needs real chrome space");
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
    assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null, "mobile X dismisses to the caller rather than a chooser");
    assert.equal(ui.screen.queryByRole("heading", { name: "Log in" }), null);
  } finally {
    ui.cleanup();
    if (originalViewport) Object.defineProperty(window, "visualViewport", originalViewport);
    else Reflect.deleteProperty(window, "visualViewport");
  }
});

for (const width of [393, 496, 639]) {
  test(`touch auth at ${width}px keeps fixed horizontal edges and calmer flow entry`, async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 852 });
    ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
    const sheet = (await ui.screen.findByRole("heading", { name: "Welcome" })).closest<HTMLElement>("[data-verification-sheet]")!;
    await ui.waitFor(() => assert.ok(parseFloat(sheet.style.width) > 0));
    const chooserWidth = parseFloat(sheet.style.width);
    const chooserRadius = sheet.style.borderRadius;
    assert.ok(sheet.classList.contains("data-[authentication-presentation=tray]:backdrop-blur-[2px]"));
    const overlay = document.querySelector<HTMLElement>("[data-vaul-overlay]");
    assert.equal(overlay?.dataset.authenticationPresentation, "tray");
    assert.ok(overlay?.classList.contains("data-[authentication-presentation=tray]:backdrop-blur-[0.5px]"), "the original caller remains clearly discernible behind the mobile tray");
    assert.equal(overlay.classList.contains("data-[authentication-presentation=tray]:backdrop-blur-[2px]"), false);
    assert.equal(sheet.classList.contains("overflow-y-auto"), true, "content remains scrollable when capped");
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
    const input = await ui.screen.findByLabelText("Email address");
    await ui.waitFor(() => assert.equal((input as HTMLInputElement).disabled, false));
    await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 250)); });
    assert.equal(parseFloat(sheet.style.width), chooserWidth, "chooser and focused mobile edges are identical");
    assert.equal(sheet.style.borderRadius, chooserRadius, "mobile radius stays anchored rather than morphing");
    const flow = sheet.querySelector("[data-member-account-flow]")!;
    const entry = flow.parentElement!;
    assert.ok(!entry.style.filter || entry.style.filter === "none", "mobile flow entry does not add a blur owner");
    assert.ok(!entry.style.transform || entry.style.transform === "none", "Vaul alone moves the mobile shell; the entry does not translate");
    const phase = sheet.querySelector<HTMLElement>("[data-account-phase-body]")!;
    assert.ok(!phase.style.transform || phase.style.transform === "none", "mobile phase transition has no vertical translation");
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
    assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
  });
}

test("mobile phone phases fade without moving their content vertically", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 393 });
  const challenge = { id: "mobile-motion-proof", recipient: "verify@example.com", body: "TEST", expiresAt: "2041-01-01T00:05:00.000Z", mode: "trial" as const };
  const renderPhone = (active: boolean, error: "status" | null = null) => (
    <VerificationProvider initialLocale="en">
      <Tray open mode="focused" cancelLabel="Cancel" onOpenChange={() => {}} onCancel={() => {}} headingId="mobile-phone-heading" descriptionId="mobile-phone-description" description="Phone verification" closeLabel="Close" locale="en">
        <Trial headingId="mobile-phone-heading" presentation="registration" platform="ios" snapshot={{
          challenge: active ? challenge : null,
          status: active ? { id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" } : null,
          busy: false, error
        }} onStart={() => {}} onRefresh={() => {}} onReset={() => {}} onExpire={() => {}} />
      </Tray>
    </VerificationProvider>
  );
  const view = ui.render(renderPhone(false), { wrapper: MemberAuthProviders });
  const phoneHeading = await ui.screen.findByRole("heading", { name: "Verify your phone" });
  assert.equal(phoneHeading.classList.contains("pr-14"), false, "mobile phone titles do not reserve space for the close control in the rail");
  const oldForm = phoneHeading.closest("section")!.querySelector("form")!;
  view.rerender(renderPhone(true));
  assert.equal(oldForm.isConnected, false, "phone destination mounts immediately instead of waiting for an outgoing phase");
  assert.equal(phoneHeading.isConnected, false, "phone heading and body change together");
  const compose = ui.screen.getByRole("link", { name: /Open Messages/ });
  const enteringPhase = compose.closest<HTMLElement>("[data-trial-phase]")!;
  assert.ok(enteringPhase?.contains(ui.screen.getByRole("heading", { name: "Send verification message" })), "the incoming subtree owns both heading and actions");
  assert.ok(!enteringPhase.style.transform || enteringPhase.style.transform === "none", "the next phone phase has no y entrance");
  view.rerender(renderPhone(true, "status"));
  const error = document.querySelector<HTMLElement>("[data-trial-error]")!;
  assert.ok(error);
  assert.equal(error.style.height, "", "phone error does not animate a second intrinsic-height owner");
  view.rerender(renderPhone(true));
  assert.ok(document.querySelector("[data-trial-error]") === null, "cleared feedback leaves no retained exit-height animation");
});

test("standalone phone privacy disclosure stays open across phone phase changes", () => {
  const challenge = { id: "privacy-phase-proof", recipient: "verify@example.com", body: "TEST", expiresAt: "2041-01-01T00:05:00.000Z", mode: "trial" as const };
  const phone = (state: "pending" | "review" | null) => (
    <VerificationProvider initialLocale="en">
      <Trial platform="ios" snapshot={{
        challenge: state ? challenge : null,
        status: state ? { id: challenge.id, state, expiresAt: challenge.expiresAt, mode: "trial" } : null,
        busy: false, error: null
      }} onStart={() => {}} onRefresh={() => {}} onReset={() => {}} onExpire={() => {}} />
    </VerificationProvider>
  );
  const rendered = ui.render(phone(null), { wrapper: MemberAuthProviders });
  const privacy = ui.screen.getByRole("button", { name: "Privacy & test details" });
  ui.fireEvent.click(privacy);
  assert.equal(privacy.getAttribute("aria-expanded"), "true");
  for (const state of ["pending", "review"] as const) {
    rendered.rerender(phone(state));
    assert.ok(ui.screen.getByRole("button", { name: "Privacy & test details" }) === privacy, "privacy disclosure does not remount with the active phone phase");
    assert.equal(privacy.getAttribute("aria-expanded"), "true", "polling phases must not collapse an opened disclosure");
  }
});

test("a height-clipped touch chooser replaces its handle with the existing visible Close target", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 240 });
const originalHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "offsetHeight")!;
Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", {
configurable: true,
get() { return this.hasAttribute("data-verification-content") ? 300 : originalHeight.get!.call(this); }
});
  try {
    ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
    const heading = await ui.screen.findByRole("heading", { name: "Welcome" });
    const sheet = heading.closest<HTMLElement>("[data-verification-sheet]")!;
    assert.equal(sheet.dataset.authenticationPresentation, "tray", "overflow does not switch or remount the tray primitive");
    assert.ok(sheet.querySelector("[data-vaul-handle]")?.classList.contains("hidden!"), "only one visible dismissal affordance remains");
    const close = ui.screen.getByRole("button", { name: "Close account options" });
    for (const token of ["top-2", "left-2", "size-12"]) assert.ok(close.parentElement?.parentElement?.classList.contains(token), "clipped touch chooser keeps the same dismissal rail geometry");
    assert.equal(close.classList.contains("opacity-0"), false, "short viewports retain a visible 48px tap target rather than only a 12px backdrop strip");
    ui.fireEvent.click(close);
    assert.equal(ui.screen.queryByRole("heading", { name: "Welcome" }), null);
  } finally {
    ui.cleanup();
Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", originalHeight);
  }
});

test("active focused chrome collapses while Cancel preserves the chooser and its focus return", async () => {
  ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
  const close = await ui.screen.findByRole("button", { name: "Close account options" });
  const closeIcon = close.querySelector("svg");
  assert.ok(closeIcon);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Log in" }));
  const heading = await ui.screen.findByRole("heading", { name: "Log in" });
  const sheet = heading.closest<HTMLElement>("[data-verification-sheet]");
  assert.ok(sheet);
  const chrome = sheet.querySelector<HTMLElement>("[data-authentication-chrome]");
  assert.ok(chrome?.classList.contains("h-0"), "focused content must not inherit an empty toolbar strip");
  await ui.waitFor(() => assert.equal(Math.round(parseFloat(sheet.style.width)), 420));
  const cancel = ui.screen.getByRole("button", { name: "Cancel" });
  assert.equal(cancel.textContent?.trim(), "", "the icon-style Cancel control has no visible word label");
  assert.equal(cancel.getAttribute("aria-label"), "Cancel", "flow cancellation retains its distinct accessible action");
  const cancelIcon = cancel.querySelector("svg");
  assert.ok(cancelIcon);
  assert.equal(cancelIcon.outerHTML, closeIcon.outerHTML, "chooser Close and focused Cancel use one X treatment");
  for (const token of ["size-10", "rounded-full"]) {
    assert.ok(cancel.classList.contains(token) && close.classList.contains(token), "both controls retain a circular 40px target");
  }
  const corner = cancel.parentElement?.parentElement;
  for (const token of ["top-2", "left-2", "size-10"]) assert.ok(corner?.classList.contains(token), "focused Cancel keeps the chooser's 8px edge inset");
  assert.equal(corner?.classList.contains("w-14"), false);
  const disc = cancel.querySelector("[data-authentication-close-disc]");
  assert.ok(disc?.classList.contains("group-focus-visible:ring-2"), "the icon-only action keeps a visible keyboard focus ring");
  ui.fireEvent.keyDown(document, { key: "Escape" });
  assert.ok(ui.screen.getByRole("heading", { name: "Log in" }));
  ui.fireEvent.click(cancel);
  const restored = await ui.screen.findByRole("button", { name: "Log in" });
  await ui.waitFor(() => assert.equal(document.activeElement, restored));
});


test("mobile auth has one stable dismissal rail and no phantom heading clearance", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 393 });
  ui.render(<Customer client={chromeClient} />, { wrapper: MemberAuthProviders });
  const welcome = await ui.screen.findByRole("heading", { name: "Welcome" });
  const sheet = welcome.closest<HTMLElement>("[data-verification-sheet]")!;
  const chrome = sheet.querySelector<HTMLElement>("[data-authentication-chrome]")!;
  const close = ui.screen.getByRole("button", { name: "Close account options" });
  const chooserCorner = close.parentElement?.parentElement?.className;
  assert.ok(chrome.classList.contains("pr-6!"), "chooser title and actions share symmetric insets");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Log in" }));
  const input = await ui.screen.findByLabelText("Email address") as HTMLInputElement;
  await ui.waitFor(() => assert.equal(input.disabled, false));
  assert.equal(ui.screen.getByRole("button", { name: "Cancel" }).parentElement?.parentElement?.className, chooserCorner, "the X cannot jump between phases");
  assert.ok(chrome.classList.contains("h-14"), "one 56px rail owns the close target and grabber");
  const panel = sheet.querySelector<HTMLElement>("[data-member-account-flow]")!;
  assert.ok(panel.classList.contains("!pt-0"), "content must not add a second toolbar-sized top gap");
  const heading = ui.screen.getByRole("heading", { name: "Log in" });
  assert.equal(heading.classList.contains("pr-14"), false, "a close target above the content needs no phantom inline clearance");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Can’t sign in?" }));
  const recovery = await ui.screen.findByRole("heading", { name: "Account recovery" });
  assert.equal(recovery.classList.contains("pr-14"), false);
  assert.ok(recovery.closest("[data-account-recovery]")?.classList.contains("pt-0!"), "recovery follows the same mobile title rhythm");
});

for (const width of [393, 1024]) {
  test(`unavailable auth at ${width}px places refresh inline before credential actions`, async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    const unavailableClient: MemberClient = {
      ...chromeClient,
      status: async () => { throw new Error("Private status lookup failed"); }
    };
    ui.render(<Customer client={unavailableClient} initialFlow="login" />, { wrapper: MemberAuthProviders });
    const refresh = await ui.screen.findByRole("button", { name: "Refresh account status" });
    const help = ui.screen.getByRole("button", { name: "Can’t sign in?" });
    assert.ok(help.classList.contains("mx-auto"), "the help action defines the secondary-action axis");
    assert.equal(refresh.classList.contains("mx-auto"), false, "refresh is beside its feedback, not a centered footer action");
    assert.ok(refresh.parentElement?.hasAttribute("data-account-feedback-row"), "one feedback row owns the refresh action");
    assert.ok(refresh.classList.contains(width < 640 ? "size-12" : "size-11"), "retry keeps input-aware 48px/44px targets");
  });
}

test("pending registration gives one concise phone-verification instruction", async () => {
  const pendingClient: MemberClient = {
    ...chromeClient,
    status: async () => ({ authenticated: true, phoneBindingAuth: "ready", emailVerified: true, phoneBound: false, member: false,
      capabilities: { emailOtp: true, magicLink: true, google: false, passkey: true } })
  };
  ui.render(<Customer client={pendingClient} initialFlow="login" />, { wrapper: MemberAuthProviders });
  assert.ok(await ui.screen.findByText("Verify your phone to finish."));
  assert.equal(ui.screen.queryByText(/You’re signed in, but registration isn’t finished/), null);
  assert.ok(ui.screen.getByRole("button", { name: "Continue registration" }));
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
  ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />, { wrapper: MemberAuthProviders });
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
  ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />, { wrapper: MemberAuthProviders });
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
  ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />, { wrapper: MemberAuthProviders });
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
    />, { wrapper: MemberAuthProviders }
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
    ui.render(<Entry open onOpenChange={() => {}} initialLocale="en" />, { wrapper: MemberAuthProviders });
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
