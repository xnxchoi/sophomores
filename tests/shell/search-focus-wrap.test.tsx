import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Search is modal (F12): Tab past its last control comes back to its first, Shift+Tab before its first
// goes to its last, and the page behind it is out of reach. A browser's Tab lands on the focus guards
// Floating UI renders around Search; focusing a guard here is what that Tab does.

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let SearchPanel: typeof import("@/components/shell/header-panels").SearchPanel;
let ThemeProvider: typeof import("@/providers/Theme").ThemeProvider;
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/essays", pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const inboxURL = new URL("../../src/components/notifications/notification-inbox.tsx", import.meta.url).href;
  const boundaryURL = new URL("../fixtures/notification-action-boundary.ts", import.meta.url).href;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL === inboxURL && specifier === "@/payload/collections/notifications/actions")
        return { url: boundaryURL, shortCircuit: true };
      return nextResolve(specifier, context);
    }
  });
  try {
    ui = await import("@testing-library/react/pure");
    ({ SearchPanel } = await import("@/components/shell/header-panels"));
    ({ ThemeProvider } = await import("@/providers/Theme"));
  } finally {
    hooks.deregister();
  }
});

afterEach(() => {
  ui.cleanup();
  document.body.replaceChildren();
});

after(() => {
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});

const ignore = () => {};
const router: AppRouterInstance = {
  back: ignore,
  forward: ignore,
  refresh: ignore,
  push: ignore,
  replace: ignore,
  prefetch: ignore,
  bfcacheId: "search-focus-wrap-fixture"
};

const frame = () => ui.act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

async function openSearch() {
  const behind = document.createElement("button");
  behind.textContent = "Behind";
  document.body.append(behind);
  ui.render(
    <EnglishMessages>
      <AppRouterContext.Provider value={router}>
        {/* Search reads the mode from the site's theme store (its quick action), as it does under Providers. */}
        <PathnameContext.Provider value="/essays">
          <ThemeProvider>
            <SearchPanel onClose={ignore} />
          </ThemeProvider>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    </EnglishMessages>
  );
  await frame();
  await frame();
  const dialog = document.querySelector("[role='dialog'][aria-modal='true']");
  assert.equal(dialog !== null, true, "Search renders as a modal dialog");
  const controls = [...dialog!.querySelectorAll<HTMLElement>("button, a[href], input")];
  const guards = [...document.querySelectorAll<HTMLElement>("[data-floating-ui-focus-guard]")];
  return { behind, dialog: dialog!, controls, first: controls[0], last: controls[controls.length - 1], guards };
}

test("focus starts in the search field", async () => {
  const { dialog } = await openSearch();
  assert.equal(document.activeElement === dialog.querySelector("input"), true);
});

test("Tab past the last control wraps to the first", async () => {
  const { first, last, guards } = await openSearch();
  assert.equal(guards.length, 2, "one guard before Search and one after");
  assert.equal(first !== last, true);
  last.focus();
  guards[1].focus();
  await frame();
  assert.equal(document.activeElement === first, true);
});

test("Shift+Tab before the first control wraps to the last", async () => {
  const { first, last, guards } = await openSearch();
  first.focus();
  guards[0].focus();
  await frame();
  assert.equal(document.activeElement === last, true);
});

test("the page behind Search is out of reach while it is open", async () => {
  const { behind } = await openSearch();
  // `inert` where the DOM supports it, otherwise Floating UI hides the rest from assistive technology.
  const excluded = behind.hasAttribute("inert") || behind.getAttribute("aria-hidden") === "true";
  assert.equal(excluded, true);
});
