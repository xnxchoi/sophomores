import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { entryTokens } from "../lib/teaser/entry-tokens";

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
    new URL("../components/teaser/use-entry.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /from ['"]motion\/react['"]/);
  assert.match(source, /useMotionValue/);
  assert.match(source, /animate\(/);
  assert.match(source, /control\.pause\(/);
  assert.match(source, /control\.play\(/);
  assert.match(source, /control\.state === ['"]running['"]/);
  assert.match(source, /control\.state === ['"]paused['"]/);
  assert.match(source, /control\.stop\(/);
  assert.match(source, /removeEventListener\(['"]visibilitychange['"]/);
  assert.doesNotMatch(
    source,
    /requestAnimationFrame|performance\.now|style\.setProperty|entryPose|setTimeout|setInterval/
  );
});
