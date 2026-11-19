"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { chapterExitHoldVh } from "@/lib/teaser/choreography";

test("blur-heading reading room remaps both scene and chapter progress without slowing reveals", () => {
  assert.deepEqual(chapterExitHoldVh, { hero: 60, people: 45 });
  const hook = readFileSync(
    new URL("../../../src/components/Warp/index.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    hook,
    /chapterGeometry\(timeline.travelVh, chapterExitHoldVh\[id\]\)/
  );
  assert.match(
    hook,
    /useTransform\(\s*scrollYProgress,\s*\[0, geometry.motionEnd\],\s*\[0, 1\]\s*\)/
  );
  assert.match(hook, /rawPosition = useTransform\(\s*chapterProgress/);
  assert.match(hook, /chapterProgress.on\("change", seek\)/);
  assert.match(hook, /geometry.heightVh/);
});

test("chapters retarget the in-flight step instead of queueing adjacent reveals", () => {
  const hook = readFileSync(
    new URL("../../../src/components/Warp/index.tsx", import.meta.url),
    "utf8"
  );
  assert.match(hook, /const next = destination/);
  assert.doesNotMatch(hook, /createStepQueue/);
  assert.doesNotMatch(hook, /use-chapter-activity/);
});

test("teaser scroll and entry controllers delegate clocks and measurement to Motion", () => {
  for (const file of [
    "src/components/Warp/index.tsx",
    "src/hooks/use-entry.ts",
    "src/components/teaser/narrative.tsx"
  ]) {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /requestAnimationFrame|setInterval|addEventListener\(["']scroll/
    );
  }
});
