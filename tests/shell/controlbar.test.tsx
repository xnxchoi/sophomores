import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";

// Header v8c2 (2026-11-19). Narrow "does it work" checks only (owner, 2026-11-19): a page's control lands
// in the touch-phone strip's centre slot, and the home teaser's chapter pill opens its chapters.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let slot: typeof import("../../src/components/shell/controlbar/slot");
let ChapterNav: typeof import("../../src/components/teaser/chapter-nav").ChapterNav;
const previous = new Map<string, PropertyDescriptor | undefined>();

function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLAnchorElement", "Element", "Node", "MutationObserver", "Event", "KeyboardEvent", "PointerEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    const source = dom.window[key as keyof typeof dom.window];
    globalValue(key, key === "window" ? dom.window : typeof source === "function" && !/^[A-Z]/.test(key) ? (source as (...args: unknown[]) => unknown).bind(dom.window) : source);
  }
  globalValue("self", dom.window);
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  slot = await import("../../src/components/shell/controlbar/slot");
  ChapterNav = (await import("../../src/components/teaser/chapter-nav")).ChapterNav;
});

afterEach(() => ui.cleanup());

after(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

/** Stands in for the strip: its centre element, registered as the strip registers it. */
function Strip() {
  return <div data-testid="centre" ref={slot.controlbarCentreRef} />;
}

test("a page's control shows in the strip's centre, and nowhere without a strip", async () => {
  const Page = () => <slot.ControlbarCentre><button type="button">Page control</button></slot.ControlbarCentre>;
  const alone = ui.render(<Page />);
  assert.equal(alone.queryByText("Page control") === null, true);
  alone.unmount();

  const view = ui.render(<><Strip /><Page /></>);
  const centre = view.getByTestId("centre");
  assert.equal(centre.contains(view.getByText("Page control")), true);
});

test("on the strip, the teaser's chapter pill opens its chapters and HOME goes to the Hero", async () => {
  let home = 0;
  const view = ui.render(
    <EnglishMessages>
      <Strip />
      <ChapterNav current="origin" onHome={() => home++} />
    </EnglishMessages>
  );
  const centre = view.getByTestId("centre");
  const pill = view.getByRole("button", { expanded: false });
  assert.equal(centre.contains(pill), true, "the pill is in the strip");
  assert.equal(dom.window.document.querySelector(".mobile-chapters") === null, true, "one chapter control on the strip");

  await ui.act(async () => pill.click());
  const links = centre.querySelectorAll("#mobile-chapter-list a");
  assert.equal(links.length, 5);
  await ui.act(async () => (links[0] as HTMLAnchorElement).click());
  assert.equal(home, 1);
  assert.equal(pill.getAttribute("aria-expanded"), "false", "choosing closes the card");
});
