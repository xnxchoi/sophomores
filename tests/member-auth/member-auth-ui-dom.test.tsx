import messages from "../../messages/en.json";
import { codeCell, codeCells, enteredCode, firstCodeCell, replaceCode } from "../fixtures/code-input";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { untilAsserted } from "../support/dom-state";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";

let MemberAuthProviders: typeof import("./fixtures/providers").MemberAuthProviders;
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
let SignIn: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountPage;
let Sheet: typeof import("@/components/auth/account-sheet");
let SheetHooks: typeof import("@/components/auth/use-account-sheet");
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
  SignIn = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountPage;
  Sheet = await import("@/components/auth/account-sheet");
  SheetHooks = await import("@/components/auth/use-account-sheet");
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
  phoneBindingAuth: "anonymous",
  authenticated: false,
  emailVerified: false,
  phoneBound: false,
  member: false,
  capabilities: { apple: false, kakao: false, emailOtp: true, magicLink: true, google: true, passkey: true }
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
    lookupEmail: async () => ({ account: "existing" }),
    sendEmailCode: action("code"),
    sendMagicLink: action("link"),
    signInSocial: action("google"),
    verifyEmailCode: async (...args) => {
      calls.push(["verify", ...args]);
      status = { ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true };
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
  name: "Sign in" | "Sign up",
  c: ReturnType<typeof client>
) {
  const rendered = ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name }));
  await untilAsserted(ui, () =>
    assert.equal(
      (ui.screen.getByLabelText(/^Email(?: address)?$/) as HTMLInputElement).disabled,
      false
    )
  );
  return rendered;
}
test("login requires explicit registration continuation for an incomplete authenticated account", async () => {
  const c = client();
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  const server = phoneServer();
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
  await untilAsserted(ui, () =>
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
  const setupDescription = await untilAsserted(ui, () => ui.screen.getByText("Verify your phone to finish."));
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
  await untilAsserted(ui, () =>
    assert.ok(
      ui.screen.queryByRole("button", { name: "Continue registration" })
    )
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Continue registration" })
  );
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }))
  );
  assert.equal(ui.screen.getByRole("button", { name: "Switch account" }).classList.contains("w-full"), false,
    "the intro-only footer treatment must not change the phone form");
  const phoneHeading = ui.screen.getByRole("heading", { name: "Verify your phone to finish" });
  assert.equal(phoneHeading.classList.contains("mt-0!"), false);
  assert.equal(phoneHeading.classList.contains("mb-2!"), false);
  await untilAsserted(ui, () => assert.equal(document.activeElement?.id, "member-phone-heading"));
  assert.equal(
    server.calls.length,
    0,
    "continuing must not issue a challenge automatically"
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
  assert.equal(server.calls.length, 0, "closing must not create a phone challenge");
});

