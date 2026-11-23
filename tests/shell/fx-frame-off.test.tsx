import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { FXFrameOff, useFXFrameOff } from "@/components/shell/footer-visibility";

// A page that drops in <FXFrameOff /> holds the FXFrame band off while it is mounted, and gives it back on leaving.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/shop", pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  ui = await import("@testing-library/react/pure");
});
afterEach(() => ui.cleanup());
after(() => {
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else delete (globalThis as Record<string, unknown>)[key];
  }
  dom.window.close();
});

const held = () => useFXFrameOff.getState().held;

test("a page holds the band off while mounted and gives it back on unmount", () => {
  assert.equal(held(), 0);
  const page = ui.render(<FXFrameOff />);
  assert.equal(held(), 1);
  page.unmount();
  assert.equal(held(), 0);
});

test("two holders (an arriving and a leaving page) keep it off until both have let go", () => {
  const leaving = ui.render(<FXFrameOff />);
  const arriving = ui.render(<FXFrameOff />);
  assert.equal(held(), 2);
  leaving.unmount();
  assert.equal(held(), 1);
  arriving.unmount();
  assert.equal(held(), 0);
});
