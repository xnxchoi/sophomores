import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { MemberClient, MemberStatus } from "@/lib/member-auth/client";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Study: typeof import("@/components/Authentication/member-auth/account-study").MemberAccountStudy;
const previous = new Map<string, PropertyDescriptor | undefined>();
let finePointer = false;
const configured: Readonly<MemberCapabilities> = Object.freeze({ emailOtp: true, magicLink: true, google: true, passkey: true });
const anonymous: MemberStatus = { authenticated: false, emailVerified: false, phoneBound: false, member: false, capabilities: configured };
const noop = async () => {};
const actions: Omit<MemberClient, "status"> = { clearPhoneIdentifier: noop, identifyPhone: noop, sendEmailCode: noop, sendMagicLink: noop, signInGoogle: noop, verifyEmailCode: noop, signInPasskey: noop, addPasskey: noop, bindPhone: noop, signOut: noop };

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  win.matchMedia = (query) => ({ matches: query.includes("pointer: fine") ? finePointer : query.includes("min-width") && win.innerWidth >= 640, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  win.scrollTo = () => {};
  for (const key of ["scrollIntoView", "setPointerCapture", "releasePointerCapture"]) Object.defineProperty(win.HTMLElement.prototype, key, { value() {} });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", { value() { return false; } });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "SVGElement", "Element", "Node", "NodeList", "NodeFilter", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const raw = key === "window" ? win : key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "ResizeObserver" ? class { observe() {} unobserve() {} disconnect() {} } : win[key as keyof typeof win];
    const value = typeof raw === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? raw.bind(win) : raw;
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  ui = await import("@testing-library/react/pure");
  Study = (await import("@/components/Authentication/member-auth/account-study")).MemberAccountStudy;
});
afterEach(() => { ui.cleanup(); dom.window.localStorage.clear(); document.body.removeAttribute("tabindex"); finePointer = false; Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 }); });
after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 60));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("anonymous status retry is an icon action beside described feedback and before credential actions", async () => {
  ui.render(<Study initialFlow="login" initialCapabilities={configured} client={{ ...actions, status: async () => { throw new Error("Private status failure"); } }} />);
  const retry = await ui.screen.findByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
  const input = ui.screen.getByLabelText("Email address");
  const description = document.getElementById(input.getAttribute("aria-describedby")!);
  assert.ok(description?.tagName === "P");
  assert.ok(description.parentElement === retry.parentElement, "feedback text and retry are siblings in one row");
  assert.ok(!description.contains(retry), "aria-describedby must not include the action button");
  assert.equal(retry.type, "button", "refresh inside the form must not submit credentials");
  assert.equal(retry.textContent?.trim(), "", "refresh uses its symbol rather than another text row");
  assert.ok(retry.classList.contains("size-11"), "fine-pointer retry remains a full 44px control");
  assert.equal(retry.parentElement?.getAttribute("aria-live"), null, "the action row must not be a live region");
  assert.ok(!retry.parentElement?.classList.contains("overflow-hidden"), "the action focus ring must not be clipped by its feedback row");
  for (const name of ["Continue", "Sign in with a passkey", "Continue with Google", "Can’t sign in?"]) {
    assert.ok(retry.compareDocumentPosition(ui.screen.getByRole("button", { name })) & Node.DOCUMENT_POSITION_FOLLOWING, "retry precedes " + name);
  }
});

for (const result of ["success", "failure", "moved", "tab"] as const) {
  test(`inline status retry ${result} keeps its pending node and honors focus ownership`, async () => {
    let requests = 0;
    let resolve!: (status: MemberStatus) => void;
    let reject!: (error: Error) => void;
    const pending = new Promise<MemberStatus>((done, fail) => { resolve = done; reject = fail; });
    ui.render(<Study initialFlow="login" initialCapabilities={configured} client={{ ...actions, status: async () => { if (++requests === 1) throw new Error("Private initial outage"); return pending; } }} />);
    const retry = await ui.screen.findByRole("button", { name: "Refresh account status" }) as HTMLButtonElement;
    const input = ui.screen.getByLabelText("Email address");
    const feedback = document.getElementById(input.getAttribute("aria-describedby")!);
    const settledText = feedback?.textContent;
    retry.focus();
    ui.fireEvent.click(retry);
    assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === retry);
    assert.equal(retry.disabled, true);
    assert.equal(retry.getAttribute("aria-busy"), "true");
    assert.ok(document.getElementById(input.getAttribute("aria-describedby")!) === feedback);
    assert.equal(feedback?.textContent, settledText, "visible outage text remains stable during its retry");
    const announcements = ui.screen.getAllByRole("status");
    assert.equal(announcements.length, 1);
    assert.match(announcements[0].textContent!, /Checking sign-in options/);
    assert.ok(!announcements[0].closest('[aria-busy="true"]'));
    assert.equal(ui.screen.getByRole("button", { name: "Continue" }).textContent?.trim(), "Continue");
    document.body.tabIndex = -1;
    document.body.focus();
    const cancel = ui.screen.getByRole("button", { name: "Cancel" });
    if (result === "moved") cancel.focus();
    if (result === "tab") ui.fireEvent.keyDown(document, { key: "Tab" });
    await ui.act(async () => { if (result === "failure") reject(new Error("Private retry outage")); else resolve(anonymous); });
    if (result === "failure") {
      assert.ok(ui.screen.getByRole("button", { name: "Refresh account status" }) === retry);
      assert.equal(retry.disabled, false);
      assert.ok(document.activeElement === retry, "an owned failed retry returns to the same usable action");
      assert.equal(ui.screen.getAllByRole("alert").length, 1);
    } else {
      assert.ok(!ui.screen.queryByRole("button", { name: "Refresh account status" }));
      assert.ok(document.getElementById(input.getAttribute("aria-describedby")!) === feedback, "retiring the action preserves its described feedback node without retaining row height");
      if (result === "tab") assert.ok(document.activeElement !== input && document.activeElement !== retry, "Tab revokes field handoff even if the dialog focus trap restores containment");
      else assert.ok(document.activeElement === (result === "moved" ? cancel : input), "only a still-owned successful retry hands off to its ready field");
    }
  });
}

