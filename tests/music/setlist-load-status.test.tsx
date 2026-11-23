import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { EnglishMessages } from "../fixtures/english-messages";

// Does it work: the setlist's couldn't-load state shows its heading and the shared
// InlineRetry, and pressing it refreshes the route.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let SetlistLoadStatus: typeof import("@/components/music/SetlistUnavailable").SetlistLoadStatus;
let deregister: () => void;
const previous = new Map<string, PropertyDescriptor | undefined>();
const refreshes = { count: 0 };

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/setlists/x", pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    SVGElement: dom.window.SVGElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
    __setlistRefreshes: refreshes
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const stub = "export function useRouter() { return { refresh() { globalThis.__setlistRefreshes.count++; } }; }";
  const prefix = "data:text/javascript,";
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "next/navigation" && context.parentURL?.endsWith("/music/SetlistUnavailable.tsx"))
        return { url: prefix + encodeURIComponent(stub), shortCircuit: true };
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === prefix + encodeURIComponent(stub)) return { format: "module", source: stub, shortCircuit: true };
      return nextLoad(url, context);
    }
  });
  deregister = () => hooks.deregister();
  ui = await import("@testing-library/react/pure");
  ({ SetlistLoadStatus } = await import("@/components/music/SetlistUnavailable"));
});
afterEach(() => ui.cleanup());
after(() => {
  deregister();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else delete (globalThis as Record<string, unknown>)[key];
  }
  dom.window.close();
});

test("couldn't load: the heading and a plain Try again that refreshes the route", async () => {
  const view = ui.render(<EnglishMessages><SetlistLoadStatus failure="setlist" /></EnglishMessages>);
  assert.equal(view.getByRole("heading", { level: 1 }).textContent, "The setlist couldn’t load.");
  const button = view.getByRole("button");
  assert.match(button.textContent ?? "", /Try again/);
  await ui.act(async () => {
    ui.fireEvent.click(button);
  });
  assert.equal(refreshes.count, 1);
});

test("loaded: no retry, just the page", () => {
  const view = ui.render(<EnglishMessages><SetlistLoadStatus failure={null}><p>Setlist</p></SetlistLoadStatus></EnglishMessages>);
  assert.equal(view.queryByRole("button"), null);
  assert.equal(view.getByText("Setlist").tagName, "P");
});
