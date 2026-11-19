import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";

// Payload's server-side live preview: after a save, RefreshRouteOnSave refreshes the route and the server
// hands the provider the draft it read again. The mounted teaser must show that copy without another
// live-preview message (Review-B, audit rev 2, item 1).

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let content: typeof import("@/components/teaser/content-provider");
const previous = new Map<string, PropertyDescriptor | undefined>();

const router = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
  bfcacheId: "content-provider-refresh"
} as unknown as AppRouterInstance;

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MessageEvent: dom.window.MessageEvent,
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true
    });
  }
  ui = await import("@testing-library/react/pure");
  content = await import("@/components/teaser/content-provider");
});

after(() => {
  ui.cleanup();
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});

function Headline() {
  return <p data-headline>{content.useTeaserContent().centerHeadline}</p>;
}

const page = (centerHeadline: string) => (
  <AppRouterContext.Provider value={router}>
    <content.TeaserContentProvider initialContent={{ centerHeadline }}>
      <Headline />
    </content.TeaserContentProvider>
  </AppRouterContext.Provider>
);

test("refreshed server copy replaces the shown copy without a second preview message", () => {
  const view = ui.render(page("Saved once"));
  const headline = () =>
    view.container.querySelector("[data-headline]")?.textContent;
  assert.equal(headline(), "Saved once");
  // The route refresh after a save re-renders the page with the draft the server read again.
  view.rerender(page("Saved twice"));
  assert.equal(headline(), "Saved twice");
});