test("provider return defaults to an explicit setup gate, not automatic phone verification", async () => {
  const c = client();
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  const server = phoneServer();
  const route = await readFile(
    new URL("../../src/app/(site)/account/continue/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(route, /initialFlow="login"/);
  ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  await untilAsserted(ui, () =>
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
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Switch account" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("heading", { name: messages.AuthPhase.login }))
  );
  assert.ok(c.calls.some(([name]) => name === "signout"));
  assert.equal(
    ui.screen.queryByRole("textbox", { name: "Phone number" }),
    null
  );
});

test("account sign-in: Enter in the email field does what the visible primary button does, once; typing fires nothing", async () => {
  // Owner, 24 Nov: Enter must submit. jsdom has no keyboard implicit submission, so Enter is its native effect:
  // requestSubmit() on the field's own form, whose submit button is the visible primary button.
  const c = client();
  const lookups: string[] = [];
  c.value.lookupEmail = async (email) => { lookups.push(email); return { account: "existing" }; };
  await choose("Sign in", c);
  const email = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  email.focus();
  ui.fireEvent.change(email, { target: { value: "enter@example.com" } });
  assert.deepEqual(lookups, [], "typing looks nothing up");
  const primary = document.querySelector<HTMLButtonElement>("[data-phase-action=submit]")!;
  assert.equal(primary.type, "submit");
  assert.equal(primary.form === email.form, true);
  ui.act(() => email.form!.requestSubmit());
  await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" }));
  assert.deepEqual(lookups, ["enter@example.com"], "the first Enter looks the email up once");
  assert.deepEqual(c.calls.filter(([name]) => name === "code"), [], "no code before the second explicit submit");
  assert.equal(document.activeElement === email, true, "focus stays in the field, so the next Enter reaches the form");
  ui.act(() => email.form!.requestSubmit());
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  assert.deepEqual(c.calls.filter(([name]) => name === "code"), [["code", "enter@example.com"]], "the second Enter sends the code once");
});

test("once an email is in, the other ways in become one row of icon-only buttons; clearing brings the labels back", async () => {
  // Owner, 24 Nov: "Once email is in, we make the passkey and others compact-1 row of 3 smaller buttons, each with
  // icons only". The accessible names stay; the visible labels go; nothing is looked up or sent while typing.
  const c = client();
  const lookups: string[] = [];
  c.value.lookupEmail = async (email) => { lookups.push(email); return { account: "existing" }; };
  await choose("Sign in", c);
  const row = () => document.querySelector<HTMLElement>("[data-account-entry-alternatives]")!;
  const alternatives = () => [...row().querySelectorAll<HTMLButtonElement>("button")];
  await untilAsserted(ui, () => assert.ok(alternatives().length >= 2));
  assert.equal(row().dataset.compact, "false", "empty field: the labelled stack");
  const labelled = alternatives().map((button) => [button.getAttribute("aria-label"), button.textContent?.trim()]);
  for (const [name, text] of labelled) assert.ok(name && text && text.length > 0, `${name} shows its label`);
  const email = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  await untilAsserted(ui, () => assert.equal(row().dataset.compact, "true"));
  // Arc's button crossfades its label out; wait for the exit to finish.
  await untilAsserted(ui, () => {
    for (const button of alternatives()) {
      assert.ok(button.getAttribute("aria-label"), "each icon button keeps its accessible name");
      assert.equal(button.textContent?.trim(), "", `${button.getAttribute("aria-label")} shows its icon only`);
    }
  });
  assert.deepEqual(alternatives().map((button) => button.getAttribute("aria-label")), labelled.map(([name]) => name), "same buttons, same order");
  assert.deepEqual(lookups, [], "typing looks nothing up");
  // Review-B: the clip must not cut the 2px outline + 2px offset focus ring, and Arc's .lg padding must not squeeze
  // the icons (its unlayered padding-inline needs the important utility).
  const shell = row().closest<HTMLElement>("[data-account-alternatives-shell]")!;
  assert.equal(shell.classList.contains("-m-1") && row().classList.contains("p-1"), true, "4px ring clearance inside the clip");
  assert.equal(alternatives().every((button) => button.classList.contains("px-0!")), true, "icon buttons drop Arc's padding");
  ui.fireEvent.change(email, { target: { value: "" } });
  await untilAsserted(ui, () => assert.equal(row().dataset.compact, "false"));
  await untilAsserted(ui, () => assert.deepEqual(alternatives().map((button) => [button.getAttribute("aria-label"), button.textContent?.trim()]), labelled, "the labels come back"));
});

test("the sign-in page renders the chooser and flow inline, never a sheet, and leaves for next once a member", async () => {
  // Owner, 24 Nov: a signed-out /account redirects to /sign-in; no modal. Sign-in returns to where they were.
  const c = client();
  c.value.verifyEmailCode = async (...args) => { c.calls.push(["verify", ...args]); c.setStatus(active); };
  const visited: string[] = [];
  ui.render(<SignIn next="/me/orders" client={c.value} navigate={(url) => visited.push(url)} />, { wrapper: MemberAuthProviders });
  assert.ok(ui.screen.getByRole("heading", { name: "Welcome" }));
  assert.equal(document.querySelector("[data-vaul-drawer], [role=dialog]") === null, true, "no sheet or dialog");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
  const email = await untilAsserted(ui, () => {
    const field = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(field.disabled, false);
    return field;
  });
  assert.equal(document.querySelector("[data-vaul-drawer], [role=dialog]") === null, true, "the flow is inline too");
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  ui.fireEvent.submit(email.closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  assert.deepEqual(visited, [], "nothing leaves before the member is confirmed");
  ui.fireEvent.change(firstCodeCell(ui.screen), { target: { value: "A1B2C3" } });
  await untilAsserted(ui, () => assert.deepEqual(visited, ["/me/orders"]));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(visited, ["/me/orders"], "it leaves once");
});

test("a signed-in /account is a normal page: the member's account inline, no sheet, no navigation away", async () => {
  // Owner, 24 Nov: "OBVIOUSLY it should be the normal page".
  const c = client();
  c.setStatus(active);
  const visited: string[] = [];
  ui.render(<SignIn initialFlow="login" client={c.value} navigate={(url) => visited.push(url)} authenticatedAction={<a href="/me">Account home</a>} />, { wrapper: MemberAuthProviders });
  await untilAsserted(ui, () => ui.screen.getByRole("link", { name: "Account home" }));
  assert.equal(document.querySelector("[data-vaul-drawer], [role=dialog]") === null, true);
  assert.equal(document.querySelector("[data-member-account-page]") !== null, true);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(visited, [], "the account page has no next: it never navigates away");
});

test("a signed-in /account whose status check fails shows the account with a retry, never the sign-in step", async () => {
  // Owner, 26 Nov, signed in through /vault: "Account page shoulda fucking should show the account page when logged
  // in". The preview's status call was refused (403), and the page fell back to the sign-in step's "Sign-in is
  // unavailable". The server already knew he was signed in.
  const c = client();
  c.setStatus(active);
  const read = c.value.status;
  let refused = true;
  c.value.status = async () => { if (refused) throw new Error("403"); return read(); };
  ui.render(<SignIn initialFlow="login" signedIn client={c.value} navigate={() => {}} authenticatedAction={<a href="/me">Account home</a>} />, { wrapper: MemberAuthProviders });
  const retry = await untilAsserted(ui, () => ui.screen.getByRole("button", { name: messages.MemberAuth.refreshAccountStatus }));
  ui.screen.getByText(messages.MemberAuth.weCouldntLoadYourAccountTryAgain);
  ui.screen.getByRole("heading", { name: messages.MemberAuth.yourAccount });
  assert.equal(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null, true, "no sign-in form");
  assert.equal(ui.screen.queryByText(messages.AuthPhase.failures.unavailable) === null, true, "no sign-in failure");
  assert.equal(ui.screen.queryByRole("button", { name: messages.MemberAuth.cancel }) === null, true, "signed in: nothing to go back to");
  refused = false;
  ui.fireEvent.click(retry);
  await untilAsserted(ui, () => ui.screen.getByRole("link", { name: "Account home" }));
  ui.screen.getByText(messages.MemberAuth.accountReady);
});

test("a signed-in /account shows no sign-in form while its status is still loading", async () => {
  const c = client();
  let release!: () => void;
  const read = c.value.status;
  c.value.status = async () => { await new Promise<void>((resolve) => { release = resolve; }); return read(); };
  c.setStatus(active);
  ui.render(<SignIn initialFlow="login" signedIn client={c.value} navigate={() => {}} />, { wrapper: MemberAuthProviders });
  await untilAsserted(ui, () => assert.equal(typeof release, "function"));
  assert.equal(ui.screen.queryByLabelText(/^Email(?: address)?$/) === null, true);
  ui.screen.getByRole("heading", { name: messages.MemberAuth.yourAccount });
  ui.act(() => release());
  await untilAsserted(ui, () => ui.screen.getByText(messages.MemberAuth.accountReady));
});

test("a sign-in button opens the in-place sheet on a plain click and keeps its sign-in page href", async () => {
  // Owner, 24 Nov: "Sign-in buttons should in general be modal-togglers"; only a typed or navigated URL gets the page.
  const { AccountSheetProvider } = Sheet;
  const { useAccountSheetTrigger, useAccountSheetSubmit } = SheetHooks;
  function Trigger() { const signIn = useAccountSheetTrigger(); return <a href={signIn.href} onClick={signIn.onClick}>Log in</a>; }
  function TapForm() { const open = useAccountSheetSubmit(); return <form method="get" action="/sign-in" onSubmit={open}><button type="submit">Sign in here</button></form>; }
  ui.render(<AccountSheetProvider><Trigger /><TapForm /></AccountSheetProvider>, { wrapper: MemberAuthProviders });
  const link = ui.screen.getByRole("link", { name: "Log in" });
  assert.equal(link.getAttribute("href")?.startsWith("/sign-in?next="), true, "the no-JS and modifier-click path is the sign-in page");
  assert.equal(document.querySelector("[data-vaul-drawer]") === null, true, "closed until asked");
  const modified = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
  link.dispatchEvent(modified);
  assert.equal(modified.defaultPrevented, false, "a modifier-click follows the link");
  const plain = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  ui.act(() => { link.dispatchEvent(plain); });
  assert.equal(plain.defaultPrevented, true, "a plain click stays on the page");
  await untilAsserted(ui, () => assert.ok(document.querySelector("[data-vaul-drawer]")));
  // The chooser is dismissible; closing it returns to the page without leaving it.
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Close account options" })));
  await untilAsserted(ui, () => assert.equal(document.querySelector("[data-vaul-drawer][data-state=open]") === null, true));
  const submitted = new dom.window.Event("submit", { bubbles: true, cancelable: true });
  ui.act(() => { ui.screen.getByRole("button", { name: "Sign in here" }).closest("form")!.dispatchEvent(submitted); });
  assert.equal(submitted.defaultPrevented, true, "the NFC form opens the sheet instead of leaving");
  await untilAsserted(ui, () => assert.ok(document.querySelector("[data-vaul-drawer][data-state=open]")));
});

test("the in-place sheet closes and refreshes the page once the member is confirmed", async () => {
  const { AccountSheetProvider } = Sheet;
  const { useAccountSheetTrigger } = SheetHooks;
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  let refreshes = 0;
  const router = { back() {}, forward() {}, refresh() { refreshes += 1; }, push() {}, replace() {}, prefetch() {}, bfcacheId: "sheet-test" };
  const c = client();
  c.value.verifyEmailCode = async (...args) => { c.calls.push(["verify", ...args]); c.setStatus(active); };
  function Trigger() { const signIn = useAccountSheetTrigger(); return <a href={signIn.href} onClick={signIn.onClick}>Log in</a>; }
  ui.render(<AppRouterContext.Provider value={router as never}><AccountSheetProvider client={c.value}><Trigger /></AccountSheetProvider></AppRouterContext.Provider>, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("link", { name: "Log in" }));
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Sign in" })));
  const email = await untilAsserted(ui, () => {
    const field = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(field.disabled, false);
    return field;
  });
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  ui.fireEvent.submit(email.closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  assert.equal(refreshes, 0, "nothing refreshes before the member is confirmed");
  ui.fireEvent.change(firstCodeCell(ui.screen), { target: { value: "A1B2C3" } });
  await untilAsserted(ui, () => assert.equal(refreshes, 1));
  await untilAsserted(ui, () => assert.equal(document.querySelector("[data-vaul-drawer][data-state=open]") === null, true));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(refreshes, 1, "once");
});

// Review-A, 24 Nov: the layout's sheet follows the page it opened over (pagehide, private-page rechecks, navigation),
// and the NFC tap asks for a new tap after a sign-in instead of promising to continue.
function SheetTrigger() {
  const signIn = SheetHooks.useAccountSheetTrigger();
  return <a href={signIn.href} onClick={signIn.onClick}>Log in</a>;
}
async function openSheetEmail(): Promise<HTMLInputElement> {
  ui.fireEvent.click(ui.screen.getByRole("link", { name: "Log in" }));
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Sign in" })));
  return untilAsserted(ui, () => {
    const field = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(field.disabled, false);
    return field;
  });
}
const typedEmailShown = () => [...document.querySelectorAll("input")].some((input) => input.value === "member@example.com");
const sheetOpen = () => document.querySelector("[data-vaul-drawer][data-state=open]") !== null;

test("pagehide disposes the open sheet, so nothing typed into it is kept for a back-forward restore", async () => {
  const c = client();
  ui.render(<Sheet.AccountSheetProvider client={c.value}><SheetTrigger /></Sheet.AccountSheetProvider>, { wrapper: MemberAuthProviders });
  ui.fireEvent.change(await openSheetEmail(), { target: { value: "member@example.com" } });
  assert.equal(typedEmailShown(), true);
  ui.act(() => { dom.window.dispatchEvent(new dom.window.Event("pagehide")); });
  assert.equal(sheetOpen(), false, "closed at once");
  assert.equal(typedEmailShown(), false, "and the typed email is gone");
  const reopened = await openSheetEmail();
  assert.equal(reopened.value, "", "reopening starts empty");
});

test("on a private page the sheet joins the page's concealment: hidden while a recheck is pending, shown again for the same member, kept hidden for a different member", async () => {
  const { PrivatePageGuard } = await import("@/components/auth/private-page-guard");
  const c = client();
  let answer: (value: string | null) => void = () => {};
  let reloads = 0;
  const readPrincipal = () => new Promise<string | null | undefined>((resolve) => { answer = resolve; });
  ui.render(<Sheet.AccountSheetProvider client={c.value}>
    <PrivatePageGuard principal="member-a" reload={() => { reloads += 1; }} readPrincipal={readPrincipal}><SheetTrigger /></PrivatePageGuard>
  </Sheet.AccountSheetProvider>, { wrapper: MemberAuthProviders });
  const email = await openSheetEmail();
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  const page = document.querySelector("[data-private-page]")!;
  const concealed = () => page.hasAttribute("data-concealed") && page.hasAttribute("inert");
  assert.equal(document.querySelector("[data-private-portal-host]")!.contains(email), true, "the sheet portals into the page's host");
  // The same member: hidden while the answer is pending, then shown again as it was.
  ui.act(() => { dom.window.dispatchEvent(new dom.window.Event("focus")); });
  await untilAsserted(ui, () => assert.equal(concealed(), true));
  assert.equal(page.contains(email), true, "hidden and blocked with the page while the answer is pending");
  await ui.act(async () => { answer("member-a"); });
  await untilAsserted(ui, () => assert.equal(concealed(), false));
  assert.equal(email.isConnected && email.value === "member@example.com", true, "the same member gets the sheet back as it was");
  assert.equal(reloads, 0);
  // A different member: kept hidden and reloaded.
  ui.act(() => { dom.window.dispatchEvent(new dom.window.Event("focus")); });
  await untilAsserted(ui, () => assert.equal(concealed(), true));
  await ui.act(async () => { answer("member-b"); });
  await untilAsserted(ui, () => assert.equal(reloads, 1));
  assert.equal(concealed(), true, "a different member never sees it");
});

test("a navigation disposes the open sheet", async () => {
  const { PathnameContext } = await import("next/dist/shared/lib/hooks-client-context.shared-runtime");
  const c = client();
  function At({ path }: { path: string }) {
    return <PathnameContext.Provider value={path}><Sheet.AccountSheetProvider client={c.value}><SheetTrigger /></Sheet.AccountSheetProvider></PathnameContext.Provider>;
  }
  const view = ui.render(<At path="/shop" />, { wrapper: MemberAuthProviders });
  ui.fireEvent.change(await openSheetEmail(), { target: { value: "member@example.com" } });
  view.rerender(<At path="/me/orders" />);
  await untilAsserted(ui, () => assert.equal(sheetOpen(), false));
  assert.equal(typedEmailShown(), false);
});

test("the NFC tap: signing in through the sheet asks for a new tap and does not refresh", async () => {
  const { TapConfirm } = await import("@/app/(nfc)/nfc/_tap/tap-confirm");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  let refreshes = 0;
  const router = { back() {}, forward() {}, refresh() { refreshes += 1; }, push() {}, replace() {}, prefetch() {}, bfcacheId: "tap-test" };
  const c = client();
  c.value.verifyEmailCode = async (...args) => { c.calls.push(["verify", ...args]); c.setStatus(active); };
  ui.render(<AppRouterContext.Provider value={router as never}><Sheet.AccountSheetProvider client={c.value}>
    <TapConfirm view={{ state: "signed-out" }} />
  </Sheet.AccountSheetProvider></AppRouterContext.Provider>, { wrapper: MemberAuthProviders });
  const tap = messages.Customer.app_site_nfc_tap;
  assert.ok(ui.screen.getByRole("heading", { name: tap.signedOut.title }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: tap.signIn }));
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Sign in" })));
  const email = await untilAsserted(ui, () => {
    const field = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(field.disabled, false);
    return field;
  });
  ui.fireEvent.change(email, { target: { value: "member@example.com" } });
  ui.fireEvent.submit(email.closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  ui.fireEvent.change(firstCodeCell(ui.screen), { target: { value: "A1B2C3" } });
  await untilAsserted(ui, () => assert.ok(ui.screen.getByRole("heading", { name: tap.signedIn.title })));
  assert.ok(ui.screen.getByText(tap.signedIn.line));
  assert.equal(ui.screen.queryByRole("button", { name: tap.signIn }), null, "no sign-in left to press");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(refreshes, 0, "the tap can't continue in place, so nothing refreshes");
});

test("the sign-in page keeps an account still in setup on its setup step, inline, without leaving", async () => {
  // A new social member returns to /sign-in signed in but not yet a member: the server opens the login flow, which
  // shows the explicit setup gate (as the account sheet does after a provider return), and next is kept for later.
  const c = client();
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  const visited: string[] = [];
  ui.render(<SignIn next="/me" initialFlow="login" client={c.value} navigate={(url) => visited.push(url)} />, { wrapper: MemberAuthProviders });
  await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Continue registration" }));
  assert.equal(document.querySelector("[data-vaul-drawer], [role=dialog]") === null, true);
  assert.deepEqual(visited, []);
});

test("Switch account clears the confirmed sign-in identity and retains only the same-address resend cooldown", async () => {
  const c = client();
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
    target: { value: "previous@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  ui.fireEvent.change(firstCodeCell(ui.screen), {
    target: { value: "A1B2C3" }
  });
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("button", { name: "Switch account" })));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Switch account" }));
  await untilAsserted(ui, () => {
    const email = ui.screen.getByLabelText("Email address") as HTMLInputElement;
    assert.equal(email.value, "");
    assert.equal(email.disabled, false);
  });
  assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code) === null);
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
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => ui.screen.getByLabelText(messages.AuthPhase.code));
  assert.deepEqual(c.calls.filter(([name]) => name === "code"), [["code", "previous@example.com"], ["code", "next@example.com"]]);
});

