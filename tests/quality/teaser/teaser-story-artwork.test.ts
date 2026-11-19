import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("artwork uses Motion's clock rather than autonomous Lottie playback", () => {
  const source = readFileSync(
    new URL("../../../src/components/teaser/story-artwork.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /autoplay:\s*false/);
  assert.match(source, /repeat:\s*Infinity/);
  assert.match(source, /goToAndStop/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /\.destroy\(\)/);
  assert.doesNotMatch(source, /requestAnimationFrame|setInterval/);
});

test("readiness rechecks synchronous renderer failure before starting the clock", () => {
  const source = readFileSync(
    new URL("../../../src/components/teaser/story-artwork.tsx", import.meta.url),
    "utf8"
  );
  const firstFrame = source.indexOf("animation.goToAndStop(0, true)");
  const failureGuard = source.indexOf(
    "if (failed || disposed) return;",
    firstFrame
  );
  const startClock = source.indexOf("clock.current = animate", firstFrame);
  assert.ok(
    firstFrame >= 0 && failureGuard > firstFrame && startClock > failureGuard
  );
});

test("each artwork observes partial visibility independently of the active card or reading clock", () => {
  const story = readFileSync(
    new URL("../../../src/components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  const artwork = readFileSync(
    new URL("../../../src/components/teaser/story-artwork.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    story,
    /playing=\{playback\.playing\}|playing && index === step/
  );
  assert.match(artwork, /useInView\(host,\s*\{\s*amount:\s*"some"\s*\}\)/);
  assert.match(artwork, /shouldPlay\.current = inView && revealed/);
  assert.match(artwork, /ref=\{host\}/);
  assert.doesNotMatch(artwork, /playing:\s*boolean/);
});

test("artwork receives the continuous visual reveal rather than an active-index flag", () => {
  const story = readFileSync(
    new URL("../../../src/components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  const artwork = readFileSync(
    new URL("../../../src/components/teaser/story-artwork.tsx", import.meta.url),
    "utf8"
  );
  assert.equal((story.match(/reveal=\{opacity\}/g) || []).length, 2);
  assert.match(artwork, /useMotionValueEvent\(reveal,\s*"change"/);
});
