import assert from "node:assert/strict";
import test from "node:test";
import { navigateHome } from "../lib/teaser/home-navigation";

function harness(overrides = {}) {
  const calls: unknown[] = [];
  const event = {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    ...overrides
  };
  const handled = navigateHome(event, {
    updateHash: () => calls.push("updateHash"),
    scrollTo: (target: number) => calls.push(["scrollTo", target])
  });
  return { handled, calls };
}

test("Home uses numeric zero rather than stale element coordinates and disables duplicate native/Lenis handling", () => {
  const { handled, calls } = harness();
  assert.equal(handled, true);
  assert.deepEqual(calls, [
    "preventDefault",
    "stopPropagation",
    "updateHash",
    ["scrollTo", 0]
  ]);
});

test("modified clicks and non-primary clicks retain browser navigation behavior", () => {
  for (const modifier of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) {
    assert.deepEqual(harness({ [modifier]: true }), {
      handled: false,
      calls: []
    });
  }
  for (const button of [1, 2]) {
    assert.deepEqual(harness({ button }), { handled: false, calls: [] });
  }
});

test("previously prevented navigation is not overridden; keyboard activation uses the primary click path", () => {
  assert.deepEqual(harness({ defaultPrevented: true }), {
    handled: false,
    calls: []
  });
  assert.equal(harness({ button: 0 }).handled, true);
});
