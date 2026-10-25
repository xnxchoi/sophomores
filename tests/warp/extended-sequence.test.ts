import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "motion";
import { getOpeningFrame, getStudyFrame, getWarpFrame, OPENING_TIMING, STUDY_HANDOFF, STUDY_TOUR } from "../../app/(site)/studies/warp/sequence";

test("editable timing names preserve the accepted load seconds and study handoff", () => {
  assert.deepEqual(OPENING_TIMING, {
    duration: 2.8, textStart: .1, characterDuration: .5,
    characterStagger: .045, fieldStart: .2, pageStart: 2.1,
  });
  assert.ok(Object.isFrozen(OPENING_TIMING));
  assert.equal(STUDY_HANDOFF, .7);
  assert.equal(STUDY_TOUR.progress.at(-1), STUDY_HANDOFF);
});

test("one readiness clock starts dark and reveals streak before page UI", () => {
  assert.deepEqual(getOpeningFrame(0), { fieldOpacity: 0, controlsOpacity: 0, phase: "Black" });
  assert.equal(getOpeningFrame(.1 / 2.8).phase, "Text reveal");
  assert.equal(getOpeningFrame(.2 / 2.8).fieldOpacity, 0);
  assert.ok(getOpeningFrame(1 / 2.8).fieldOpacity > 0);
  assert.ok(getOpeningFrame(1 / 2.8).fieldOpacity < 1);
  assert.equal(getOpeningFrame(1 / 2.8).controlsOpacity, 0);
  assert.equal(getOpeningFrame(2.1 / 2.8).fieldOpacity, 1);
  assert.equal(getOpeningFrame(2.1 / 2.8).controlsOpacity, 0);
  assert.equal(getOpeningFrame(2.1 / 2.8).phase, "Page reveal");
  assert.ok(getOpeningFrame(2.5 / 2.8).controlsOpacity > 0);
  assert.deepEqual(getOpeningFrame(1), { fieldOpacity: 1, controlsOpacity: 1, phase: "Ready" });
});

test("load clock runs independently while scroll headline exit and later phases stay intact", () => {
  for (const scroll of [0, .1, .2, .3]) assert.equal(getStudyFrame(scroll).headlineOpacity, 1);
  assert.ok(getStudyFrame(.35).headlineOpacity > 0 && getStudyFrame(.35).headlineOpacity < 1);
  assert.equal(getStudyFrame(.4).headlineOpacity, 0);
  assert.equal(getStudyFrame(1).headlineOpacity, 0);
  assert.equal(getStudyFrame(0).phase, "Attraction");
});

test("original warp anchors survive the new overall progress map and ring pins from sixty percent", () => {
  for (const [warpProgress, ringScale] of [[0, 0.018], [0.22, 0.035], [0.4, 0.1], [0.52, 0.35], [0.63, 1.15], [0.74, 1.6]]) {
    const overall = 0.04 + warpProgress / 0.74 * 0.56;
    assert.ok(Math.abs(getStudyFrame(overall).warpProgress - warpProgress) < 1e-12);
    // Native cubicBezier has finite subdivision precision just off an anchor.
    assert.ok(Math.abs(getWarpFrame(getStudyFrame(overall).warpProgress).ringScale - ringScale) < .0002);
  }
  assert.equal(getStudyFrame(0.04).warpProgress, 0);
  for (const overall of [0.6, 0.64, 0.68]) assert.equal(getStudyFrame(overall).warpProgress, 0.74);
  for (const overall of [0.7, 0.8, 1]) {
    assert.equal(getStudyFrame(overall).warpProgress, 0.76);
    assert.equal(getStudyFrame(overall).settlement, 1);
    assert.equal(getWarpFrame(getStudyFrame(overall).warpProgress).ringScale, 1.6);
  }
});

test("extra passage rises after headline parting, holds then leaves before settlement", () => {
  assert.equal(getStudyFrame(.2).headlineSplit, 0);
  assert.equal(getStudyFrame(.34).headlineSplit, 1);
  assert.equal(getStudyFrame(.34).passageReveal, 0);
  assert.ok(getStudyFrame(.38).passageReveal > 0);
  assert.equal(getStudyFrame(.42).passageReveal, 1);
  for (const overall of [.42, .46, .5]) {
    assert.equal(getStudyFrame(overall).passageOpacity, 1);
    assert.equal(getStudyFrame(overall).passageLift, 0);
  }
  assert.ok(getStudyFrame(.55).passageOpacity > 0);
  assert.ok(getStudyFrame(.55).passageLift > 0);
  for (const overall of [0, .6, .7, 1]) assert.equal(getStudyFrame(overall).passageOpacity, 0);
});

test("Play jump stops at seventy percent with reading room and 2.4s pinned settlement", () => {
  assert.equal(STUDY_TOUR.duration, 9.8);
  assert.deepEqual(STUDY_TOUR.progress, [0, .01, .04, .08, .14, .34, .42, .50, .60, .70]);
  assert.deepEqual(STUDY_TOUR.seconds, [0, .45, 1.3, 2, 2.6, 4, 4.8, 6, 7.4, 9.8]);
  const time = transform([...STUDY_TOUR.progress], [...STUDY_TOUR.seconds]);
  assert.ok(Math.abs(time(.7) - time(.6) - 2.4) < 1e-12);
  for (const value of [STUDY_TOUR, STUDY_TOUR.progress, STUDY_TOUR.seconds]) assert.ok(Object.isFrozen(value));
});

test("settlement is absent during expansion and finishes at the actual corona zero", () => {
  for (const overall of [0, .2, .5, .599999, .6]) assert.equal(getStudyFrame(overall).settlement, 0);
  for (const [overall, settlement] of [[.6, 0], [.625, .25], [.65, .5], [.675, .75], [.7, 1], [1, 1]]) {
    assert.ok(Math.abs(getStudyFrame(overall).settlement - settlement) < 1e-12);
  }
  assert.equal(getStudyFrame(.6).phase, "Settling");
  assert.equal(getStudyFrame(.65).phase, "Color return");
  assert.equal(getStudyFrame(.7).phase, "Corona");
});

test("new progress maps reject invalid input, clamp overscroll and return immutable fresh frames", () => {
  for (const map of [getOpeningFrame, getStudyFrame]) {
    for (const value of [NaN, Infinity, -Infinity, undefined, null, "0.5", {}, []]) {
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
    const study = getStudyFrame(progress);
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
  assert.deepEqual(progress.map(getOpeningFrame), progress.toReversed().map(getOpeningFrame).reverse());
  assert.deepEqual(progress.map(getStudyFrame), progress.toReversed().map(getStudyFrame).reverse());
});
