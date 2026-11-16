"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { easeOut, transform } from "motion/react";
import {
  chapterExitHoldVh,
  createTimeline,
  heroAuroraZoomShare,
  scrollChapters
} from "@/lib/teaser/choreography";
import { scrollSmoothing } from "@/lib/motion-tokens";
import { chapterGeometry } from "@/lib/teaser/step-motion";

test("hero holds blank, first notification, second notification and statement independently", () => {
  assert.equal(scrollChapters.hero.steps, 4);
  assert.deepEqual(
    createTimeline(scrollChapters.hero).output,
    [0, 0, 1, 1, 2, 2, 3, 3]
  );
  const experience = readFileSync(
    new URL("../../src/components/teaser/experience.tsx", import.meta.url),
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
  assert.deepEqual(scrollChapters.hero.stepHoldsVh, [120, 200, 200, 240]);
  const timeline = createTimeline(scrollChapters.hero);
  // The zoom ends at 85% of pose 0, before notification 1 starts entering.
  assert.ok(Math.abs(heroAuroraZoomShare - 0.85 * timeline.input[1]) < 1e-12);
  assert.ok(heroAuroraZoomShare < timeline.input[1]);
  // In scroll distance: about 136svh of the 1096svh hero motion.
  const heroMotionVh =
    chapterGeometry(timeline.travelVh, chapterExitHoldVh.hero).heightVh -
    (chapterExitHoldVh.hero ?? 0) -
    100;
  const zoomVh = heroAuroraZoomShare * heroMotionVh;
  assert.ok(zoomVh > 130 && zoomVh < 145, `zoom ends at ${zoomVh}svh`);
  // Ease-out moves ahead of linear early, then settles, without a front-loaded snap.
  const zoomEnd = (scrollChapters.hero.steps - 1) * heroAuroraZoomShare;
  const zoom = transform([0, zoomEnd], [0, 1], { ease: easeOut });
  assert.ok(zoom(zoomEnd / 4) > 0.25 && zoom(zoomEnd / 4) < 0.5);
  assert.ok(zoom(zoomEnd * 0.9) > 0.95);
  assert.equal(zoom(zoomEnd * 1.5), 1);
  for (const path of [
    "../../src/components/Warp/index.tsx",
    "../../src/components/teaser/experience.tsx"
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(
      source,
      /\[0, \(scrollChapters\.hero\.steps - 1\) \* heroAuroraZoomShare\],\s*\[0, 1\],\s*\{ ease: easeOut \}/
    );
  }
  const pose = transform(timeline.input, timeline.output);
  const stepAt = (distance: number) =>
    Math.min(
      scrollChapters.hero.steps - 1,
      Math.max(0, Math.floor(pose(distance / timeline.travelVh) + 1e-6))
    );
  // Holds 120 / 200 / 200 / 240 with 20svh transitions:
  // pose 0 0–120, transition 120–140, pose 1 140–340, transition 340–360,
  // pose 2 360–560, transition 560–580, pose 3 580–820.
  assert.equal(stepAt(96), 0);
  assert.equal(stepAt(120), 0);
  assert.equal(stepAt(140), 1);
  assert.equal(stepAt(340), 1);
  assert.equal(stepAt(360), 2);
  assert.equal(stepAt(560), 2);
  assert.equal(stepAt(580), 3);
  for (const path of [
    "../../src/components/Warp/index.tsx",
    "../../src/components/teaser/experience.tsx"
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /transform\(timeline\.input, timeline\.output\)/);
    assert.doesNotMatch(source, /chapterStep\(/);
  }
});

test("blur-heading reading room remaps both scene and chapter progress without slowing reveals", () => {
  assert.deepEqual(chapterExitHoldVh, { hero: 60, people: 45 });
  const hook = readFileSync(
    new URL("../../src/components/Warp/index.tsx", import.meta.url),
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
    new URL("../../src/components/Warp/index.tsx", import.meta.url),
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
    new URL("../../src/components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  assert.match(experience, /ReactLenis/);
  assert.doesNotMatch(experience, /requestAnimationFrame|\.raf\(/);
  const css = readFileSync(
    new URL("../../src/styles/teaser.css", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(css, /scroll-behavior:\s*smooth/);
});

test("flame motion stays fully enabled, never reported CPU count or a mobile quality downgrade", () => {
  const experience = readFileSync(
    new URL("../../src/components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  const flags = readFileSync(
    new URL(
      "../../src/components/teaser/use-device-flags.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const policy = readFileSync(
    new URL("../../src/lib/motion-tokens.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(experience + flags, /ReducedMotion|reducedMotion/);
  assert.doesNotMatch(
    experience + flags + policy,
    /hardwareConcurrency|useLowEnd|lowEnd/
  );
  const scene = readFileSync(
    new URL("../../src/components/teaser/scene.tsx", import.meta.url),
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
    const holds =
      "stepHoldsVh" in chapter
        ? chapter.stepHoldsVh
        : Array.from({ length: chapter.steps }, () => chapter.holdVh);
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
    "src/components/Warp/index.tsx",
    "src/hooks/use-entry.ts",
    "src/components/teaser/narrative.tsx"
  ]) {
    const source = readFileSync(
      new URL(`../../${file}`, import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(
      source,
      /requestAnimationFrame|setInterval|addEventListener\(["']scroll/
    );
  }
});
