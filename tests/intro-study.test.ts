import assert from "node:assert/strict";
import { test } from "node:test";
import {
  introStudy,
  resolveIntroPlayback,
  introFrame,
  introCopyOpacity
} from "../lib/entry-animation/model";

test("intro reference is explicitly local and its light source remains configurable", () => {
  assert.equal(introStudy.productionApproved, false);
  assert.match(introStudy.referenceUrl, /^https:\/\/analogueagency\.com\//);
  assert.match(
    introStudy.referenceVideo,
    /^https:\/\/framerusercontent\.com\//
  );
  assert.equal(introStudy.finalCopy, false);
});

test("video never loads before network preferences are known or for data saving", () => {
  const ready = {
    ready: true,
    saveData: false,
    paused: false,
    visible: true,
    inView: true
  };
  assert.deepEqual(resolveIntroPlayback(ready), {
    loadVideo: true,
    playVideo: true,
    staticLayout: false
  });
  for (const blocked of [
    { ready: false },
    { saveData: true }
  ]) {
    assert.equal(
      resolveIntroPlayback({ ...ready, ...blocked }).loadVideo,
      false
    );
  }
  for (const stopped of [
    { paused: true },
    { visible: false },
    { inView: false }
  ]) {
    assert.equal(
      resolveIntroPlayback({ ...ready, ...stopped }).playVideo,
      false
    );
  }
  assert.equal(
    resolveIntroPlayback({ ...ready, paused: true }).staticLayout,
    true
  );
});

test("light handoff is transform-only, bounded, reversible, and clamps overscroll", () => {
  assert.deepEqual(introFrame(0), { scale: 1 });
  assert.deepEqual(introFrame(1), { scale: 0.93 });
  assert.deepEqual(introFrame(-1), introFrame(0));
  assert.deepEqual(introFrame(2), introFrame(1));
  assert.deepEqual(introFrame(0.5), { scale: 1 });
  assert.deepEqual(Object.keys(introFrame(0.9)), ["scale"]);
});

test("hero clears completely before proposition enters in either scroll direction", () => {
  const cues = introStudy.choreography;
  assert.ok(
    cues.heroOut[1] < cues.propositionIn[0],
    "copy passages need a clear interval between them"
  );
  const progress = Array.from({ length: 1001 }, (_, index) => index / 1000);
  for (const value of [...progress, ...progress.toReversed()]) {
    const opacity = introCopyOpacity(value);
    assert.ok(
      opacity.hero === 0 || opacity.proposition === 0,
      `copy overlaps at ${value}`
    );
  }
  assert.deepEqual(introCopyOpacity(0.32), { hero: 0, proposition: 0 });
  assert.deepEqual(introCopyOpacity(0), { hero: 1, proposition: 0 });
  assert.deepEqual(introCopyOpacity(0.5), { hero: 0, proposition: 1 });
});
