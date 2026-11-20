import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Row-6 live FAIL, Review-B BLOCK: an ordinary Back after a page has landed leaves the transition router idle,
// so the place must be put back from the route commit, not the router's enter. This drives the site's real
// provider stack the way the browser does: a navigate event before each entry change, a popstate on Back and
// Forward, then the committed pathname, with no link transition running.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Providers: typeof import("@/providers").Providers;
const previous = new Map<string, PropertyDescriptor | undefined>();
// The page's scroll position and height, as the browser reports them.
let y = 0;
let height = 2000;
const scrolledTo: number[] = [];
let nav: EventTarget & { currentEntry: { key: string } };

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/help",
    pretendToBeVisual: true
  });
  nav = Object.assign(new dom.window.EventTarget(), {
    currentEntry: { key: "help" }
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    Window: dom.window.Window,
    CustomEvent: dom.window.CustomEvent,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    // Browser APIs jsdom lacks. They stand in for the browser only; the providers are the real ones.
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false
    }),
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    navigation: nav,
    history: dom.window.history,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true
    });
  }
  // jsdom's DOM constructors (SVGElement, PopStateEvent, ...) that Motion and the providers check against.
  for (const key of Object.getOwnPropertyNames(dom.window))
    if (/^[A-Z]\w*(Element|Event)$/.test(key) && !(key in globalThis)) {
      previous.set(key, undefined);
      Object.defineProperty(globalThis, key, {
        value: dom.window[key as keyof typeof dom.window],
        configurable: true,
        writable: true
      });
    }
  for (const key of [
    "matchMedia",
    "ResizeObserver",
    "IntersectionObserver"
  ] as const)
    Object.defineProperty(dom.window, key, {
      value: (globalThis as Record<string, unknown>)[key],
      configurable: true,
      writable: true
    });
  Object.defineProperty(dom.window, "scrollY", {
    configurable: true,
    get: () => y
  });
  Object.defineProperty(dom.window, "innerHeight", {
    configurable: true,
    value: 900
  });
  Object.defineProperty(dom.window.document.documentElement, "scrollHeight", {
    configurable: true,
    get: () => height
  });
  // Every way the page can be scrolled (Lenis's immediate scroll, or the native fallback) lands here.
  const scrollWindow = (a?: number | ScrollToOptions, b?: number) => {
    const top = typeof a === "object" ? (a.top ?? y) : (b ?? y);
    scrolledTo.push(Math.round(top));
    y = Math.round(top);
  };
  dom.window.scrollTo = scrollWindow as typeof dom.window.scrollTo;
  dom.window.scroll = scrollWindow as typeof dom.window.scroll;
  const inboxURL = new URL(
    "../../src/components/notifications/notification-inbox.tsx",
    import.meta.url
  ).href;
  const boundaryURL = new URL(
    "../fixtures/notification-action-boundary.ts",
    import.meta.url
  ).href;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        context.parentURL === inboxURL &&
        specifier === "@/payload/collections/notifications/actions"
      )
        return { url: boundaryURL, shortCircuit: true };
      return nextResolve(specifier, context);
    }
  });
  try {
    ui = await import("@testing-library/react/pure");
    ({ Providers } = await import("@/providers"));
  } finally {
    hooks.deregister();
  }
});

after(() => {
  ui.cleanup();
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
  bfcacheId: "back-scroll"
} as AppRouterInstance;

function Site({ path }: { path: string }) {
  return (
    <EnglishMessages>
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={path}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            <Providers>
              <main>{path}</main>
            </Providers>
          </SearchParamsContext.Provider>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    </EnglishMessages>
  );
}

const frames = (n: number) =>
  ui.act(
    () =>
      new Promise<void>((resolve) => {
        let i = 0;
        const next = () => (++i >= n ? resolve() : requestAnimationFrame(next));
        requestAnimationFrame(next);
      })
  );

test("an ordinary Back, then Forward, puts each page back where it was left (router idle)", async () => {
  const view = ui.render(<Site path="/help" />);
  await frames(2);
  // The browser's own history step: navigate fires before the entry changes, then the address changes.
  const step = (key: string, path: string) => {
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType: "push" }));
    nav.currentEntry = { key };
    dom.reconfigure({ url: "http://localhost" + path });
  };
  const commit = (path: string) =>
    ui.act(() => view.rerender(<Site path={path} />));

  y = 700;
  step("terms", "/terms"); // a link from /help, left at 700
  await commit("/terms");
  await frames(2);
  y = 300; // the reader scrolls /terms

  step("help", "/help"); // Back, with no link transition running
  dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
  height = 900; // the restored page mounts fixed and viewport-high (stores/RP_Ui.ts "none")
  y = 0;
  await commit("/help");
  await frames(3);
  assert.equal(
    scrolledTo.includes(700),
    false,
    "nothing is put back while the page has no room"
  );
  height = 2000; // back in flow
  await frames(12);
  assert.equal(y, 700, "Back returns to where /help was left");

  step("terms", "/terms"); // Forward, again with the router idle
  dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
  y = 0;
  await commit("/terms");
  await frames(12);
  assert.equal(y, 300, "Forward returns to where /terms was left");
  view.unmount();
});

// What the browser actually does (row-6 live, revs 4-5): a history step fires a "traverse" navigate event; Next
// commits the destination synchronously inside its own popstate handler, and rewrites that entry with
// replaceState while the outgoing page's scroll still shows; only then does popstate reach the provider.
test("Back and Forward restore in Next's order, and its replace doesn't overwrite the saved place", async () => {
  nav.currentEntry = { key: "help-2" };
  dom.reconfigure({ url: "http://localhost/help" });
  height = 2000;
  y = 0;
  const view = ui.render(<Site path="/help" />);
  await frames(2);
  const navigate = (navigationType: string) =>
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType }));
  const commit = (path: string) => ui.act(() => view.rerender(<Site path={path} />));
  const history = async (key: string, path: string) => {
    navigate("traverse");
    nav.currentEntry = { key };
    dom.reconfigure({ url: "http://localhost" + path });
    await commit(path); // Next commits first...
    navigate("replace"); // ...rewrites the entry while the old scroll still shows...
    y = 0; // ...the restored page mounts at the top...
    dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate")); // ...then popstate reaches the provider
  };

  y = 700;
  navigate("push"); // a link from /help, left at 700
  nav.currentEntry = { key: "terms-2" };
  dom.reconfigure({ url: "http://localhost/terms" });
  await commit("/terms");
  await frames(2);
  y = 300;

  height = 900; // the restored page is fixed and viewport-high at first
  await history("help-2", "/help"); // Back
  await frames(3);
  assert.equal(y, 0, "nothing is put back while the page has no room");
  height = 2000;
  await frames(12);
  assert.equal(y, 700, "Back returns to where /help was left, not the outgoing page's 300");

  await history("terms-2", "/terms"); // Forward
  await frames(12);
  assert.equal(y, 300, "Forward returns to where /terms was left");
  view.unmount();
});
