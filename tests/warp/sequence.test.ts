import assert from "node:assert/strict";
import test from "node:test";
import { getWarpFrame } from "@/components/Warp/sequence";

test("opening and completed handoff have explicit bounded endpoints", () => {
  assert.deepEqual(getWarpFrame(0), {
    ringScale: 0.018,
    pointRadius: 0.006,
    pointOpacity: 1,
    rayOpacity: 1,
    travel: 0,
    headlineSplit: 0,
    headlineOpacity: 1,
    captionOpacity: 0,
    captionY: 90,
    sceneOpacity: 1,
    phase: "Stillness"
  });
  assert.deepEqual(getWarpFrame(1), {
    ringScale: 3.6,
    pointRadius: 0.12,
    pointOpacity: 0,
    rayOpacity: 0,
    travel: 3.9,
    headlineSplit: 1,
    headlineOpacity: 0,
    captionOpacity: 0,
    captionY: 0,
    sceneOpacity: 0,
    phase: "Handoff"
  });
});

test("finite overscroll clamps without extrapolating geometry", () => {
  assert.deepEqual(getWarpFrame(-1), getWarpFrame(0));
  assert.deepEqual(getWarpFrame(2), getWarpFrame(1));
  assert.deepEqual(getWarpFrame(Number.MAX_VALUE), getWarpFrame(1));
  assert.deepEqual(getWarpFrame(-Number.MAX_VALUE), getWarpFrame(0));
});

test("non-finite and nonnumeric inputs fail explicitly", () => {
  for (const value of [
    NaN,
    Infinity,
    -Infinity,
    undefined,
    null,
    "0.5",
    {},
    []
  ]) {
    assert.throws(() => getWarpFrame(value as number), RangeError);
  }
});

test("phase boundaries follow the agreed six beats", () => {
  for (const [progress, phase] of [
    [0, "Stillness"],
    [0.0799, "Stillness"],
    [0.08, "Attraction"],
    [0.3799, "Attraction"],
    [0.38, "Acceleration"],
    [0.5999, "Acceleration"],
    [0.6, "Threshold"],
    [0.6999, "Threshold"],
    [0.7, "Suspension"],
    [0.8799, "Suspension"],
    [0.88, "Handoff"],
    [1, "Handoff"]
  ] as const)
    assert.equal(getWarpFrame(progress).phase, phase);
});

test("the actual ring reaches hero scale and holds before departure", () => {
  for (const [progress, scale] of [
    [0, 0.018],
    [0.22, 0.035],
    [0.4, 0.1],
    [0.52, 0.35],
    [0.63, 1.15],
    [0.74, 1.6],
    [0.8, 1.6],
    [0.86, 1.6],
    [1, 3.6]
  ])
    assert.ok(Math.abs(getWarpFrame(progress).ringScale - scale) < 1e-10);
});

test("caption receives a dark center and a settled ring, not the peak hotspot", () => {
  assert.equal(getWarpFrame(0.22).captionOpacity, 0);
  assert.equal(getWarpFrame(0.4).captionOpacity, 0.15);
  assert.equal(getWarpFrame(0.68).pointOpacity, 0);
  assert.equal(getWarpFrame(0.7).captionOpacity, 1);
  assert.equal(getWarpFrame(0.7).captionY, 0);
  assert.equal(getWarpFrame(0.76).rayOpacity, 0);
  assert.equal(getWarpFrame(0.86).captionOpacity, 1);
  assert.equal(getWarpFrame(0.88).sceneOpacity, 1);
});

test("all numeric channels remain finite and bounded over the complete transition", () => {
  const bounds = {
    ringScale: [0.018, 3.6],
    pointRadius: [0.006, 0.12],
    pointOpacity: [0, 1],
    rayOpacity: [0, 1],
    travel: [0, 3.9],
    headlineSplit: [0, 1],
    headlineOpacity: [0, 1],
    captionOpacity: [0, 1],
    captionY: [0, 90],
    sceneOpacity: [0, 1]
  } as const;
  let previous = getWarpFrame(0);
  for (let index = 0; index <= 10_000; index++) {
    const current = getWarpFrame(index / 10_000);
    for (const key of Object.keys(bounds) as (keyof typeof bounds)[]) {
      assert.ok(Number.isFinite(current[key]), key);
      assert.ok(
        current[key] >= bounds[key][0] && current[key] <= bounds[key][1],
        key
      );
    }
    for (const key of [
      "ringScale",
      "pointRadius",
      "travel",
      "headlineSplit"
    ] as const) {
      assert.ok(current[key] >= previous[key], key);
    }
    previous = current;
  }
});

test("phase and keyframe boundaries do not introduce numeric jumps", () => {
  const keys = Object.keys(getWarpFrame(0)).filter(
    (key) => key !== "phase"
  ) as Exclude<keyof ReturnType<typeof getWarpFrame>, "phase">[];
  for (const boundary of [
    0.08, 0.22, 0.25, 0.38, 0.4, 0.48, 0.5, 0.52, 0.53, 0.6, 0.62, 0.63, 0.68,
    0.7, 0.72, 0.74, 0.76, 0.86, 0.88
  ]) {
    const before = getWarpFrame(boundary - 1e-7);
    const after = getWarpFrame(boundary + 1e-7);
    for (const key of keys)
      assert.ok(
        Math.abs(before[key] - after[key]) < 0.001,
        `${boundary}: ${key}`
      );
  }
});

test("reverse scrolling and explicit replay produce identical independent frames", () => {
  const forward = [0, 0.2, 0.5, 0.7, 1].map(getWarpFrame);
  const reverse = [1, 0.7, 0.5, 0.2, 0].map(getWarpFrame).reverse();
  assert.deepEqual(reverse, forward);
  const initial = getWarpFrame(0);
  assert.notEqual(initial, forward[0]);
  assert.deepEqual(initial, forward[0]);
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Reflect.set(initial, "ringScale", 99), false);
  assert.equal(getWarpFrame(0).ringScale, 0.018);
});

test("ring and travel preserve nonzero velocity across acceleration joints", () => {
  // Motion's native cubicBezier solver caps binary subdivision at 12 iterations;
  // use .001 rather than sub-solver-resolution differences for velocity checks.
  const epsilon = 1e-3;
  for (const key of ["ringScale", "travel"] as const) {
    for (const joint of [0.4, 0.52, 0.63]) {
      const center = getWarpFrame(joint)[key];
      const before = (center - getWarpFrame(joint - epsilon)[key]) / epsilon;
      const after = (getWarpFrame(joint + epsilon)[key] - center) / epsilon;
      assert.ok(
        before > 0.5 && after > 0.5,
        `${key} at ${joint} must not stop`
      );
      assert.ok(
        Math.abs(before - after) < 0.25,
        `${key} at ${joint}: ${before} vs ${after}`
      );
    }
  }
});
