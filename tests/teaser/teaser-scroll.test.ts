"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transform } from "motion/react";
import {
  chapterExitHoldVh,
  createTimeline,
  heroAuroraZoomVh,
  scrollChapters
} from "../../lib/teaser/choreography";
import { scrollSmoothing } from "../../lib/motion-tokens";

test("hero holds blank, first notification, second notification and statement independently", () => {
  assert.equal(scrollChapters.hero.steps, 4);
  assert.deepEqual(
    createTimeline(scrollChapters.hero).output,
    [0, 0, 1, 1, 2, 2, 3, 3]
  );
  const experience = readFileSync(
    new URL("../../components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    experience,
    /hero\.rawPosition,\s*\[0, scrollChapters\.hero\.steps - 1\],\s*\[0, 1\]/
  );
  assert.match(
    experience,
    /useTransform\(heroProgress, \[0\.7, 1\], \[1, 0\]\)/
  );
});

test("hero zoom finishes early and later poses follow their own holds", () => {
  assert.deepEqual(scrollChapters.hero.stepHoldsVh, [96, 320, 320, 360]);
  assert.equal(heroAuroraZoomVh, 564);
  const timeline = createTimeline(scrollChapters.hero);
  const pose = transform(timeline.input, timeline.output);
  const stepAt = (distance: number) =>
    Math.min(
      scrollChapters.hero.steps - 1,
      Math.max(0, Math.floor(pose(distance / timeline.travelVh) + 1e-6))
    );
  assert.equal(stepAt(96), 0);
  assert.equal(stepAt(116), 1);
  assert.equal(stepAt(436), 1);
  assert.equal(stepAt(456), 2);
  assert.equal(stepAt(776), 2);
  assert.equal(stepAt(796), 3);
  for (const path of [
    "../../components/Warp/index.tsx",
    "../../components/teaser/experience.tsx"
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /transform\(timeline\.input, timeline\.output\)/);
    assert.doesNotMatch(source, /chapterStep\(/);
  }
});

test("blur-heading reading room remaps both scene and chapter progress without slowing reveals", () => {
  assert.deepEqual(chapterExitHoldVh, { hero: 60, people: 45 });
  const hook = readFileSync(
    new URL("../../components/Warp/index.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    hook,
    /chapterGeometry\(timeline.travelVh, chapterExitHoldVh\[id\]\)/
  );
  assert.match(
    hook,
    /useTransform\(scrollYProgress, \[0, geometry.motionEnd\], \[0, 1\]\)/
  );
  assert.match(hook, /rawPosition = useTransform\(chapterProgress/);
  assert.match(hook, /chapterProgress.on\("change", seek\)/);
  assert.match(hook, /geometry.heightVh/);
});

test("chapters retarget the in-flight step instead of queueing adjacent reveals", () => {
  const hook = readFileSync(
    new URL("../../components/Warp/index.tsx", import.meta.url),
    "utf8"
  );
  assert.match(hook, /const next = destination/);
  assert.doesNotMatch(hook, /createStepQueue/);
  assert.doesNotMatch(hook, /use-chapter-activity/);
});

test("Lenis preserves the explicit reduced-motion opt-out without a bespoke frame loop or touch hijacking", () => {
  assert.equal(scrollSmoothing.autoRaf, true);
  assert.equal(scrollSmoothing.anchors, true);
  assert.equal(scrollSmoothing.syncTouch, false);
  assert.equal(scrollSmoothing.respectReducedMotion, false);
  const experience = readFileSync(
    new URL("../../components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  assert.match(experience, /ReactLenis/);
  assert.doesNotMatch(experience, /requestAnimationFrame|\.raf\(/);
  const css = readFileSync(
    new URL("../../styles/teaser.css", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(css, /scroll-behavior:\s*smooth/);
});

test("flame motion stays fully enabled, never reported CPU count or a mobile quality downgrade", () => {
  const experience = readFileSync(
    new URL("../../components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  const flags = readFileSync(
    new URL("../../components/teaser/use-device-flags.tsx", import.meta.url),
    "utf8"
  );
  const policy = readFileSync(
    new URL("../../lib/motion-tokens.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(experience + flags, /ReducedMotion|reducedMotion/);
  assert.doesNotMatch(
    experience + flags + policy,
    /hardwareConcurrency|useLowEnd|lowEnd/
  );
  const scene = readFileSync(
    new URL("../../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    scene,
    /hardwareConcurrency|deviceMemory|useMobile|useLowEnd/
  );
});

test("pinned chapters have longer travel and full holds before AND after transitions", () => {
  for (const [id, chapter] of Object.entries(scrollChapters)) {
    const timeline = createTimeline(chapter);
    const holds = chapter.stepHoldsVh ?? Array.from({ length: chapter.steps }, () => chapter.holdVh);
    assert.equal(
      timeline.travelVh,
      holds.reduce((sum, hold) => sum + hold, 0) +
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
        Math.abs((end - start) * timeline.travelVh - holds[step]) < 1e-9
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
    "components/Warp/index.tsx",
    "hooks/use-entry.ts",
    "components/teaser/narrative.tsx"
  ]) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /requestAnimationFrame|setInterval|addEventListener\(["']scroll/
    );
  }
});
