import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "motion";
import {
  getOpeningFrame,
  getFrame,
  getWarpFrame,
  OPENING_TIMING,
  HANDOFF,
  TOR
} from "@/components/Warp/sequence";

test("editable timing names preserve the accepted load seconds and study handoff", () => {
  assert.deepEqual(OPENING_TIMING, {
    duration: 2.8,
    textStart: 0.1,
    characterDuration: 0.5,
    characterStagger: 0.045,
    fieldStart: 0.2,
    pageStart: 2.1
  });
  assert.ok(Object.isFrozen(OPENING_TIMING));
  assert.equal(HANDOFF, 0.7);
  assert.equal(TOR.progress.at(-1), HANDOFF);
});

test("one readiness clock starts dark and reveals streak before page UI", () => {
  assert.deepEqual(getOpeningFrame(0), {
    fieldOpacity: 0,
    controlsOpacity: 0,
    phase: "Black"
  });
  assert.equal(getOpeningFrame(0.1 / 2.8).phase, "Text reveal");
  assert.equal(getOpeningFrame(0.2 / 2.8).fieldOpacity, 0);
  assert.ok(getOpeningFrame(1 / 2.8).fieldOpacity > 0);
  assert.ok(getOpeningFrame(1 / 2.8).fieldOpacity < 1);
  assert.equal(getOpeningFrame(1 / 2.8).controlsOpacity, 0);
  assert.equal(getOpeningFrame(2.1 / 2.8).fieldOpacity, 1);
  assert.equal(getOpeningFrame(2.1 / 2.8).controlsOpacity, 0);
  assert.equal(getOpeningFrame(2.1 / 2.8).phase, "Page reveal");
  assert.ok(getOpeningFrame(2.5 / 2.8).controlsOpacity > 0);
  assert.deepEqual(getOpeningFrame(1), {
    fieldOpacity: 1,
    controlsOpacity: 1,
    phase: "Ready"
  });
});

test("load clock runs independently while scroll headline exit and later phases stay intact", () => {
  for (const scroll of [0, 0.1, 0.2, 0.22])
    assert.equal(getFrame(scroll).headlineOpacity, 1);
  assert.ok(
    getFrame(0.25).headlineOpacity > 0 &&
      getFrame(0.25).headlineOpacity < 1
  );
  assert.equal(getFrame(0.29).headlineOpacity, 0);
  assert.equal(getFrame(1).headlineOpacity, 0);
  assert.equal(getFrame(0).phase, "Attraction");
});

test("original warp anchors survive the new overall progress map and ring pins from sixty percent", () => {
  for (const [warpProgress, ringScale] of [
    [0, 0.018],
    [0.22, 0.035],
    [0.4, 0.1],
    [0.52, 0.35],
    [0.63, 1.15],
    [0.74, 1.6]
  ]) {
    const overall = (warpProgress / 0.74) * 0.6;
    assert.ok(
      Math.abs(getFrame(overall).warpProgress - warpProgress) < 1e-12
    );
    // Native cubicBezier has finite subdivision precision just off an anchor.
    assert.ok(
      Math.abs(
        getWarpFrame(getFrame(overall).warpProgress).ringScale - ringScale
      ) < 0.0002
    );
  }
  assert.equal(getFrame(0).warpProgress, 0);
  assert.ok(getFrame(0.01).warpProgress > 0);
  for (const overall of [0.6, 0.64, 0.68])
    assert.equal(getFrame(overall).warpProgress, 0.74);
  for (const overall of [0.7, 0.8, 1]) {
    assert.equal(getFrame(overall).warpProgress, 0.76);
    assert.equal(getFrame(overall).settlement, 1);
    assert.equal(
      getWarpFrame(getFrame(overall).warpProgress).ringScale,
      1.6
    );
  }
});

test("passage travels continuously from viewport bottom to above its top", () => {
  assert.equal(getFrame(0.005).headlineSplit, 0);
  assert.equal(getFrame(0.07).headlineSplit, 1);
  assert.equal(getFrame(0.07).passageReveal, 0);
  assert.ok(getFrame(0.11).passageReveal > 0);
  assert.equal(getFrame(0.15).passageReveal, 1);
  assert.equal(getFrame(0.07).passageLift, 0);
  assert.ok(Math.abs(getFrame(0.335).passageLift - 0.5) < 0.0002);
  assert.equal(getFrame(0.6).passageLift, 1);
  let previous = 0;
  for (let sample = 1; sample <= 530; sample++) {
    const travel = getFrame(0.07 + sample / 1000).passageLift;
    assert.ok(
      travel > previous,
      `Passage must keep moving at sample ${sample}`
    );
    previous = travel;
  }
  for (const boundary of [0.07, 0.335, 0.6]) {
    assert.ok(
      Math.abs(
        getFrame(boundary + 1e-7).passageLift -
          getFrame(boundary - 1e-7).passageLift
      ) < 1e-4
    );
  }
});

test("headline split and independent scale settle before the passage rises through the opening", () => {
  assert.equal(getFrame(0).headlineScale, 1);
  assert.ok(getFrame(0.01).headlineScale < 1);
  assert.equal(getFrame(0.07).headlineSplit, 1);
  assert.ok(getFrame(0.04).headlineScale > getFrame(0.07).headlineScale);
  assert.equal(getFrame(0.07).headlineScale, 0.72);
  for (const progress of [0.1, 0.15, 0.22, 0.27]) {
    const frame = getFrame(progress);
    assert.ok(frame.passageLift > 0 && frame.passageLift < 1);
    assert.ok(frame.headlineOpacity > 0);
    assert.equal(frame.passageOpacity, 1);
  }
});

