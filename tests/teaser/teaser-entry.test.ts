import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { animate, motionValue } from "motion/react";
import { mountEntry } from "../fixtures/teaser/entry-hook";
import { entryTokens } from "../../lib/teaser/entry-tokens";

test("entry timeline retains the centered hold and settles all values by five seconds", () => {
  assert.equal(entryTokens.dock.delay, 1.5);
  assert.equal(entryTokens.dock.delay + entryTokens.dock.duration, 3);
  assert.equal(entryTokens.backdrop.delay, 1);
  assert.equal(entryTokens.backdrop.delay + entryTokens.backdrop.duration, 2);
  assert.deepEqual(entryTokens.layout, { delay: 3, duration: 0.5 });
  assert.equal(entryTokens.scale.delay, 2);
  assert.equal(entryTokens.scale.delay + entryTokens.scale.duration, 5);
});

test("entry endpoints are deterministic and glyph flicker is finite", () => {
  assert.deepEqual(entryTokens.initial, {
    dock: 0,
    backdrop: 0,
    layout: 0,
    scale: 0.77,
    glyph: 0.4
  });
  assert.deepEqual(entryTokens.complete, {
    dock: 1,
    backdrop: 1,
    layout: 1,
    scale: 1,
    glyph: 1
  });
  assert.deepEqual(entryTokens.glyph.keyframes, [0.4, 0.4, 1, 0.4, 1]);
  assert.deepEqual(entryTokens.glyph.times, [0, 0.2, 0.35, 0.5, 1]);
  assert.equal(entryTokens.glyph.duration, 1.5);
  assert.equal(entryTokens.glyph.keyframes.at(-1), entryTokens.complete.glyph);
});

test("entry delegates scheduling to Motion and cleans up controls instead of running a frame loop", () => {
  const source = readFileSync(
    new URL("../../hooks/use-entry.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /from ['"]motion\/react['"]/);
  assert.match(source, /useMotionValue/);
  assert.match(source, /animate\(/);
  assert.match(source, /control\.pause\(/);
  assert.match(source, /control\.play\(/);
  assert.match(source, /control\?\.state === ['"]running['"]/);
  assert.match(source, /control\?\.state === ['"]paused['"]/);
  assert.match(source, /control\?\.stop\(/);
  assert.match(source, /removeEventListener\(['"]visibilitychange['"]/);
  assert.doesNotMatch(
    source,
    /requestAnimationFrame|performance\.now|style\.setProperty|entryPose|setTimeout|setInterval/
  );
});

test("native sequence samples match every former independent channel through the five-second opening", () => {
  const entry = mountEntry(0, "", true);
  entry.render();
  const sequence = entry.runs[0].nativeControl!;
  const referenceValues = Object.fromEntries(
    Object.entries(entryTokens.initial).map(([key, value]) => [
      key,
      motionValue<number>(value)
    ])
  );
  const references = ["dock", "backdrop", "layout", "scale"].map((key) => {
    const channel = key as "dock" | "backdrop" | "layout" | "scale";
    return animate(
      referenceValues[channel],
      [entryTokens.initial[channel], 1],
      {
        ...entryTokens[channel],
        ease: entryTokens.ease,
        autoplay: false
      }
    );
  });
  references.push(
    animate(referenceValues.glyph, [...entryTokens.glyph.keyframes], {
      duration: entryTokens.glyph.duration,
      times: [...entryTokens.glyph.times],
      ease: entryTokens.ease,
      autoplay: false
    })
  );
  // Node has no browser frame driver: sample Motion's actual JS engine, not a recreated easing function.
  type NativeSamples = {
    animations: { animation: { sample(milliseconds: number): unknown } }[];
  };
  const sample = (control: unknown, milliseconds: number) => {
    for (const child of (control as NativeSamples).animations)
      child.animation.sample(milliseconds);
  };
  try {
    assert.equal(sequence.duration, 5);
    for (const milliseconds of [
      0, 100, 299, 300, 450, 525, 750, 999, 1000, 1250, 1499, 1500, 1750, 1999,
      2000, 2250, 2750, 3000, 3250, 3500, 4000, 4500, 4999, 5000, 6000
    ]) {
      sample(sequence, milliseconds);
      for (const reference of references) sample(reference, milliseconds);
      for (const [key, value] of Object.entries(entry.values())) {
        assert.ok(
          Math.abs(value.get() - referenceValues[key].get()) < 1e-8,
          `${key} differs at ${milliseconds}ms: ${value.get()} vs ${referenceValues[key].get()}`
        );
      }
    }
  } finally {
    entry.unmount();
    for (const reference of references) reference.stop();
  }
});
