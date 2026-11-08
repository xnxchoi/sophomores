import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { motionValue } from "motion/react";
import { ProgressSegment } from "@/components/teaser/story";
import {
  chapterGeometry,
  sectionHeightVh,
  stepMotionTokens
} from "@/lib/teaser/step-motion";

test("exit reading room extends only the final pinned hold, not earlier scroll thresholds", () => {
  const base = chapterGeometry(220);
  const extended = chapterGeometry(220, 60);
  assert.equal(base.heightVh, 416);
  assert.equal(base.motionEnd, 1);
  assert.equal(extended.heightVh, 476);
  for (const threshold of [0.25, 0.5, 0.75, 1]) {
    const oldDistance = (base.heightVh - 100) * threshold;
    const newDistance =
      (extended.heightVh - 100) * extended.motionEnd * threshold;
    assert.ok(Math.abs(oldDistance - newDistance) < 1e-9);
  }
  assert.ok(
    Math.abs((1 - extended.motionEnd) * (extended.heightVh - 100) - 60) < 1e-9
  );
  for (const invalid of [-1, NaN, Infinity]) {
    assert.throws(() => chapterGeometry(220, invalid));
    assert.throws(() => chapterGeometry(invalid, 60));
  }
});

test("sections add reading distance independently of reveal duration", () => {
  assert.equal(sectionHeightVh(0), 130);
  assert.equal(sectionHeightVh(100), 260);
  assert.equal(sectionHeightVh(300), 520);
  assert.equal(sectionHeightVh(12.5), 146.25);
  for (const invalid of [-1, NaN, Infinity, -Infinity]) {
    assert.throws(() => sectionHeightVh(invalid));
  }
});

function segmentScale(
  card: number,
  step: number,
  index: number,
  value: number
) {
  const html = renderToStaticMarkup(
    createElement(ProgressSegment, {
      card,
      step,
      index,
      progress: motionValue(value)
    })
  );
  const transform = html.match(/transform:([^";]*)/)?.[1];
  return transform === "none"
    ? 1
    : Number(transform?.match(/scaleX\(([^)]+)\)/)?.[1]);
}

test("each story card owns its progress segments rather than inheriting later cards", () => {
  const segments = [0, 1, 2, 3];
  const cardProgress = (card: number) =>
    segments.map((segment) => segmentScale(card, 2, segment, 0.4));
  assert.deepEqual(cardProgress(0), [1, 0, 0, 0]);
  assert.deepEqual(cardProgress(1), [1, 1, 0, 0]);
  assert.deepEqual(cardProgress(2), [1, 1, 0.4, 0]);
  assert.deepEqual(cardProgress(3), [0, 0, 0, 0]);
  assert.equal(segmentScale(0, 0, 0, 0), 0);
  assert.equal(segmentScale(0, 0, 0, 1), 1);
  assert.equal(segmentScale(1, 1, 1, -1), 0);
  assert.equal(segmentScale(1, 1, 1, 2), 1);
});

test("story progress rejects invalid indices and non-finite progress", () => {
  for (const invalid of [NaN, Infinity, -Infinity, -1, 0.5]) {
    assert.throws(() => segmentScale(invalid, 1, 0, 0.5));
    assert.throws(() => segmentScale(1, invalid, 0, 0.5));
    assert.throws(() => segmentScale(1, 1, invalid, 0.5));
  }
  for (const progress of [NaN, Infinity, -Infinity]) {
    assert.throws(() => segmentScale(1, 1, 1, progress));
  }
});

test("chapter reveals keep the local step durations and eases", () => {
  assert.deepEqual(stepMotionTokens, {
    hero: { duration: 0.6, ease: [0.25, 0.35, 0.35, 1] },
    origin: { duration: 0.5, ease: [0.25, 0.35, 0.35, 1] },
    how: { duration: 0.8, ease: [0.25, 0.35, 0.35, 1] },
    strategy: { duration: 0.65, ease: [0.25, 0.35, 0.35, 1] },
    people: { duration: 0.9, ease: [0.25, 0.35, 0.35, 1] }
  });
});