for (const [width, pointer] of [[393, false], [393, true], [1024, true]] as const) {
  test(`${width}px ${pointer ? "fine" : "coarse"} auth keeps input-aware spacing and exposes modal overflow`, async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    finePointer = pointer;
    const modal = width >= 640 || pointer;
    ui.render(<Study initialFlow="login" initialCapabilities={configured} client={{ ...actions, status: async () => { throw new Error("Private outage"); } }} />);
    const retry = await ui.screen.findByRole("button", { name: "Refresh account status" });
    const sheet = retry.closest<HTMLElement>("[data-verification-sheet]");
    const panel = retry.closest("[data-member-account-flow]");
    const identity = retry.closest("[data-account-identity]");
    assert.ok(sheet && panel && identity);
    assert.ok(identity.classList.contains("space-y-5"));
    assert.equal(panel.getAttribute("data-authentication-presentation"), modal ? "modal" : "tray");
    assert.ok(identity.classList.contains("data-[authentication-presentation=modal]:[@media(max-height:600px)]:space-y-3"));
    assert.ok(panel.classList.contains("!px-6"), "short surfaces retain horizontal alignment and wrapping");
    assert.ok(panel.classList.contains("data-[authentication-presentation=modal]:[@media(max-height:600px)]:pt-4!"));
    assert.ok(panel.classList.contains("data-[authentication-presentation=modal]:[@media(max-height:600px)]:pb-4!"));
    const intro = panel.querySelector("[data-phase-intro]");
    assert.ok(intro?.classList.contains("data-[authentication-presentation=modal]:[@media(max-height:600px)]:mb-4"));
    assert.ok(retry.classList.contains(modal ? "size-11" : "size-12"));
    assert.ok(!sheet.classList.contains("scrollbar-none"), "modal scrollbar must not be globally suppressed by the tray owner");
    assert.ok(sheet.classList.contains("data-[authentication-presentation=tray]:scrollbar-none"));
    assert.ok(sheet.classList.contains("data-[authentication-presentation=modal]:scroll-pt-14"));
    assert.ok(sheet.classList.contains("data-[authentication-presentation=modal]:scroll-pb-4"));
  });
}

test("the actual stylesheet compiles short-modal spacing and overrides the global WebKit scrollbar hide", async () => {
  const { default: tailwind } = await import("@tailwindcss/postcss");
  const require = createRequire(import.meta.url);
  const tailwindRequire = createRequire(require.resolve("@tailwindcss/postcss"));
  type Container = { type: string; selector?: string; params?: string; parent?: Container };
  const postcss = tailwindRequire("postcss") as (plugins: ReturnType<typeof tailwind>[]) => { process(source: string, options: { from: string }): Promise<{ root: { walkDecls(callback: (decl: { prop: string; value: string; important?: boolean; parent?: Container }) => void): void } }> };
  const path = new URL("../../styles/globals.css", import.meta.url);
  const compiled = await postcss([tailwind({ optimize: false })]).process(await readFile(path, "utf8"), { from: path.pathname });
  const declarations: Array<{ prop: string; value: string; important: boolean; context: string }> = [];
  compiled.root.walkDecls((decl) => {
    const context: string[] = [];
    let parent = decl.parent;
    while (parent) {
      if (parent.type === "rule" && parent.selector) context.push(parent.selector);
      if (parent.type === "atrule" && parent.params) context.push(parent.params);
      parent = parent.parent;
    }
    declarations.push({ prop: decl.prop, value: decl.value, important: decl.important === true, context: context.join(" ") });
  });
  for (const utility of ["pt-4", "pb-4", "mb-4", "space-y-3"]) {
    assert.ok(declarations.some((decl) => decl.context.includes(utility) && decl.context.includes("authentication-presentation") && decl.context.includes("modal") && /max-height:\s*600px/.test(decl.context)), "short modal utility compiles inside its actual modal+height query: " + utility);
  }
  assert.ok(declarations.some((decl) => decl.prop === "scrollbar-width" && decl.value === "thin" && decl.important && decl.context.includes("authentication-presentation")));
  assert.ok(declarations.some((decl) => decl.prop === "display" && decl.value === "block" && decl.important && decl.context.includes("webkit-scrollbar") && decl.context.includes("authentication-presentation")));
});

