import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { startTransition, Suspense, use, useState } from "react";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Does it work: a link whose push lands back on the page it left (Home redirects to the shop without a pass;
// /account redirects to sign-in) must not leave next-transition-router stuck in "leaving", where every later link
// is ignored (patches/next-transition-router@0.2.11.patch).
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let router: typeof import("next-transition-router");
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/shop", pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  ui = await import("@testing-library/react/pure");
  router = await import("next-transition-router");
});

after(() => {
  ui.cleanup();
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});

// The server's redirects, as the router follows them: Home sends a visitor without a pass back to the shop.
const redirects: Record<string, string> = { "/": "/shop" };
// Next's router state, as its action queue keeps it (client/components/app-router-instance.js, use-action-queue.js):
// a push sets a promise of the next state inside startTransition, and the router reads it with use(), so the old
// page stays up while the payload loads.
type Settled = Promise<string> & { status: "fulfilled"; value: string };
const settled = (path: string): Settled => Object.assign(Promise.resolve(path), { status: "fulfilled" as const, value: path });
const loaded = (path: string) => new Promise<string>((resolve) => setTimeout(() => resolve(path), 5));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function harness() {
  const pushes: string[] = [];
  const leaves: string[] = [];
  let state: ReturnType<typeof router.useTransitionState> | undefined;
  function Probe() {
    state = router.useTransitionState();
    return null;
  }
  function Site() {
    const [routerState, setRouterState] = useState<Promise<string>>(() => settled("/shop"));
    const path = use(routerState);
    const ignore = () => {};
    const app = {
      back: ignore,
      forward: ignore,
      refresh: ignore,
      prefetch: ignore,
      replace: ignore,
      push: (href: string) => {
        pushes.push(href);
        startTransition(() => setRouterState(loaded(redirects[href] ?? href)));
      }
    } as unknown as AppRouterInstance;
    return (
      <AppRouterContext.Provider value={app}>
        <PathnameContext.Provider value={path}>
          <router.TransitionRouter
            leave={(next, from, to) => {
              leaves.push(`${from}->${to}`);
              next();
            }}
          >
            <Probe />
          </router.TransitionRouter>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    );
  }
  ui.render(
    <Suspense fallback={null}>
      <Site />
    </Suspense>
  );
  const follow = async (href: string) => {
    await ui.act(async () => {
      state!.navigate(href, dom.window.location.pathname);
    });
    await ui.act(() => wait(40));
  };
  return { pushes, leaves, follow, stage: () => state!.stage };
}

test("a link that redirects back to the current page leaves the next link working", async () => {
  const site = harness();
  await site.follow("/");
  assert.equal(site.stage(), "none", "the router settles after the push lands on the page it left");
  await site.follow("/help");
  assert.deepEqual(site.pushes, ["/", "/help"], "the next link still navigates");
  assert.deepEqual(site.leaves, ["/shop->/", "/shop->/help"]);
  ui.cleanup();
});

test("an ordinary link still leaves, enters and settles", async () => {
  const site = harness();
  await site.follow("/help");
  assert.equal(site.stage(), "none");
  assert.deepEqual(site.pushes, ["/help"]);
  ui.cleanup();
});
