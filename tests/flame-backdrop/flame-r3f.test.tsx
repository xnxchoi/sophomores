import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { advanceFieldTime } from "@/components/gl/flame-backdrop/field/runtime";
import { referenceConfig } from "@/components/gl/flame-backdrop/field/material";
import { createResponsiveEnvelopeShader } from "@/components/gl/flame-backdrop/field/shader";

test("field time advances only for active rendering and does not catch up after suspension", () => {
  assert.equal(advanceFieldTime(7, 0.016, true), 7.016);
  assert.equal(advanceFieldTime(7, 30, false), 7);
  assert.equal(advanceFieldTime(7, 30, true), 7.1);
  assert.equal(advanceFieldTime(7, 0, true), 7);
  assert.equal(advanceFieldTime(0, 0.1, true), 0.1);
});

test("field time rejects invalid clocks instead of sending NaN into GPU uniforms", () => {
  for (const invalid of [-1, NaN, Infinity, -Infinity, null, undefined, "1"]) {
    assert.throws(
      () => advanceFieldTime(invalid as number, 0.016, true),
      RangeError
    );
    assert.throws(
      () => advanceFieldTime(0, invalid as number, true),
      RangeError
    );
  }
});

test("R3F owns field rendering rather than nesting a second renderer or animation loop", () => {
  const canvas = readFileSync(
    new URL("../../src/components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
    "utf8"
  );
  // Full-motion owner rule; tests/motion/full-motion-policy.test.ts skips flame-backdrop.
  assert.doesNotMatch(canvas, /prefers-reduced-motion|useReducedMotion/);
});

test("responsive field retains the canonical shader precondition guards", () => {
  const config = referenceConfig(1440, 900);
  assert.throws(() =>
    createResponsiveEnvelopeShader({
      ...config,
      fire: { ...config.fire, rimStrength: 1 }
    })
  );
  assert.throws(() =>
    createResponsiveEnvelopeShader({
      ...config,
      visual: { ...config.visual, ringRadius: 0.4 }
    })
  );
});

test("vertical presentation validates a bounded finite stretch before it reaches the GPU", async () => {
  const { validateVerticalStretch } =
    await import("@/components/gl/flame-backdrop/field/presentation");
  for (const value of [0.5, 1, 1.4, 3]) {
    assert.doesNotThrow(() => validateVerticalStretch(value));
  }
  for (const invalid of [
    0.4999,
    3.0001,
    0,
    -1,
    NaN,
    Infinity,
    -Infinity,
    null,
    undefined,
    "1.4",
    true
  ]) {
    assert.throws(() => validateVerticalStretch(invalid as number), RangeError);
  }
});

test("production footer raises the field through a validated art-direction token", async () => {
  const { backdropTokens } = await import("@/lib/teaser/backdrop-tokens");
  const { validateVerticalStretch } =
    await import("@/components/gl/flame-backdrop/field/presentation");
  assert.ok(
    backdropTokens.footerVerticalStretch > 1,
    "production footer must lift its upper reach above the canonical editor presentation"
  );
  assert.doesNotThrow(() =>
    validateVerticalStretch(backdropTokens.footerVerticalStretch)
  );
});
