import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { useEffect, type ReactNode } from "react";

// Live check, 25 Nov: "?entry=1" stayed in the address bar. Next's router patches history.replaceState in its own effect
// (after a child's) and skips the router sync for state that carries its `__NA` flag. The marker must leave through the
// patched call, with null state, so the router follows it.
const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/?entry=1&utm=x#top" });
const previous = new Map<string, PropertyDescriptor | undefined>();
let ui: typeof import("@testing-library/react/pure");
let DropEntryMarker: typeof import("@/app/(site)/_home/drop-entry-marker").DropEntryMarker;
before(async () => {
  for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? dom.window : dom.window[key as keyof Window] });
  }
  ui = await import("@testing-library/react/pure");
  ({ DropEntryMarker } = await import("@/app/(site)/_home/drop-entry-marker"));
});
after(() => {
  ui.cleanup();
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("the entry marker leaves through the router's patched replaceState, with null state, keeping the rest of the URL", async () => {
  const history = dom.window.history;
  history.replaceState({ __NA: true }, "", "/?entry=1&utm=x#top");
  const original = history.replaceState.bind(history);
  const routed: { state: unknown; url: string }[] = [];
  // Stands in for Next's app router: its effect runs after the child's and patches replaceState.
  function Router({ children }: { children: ReactNode }) {
    useEffect(() => {
      history.replaceState = (state: unknown, unused: string, url?: string | URL | null) => {
        routed.push({ state, url: String(url) });
        original(state, unused, url);
      };
      return () => { history.replaceState = original; };
    }, []);
    return children;
  }
  ui.render(<Router><DropEntryMarker /></Router>);
  await ui.waitFor(() => assert.equal(routed.length, 1));
  assert.deepEqual(routed, [{ state: null, url: "/?utm=x#top" }]);
  assert.equal(dom.window.location.pathname + dom.window.location.search + dom.window.location.hash, "/?utm=x#top");
  ui.cleanup();
});

test("without the marker nothing is written", async () => {
  dom.window.history.replaceState(null, "", "/?utm=x");
  let writes = 0;
  const original = dom.window.history.replaceState.bind(dom.window.history);
  dom.window.history.replaceState = (...args: Parameters<History["replaceState"]>) => { writes++; original(...args); };
  ui.render(<DropEntryMarker />);
  await ui.act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  assert.equal(writes, 0);
  dom.window.history.replaceState = original;
  ui.cleanup();
});
