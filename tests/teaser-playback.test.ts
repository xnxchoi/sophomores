import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transform } from "motion/react";
import { createTimeline, scrollChapters } from "../lib/teaser/choreography";
import {
  canPlayStory,
  createStoryPlaybackController,
  storyPlayback,
  storyTarget
} from "../lib/teaser/story-playback";

test("automatic stories use a three-and-a-half-second reading hold", () => {
  assert.equal(storyPlayback.holdSeconds, 3.5);
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

test("story playback ignores hover while preserving visibility, focus, pause and motion gates", () => {
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
                !still && inView && visible && !focused && !paused,
                JSON.stringify(state)
              );
            }
});

function playbackHarness() {
  let finish = () => {};
  let allowed = true;
  const calls = { play: 0, pause: 0, stop: 0, advance: 0 };
  const controller = createStoryPlaybackController({
    start: (onComplete) => {
      finish = onComplete;
      return {
        play: () => {
          calls.play++;
        },
        pause: () => {
          calls.pause++;
        },
        stop: () => {
          calls.stop++;
        }
      };
    },
    canAdvance: () => allowed,
    onAdvance: () => {
      calls.advance++;
    }
  });
  return {
    controller,
    calls,
    finish: () => finish(),
    allow: (value: boolean) => {
      allowed = value;
    }
  };
}

test("playback starts paused, resumes the same Motion clock, and does not restart for repeated eligibility", () => {
  const { controller, calls } = playbackHarness();
  assert.equal(calls.pause, 1);
  controller.sync(true);
  controller.sync(true);
  assert.equal(calls.play, 1);
  controller.sync(false);
  controller.sync(false);
  assert.equal(calls.pause, 2);
  controller.sync(true);
  assert.equal(calls.play, 2);
  assert.equal(calls.advance, 0);
});

test("completion advances exactly once and never restarts a finished clock", () => {
  const { controller, calls, finish } = playbackHarness();
  controller.sync(true);
  finish();
  finish();
  controller.sync(false);
  controller.sync(true);
  assert.equal(calls.advance, 1);
  assert.equal(calls.play, 1);
});

test("a completion racing pause, hidden-tab or transition eligibility stays pending until allowed", () => {
  const { controller, calls, finish, allow } = playbackHarness();
  controller.sync(true);
  allow(false);
  finish();
  assert.equal(calls.advance, 0);
  controller.sync(false);
  allow(true);
  controller.sync(true);
  assert.equal(calls.advance, 1);
  assert.equal(calls.play, 1, "pending completion is delivered, not replayed");
});

test("offscreen pauses retain the running clock and reentry does not advance early", () => {
  const { controller, calls, finish } = playbackHarness();
  controller.sync(true);
  controller.sync(false);
  controller.sync(true);
  assert.equal(calls.advance, 0);
  finish();
  assert.equal(calls.advance, 1);
});

test("new cards, replay and manual reselection dispose stale completions before starting fresh", () => {
  const old = playbackHarness();
  old.controller.sync(true);
  old.controller.dispose();
  old.controller.dispose();
  old.finish();
  old.controller.sync(true);
  assert.equal(old.calls.advance, 0);
  assert.equal(old.calls.stop, 1);
  const fresh = playbackHarness();
  fresh.controller.sync(true);
  assert.equal(fresh.calls.advance, 0);
  fresh.finish();
  assert.equal(fresh.calls.advance, 1);
});

test("hovering and leaving do not pause or recreate the story and artwork playback clock", () => {
  const { controller, calls, finish } = playbackHarness();
  for (const hovered of [false, true, false]) {
    const state = {
      still: false,
      inView: true,
      visible: true,
      hovered,
      focused: false,
      paused: false
    };
    controller.sync(canPlayStory(state));
  }
  assert.deepEqual(calls, { play: 1, pause: 1, stop: 0, advance: 0 });
  finish();
  assert.equal(calls.advance, 1);
  const source = readFileSync(
    new URL("../components/teaser/use-story-playback.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /hoveredCard|isActiveStoryHovered|updateStoryHover|!hovered/
  );
});

test("fine-pointer track hover fades every story progress bar uniformly after the same enter and leave delay", () => {
  const css = readFileSync(
    new URL("../app/teaser.css", import.meta.url),
    "utf8"
  );
  assert.match(
    css,
    /\.story-progress\s*\{[^}]*opacity:\s*1;[^}]*transition:\s*opacity\s+0?\.18s\s+ease-out\s+0?\.15s;/
  );
  assert.doesNotMatch(css, /\.story-card:hover\s+\.story-progress/);
  assert.match(
    css,
    /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{\s*\.story-track:hover\s+\.story-progress\s*\{\s*opacity:\s*0;/
  );
});
