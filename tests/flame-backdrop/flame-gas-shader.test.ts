import assert from "node:assert/strict";
import test from "node:test";
import {
  createGasFlameShader,
  ignitionUvSample
} from "@/components/gl/flame-backdrop/field/gas-shader";
import { referenceConfig } from "@/components/gl/flame-backdrop/field/material";
import {
  FLAME_BLEND_WEIGHTS,
  flameMotionSeconds
} from "@/components/gl/flame-backdrop/field/blend";

test("comparison generator varies only lighting weights without changing the production default or wrapper", () => {
  const config = referenceConfig(1440, 900);
  const original = createGasFlameShader(config);
  assert.equal(
    createGasFlameShader(config, { original: 0.75, next: 0.25 }),
    original
  );
  assert.throws(
    () => createGasFlameShader(config, { original: 0.7, next: 0.4 }),
    /weights/
  );
});

test("approved independent controls are frozen and normalized", () => {
  const expected = {
    silhouette: [0.7, 0.3],
    material: [0.75, 0.25],
    color: [0.8, 0.2],
    surface: [1, 0],
    motion: [0.3, 0.7],
    animation: [0, 1]
  };
  assert.ok(Object.isFrozen(FLAME_BLEND_WEIGHTS));
  for (const [factor, weights] of Object.entries(FLAME_BLEND_WEIGHTS)) {
    assert.ok(Object.isFrozen(weights));
    assert.deepEqual(
      [weights.original, weights.next],
      expected[factor as keyof typeof expected]
    );
    assert.equal(weights.original + weights.next, 1);
  }
});

test("motion uses continuous active advection with no new loop-boundary jump", () => {
  assert.equal(flameMotionSeconds(0), 0);
  assert.ok(Math.abs(flameMotionSeconds(1) - 1.42) < 1e-12);
  assert.ok(
    Math.abs(
      flameMotionSeconds(16.001) - flameMotionSeconds(15.999) - 0.00284
    ) < 1e-10
  );
  for (const invalid of [-1, NaN, Infinity])
    assert.throws(() => flameMotionSeconds(invalid), /finite and nonnegative/);
});

test("shared UV transform remains continuous when ignition reaches settled at partial exposure", () => {
  for (const exposure of [0.08, 0.15, 0.4, 1]) {
    for (const v of [0, 0.15, 0.5, 1]) {
      assert.ok(
        Math.abs(
          ignitionUvSample(v, 0.9999999, exposure) -
            ignitionUvSample(v, 1, exposure)
        ) < 1e-8
      );
    }
  }
  for (const v of [0, 0.15, 0.5, 1])
    assert.ok(Math.abs(ignitionUvSample(v, 1, 1) - v) < 1e-12);
  for (const invalid of [-1, NaN, Infinity])
    assert.throws(() => ignitionUvSample(0.5, 1, invalid), /normalized finite/);
});