test("ordinary login and sign-out never expose phone account lookup", async () => {
  const c = client();
  await choose("Sign in", c);
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("button", { name: "Sign out" })));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText("Email address")));
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
  assert.equal(c.calls.filter(([name]) => name === "identify").length, 0);
});

for (const failure of ["request", "authenticated-status", "status-request", "identifier-clear"] as const) {
  test(`Switch account preserves the identity until sign-out is confirmed: ${failure}`, async () => {
    const c = client();
    await choose("Sign in", c);
    ui.fireEvent.change(ui.screen.getByLabelText("Email address"), {
      target: { value: "retained@example.com" }
    });
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
    await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("button", { name: "Sign out" })));
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
    await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("alert")));
    assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }));
    assert.doesNotMatch(ui.screen.getByRole("alert").textContent!, /private/);
    c.value.status = status;
    c.value.clearPhoneIdentifier = clear;
    c.setStatus(anonymous);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Refresh account status" }));
    await untilAsserted(ui, () =>
      assert.equal((ui.screen.getByLabelText("Email address") as HTMLInputElement).value, "retained@example.com")
    );
  });
}

test("a disposed sign-out cannot clear the next flow's identity", async () => {
  const c = client();
  await choose("Sign in", c);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("button", { name: "Sign out" })));
  let release!: () => void;
  c.value.signOut = () => new Promise<void>((resolve) => { release = resolve; });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  c.setStatus(anonymous);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Open account options" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
  await untilAsserted(ui, () =>
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
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  const server = phoneServer();
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await untilAsserted(ui, () =>
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
    `resuming does not create a phone challenge (calls: ${JSON.stringify(server.calls.map(([path, method, body]) => [method, path, body]))})`
  );
  assert.ok(
    c.calls.every(([name]) => name === "status"),
    "return uses only authoritative status reads"
  );

  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null));
  assert.ok(ui.screen.queryByRole("button", { name: "Resume registration" }) === null);
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }) === null);
  assert.ok(ui.screen.getByRole("button", { name: "Open account options" }));
});
test("authenticated returning member resumes the account screen without repeating signup", async () => {
  const c = client();
  c.setStatus(active);
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("heading", { name: "Account ready" }))
  );
  await untilAsserted(ui, () =>
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
  await untilAsserted(ui, () => ui.screen.getByRole("heading", { name: messages.AuthPhase.signup }));
  await untilAsserted(ui, () => assert.ok(c.calls.some(([name]) => name === "clear")));
  assert.equal(ui.screen.queryByRole("textbox", { name: "Email address" }) === null, true);
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
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/)));
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
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
  await untilAsserted(ui, () =>
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
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("dialog") === null));
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Open account options" })
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
  await untilAsserted(ui, () =>
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
  await untilAsserted(ui, () =>
    assert.ok(c.calls.some(([name]) => name === "google"))
  );
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  ui.fireEvent.change(firstCodeCell(ui.screen), {
    target: { value: "a1b2c" }
  });
  assert.equal(
    enteredCode(ui.screen),
    "A1B2C"
  );
  now += 31_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: /Send (?:a )?new code/ })
  );
  // The resend is complete only when its result is committed (a successful resend clears the code). Changing the
  // email before that races the in-flight resend, which is what left the code field in place under load.
  await untilAsserted(ui, () => {
    assert.equal(c.calls.filter(([name]) => name === "code").length, 2);
    assert.equal(enteredCode(ui.screen), "");
  });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Change email" }));
  assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code) === null);
  now += 31_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  const continueButton = ui.screen.queryByRole("button", { name: "Continue" });
  if (continueButton) ui.fireEvent.click(continueButton);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  ui.fireEvent.change(firstCodeCell(ui.screen), {
    target: { value: "D4E5F6" }
  });
  await untilAsserted(ui, () =>
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
test("editing one code cell keeps the other cells in place, and the full code verifies once", async () => {
  const c = client();
  c.value.verifyEmailCode = (...args) => {
    c.calls.push(["verify", ...args]);
    return new Promise<void>(() => {});
  };
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  const verifies = () => c.calls.filter(([name]) => name === "verify");
  // One character per cell, as typed.
  ["a", "1", "b", "2", "c"].forEach((character, index) =>
    ui.fireEvent.change(codeCell(ui.screen, index + 1), { target: { value: character } })
  );
  assert.deepEqual(codeCells(ui.screen), ["A", "1", "B", "2", "C", ""]);
  // Clearing an interior cell leaves a gap; later characters do not shift left.
  ui.fireEvent.change(codeCell(ui.screen, 2), { target: { value: "" } });
  assert.deepEqual(codeCells(ui.screen), ["A", "", "B", "2", "C", ""]);
  // Delete clears only its own cell; Backspace in an empty cell clears only the one before it.
  ui.fireEvent.keyDown(codeCell(ui.screen, 4), { key: "Delete" });
  assert.deepEqual(codeCells(ui.screen), ["A", "", "B", "", "C", ""]);
  ui.fireEvent.keyDown(codeCell(ui.screen, 6), { key: "Backspace" });
  assert.deepEqual(codeCells(ui.screen), ["A", "", "B", "", "", ""]);
  // Refilling the gaps in any order: no verification until every cell holds a character.
  ui.fireEvent.change(codeCell(ui.screen, 6), { target: { value: "3" } });
  ui.fireEvent.change(codeCell(ui.screen, 4), { target: { value: "2" } });
  ui.fireEvent.change(codeCell(ui.screen, 5), { target: { value: "c" } });
  assert.deepEqual(codeCells(ui.screen), ["A", "", "B", "2", "C", "3"]);
  assert.equal(verifies().length, 0, "a code with a gap is not complete");
  assert.equal(
    (ui.screen.getByRole("button", { name: messages.AuthPhase.verify }) as HTMLButtonElement).getAttribute("aria-disabled") === "true"
      || (ui.screen.getByRole("button", { name: messages.AuthPhase.verify }) as HTMLButtonElement).disabled,
    true,
    "Verify waits for a full code"
  );
  // A character the step doesn't accept, typed into the gap, is dropped without moving the others.
  ui.fireEvent.change(codeCell(ui.screen, 2), { target: { value: "-" } });
  assert.deepEqual(codeCells(ui.screen), ["A", "", "B", "2", "C", "3"]);
  assert.equal(verifies().length, 0);
  ui.fireEvent.change(codeCell(ui.screen, 2), { target: { value: "9" } });
  assert.equal(enteredCode(ui.screen), "A9B2C3");
  assert.deepEqual(verifies(), [["verify", "member@example.com", "A9B2C3"]]);
});
// A one-time code autofilled (iOS offers codes from Mail and Messages; Android has its own autofill) or pasted arrives
// whole in one cell, as an input event carrying every character. It fills the row from the first cell and verifies once.
for (const [how, cell, text] of [
  ["autofill into the first cell", 1, "A1B2C3"],
  ["formatted autofill into the first cell", 1, " a1b-2c3 "],
  ["autofill into another cell", 4, "a1b2c3"],
  ["formatted paste into another cell", 3, " a1b-2c3 "]
] as const) {
  test(`a whole code arriving in one cell fills the row and verifies once: ${how}`, async () => {
    const c = client();
    c.value.verifyEmailCode = (...args) => {
      c.calls.push(["verify", ...args]);
      return new Promise<void>(() => {});
    };
    await choose("Sign in", c);
    ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
      target: { value: "member@example.com" }
    });
    ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
    ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
    await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
    const target = codeCell(ui.screen, cell);
    assert.equal(target.hasAttribute("maxlength"), false, "no cell limits what arrives in it");
    if (how.includes("paste")) ui.fireEvent.paste(target, { clipboardData: { getData: () => text } });
    else ui.fireEvent.input(target, { target: { value: text } });
    assert.deepEqual(codeCells(ui.screen), ["A", "1", "B", "2", "C", "3"]);
    assert.deepEqual(c.calls.filter(([name]) => name === "verify"), [["verify", "member@example.com", "A1B2C3"]]);
  });
}

