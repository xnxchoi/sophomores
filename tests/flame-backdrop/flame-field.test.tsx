import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FlameFooterBackdrop } from "@/components/gl/flame-backdrop/FlameFooterBackdrop";
import { canPlayField } from "@/components/gl/flame-backdrop/field/playback";

const source = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("field playback respects visibility, manual pause and browser visibility independently", () => {
  const active = { paused: false, visible: true, hidden: false };
  assert.equal(canPlayField(active), true);
  for (const override of [
    { paused: true },
    { visible: false },
    { hidden: true }
  ]) {
    assert.equal(canPlayField({ ...active, ...override }), false);
  }
});

test("footer and durable editor share image-backed runtime without production study dependencies", () => {
  // Full-motion owner rule; tests/motion/full-motion-policy.test.ts skips flame-backdrop.
  const footer = source("src/components/gl/flame-backdrop/FlameFooterBackdrop.tsx");
  assert.doesNotMatch(footer, /ReducedMotion/);
  const html = renderToStaticMarkup(
    createElement(FlameFooterBackdrop, {
      maskSource: "/masks/custom.svg",
      paused: true
    })
  );
  assert.match(html, /data-flame-backdrop/);
  assert.match(html, /data-flame-field/);
  assert.doesNotMatch(html, /<video|<img/);
});
