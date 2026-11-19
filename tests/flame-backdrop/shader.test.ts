import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveFlameConfig,
  PALETTES,
  RINGS
} from "@/components/gl/flame-backdrop/config";
import {
  pointerWeightAt,
  type Point
} from "@/components/gl/flame-backdrop/geometry";

test("shader uses linear weighted palettes and sampler-free analytic geometry", () => {
  for (const palette of PALETTES) {
    assert.ok(
      palette.colors.flat(2).every((value) => value >= 0 && value <= 1)
    );
  }
  assert.equal(RINGS.length, 5);
});

test("pointer geometry rejects invalid input, honors enabled and stays ring-bound", () => {
  const config = resolveFlameConfig();
  assert.ok(pointerWeightAt([0.35, 0], [0.35, 0], 1, 0, config) > 0.95);
  assert.equal(pointerWeightAt([0, 0], [0.35, 0], 1, 0, config), 0);
  assert.equal(pointerWeightAt([0.35, 0], [0, 0], 1, 0, config), 0);
  for (const value of [NaN, Infinity, -1, 0])
    assert.equal(pointerWeightAt([0.35, 0], [0.35, 0], value, 0, config), 0);
  assert.equal(pointerWeightAt([NaN, 0], [0.35, 0], 1, 0, config), 0);
  assert.equal(pointerWeightAt([0.35, 0], [NaN, 0], 1, 0, config), 0);
  assert.equal(pointerWeightAt([0.35, 0], [0.35, 0], 1, NaN, config), 0);
  assert.equal(
    pointerWeightAt(
      [0.35, 0],
      [0.35, 0],
      1,
      0,
      resolveFlameConfig({ pointer: { enabled: false } })
    ),
    0
  );
});

test("pointer geometry loops, scales with strength and follows configured radius", () => {
  const config = resolveFlameConfig();
  const sample = (time: number, strength = 1) =>
    pointerWeightAt([0.33, 0.01], [0.35, 0], strength, time, config);
  assert.ok(Math.abs(sample(0) - sample(12)) < 1e-12);
  assert.equal(sample(3, 0.5), sample(3) * 0.5);
  const small = resolveFlameConfig({
    visual: { ringRadius: 0.2, breathingAmount: 0 }
  });
  assert.ok(pointerWeightAt([0.2, 0], [0.2, 0], 1, 0, small) > 0.95);
  assert.equal(pointerWeightAt([0.35, 0], [0.35, 0], 1, 0, small), 0);
});

test("default pointer geometry matches fixed samples from the approved iteration", () => {
  // Recorded directly from backdrop-studies/flame-model.mjs before extraction.
  const fixtures: readonly [Point, Point, number, number, number][] = [
    [[0.35, 0], [0.35, 0], 1, 0, 0.9992738228045045],
    [[0.32, 0.07], [0.35, 0], 0.8, 3, 0.519947673513008],
    [[0, 0.35], [0, 0.32], 0.5, 7, 0.33368654695352645],
    [[0.12, 0.29], [0.03, 0.36], 1, 11, 0.3699280355118737]
  ];
  for (const [point, pointer, strength, time, expected] of fixtures) {
    assert.ok(
      Math.abs(
        pointerWeightAt(point, pointer, strength, time, resolveFlameConfig()) -
          expected
      ) < 1e-12
    );
  }
});