test("typing over a filled code cell replaces its character", async () => {
  const c = client();
  c.value.verifyEmailCode = (...args) => {
    c.calls.push(["verify", ...args]);
    return new Promise<void>(() => {});
  };
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  ui.fireEvent.input(codeCell(ui.screen, 1), { target: { value: "a1b2c" } });
  // The browser hands the cell its old character plus the typed one, on either side of the caret.
  ui.fireEvent.input(codeCell(ui.screen, 2), { target: { value: "19" } });
  ui.fireEvent.input(codeCell(ui.screen, 3), { target: { value: "xB" } });
  assert.deepEqual(codeCells(ui.screen), ["A", "9", "X", "2", "C", ""]);
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 0);
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
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "member@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  const input = firstCodeCell(ui.screen);
  replaceCode(ui.screen, ui.fireEvent.change, "a1b2c");
  ui.fireEvent.submit(input.closest("form")!);
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 0);
  replaceCode(ui.screen, ui.fireEvent.change, "a1b2c3");
  assert.deepEqual(c.calls.filter(([name]) => name === "verify"), [
    ["verify", "member@example.com", "A1B2C3"]
  ]);
  assert.ok(ui.screen.queryByRole("button", { name: messages.AuthPhase.verifying }));
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
  // Arc's button carries aria-busy only while busy.
  assert.notEqual(
    document.querySelector("[data-phase-action=submit]")?.getAttribute("aria-busy"),
    "true"
  );
  await ui.act(async () => {});
  // The rejected code again with a stray character: still the same code, so no second attempt.
  ui.fireEvent.change(firstCodeCell(ui.screen), { target: { value: "A1B2C3!" } });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  replaceCode(ui.screen, ui.fireEvent.change, "D4E5F");
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  replaceCode(ui.screen, ui.fireEvent.change, "D4E5F6");
  assert.deepEqual(c.calls.filter(([name]) => name === "verify"), [
    ["verify", "member@example.com", "A1B2C3"],
    ["verify", "member@example.com", "D4E5F6"]
  ]);
  await ui.act(async () => reject(Error("still invalid")));
  assert.ok(ui.screen.queryByRole("button", { name: messages.AuthPhase.verify }));
  // Pasting over a full code after a failure that wasn't a rejection doesn't resend it; finishing an edit does.
  ui.fireEvent.change(firstCodeCell(ui.screen), { target: { value: "X7Y8Z9" } });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 2);
  replaceCode(ui.screen, ui.fireEvent.change, "X7Y8Z");
  replaceCode(ui.screen, ui.fireEvent.change, "X7Y8Z9");
  assert.deepEqual(c.calls.filter(([name]) => name === "verify").at(-1), [
    "verify", "member@example.com", "X7Y8Z9"
  ]);
  await ui.act(async () => reject(Error("temporary failure")));
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 3);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: messages.AuthPhase.verify }));
  assert.deepEqual(c.calls.filter(([name]) => name === "verify").at(-1), [
    "verify", "member@example.com", "X7Y8Z9"
  ]);
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  await ui.act(async () => resolve());
  await untilAsserted(ui, () =>
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
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText(/^Email(?: address)?$/), {
    target: { value: "private@example.com" }
  });
  ui.fireEvent.submit(ui.screen.getByLabelText(/^Email(?: address)?$/).closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  ui.fireEvent.change(firstCodeCell(ui.screen), {
    target: { value: "A1B2C3" }
  });
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  c.setStatus(active);
  await ui.act(async () => resolve());
  assert.ok(ui.screen.queryByRole("heading", { name: "Welcome" }));
  assert.ok(!ui.screen.queryByRole("heading", { name: "Account ready" }));
  assert.ok(!ui.screen.queryByLabelText(messages.AuthPhase.code));
  assert.equal(c.calls.filter(([name]) => name === "verify").length, 1);
});
test("passkey failure preserves the email fallback without introducing phone lookup", async () => {
  const c = client();
  c.value.signInPasskey = async () => { throw Error("private credential cancelled"); };
  await choose("Sign in", c);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in with a passkey" }));
  await untilAsserted(ui, () => assert.match(ui.screen.getByRole("alert").textContent!, /Sign-in is unavailable/));
  assert.doesNotMatch(document.body.textContent!, /private credential/);
  assert.ok(ui.screen.queryByLabelText("Email address"));
  assert.ok(ui.screen.queryByRole("button", { name: "More options" }) === null);
  assert.ok(ui.screen.queryByRole("textbox", { name: "Phone number" }) === null);
  assert.equal(c.calls.filter(([name]) => name === "identify").length, 0);
});
test("returning passkey member can add passkey and sign out without routine refresh clutter", async () => {
  const c = client();
  await choose("Sign in", c);
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Sign in with a passkey" })
  );
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Add a passkey" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Add a passkey" }));
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByText("Passkey added to this local account."))
  );
  assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null);
  await untilAsserted(ui, () =>
    assert.equal(
      ui.screen
        .getByRole("button", { name: "Sign out" })
        .hasAttribute("disabled"),
      false
    )
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign out" }));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(/^Email(?: address)?$/)));
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
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign in" }));
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
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Check status" }))
  );
}
test("phone UI starts only by explicit submission, refreshes real proof and binds the captured normalized phone", async () => {
  const server = phoneServer({ verified: true });
  const bound: unknown[][] = [];
  ui.render(<Phone onPrepare={async () => true} busy={false} onBind={(...args) => bound.push(args)} />, { wrapper: MemberAuthProviders });
  assert.equal(server.calls.length, 0);
  await startPhone();
  assert.deepEqual(JSON.parse(server.calls[0][2] as string), {
    phone: "+821012345678"
  });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Finish registration" })
  );
  assert.deepEqual(bound, [[server.challenge.id, "+821012345678"]]);
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Use a different phone" }))
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Use a different phone" }));
  await untilAsserted(ui, () =>
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
    <Phone onPrepare={async () => true}
      busy={false}
      onBind={() => {
        binds++;
      }}
    />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await untilAsserted(ui, () =>
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
  assert.equal(Boolean(ui.screen.queryByText(messages.MemberAuth.verificationExpiredTryAgain)), true);
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  assert.equal((ui.screen.getByRole("button", { name: "Start again" }) as HTMLButtonElement).disabled, false);
});
test("phone UI timer expires verified proof and pending challenge without granting membership", async () => {
  phoneServer({ verified: true, lifetime: 600 });
  const first = ui.render(
    <Phone onPrepare={async () => true} busy={false} onBind={() => assert.fail("expired proof bound")} />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  // Expiry fires on the step's own timer: await the expired state it commits, not a wall-clock window.
  await untilAsserted(ui, () => assert.equal(Boolean(ui.screen.queryByText(messages.MemberAuth.verificationExpiredTryAgain)), true));
  await untilAsserted(ui, () => {
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
  assert.equal(ui.screen.queryByRole("button", { name: "Finish registration" }) === null, true);
  assert.equal((ui.screen.getByRole("button", { name: "Start again" }) as HTMLButtonElement).disabled, false);
  first.unmount();
  phoneServer({ lifetime: 600 });
  ui.render(
    <Phone onPrepare={async () => true} busy={false} onBind={() => assert.fail("pending challenge bound")} />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByText("Verification expired")));
  assert.equal(
    ui.screen.queryByRole("button", { name: "Finish registration" }),
    null
  );
});
test("phone UI handles network errors truthfully and cancels on disposal", async () => {
  phoneServer({ failCreate: true });
  const first = ui.render(
    <Phone onPrepare={async () => true} busy={false} onBind={() => assert.fail("failed challenge bound")} />, { wrapper: MemberAuthProviders }
  );
  ui.fireEvent.change(
    ui.screen.getByRole("textbox", { name: "Phone number" }),
    { target: { value: "01012345678" } }
  );
  ui.fireEvent.submit(
    ui.screen.getByRole("textbox", { name: "Phone number" }).closest("form")!
  );
  await untilAsserted(ui, () =>
    assert.match(ui.screen.getByRole("alert").textContent!, /couldn't prepare/)
  );
  assert.doesNotMatch(document.body.textContent!, /private network failure/);
  first.unmount();
  const server = phoneServer({ failStatus: true });
  const second = ui.render(
    <Phone onPrepare={async () => true}
      busy={false}
      onBind={() => assert.fail("unconfirmed challenge bound")}
    />, { wrapper: MemberAuthProviders }
  );
  await startPhone();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check status" }));
  await untilAsserted(ui, () =>
    assert.match(ui.screen.getByRole("alert").textContent!, /couldn't check/)
  );
  second.unmount();
  await untilAsserted(ui, () =>
    assert.ok(server.calls.some(([, method]) => method === "DELETE"))
  );
});

test("pending account completes phone verification then refreshes server-confirmed membership", async () => {
  const c = client();
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  phoneServer({ verified: true });
  ui.render(<Study client={c.value} />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sign up" }));
  await untilAsserted(ui, () =>
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
  await untilAsserted(ui, () =>
    assert.ok(ui.screen.queryByRole("button", { name: "Finish registration" }))
  );
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Finish registration" })
  );
  await untilAsserted(ui, () =>
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
  await choose("Sign in", c);
  assert.ok(ui.screen.queryByRole("button", { name: "More options" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null);
  const row = document.querySelector("[data-account-entry-alternatives]");
  assert.equal(row?.querySelectorAll("button").length, 2);
  assert.equal(ui.screen.getAllByRole("button", { name: "Continue with Google" }).length, 1);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue with Google" }));
  await untilAsserted(ui, () => assert.equal(c.calls.filter(([name]) => name === "google").length, 1));
  assert.equal(c.calls.filter(([name]) => name === "code" || name === "link" || name === "identify").length, 0);
});

test("code-stage sign-in link honors shared cooldown and replaces code instructions", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const c = client();
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "member@example.com" } });
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code)));
  const magic = ui.screen.getByRole("button", { name: "Email a sign-in link instead" }) as HTMLButtonElement;
  assert.equal(magic.disabled, true);
  ui.fireEvent.click(magic);
  assert.equal(c.calls.filter(([name]) => name === "link").length, 0);
  now += 31_000;
  await ui.act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  assert.equal(magic.disabled, false);
  ui.fireEvent.click(magic);
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByText(/Check your inbox for a sign-in link/)));
  assert.ok(c.calls.some(([name, email]) => name === "link" && email === "member@example.com"));
  assert.ok(ui.screen.queryByLabelText(messages.AuthPhase.code) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null);
  assert.equal(ui.screen.queryByText(/Enter the code sent/), null);
  assert.ok(ui.screen.queryByLabelText("Email address"));
});