test("existing passage lines reveal in succession without another animation clock", () => {
  assert.equal(getFrame(0.1).passageSecondReveal, 0);
  for (const progress of [0.11, 0.13, 0.15, 0.17]) {
    const frame = getFrame(progress);
    assert.ok(frame.passageReveal > frame.passageSecondReveal);
  }
  assert.equal(getFrame(0.18).passageSecondReveal, 1);
  for (const boundary of [0.005, 0.07, 0.1, 0.15, 0.18, 0.22, 0.29]) {
    const before = getFrame(boundary - 1e-7);
    const after = getFrame(boundary + 1e-7);
    for (const key of ["headlineScale", "headlineOpacity", "passageReveal", "passageSecondReveal"] as const) {
      assert.ok(Math.abs(after[key] - before[key]) < 0.0001, `${key} at ${boundary}`);
    }
  }
});

test("headline responds to the first scroll without a long hold or slow ease-in", () => {
  assert.equal(getFrame(0).headlineSplit, 0);
  assert.ok(getFrame(0.01).headlineSplit > 0.025);
  assert.ok(getFrame(0.05).headlineSplit > 0.2);
  for (const progress of [0.01, 0.025, 0.04, 0.06]) {
    const before = getFrame(progress - 0.001);
    const after = getFrame(progress + 0.001);
    assert.ok(after.headlineSplit > before.headlineSplit);
    assert.ok(after.warpProgress > before.warpProgress);
  }
});

test("passage remains fully opaque until its entire block has left above the viewport", () => {
  for (const overall of [0.08, 0.15, 0.25, 0.34, 0.42, 0.47, 0.5, 0.55, 0.59, 0.599999, 0.6]) {
    assert.equal(
      getFrame(overall).passageOpacity,
      1,
      `No in-viewport fade at ${overall}`
    );
  }
  assert.ok(
    getFrame(0.605).passageOpacity > 0 &&
      getFrame(0.605).passageOpacity < 1
  );
  for (const overall of [0, 0.07, 0.61, 0.7, 1]) {
    assert.equal(getFrame(overall).passageOpacity, 0);
  }
});

test("Play jump stops at seventy percent with reading room and 2.4s pinned settlement", () => {
  assert.equal(TOR.duration, 9.8);
  assert.deepEqual(
    TOR.progress,
    [0, 0.01, 0.04, 0.08, 0.14, 0.34, 0.42, 0.5, 0.6, 0.7]
  );
  assert.deepEqual(
    TOR.seconds,
    [0, 0.45, 1.3, 2, 2.6, 4, 4.8, 6, 7.4, 9.8]
  );
  const time = transform([...TOR.progress], [...TOR.seconds]);
  assert.ok(Math.abs(time(0.7) - time(0.6) - 2.4) < 1e-12);
  for (const value of [TOR, TOR.progress, TOR.seconds])
    assert.ok(Object.isFrozen(value));
});

test("settlement is absent during expansion and finishes at the actual corona zero", () => {
  for (const overall of [0, 0.2, 0.5, 0.599999, 0.6])
    assert.equal(getFrame(overall).settlement, 0);
  for (const [overall, settlement] of [
    [0.6, 0],
    [0.625, 0.25],
    [0.65, 0.5],
    [0.675, 0.75],
    [0.7, 1],
    [1, 1]
  ]) {
    assert.ok(Math.abs(getFrame(overall).settlement - settlement) < 1e-12);
  }
  assert.equal(getFrame(0.6).phase, "Settling");
  assert.equal(getFrame(0.65).phase, "Color return");
  assert.equal(getFrame(0.7).phase, "Corona");
});

test("new progress maps reject invalid input, clamp overscroll and return immutable fresh frames", () => {
  for (const map of [getOpeningFrame, getFrame]) {
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
      assert.throws(() => map(value as number), RangeError);
    }
    assert.deepEqual(map(-100), map(0));
    assert.deepEqual(map(Number.MAX_VALUE), map(1));
    const frame = map(0.5);
    assert.equal(Object.isFrozen(frame), true);
    assert.notEqual(frame, map(0.5));
    assert.deepEqual(frame, map(0.5));
    assert.equal(Reflect.set(frame, "phase", "mutated"), false);
  }
});

test("new maps stay bounded, deterministic and reversible across 10,001 samples", () => {
  let previousWarp = 0;
  for (let index = 0; index <= 10_000; index++) {
    const progress = index / 10_000;
    const opening = getOpeningFrame(progress);
    const study = getFrame(progress);
    for (const frame of [opening, study]) {
      for (const [key, value] of Object.entries(frame)) {
        if (typeof value !== "number") continue;
        assert.ok(Number.isFinite(value), key);
        assert.ok(value >= 0 && value <= 1, key);
      }
    }
    assert.ok(study.warpProgress >= previousWarp);
    previousWarp = study.warpProgress;
  }
  const progress = [0, 0.12, 0.42, 0.62, 0.68, 0.78, 0.84, 0.94, 1];
  assert.deepEqual(
    progress.map(getOpeningFrame),
    progress.toReversed().map(getOpeningFrame).reverse()
  );
  assert.deepEqual(
    progress.map(getFrame),
    progress.toReversed().map(getFrame).reverse()
  );
});
