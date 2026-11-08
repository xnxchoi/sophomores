import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Tray: typeof import("@/components/Authentication/phone-verification/verification-tray").VerificationTray;
const previous = new Map<string, PropertyDescriptor | undefined>();
const observations = new Map<Element, { callback: ResizeObserverCallback; observer: ResizeObserver }>();
let dimensions = { logical: 520, scale: 0.95, width: 1024, viewport: 768, finePointer: true };

class LayoutResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    observations.set(target, { callback: this.callback, observer: this as unknown as ResizeObserver });
  }
  unobserve(target: Element) { observations.delete(target); }
  disconnect() {
    for (const [target, observation] of observations) {
      if (observation.observer === (this as unknown as ResizeObserver)) observations.delete(target);
    }
  }
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/account", pretendToBeVisual: true });
  const win = dom.window;
  win.document.elementFromPoint = () => null;
  win.matchMedia = (query) => ({ matches: query.includes("pointer: fine") ? dimensions.finePointer : query.includes("min-width") && dimensions.width >= 640, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  win.scrollTo = () => {};
  for (const key of ["scrollIntoView", "setPointerCapture", "releasePointerCapture"]) Object.defineProperty(win.HTMLElement.prototype, key, { value() {} });
  Object.defineProperty(win.HTMLElement.prototype, "hasPointerCapture", { value() { return false; } });
  Object.defineProperty(win, "innerWidth", { get: () => dimensions.width });
  Object.defineProperty(win, "innerHeight", { get: () => dimensions.viewport });
  const originalBounds = win.HTMLElement.prototype.getBoundingClientRect;
  const originalOffset = Object.getOwnPropertyDescriptor(win.HTMLElement.prototype, "offsetHeight")!;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.hasAttribute("data-verification-content")
      ? new win.DOMRect(0, 0, 420, dimensions.logical * dimensions.scale)
      : originalBounds.call(this);
  };
  Object.defineProperty(win.HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() { return this.hasAttribute("data-verification-content") ? Math.round(dimensions.logical) : originalOffset.get!.call(this); }
  });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "SVGElement", "Element", "Node", "NodeList", "NodeFilter", "MutationObserver", "CustomEvent", "Event", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const raw = key === "window" ? win : key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "ResizeObserver" ? LayoutResizeObserver : win[key as keyof typeof win];
    const value = typeof raw === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? raw.bind(win) : raw;
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  ui = await import("@testing-library/react/pure");
  Tray = (await import("@/components/Authentication/phone-verification/verification-tray")).VerificationTray;
});

afterEach(() => {
  ui.cleanup();
  observations.clear();
  dimensions = { logical: 520, scale: 0.95, width: 1024, viewport: 768, finePointer: true };
});
after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 60));
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function content(open = true) {
  return <Tray open={open} chrome="compact" onOpenChange={() => {}} onCancel={() => {}} headingId="height-heading" descriptionId="height-description" description="Sizing fixture" closeLabel="Close" locale="en">
    <section><h2 id="height-heading" tabIndex={-1}>Log in</h2><input aria-label="Email address" /><button type="button">Continue</button></section>
  </Tray>;
}

function surface() {
  const inner = document.querySelector<HTMLElement>("[data-verification-content]");
  const shell = inner?.closest<HTMLElement>("[data-verification-sheet]");
  const wrapper = inner?.parentElement;
  assert.ok(inner && shell && wrapper, "the real tray content, animated wrapper, and shell are mounted");
  return { inner, shell, wrapper };
}

async function logicalResize(logical: number, borderBox = true) {
  dimensions = { ...dimensions, logical };
  const { inner } = surface();
  const observation = observations.get(inner);
  assert.ok(observation, "natural content owns a live layout-size observer");
  await ui.act(async () => observation.callback([{
    target: inner,
    borderBoxSize: borderBox ? [{ inlineSize: 420, blockSize: logical }] : [],
    contentRect: new dom.window.DOMRect(0, 0, 420, logical)
  } as unknown as ResizeObserverEntry], observation.observer));
}

async function settledHeight(expected: number) {
  const { wrapper } = surface();
  await ui.waitFor(() => assert.ok(Math.abs(parseFloat(wrapper.style.height) - expected) < 0.01, "content wrapper must settle at " + expected + " logical pixels; received " + wrapper.style.height));
}

test("desktop entrance scale cannot leave the content wrapper five percent too short", async () => {
  ui.render(content());
  await settledHeight(520);
  const { shell } = surface();
  await ui.waitFor(() => assert.ok(Math.abs(parseFloat(shell.style.bottom) - 124) < 0.01, "centering uses the same untransformed natural height"));
  assert.equal(shell.dataset.authenticationPresentation, "modal");
});

test("fractional observer sizes round outward instead of leaving a subpixel overflow", async () => {
  ui.render(content());
  await logicalResize(520.125);
  await settledHeight(521);
  await logicalResize(521);
  await settledHeight(521);
});

test("layout-size fallback remains independent of ancestor scale when border-box data is unavailable", async () => {
  ui.render(content());
  await logicalResize(640.125, false);
  await settledHeight(641);
});

test("logical growth and shrinkage preserve the same mounted field and its focus", async () => {
  ui.render(content());
  const input = ui.screen.getByLabelText("Email address");
  input.focus();
  await logicalResize(700.75);
  await settledHeight(701);
  await logicalResize(380.25);
  await settledHeight(381);
  assert.ok(ui.screen.getByLabelText("Email address") === input, "resize must not remount the active phase");
  assert.ok(document.activeElement === input, "measuring content must not move focus");
});

test("genuine desktop overflow retains its full content height and a capped scrollable shell", async () => {
  dimensions = { ...dimensions, logical: 900 };
  ui.render(content());
  await settledHeight(900);
  const { shell } = surface();
  await ui.waitFor(() => assert.ok(Math.abs(parseFloat(shell.style.maxHeight) - 720) < 0.01));
  await ui.waitFor(() => assert.ok(Math.abs(parseFloat(shell.style.bottom) - 24) < 0.01));
  assert.ok(shell.classList.contains("overflow-y-auto"));
  assert.ok(shell.classList.contains("data-[authentication-presentation=modal]:[scrollbar-width:thin]!"));
  assert.ok(shell.classList.contains("data-[authentication-presentation=modal]:scroll-pt-14"));
});

test("touch presentation keeps its bottom gutter while measuring logical content", async () => {
  dimensions = { ...dimensions, width: 393, finePointer: false };
  ui.render(content());
  await settledHeight(520);
  const { shell } = surface();
  assert.equal(shell.dataset.authenticationPresentation, "tray");
  await ui.waitFor(() => assert.ok(Math.abs(parseFloat(shell.style.bottom) - 12) < 0.01));
});

test("closing disconnects measurement and holds the last natural height during the exit", async () => {
  dimensions = { ...dimensions, scale: 1 };
  const rendered = ui.render(content());
  await settledHeight(520);
  const { inner, wrapper } = surface();
  assert.ok(observations.has(inner));
  dimensions = { ...dimensions, logical: 0 };
  rendered.rerender(content(false));
  assert.ok(!observations.has(inner), "exit disposes the private content observer");
  assert.equal(wrapper.style.height, "520px", "shell must not collapse while the dismissed phase exits");
});