test("social signup exposes no email delivery or passkey action", async () => {
  const c = client();
  ui.render(<Study client={c.value} initialFlow="signup" />, { wrapper: MemberAuthProviders });
  const google = await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Continue with Google" })) as HTMLButtonElement;
  await untilAsserted(ui, () => assert.equal(google.disabled, false));
  assert.equal(ui.screen.queryByRole("textbox", { name: "Email address" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Sign in with a passkey" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Email a sign-in link instead" }) === null, true);
  assert.equal(ui.screen.queryByRole("button", { name: "Use phone to identify account" }) === null, true);
  ui.fireEvent.click(google);
  assert.equal(c.calls.filter(([name]) => name === "google").length, 1);
  assert.equal(c.calls.some(([name]) => name === "code" || name === "link"), false);
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
    onContinueRegistration: () => {}, onPasskey: () => {}, onSocial: () => {},
    onCode: () => {}, onLink: () => {}, onVerify: () => {}, onEditEmail: () => {},
    onIdentifier: () => {}, onClearIdentifier: () => {}, onAddPasskey: () => {},
    onSignOut: () => {}, onRefresh: () => {}, onMode: () => {}, onEmail: () => {},
    onPhone: () => {}, onOtp: () => {}
  };
  const rendered = ui.render(<View {...props} />, { wrapper: MemberAuthProviders });
  const recovery = ui.screen.getByRole("button", { name: "Lost access?" }) as HTMLButtonElement;
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
  const setup = { ...anonymous, phoneBindingAuth: "ready" as const, authenticated: true, emailVerified: true };
  const noop = () => {};
  const props = {
    snapshot: { ...emptyMemberSnapshot, status: setup },
    identifierMode: "email" as const, flow: "login" as const,
    email: "member@example.com", phone: "", otp: "",
    phoneStep: <label>Phone phase<input aria-label="Phone phase" defaultValue="01012345678" /></label>,
    onContinueRegistration: noop, onPasskey: noop, onSocial: noop,
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
    onContinueRegistration: noop, onPasskey: noop, onSocial: noop,
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
  await choose("Sign in", c);
  const input = ui.screen.getByLabelText("Email address") as HTMLInputElement;
  ui.fireEvent.change(input, { target: { value: "retained@example.com" } });
  c.value.sendEmailCode = async () => { throw new Error("Private delivery outage"); };
  ui.fireEvent.submit(input.closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Refresh account status" }));
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
  // Arc's button lets an outgoing label fade out; its accessible name is the label in effect.
  assert.ok(ui.screen.getByRole("button", { name: "Send sign-in code" }) === primary, "a status refresh must not relabel the unrelated primary action");
  assert.notEqual(primary.getAttribute("aria-busy"), "true", "only the initiating refresh control spins");
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
  await untilAsserted(ui, () => assert.equal(retry.disabled, false));
  assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === retry);
  assert.equal(retry.getAttribute("aria-busy"), "false");
  assert.ok(icon?.querySelector(".lucide-refresh-cw"));
  assert.ok(ui.screen.getByRole("alert"));
  assert.ok(ui.screen.getByLabelText("Email address") === input);
  assert.equal(input.value, "retained@example.com");
  c.value.status = async () => anonymous;
  ui.fireEvent.click(retry);
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null));
  assert.equal(feedback.parentElement?.classList.contains("min-h-11"), false, "irrelevant outage space collapses after recovery");
  assert.equal(feedback.classList.contains("sr-only"), true);
  assert.ok(ui.screen.getByLabelText("Email address") === input);
});

