import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getWarpCaptionFade } from "@/components/Warp/sequence";
import {
  SEQUENCE_CLIPS,
  createDefaultSequence,
  isStartOnlyClip,
  moveClipStart
} from "@/components/Warp/_shared/sequence-editor";

const clips = (passageEnd: number, warpEnd: number) => {
  const { passageTravel, warpApproach } = createDefaultSequence().clips;
  return {
    passageTravel: { ...passageTravel, end: passageEnd },
    warpApproach: { ...warpApproach, end: warpEnd }
  };
};
const samples = Array.from({ length: 1001 }, (_, index) => index / 1000);
const visible = (fade: { in: number; out: number }) => fade.in * (1 - fade.out);

test("the caption rides the warp on the default timing and is gone before the aurora", () => {
  const { passageTravel, warpApproach } = createDefaultSequence().clips;
  const run = warpApproach.end - passageTravel.end;
  const at = (percent: number) => getWarpCaptionFade({ passageTravel, warpApproach }, percent / 100);
  assert.equal(visible(at(passageTravel.end)), 0, "not over the passage's end");
  assert.equal(visible(at(passageTravel.end + run * 0.15)), 0, "starts at its later arrival");
  assert.equal(visible(at(passageTravel.end + run * 0.5)), 1, "fully in mid-warp");
  assert.equal(visible(at(warpApproach.end - run / 20)), 0, "gone before the warp ends");
  assert.equal(visible(at(warpApproach.end)), 0, "nothing over the aurora ring");
  for (const progress of samples) {
    const fade = getWarpCaptionFade({ passageTravel, warpApproach }, progress);
    assert.ok(Number.isFinite(fade.in) && Number.isFinite(fade.out), `finite at ${progress}`);
  }
});

test("an equal passage and warp end (40/40) keeps the caption hidden, never NaN", () => {
  for (const progress of samples) {
    const fade = getWarpCaptionFade(clips(40, 40), progress);
    assert.ok(Number.isFinite(fade.in) && Number.isFinite(fade.out), `finite at ${progress}`);
    assert.equal(visible(fade), 0, `hidden at ${progress}`);
  }
});

test("a passage ending after the warp (45/35) keeps the caption hidden, including at 40%", () => {
  assert.equal(visible(getWarpCaptionFade(clips(45, 35), 0.4)), 0);
  for (const progress of samples) assert.equal(visible(getWarpCaptionFade(clips(45, 35), progress)), 0);
});

test("the passage lines are start-only across the editor", () => {
  const timeline = readFileSync("src/components/Warp/editor/domain-timeline.tsx", "utf8");
  const inspector = readFileSync("src/components/Warp/editor/clip-inspector.tsx", "utf8");
  // Timeline: their bars move but don't resize and carry no easing lane.
  assert.match(timeline, /const startOnly = isStartOnlyClip\(clip\.id\);/);
  assert.match(timeline, /flexible: !startOnly,/);
  assert.match(timeline, /\.\.\.\(showEasing && !startOnly/);
  // Inspector: Start only, with the note, and no easing controls for them.
  assert.match(inspector, /const startOnly = isStartOnlyClip\(selected\);/);
  assert.match(inspector, /startOnly \? \(\["start"\] as const\)/);
  assert.match(inspector, /t\("wordRevealStartOnly"\)/);
  // Both set Start through the one span-keeping move (the inspector test in sequence-editor-ui covers it live).
  assert.equal(timeline.match(/moveClipStart\(previous, /g)?.length, 2, "timeline: bounds check and the saved move");
  assert.match(inspector, /\? moveClipStart\(clip, value\)/);
  // Screen readers hear the word reveal, not the old vertical wipe.
  for (const id of ["passageLine1", "passageLine2"] as const) {
    const clip = SEQUENCE_CLIPS.find((item) => item.id === id)!;
    assert.match(clip.descriptionKey, /WordsAppearInTurn$/);
    assert.doesNotMatch(clip.description, /wipe/i);
  }
});

test("moving a passage line's Start keeps its span, so End follows", () => {
  const { passageLine1 } = createDefaultSequence().clips;
  const span = passageLine1.end - passageLine1.start;
  assert.ok(isStartOnlyClip("passageLine1") && isStartOnlyClip("passageLine2"));
  assert.ok(!isStartOnlyClip("passageTravel"));
  const moved = moveClipStart(passageLine1, 10);
  assert.equal(moved.start, 10);
  assert.equal(moved.end - moved.start, span);
  assert.deepEqual(moved.ease, passageLine1.ease);
});
