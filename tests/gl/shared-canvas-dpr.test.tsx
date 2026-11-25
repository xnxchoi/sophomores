import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";

// The shared canvas caps its pixel ratio at 2 (gl/shared-canvas.tsx), and the cap must survive a resize. The menu
// gradient used to set the renderer's ratio to the device's on every resize, overriding the cap (a 3× phone drew 3×).
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let SharedCanvas: typeof import("../../src/components/gl/shared-canvas").SharedCanvas;
let HAStoreProvider: typeof import("../../src/providers/RP_Pro").HAStoreProvider;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

// The container's measured box. R3F's measure hook (react-use-measure) reads it on a window resize; jsdom lays nothing
// out and has no ResizeObserver, so both are stood in.
let box = { width: 1440, height: 900 };

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLCanvasElement", "Element", "Node", "MutationObserver", "Event"]) {
    globalValue(key, key === "window" ? dom.window : dom.window[key as keyof typeof dom.window]);
  }
  globalValue("self", dom.window);
  globalValue("screen", dom.window.screen);
  globalValue("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  globalValue("requestAnimationFrame", dom.window.requestAnimationFrame.bind(dom.window));
  globalValue("cancelAnimationFrame", dom.window.cancelAnimationFrame.bind(dom.window));
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(dom.window, "devicePixelRatio", { value: 3, configurable: true, writable: true });
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, top: 0, left: 0, right: box.width, bottom: box.height, width: box.width, height: box.height, toJSON() {} } as DOMRect;
  };
  class StandInResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalValue("ResizeObserver", StandInResizeObserver);
  dom.window.ResizeObserver = StandInResizeObserver as unknown as typeof ResizeObserver;
  ui = await import("@testing-library/react/pure");
  ({ SharedCanvas } = await import("../../src/components/gl/shared-canvas"));
  ({ HAStoreProvider } = await import("../../src/providers/RP_Pro"));
});

after(() => {
  ui?.cleanup();
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

/** A renderer that records what R3F asks of it; no WebGL in jsdom. */
function standInRenderer() {
  const canvas = document.createElement("canvas");
  const renderer = {
    ratio: 1,
    domElement: canvas,
    shadowMap: { enabled: false, type: 0, needsUpdate: false },
    xr: { enabled: false, isPresenting: false, addEventListener() {}, removeEventListener() {}, setAnimationLoop() {} },
    outputColorSpace: "srgb",
    toneMapping: 0,
    info: { autoReset: true, reset() {} },
    render() {},
    setPixelRatio(value: number) { renderer.ratio = value; },
    getPixelRatio: () => renderer.ratio,
    setSize() {},
    setAnimationLoop() {},
    setClearColor() {},
    dispose() {},
    forceContextLoss() {}
  };
  return renderer;
}

const settle = () => ui.act(() => new Promise((resolve) => setTimeout(resolve, 60)));

test("the shared canvas draws at most 2× on a 3× screen, and still after a resize", async () => {
  const renderer = standInRenderer();
  ui.render(
    <HAStoreProvider>
      <SharedCanvas eventSource={{ current: null }} gl={renderer as never} />
    </HAStoreProvider>
  );
  dom.window.dispatchEvent(new dom.window.Event("resize"));
  await settle();
  assert.equal(renderer.ratio, 2);

  box = { width: 390, height: 844 };
  dom.window.dispatchEvent(new dom.window.Event("resize"));
  await settle();
  assert.equal(renderer.ratio, 2);
});

test("the menu gradient leaves the renderer's size and ratio to the shared canvas", () => {
  const source = readFileSync(new URL("../../src/components/UX/Gradient/index.client.tsx", import.meta.url), "utf8");
  assert.equal(/\.setPixelRatio\(|\.setSize\(|domElement\.(width|height)\s*=/.test(source), false);
});