test("a disposed status retry cannot clear a later flow's pending retry", async () => {
  const c = client();
  c.value.sendEmailCode = async () => { throw new Error("Private delivery outage"); };
  await choose("Sign in", c);
  ui.fireEvent.change(ui.screen.getByLabelText("Email address"), { target: { value: "first@example.com" } });
  ui.fireEvent.submit(ui.screen.getByLabelText("Email address").closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  const first = await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Refresh account status" }));
  let oldReject!: (error: Error) => void;
  c.value.status = () => new Promise((_resolve, reject) => { oldReject = reject; });
  ui.fireEvent.click(first);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cancel" }));
  c.value.status = async () => anonymous;
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Sign in" })));
  const input = await untilAsserted(ui, () => ui.screen.getByLabelText("Email address")) as HTMLInputElement;
  await untilAsserted(ui, () => assert.equal(input.disabled, false));
  ui.fireEvent.change(input, { target: { value: "next@example.com" } });
  ui.fireEvent.submit(input.closest("form")!);
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Send sign-in code" })));
  const next = await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Refresh account status" })) as HTMLButtonElement;
  let release!: (status: MemberStatus) => void;
  c.value.status = () => new Promise((resolve) => { release = resolve; });
  ui.fireEvent.click(next);
  await ui.act(async () => oldReject(new Error("Disposed request failed")));
  assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === next);
  assert.equal(next.disabled, true);
  assert.equal(next.getAttribute("aria-busy"), "true", "disposed lifetime cannot clear the next retry state");
  assert.equal(input.value, "next@example.com");
  await ui.act(async () => release(anonymous));
  await untilAsserted(ui, () => assert.ok(ui.screen.queryByRole("button", { name: "Refresh account status" }) === null));
});


