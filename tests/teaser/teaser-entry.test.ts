import assert from "node:assert/strict";
import { test } from "node:test";
import { animate, frameSteps, motionValue } from "motion/react";
import { mountEntry } from "../fixtures/teaser/entry-hook";
import { entryTokens } from "@/lib/teaser/entry-tokens";

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
  // Seek the paused native controls in seconds and read the actual Motion values.
  try {
    sequence.pause();
    for (const reference of references) reference.pause();
    assert.equal(sequence.state, "paused");
    assert.equal(sequence.duration, 5);
    const differences: string[] = [];
    for (const milliseconds of [
      0, 100, 299, 300, 450, 525, 750, 999, 1000, 1250, 1499, 1500, 1750, 1999,
      2000, 2250, 2750, 3000, 3250, 3500, 4000, 4500, 4999, 5000, 6000
    ]) {
      sequence.time = milliseconds / 1000;
      for (const reference of references) reference.time = milliseconds / 1000;
      frameSteps.update.process({ delta: 0, timestamp: performance.now(), isProcessing: false });
      for (const [key, value] of Object.entries(entry.values())) {
        if (Math.abs(value.get() - referenceValues[key].get()) >= 1e-8) {
          differences.push(`${key} at ${milliseconds}ms: ${value.get()} vs ${referenceValues[key].get()}`);
        }
      }
    }
    for (const [key, expected] of Object.entries(entryTokens.complete)) {
      assert.equal(entry.values()[key].get(), expected, `${key} reaches its final value`);
    }
    assert.deepEqual(differences, []);
  } finally {
    entry.unmount();
    for (const reference of references) reference.stop();
  }
});
