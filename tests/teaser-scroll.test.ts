"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transform } from "motion/react";
import { createTimeline, scrollChapters } from "../lib/teaser/choreography";
import { scrollSmoothing, shouldAnimate } from "../lib/motion-tokens";

test("Lenis owns smooth scrolling without a bespoke frame loop or touch hijacking", () => {
  assert.equal(scrollSmoothing.autoRaf, true);
  assert.equal(scrollSmoothing.anchors, true);
  assert.equal(scrollSmoothing.syncTouch, false);
  assert.equal(scrollSmoothing.respectReducedMotion, true);
  const experience = readFileSync(
    new URL("../components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  assert.match(experience, /ReactLenis/);
  assert.doesNotMatch(experience, /requestAnimationFrame|\.raf\(/);
  const css = readFileSync(
    new URL("../app/teaser.css", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(css, /scroll-behavior:\s*smooth/);
  assert.equal(shouldAnimate({ prefersReduced: true, essential: true }), false);
  assert.equal(shouldAnimate({ lowEnd: true }), false);
  assert.equal(shouldAnimate({ lowEnd: true, essential: true }), true);
});

test("pinned chapters have longer travel and full holds before AND after transitions", () => {
  for (const [id, chapter] of Object.entries(scrollChapters)) {
    const timeline = createTimeline(chapter);
    assert.equal(
      timeline.travelVh,
      chapter.steps * chapter.holdVh +
        (chapter.steps - 1) * chapter.transitionVh
    );
    assert.equal(timeline.input[0], 0);
    assert.equal(timeline.input.at(-1), 1);
    const previous = id === "hero" ? 100 : id === "people" ? 140 : 200;
    assert.ok(timeline.travelVh >= previous * 1.35);
    for (let step = 0; step < chapter.steps; step++) {
      const start = timeline.input[step * 2];
      const end = timeline.input[step * 2 + 1];
      assert.ok(end > start);
      assert.ok(
        Math.abs((end - start) * timeline.travelVh - chapter.holdVh) < 1e-9
      );
      const sample = transform(timeline.input, timeline.output);
      assert.equal(sample((start + end) / 2), step);
      assert.equal(sample(start), step);
      assert.equal(sample(end), step);
    }
  }
});

test("scroll-driven Motion interpolation remains continuous and reversible", () => {
  const { input, output } = createTimeline(scrollChapters.origin);
  const sample = transform(input, output);
  for (let i = 1; i < input.length - 1; i += 2)
    assert.ok(
      Math.abs(sample((input[i] + input[i + 1]) / 2) - (output[i] + 0.5)) < 1e-9
    );
  const forward = Array.from({ length: 1001 }, (_, i) => sample(i / 1000));
  const reverse = Array.from({ length: 1001 }, (_, i) =>
    sample((1000 - i) / 1000)
  ).reverse();
  assert.deepEqual(forward, reverse);
  assert.ok(
    forward.every(
      (value, i) =>
        Number.isFinite(value) && (i === 0 || value >= forward[i - 1])
    )
  );
});

test("timeline rejects invalid configuration and supports a single held step", () => {
  assert.deepEqual(createTimeline({ steps: 1, holdVh: 60, transitionVh: 20 }), {
    input: [0, 1],
    output: [0, 0],
    travelVh: 60
  });
  for (const steps of [0, -1, 1.5, NaN])
    assert.throws(() =>
      createTimeline({ steps, holdVh: 60, transitionVh: 20 })
    );
  for (const distance of [0, -1, NaN, Infinity]) {
    assert.throws(() =>
      createTimeline({ steps: 3, holdVh: distance, transitionVh: 20 })
    );
    assert.throws(() =>
      createTimeline({ steps: 3, holdVh: 60, transitionVh: distance })
    );
  }
});

test("teaser scroll and entry controllers delegate clocks and measurement to Motion", () => {
  for (const file of [
    "use-chapter-scroll.ts",
    "use-entry.ts",
    "narrative.tsx"
  ]) {
    const source = readFileSync(
      new URL(`../components/teaser/${file}`, import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(
      source,
      /requestAnimationFrame|setInterval|addEventListener\(["']scroll/
    );
  }
});