test("capability outage feedback keeps the same compact slot during refresh and failure", async () => {
  const c = client();
  c.setStatus({ ...anonymous, capabilities: { ...anonymous.capabilities, emailOtp: false } });
  const rendered = ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  const retry = await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Refresh account status" })) as HTMLButtonElement;
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
  await untilAsserted(ui, () => assert.equal(retry.disabled, false));
  assert.ok(feedback.isConnected && feedback.parentElement?.classList.contains("min-h-11"));
  assert.match(feedback.textContent!, /Sign-in is unavailable/);
  rendered.unmount();
});


test("embedded phone entry has only the trial phase as its incoming fade owner", async () => {
  const c = client();
  c.setStatus({ ...anonymous, phoneBindingAuth: "ready", authenticated: true, emailVerified: true });
  ui.render(<Study client={c.value} initialFlow="login" />, { wrapper: MemberAuthProviders });
  ui.fireEvent.click(await untilAsserted(ui, () => ui.screen.getByRole("button", { name: "Continue registration" })));
  const accountPhase = document.querySelector<HTMLElement>('[data-member-account-phase="phone"]')!;
  const trialPhase = accountPhase.querySelector<HTMLElement>('[data-trial-phase="number"]')!;
  assert.ok(accountPhase && trialPhase, "the real phone controller renders inside the account phase");
  assert.equal(accountPhase.style.opacity, "1", "the outer phone phase must not multiply the trial's incoming fade");
  assert.equal(trialPhase.style.opacity, "0", "the actual trial phase remains the sole incoming fade owner");
  assert.ok(ui.screen.getByRole("heading", { name: "Verify your phone" }));
});

