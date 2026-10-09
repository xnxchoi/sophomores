import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "motion/react";
import { createTimeline, scrollChapters } from "../lib/teaser/choreography";
import {
  canPlayStory,
  storyPlayback,
  storyTarget
} from "../lib/teaser/story-playback";

test("automatic stories allow at least four seconds to read each card", () => {
  assert.ok(Number.isFinite(storyPlayback.holdSeconds));
  assert.ok(storyPlayback.holdSeconds >= 4);
});

test("story targets land in the middle of each origin card's existing scroll hold", () => {
  const timeline = createTimeline(scrollChapters.origin);
  const pose = transform(timeline.input, timeline.output);
  const targets = Array.from(
    { length: scrollChapters.origin.steps },
    (_, index) => {
      const target = storyTarget(index, timeline);
      const start = timeline.input[index * 2];
      const end = timeline.input[index * 2 + 1];
      assert.equal(target, (start + end) / 2);
      assert.ok(target > start && target < end);
      assert.equal(pose(target), index);
      return target;
    }
  );
  assert.ok(
    targets.every((target, index) => index === 0 || target > targets[index - 1])
  );
});

test("a single-card timeline has a centered story target", () => {
  const timeline = createTimeline({ steps: 1, holdVh: 55, transitionVh: 20 });
  assert.equal(storyTarget(0, timeline), 0.5);
});

test("invalid story indices are rejected rather than seeking outside the chapter", () => {
  const timeline = createTimeline(scrollChapters.origin);
  for (const index of [
    -1,
    0.5,
    scrollChapters.origin.steps,
    10_000,
    NaN,
    Infinity,
    -Infinity
  ]) {
    assert.throws(() => storyTarget(index, timeline), RangeError);
  }
});

test("story playback requires visibility and pauses for every interaction or motion opt-out", () => {
  for (const still of [false, true])
    for (const inView of [false, true])
      for (const visible of [false, true])
        for (const hovered of [false, true])
          for (const focused of [false, true])
            for (const paused of [false, true]) {
              const state = {
                still,
                inView,
                visible,
                hovered,
                focused,
                paused
              };
              assert.equal(
                canPlayStory(state),
                !still && inView && visible && !hovered && !focused && !paused,
                JSON.stringify(state)
              );
            }
});
