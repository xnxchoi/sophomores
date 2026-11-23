// The header reaches the notification inbox, whose server action loads the Payload config: map it first.
import "../fixtures/notification-action-mapping";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { MotionValue } from "motion/react";
import type { HeaderTransitionType } from "@/stores/RP_Ui";

// Real Motion values through the header's own hook: rendered once, then driven only by .set(), as the header's
// reveal (keyboard focus or the open menu) and The Hideaway's slide/fade springs are. Motion's frame loop picks its
// scheduler when it loads, so the DOM (with requestAnimationFrame) is in place before Motion and the header load.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let motion: typeof import("motion");
let header: typeof import("@/components/shell/site-header");
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/missing", pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  // The header module is compiled to CommonJS (no "type": "module"), so it loads Motion's CJS build. The values here
  // must come from that same instance: Motion's dependency collection is per module instance.
  const { createRequire } = await import("node:module");
  motion = createRequire(import.meta.url)("motion");
  ui = await import("@testing-library/react/pure");
  header = await import("@/components/shell/site-header");
});
afterEach(() => ui.cleanup());
after(() => {
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else delete (globalThis as Record<string, unknown>)[key];
  }
  dom.window.close();
});

/** One frame of Motion's loop: changes scheduled before it (preRender) have run by its postRender. */
const nextFrame = () => new Promise<void>((resolve) => motion.frame.postRender(() => resolve()));
/** Lets a spring run to rest; a new target reaches it a frame after the input changes. */
async function settle(spring: MotionValue<number>) {
  await nextFrame();
  await nextFrame();
  for (let i = 0; i < 400 && spring.isAnimating(); i++) await nextFrame();
  await nextFrame();
}

function mount(variant: HeaderTransitionType) {
  const values = {
    transitionVariant: motion.motionValue<HeaderTransitionType>(variant),
    visibleness: motion.motionValue(true),
    revealState: motion.motionValue(false),
    innerTranslate: motion.motionValue(-100)
  };
  const hook = ui.renderHook(() => header.useHeaderSides(values));
  return { values, hook, sides: () => hook.result.current };
}

for (const variant of ["slide", "fade"] as const) {
  for (const trigger of ["keyboard focus", "the open menu"]) {
    test(`${variant}: ${trigger} reveals the sides, and The Hideaway's values return when it ends`, async () => {
      const { values, hook, sides } = mount(variant);
      // Shown, not revealed: The Hideaway hides the sides for a slide or fade (opacity 0) and holds the row up.
      await settle(sides().springOpacity);
      assert.equal(sides().internalOpacity.get(), 0);
      assert.equal(sides().sectionTranslate.get(), 0);
      assert.equal(sides().rowY.get(), -100);

      // Reveal on (Tab in / menu open): at rest at once.
      values.revealState.set(true);
      await nextFrame();
      assert.equal(sides().internalOpacity.get(), 1);
      assert.equal(sides().sectionTranslate.get(), 0);
      assert.equal(sides().rowY.get(), 0);

      // A render while revealed (the header re-renders on hover, focus and store changes), then The Hideaway's
      // inputs change underneath: the output stays revealed.
      hook.rerender();
      values.visibleness.set(false);
      values.innerTranslate.set(-40);
      await nextFrame();
      assert.equal(sides().internalOpacity.get(), 1);
      assert.equal(sides().sectionTranslate.get(), 0);
      assert.equal(sides().rowY.get(), 0);

      // Reveal off (Tab out / menu closed): the output follows The Hideaway's springs again, frame by frame.
      values.revealState.set(false);
      await nextFrame();
      assert.equal(sides().internalOpacity.get(), sides().springOpacity.get());
      assert.equal(sides().sectionTranslate.get(), sides().springTranslate.get());
      assert.equal(sides().rowY.get(), -40);
      await settle(sides().springTranslate);
      await settle(sides().springOpacity);
      assert.equal(sides().internalOpacity.get(), 0);
      assert.equal(sides().sectionTranslate.get(), variant === "slide" ? 100 : 0);
      // And it stays subscribed: a later spring move still comes through.
      values.visibleness.set(true);
      await settle(sides().springTranslate);
      assert.equal(sides().sectionTranslate.get(), sides().springTranslate.get());
      assert.equal(sides().sectionTranslate.get(), 0);
    });
  }
}

test("no slide or fade: the sides follow The Hideaway's visibility alone", async () => {
  const { values, sides } = mount(null);
  values.innerTranslate.set(0);
  await settle(sides().springOpacity);
  assert.equal(sides().internalOpacity.get(), 1);
  values.visibleness.set(false);
  await settle(sides().springOpacity);
  assert.equal(sides().internalOpacity.get(), 0);
  assert.equal(sides().sectionTranslate.get(), 0);
});
