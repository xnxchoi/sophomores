import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { ChapterId } from "../../src/lib/teaser/choreography";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let ChapterNav: typeof import("../../src/components/teaser/chapter-nav").ChapterNav;
let PresenceContext: typeof import("motion/react").PresenceContext;
const previous = new Map<string, PropertyDescriptor | undefined>();

function globalValue(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLAnchorElement",
    "Element",
    "Node",
    "MutationObserver",
    "Event",
    "KeyboardEvent",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ]) {
    const source = dom.window[key as keyof typeof dom.window];
    globalValue(
      key,
      key === "window"
        ? dom.window
        : typeof source === "function" && !/^[A-Z]/.test(key)
          ? (source as (...args: unknown[]) => unknown).bind(dom.window)
          : source
    );
  }
  globalValue("self", dom.window);
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  ChapterNav = (await import("../../src/components/teaser/chapter-nav"))
    .ChapterNav;
  // Same module instance as the component: tsx compiles both to CommonJS, while
  // a dynamic import() would load Motion's separate ESM build and context.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PresenceContext = (require("motion/react") as typeof import("motion/react"))
    .PresenceContext;
});

afterEach(() => ui.cleanup());

after(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

function renderNav(current: ChapterId, onHome: () => void = () => {}) {
  return ui.render(
    <EnglishMessages>
      <ChapterNav current={current} onHome={onHome} />
    </EnglishMessages>
  );
}

test("HOME calls onHome on desktop and in the mobile menu; other chapters don't", async () => {
  let calls = 0;
  const view = renderNav("strategy", () => calls++);
  const desktop = [
    ...dom.window.document.querySelectorAll<HTMLAnchorElement>(
      ".desktop-chapters a"
    )
  ];
  await ui.act(async () =>
    desktop.find((link) => link.getAttribute("href") === "#hero")!.click()
  );
  assert.equal(calls, 1, "desktop HOME");
  await ui.act(async () =>
    desktop.find((link) => link.getAttribute("href") === "#origin")!.click()
  );
  assert.equal(calls, 1, "a chapter link is not HOME");
  await ui.act(async () =>
    view.getByRole("button", { expanded: false }).click()
  );
  const mobileHome = dom.window.document.querySelector<HTMLAnchorElement>(
    '#mobile-chapter-list a[href="#hero"]'
  );
  await ui.act(async () => mobileHome!.click());
  assert.equal(calls, 2, "mobile HOME");
});

test("skip link names the next chapter and shows only between Home and the invitation", () => {
  const expected = {
    hero: null,
    origin: "Skip to The first night",
    strategy: "Skip to The people",
    people: "Skip to The invitation",
    contacts: null
  } as Record<ChapterId, string | null>;
  for (const [chapter, label] of Object.entries(expected)) {
    const view = renderNav(chapter as ChapterId);
    const skip = dom.window.document.querySelector(".skip-chapter");
    assert.equal(skip !== null, label !== null, `${chapter} skip visibility`);
    if (label) assert.equal(skip?.getAttribute("aria-label"), label);
    view.unmount();
  }
});

test("the current chapter is marked as the current location", () => {
  renderNav("strategy");
  const current = [
    ...dom.window.document.querySelectorAll(
      '.desktop-chapters [aria-current="location"]'
    )
  ].map((link) => link.textContent);
  assert.deepEqual(current, ["The first night"]);
});

test("the mobile menu toggles aria-expanded and Escape returns focus to it", async () => {
  const view = renderNav("origin");
  const button = view.getByRole("button", { expanded: false });
  await ui.act(async () => button.click());
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(
    dom.window.document.querySelector("#mobile-chapter-list") !== null,
    true
  );
  await ui.act(async () => {
    dom.window.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape" })
    );
  });
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(dom.window.document.activeElement === button, true);
});

test("while exiting it closes the menu, releases focus and makes the nav inert", async () => {
  // Drive presence directly: jsdom completes Motion's exit instantly, so the
  // exiting state is held through Motion's own PresenceContext instead.
  const Host = ({ present }: { present: boolean }) => (
    <EnglishMessages>
      <PresenceContext.Provider
        value={{
          id: "chapter-nav",
          isPresent: present,
          register: () => () => {}
        }}
      >
        <ChapterNav current="origin" onHome={() => {}} />
      </PresenceContext.Provider>
    </EnglishMessages>
  );
  const view = ui.render(<Host present />);
  const button = view.getByRole("button", { expanded: false });
  await ui.act(async () => button.click());
  const item = dom.window.document.querySelector<HTMLAnchorElement>(
    "#mobile-chapter-list a"
  );
  assert.equal(item !== null, true, "menu opened");
  item!.focus();
  assert.equal(dom.window.document.activeElement === item, true);

  await ui.act(async () => view.rerender(<Host present={false} />));

  const nav = dom.window.document.querySelector(".chapter-nav");
  const skip = dom.window.document.querySelector(".skip-chapter");
  assert.equal(nav !== null, true, "nav stays mounted while exiting");
  // React sets `inert` as a DOM property; jsdom doesn't reflect it to an attribute.
  const isInert = (element: Element | null) =>
    element !== null &&
    ((element as HTMLElement & { inert?: boolean }).inert === true ||
      element.hasAttribute("inert"));
  assert.equal(isInert(nav), true, "exiting nav is inert");
  assert.equal(isInert(skip), true, "exiting skip link is inert");
  assert.equal(
    button.getAttribute("aria-expanded"),
    "false",
    "menu closed on exit"
  );
  assert.equal(
    nav!.contains(dom.window.document.activeElement),
    false,
    "focus released from the exiting nav"
  );
});
