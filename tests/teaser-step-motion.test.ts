import assert from "node:assert/strict";
import test from "node:test";
import {
  chapterStep,
  getStoryStepProgress,
  nextDisplayedStep,
  sectionHeightVh,
  stepMotionTokens,
} from "../lib/teaser/step-motion";

test("sections grow twenty percent including their pinned viewport", () => {
  assert.equal(sectionHeightVh(0), 120);
  assert.equal(sectionHeightVh(100), 240);
  assert.equal(sectionHeightVh(300), 480);
  assert.equal(sectionHeightVh(12.5), 135);
  for (const invalid of [-1, NaN, Infinity, -Infinity]) {
    assert.throws(() => sectionHeightVh(invalid));
  }
});

test("chapter targets change only at discrete scroll thresholds and stay in bounds", () => {
  const samples = [-1, 0, 0.249, 0.25, 0.499, 0.5, 0.749, 0.75, 1, 2];
  assert.deepEqual(samples.map((progress) => chapterStep(progress, 4)), [
    0, 0, 0, 1, 1, 2, 2, 3, 3, 3,
  ]);
  assert.equal(chapterStep(1, 1), 0);
  assert.equal(chapterStep(0.99999, 10_000), 9_999);
  assert.deepEqual(
    [...samples].reverse().map((progress) => chapterStep(progress, 4)),
    samples.map((progress) => chapterStep(progress, 4)).reverse(),
  );
});

test("chapter targets reject invalid progress and step counts", () => {
  for (const progress of [NaN, Infinity, -Infinity]) {
    assert.throws(() => chapterStep(progress, 4));
  }
  for (const steps of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => chapterStep(0.5, steps));
  }
});

test("displayed steps catch up one adjacent card at a time in either direction", () => {
  assert.equal(nextDisplayedStep(0, 3), 1);
  assert.equal(nextDisplayedStep(1, 3), 2);
  assert.equal(nextDisplayedStep(2, 3), 3);
  assert.equal(nextDisplayedStep(3, 3), 3);
  assert.equal(nextDisplayedStep(3, 0), 2);
  assert.equal(nextDisplayedStep(2, 0), 1);
  assert.equal(nextDisplayedStep(1, 0), 0);
  assert.equal(nextDisplayedStep(0, 0), 0);
  assert.equal(nextDisplayedStep(0, 10_000), 1);
  assert.equal(nextDisplayedStep(10_000, 0), 9_999);
  // Reversing the target while catching up never overshoots or skips a card.
  assert.equal(nextDisplayedStep(nextDisplayedStep(0, 3), 0), 0);
});

test("displayed steps reject non-finite, negative, and fractional indices", () => {
  for (const invalid of [NaN, Infinity, -Infinity, -1, 0.5]) {
    assert.throws(() => nextDisplayedStep(invalid, 2));
    assert.throws(() => nextDisplayedStep(2, invalid));
  }
});

test("each story card owns its progress segments rather than inheriting later cards", () => {
  const segments = [0, 1, 2, 3];
  const cardProgress = (card: number) =>
    segments.map((segment) => getStoryStepProgress(card, 2, segment, 0.4));
  assert.deepEqual(cardProgress(0), [1, 0, 0, 0]);
  assert.deepEqual(cardProgress(1), [1, 1, 0, 0]);
  assert.deepEqual(cardProgress(2), [1, 1, 0.4, 0]);
  assert.deepEqual(cardProgress(3), [0, 0, 0, 0]);
  assert.equal(getStoryStepProgress(0, 0, 0, 0), 0);
  assert.equal(getStoryStepProgress(0, 0, 0, 1), 1);
  assert.equal(getStoryStepProgress(1, 1, 1, -1), 0);
  assert.equal(getStoryStepProgress(1, 1, 1, 2), 1);
});

test("story progress rejects invalid indices and non-finite progress", () => {
  for (const invalid of [NaN, Infinity, -Infinity, -1, 0.5]) {
    assert.throws(() => getStoryStepProgress(invalid, 1, 0, 0.5));
    assert.throws(() => getStoryStepProgress(1, invalid, 0, 0.5));
    assert.throws(() => getStoryStepProgress(1, 1, invalid, 0.5));
  }
  for (const progress of [NaN, Infinity, -Infinity]) {
    assert.throws(() => getStoryStepProgress(1, 1, 1, progress));
  }
});

test("internal transitions preserve the established chapter timing and easing", () => {
  assert.deepEqual(stepMotionTokens.origin, {
    duration: 0.55,
    ease: [0.5, 0, 0.5, 1],
  });
  assert.deepEqual(stepMotionTokens.how, {
    duration: 1.2,
    ease: [0.33, 1, 0.68, 1],
  });
  assert.deepEqual(stepMotionTokens.strategy, {
    duration: 0.8,
    ease: [0.5, 0, 0, 1],
  });
});
