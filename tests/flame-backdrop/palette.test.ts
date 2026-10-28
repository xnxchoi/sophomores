import assert from "node:assert/strict";
import test from "node:test";
import {
  paletteWeights,
  resolvePaletteWeights,
  cyclePaletteWeights,
  resolveScrollStops,
  paletteAtProgress,
  scrollProgress,
  DEFAULT_SCROLL_PALETTE_STOPS
} from "@/components/gl/flame-backdrop/palette";

test("external blend weights normalize without mutating the caller", () => {
  const input = [2, 3, 5] as const;
  const result = resolvePaletteWeights(input);
  assert.deepEqual(result, [0.2, 0.3, 0.5]);
  assert.deepEqual(input, [2, 3, 5]);
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(resolvePaletteWeights("gilded-flame"), [0, 1, 0]);
  assert.deepEqual(
    resolvePaletteWeights([Number.MAX_VALUE, Number.MAX_VALUE, 0]),
    [0.5, 0.5, 0]
  );
  for (const input of [
    [0, 0, 0],
    [-1, 1, 1],
    [NaN, 1, 1],
    [Infinity, 1, 1],
    [1, 2],
    [1, , 0],
    null
  ]) {
    assert.throws(() => resolvePaletteWeights(input as never), /weights/i);
  }
});

test("optional cyclic driver holds, blends, closes loop, and accepts custom sequences", () => {
  assert.deepEqual(cyclePaletteWeights(0), [0, 1, 0]);
  assert.deepEqual(cyclePaletteWeights(8), [0, 1, 0]);
  assert.deepEqual(cyclePaletteWeights(12), [0, 0.5, 0.5]);
  assert.deepEqual(cyclePaletteWeights(16), [0, 0, 1]);
  assert.deepEqual(cyclePaletteWeights(48), [0, 1, 0]);
  assert.deepEqual(cyclePaletteWeights(-1), cyclePaletteWeights(47));
  assert.deepEqual(
    cyclePaletteWeights(3, {
      palettes: ["pale-brass"],
      holdSeconds: 0,
      transitionSeconds: 1
    }),
    [1, 0, 0]
  );
  assert.deepEqual(
    cyclePaletteWeights(1, {
      palettes: ["pale-brass", "copper-ember"],
      holdSeconds: 0,
      transitionSeconds: 2
    }),
    [0.5, 0, 0.5]
  );
  for (const options of [
    { palettes: [] },
    { palettes: ["pale-brass", , "copper-ember"] },
    { holdSeconds: -1 },
    { transitionSeconds: 0 },
    { transitionSeconds: Infinity },
    { holdSeconds: Number.MAX_VALUE, transitionSeconds: Number.MAX_VALUE }
  ]) {
    assert.throws(
      () => cyclePaletteWeights(0, options as never),
      /cycle|palette|Seconds/i
    );
  }
  assert.throws(() => cyclePaletteWeights(NaN), /finite/);
});

test("palette endpoints are immutable one-hot weights in shader order", () => {
  assert.deepEqual(paletteWeights("pale-brass"), [1, 0, 0]);
  assert.deepEqual(paletteWeights("gilded-flame"), [0, 1, 0]);
  assert.deepEqual(paletteWeights("copper-ember"), [0, 0, 1]);
  assert.ok(Object.isFrozen(paletteWeights("gilded-flame")));
  assert.throws(() => paletteWeights("invalid" as never), /palette/i);
});

test("scroll thresholds select in both directions; equality selects the new palette", () => {
  const stops = resolveScrollStops();
  for (const [progress, expected] of [
    [0, "gilded-flame"],
    [0.4, "pale-brass"],
    [0.75, "copper-ember"],
    [0.6, "pale-brass"],
    [0.1, "gilded-flame"]
  ] as const) {
    assert.equal(paletteAtProgress(progress, stops), expected);
  }
  assert.equal(paletteAtProgress(-1, stops), "gilded-flame");
  assert.equal(paletteAtProgress(2, stops), "copper-ember");
  assert.throws(() => paletteAtProgress(NaN, stops), /finite/);
});

test("scroll progress handles short pages, overscroll, and viewport changes", () => {
  assert.equal(scrollProgress(500, 2000, 1000), 0.5);
  assert.equal(scrollProgress(500, 1000, 1000), 0);
  assert.equal(scrollProgress(0, 800, 1000), 0);
  assert.equal(scrollProgress(-50, 2000, 1000), 0);
  assert.equal(scrollProgress(2000, 2000, 1000), 1);
  assert.equal(scrollProgress(500, 3000, 1000), 0.25);
  assert.throws(() => scrollProgress(Infinity, 2000, 1000), /finite/);
});

test("custom stops are copied, frozen and strictly validated", () => {
  const input = [{ progress: 0, palette: "copper-ember" as const }];
  const result = resolveScrollStops(input);
  assert.notEqual(result, input);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result[0]));
  assert.ok(Object.isFrozen(DEFAULT_SCROLL_PALETTE_STOPS));
  assert.equal(paletteAtProgress(0.9, result), "copper-ember");
  for (const stops of [
    [],
    [{ progress: 0, palette: "pale-brass" }, ,],
    [{ progress: 0.1, palette: "pale-brass" }],
    [{ progress: 0, palette: "x" }],
    [{ progress: NaN, palette: "pale-brass" }],
    [
      { progress: 0, palette: "pale-brass" },
      { progress: 0, palette: "copper-ember" }
    ],
    [
      { progress: 0, palette: "pale-brass" },
      { progress: 1.1, palette: "copper-ember" }
    ]
  ]) {
    assert.throws(
      () => resolveScrollStops(stops as never),
      /palette|progress|stop/i
    );
  }
});
