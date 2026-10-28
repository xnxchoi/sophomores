import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { useComposeFallback } from "../../components/Authentication/phone-verification/use-compose-fallback";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
const previous = new Map<string, PropertyDescriptor | undefined>();
const timers = new Map<number, { at: number; callback: () => void }>();
let now = 0;
let sequence = 0;
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/account/continue",
    pretendToBeVisual: true
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true
    });
  }
  dom.window.setTimeout = ((callback: () => void, delay = 0) => {
    const id = ++sequence;
    timers.set(id, { at: now + delay, callback });
    return id;
  }) as typeof dom.window.setTimeout;
  dom.window.clearTimeout = (id: number | undefined) => {
    if (id !== undefined) timers.delete(id);
  };
  ui = await import("@testing-library/react/pure");
});
beforeEach(() => {
  now = 0;
  timers.clear();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true
  });
});
afterEach(() => {
  ui.cleanup();
  timers.clear();
});
after(() => {
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});
function Probe({ challengeId = "first" }: { challengeId?: string | null }) {
  const { showFallback, onCompose } = useComposeFallback(challengeId);
  return (
    <>
      <button type="button" onClick={onCompose}>
        Open Messages
      </button>
      <output role="status">
        {showFallback ? "Recovery available" : "No recovery"}
      </output>
    </>
  );
}
async function advance(milliseconds: number) {
  await ui.act(async () => {
    now += milliseconds;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) {
        timers.delete(id);
        timer.callback();
      }
    }
  });
}
const feedback = () => ui.screen.getByRole("status").textContent;

test("recovery requires an explicit attempt and three uninterrupted foreground seconds", async () => {
  ui.render(<Probe />);
  await advance(5000);
  assert.equal(feedback(), "No recovery");
  const button = ui.screen.getByRole("button", { name: "Open Messages" });
  button.focus();
  ui.fireEvent.click(button);
  await advance(2999);
  assert.equal(feedback(), "No recovery");
  await advance(1);
  assert.equal(feedback(), "Recovery available");
  assert.equal(
    document.activeElement,
    button,
    "showing recovery never steals focus"
  );
});
test("any window blur suppresses recovery even after focus returns", async () => {
  ui.render(<Probe />);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  await advance(1000);
  ui.fireEvent(window, new dom.window.Event("blur"));
  ui.fireEvent(window, new dom.window.Event("focus"));
  await advance(5000);
  assert.equal(feedback(), "No recovery");
});
test("a hidden document suppresses recovery for that attempt", async () => {
  ui.render(<Probe />);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true
  });
  ui.fireEvent(document, new dom.window.Event("visibilitychange"));
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true
  });
  await advance(5000);
  assert.equal(feedback(), "No recovery");
});
test("challenge changes and unmount cancel outstanding attempt timers", async () => {
  const view = ui.render(<Probe />);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  await advance(1000);
  view.rerender(<Probe challengeId="second" />);
  await advance(5000);
  assert.equal(feedback(), "No recovery");
  ui.fireEvent.click(ui.screen.getByRole("button"));
  view.unmount();
  assert.equal(timers.size, 0);
});
test("a late native-app handoff hides already-offered recovery", async () => {
  ui.render(<Probe />);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  await advance(3000);
  assert.equal(feedback(), "Recovery available");
  ui.fireEvent(window, new dom.window.Event("blur"));
  assert.equal(feedback(), "No recovery");
});

test("restoring the same challenge after receiver unavailability requires a fresh attempt", async () => {
  const view = ui.render(<Probe />);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  await advance(3000);
  assert.equal(feedback(), "Recovery available");
  view.rerender(<Probe challengeId={null} />);
  assert.equal(feedback(), "No recovery");
  view.rerender(<Probe />);
  await advance(5000);
  assert.equal(feedback(), "No recovery");
});

test("a repeated compose tap restarts the full foreground observation window", async () => {
  ui.render(<Probe />);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  await advance(2000);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  await advance(2999);
  assert.equal(feedback(), "No recovery");
  await advance(1);
  assert.equal(feedback(), "Recovery available");
});