for (const [failure, message] of [
  ["timeout", messages.MemberAuth.failures.timeout],
  ["network", messages.MemberAuth.failures.network]
] as const) {
  test(`inline ticket ${failure} feedback stays stable while account refresh clears the current failure`, async () => {
    const { emptyMemberSnapshot } = await import("@/components/Authentication/member-auth/_shared/session");
    const noop = () => {};
    const props = {
      presentation: "ticket-checkout" as const,
      snapshot: { ...emptyMemberSnapshot, status: anonymous, error: "Diagnostic only", failure },
      identifierMode: "email" as const, flow: "login" as const,
      headingId: `ticket-refresh-${failure}`, email: "member@example.com", phone: "", otp: "", phoneStep: null,
      onContinueRegistration: noop, onPasskey: noop, onSocial: noop,
      onCode: noop, onLink: noop, onVerify: noop, onEditEmail: noop,
      onIdentifier: noop, onClearIdentifier: noop, onAddPasskey: noop,
      onSignOut: noop, onRefresh: noop, onMode: noop, onEmail: noop,
      onPhone: noop, onOtp: noop
    };
    const rendered = ui.render(<View {...props} />, { wrapper: MemberAuthProviders });
    const feedback = ui.screen.getByRole("alert");
    assert.equal(feedback.textContent, message);
    const input = ui.screen.getByLabelText("Email address");
    rendered.rerender(<View {...props} refreshingStatus snapshot={{ ...props.snapshot, busy: true, pendingAction: "other", failure: null, error: null }} />);
    assert.equal(ui.screen.getByRole("alert") === feedback, true);
    assert.equal(feedback.textContent, message);
    assert.equal(ui.screen.getByLabelText("Email address") === input, true);
    assert.doesNotMatch(feedback.textContent ?? "", /couldn’t complete that action/);
  });
}
