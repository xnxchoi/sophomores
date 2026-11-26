import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";

// Review-B G: the colophon gallery wipes in an image only once it has loaded, runs no frames while one waits, and drops
// an image that fails, keeping the one already showing. Real local gallery paths; load and error are fired by hand.

const IMAGES = [
  { url: "/assets/three/book/shared/page_plain.png", alt: "one" },
  { url: "/assets/three/book/shared/blank.png", alt: "two" },
  { url: "/assets/three/book/missing-image.png", alt: "three" }
];

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Gallery: typeof import("../../../src/components/commerce/shop/detail-gallery").DetailGallery;
const previous = new Map<string, PropertyDescriptor | undefined>();
let frames = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/shop", pretendToBeVisual: true });
  const raf = dom.window.requestAnimationFrame.bind(dom.window);
  const values: Record<string, unknown> = {
    window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames += 1; return raf(callback); },
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true
  };
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  ui = await import("@testing-library/react/pure");
  Gallery = (await import("../../../src/components/commerce/shop/detail-gallery")).DetailGallery;
});
after(() => {
  ui.cleanup(); dom.window.close();
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
});

const shown = (container: HTMLElement) => [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));

test("a loaded image wipes in and replaces the one under it; nothing runs while it waits", async () => {
  const view = ui.render(createElement(Gallery, { images: IMAGES, index: 0, onStep: () => {} }));
  assert.deepEqual(shown(view.container), [IMAGES[0].url]);
  view.rerender(createElement(Gallery, { images: IMAGES, index: 1, onStep: () => {} }));
  assert.deepEqual(shown(view.container), [IMAGES[0].url, IMAGES[1].url]);
  const before = frames;
  await wait(120);
  assert.equal(frames, before, "no frames while the incoming image is still loading");
  const incoming = view.container.querySelectorAll("img")[1];
  assert.match(incoming.closest("[class*='clip-path']")?.getAttribute("style") ?? "", /--wipe-clip: inset\(0 0 0 100\.000%\)/, "starts fully clipped");
  ui.fireEvent.load(incoming);
  await wait(1600);
  assert.ok(frames > before, "the wipe ran once the image loaded");
  assert.deepEqual(shown(view.container), [IMAGES[1].url], "the covered image is dropped once the new one is fully in");
  view.unmount();
});

test("an image that fails is dropped and the one showing stays", async () => {
  const view = ui.render(createElement(Gallery, { images: IMAGES, index: 1, onStep: () => {} }));
  view.rerender(createElement(Gallery, { images: IMAGES, index: 2, onStep: () => {} }));
  assert.deepEqual(shown(view.container), [IMAGES[1].url, IMAGES[2].url]);
  ui.fireEvent.error(view.container.querySelectorAll("img")[1]);
  await wait(200);
  assert.deepEqual(shown(view.container), [IMAGES[1].url], "the failed layer is gone; the previous image stays");
  view.unmount();
});
