import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StoryArtwork,
  getArtworkTiming
} from "../components/teaser/story-artwork";

for (const [name, width, height, rate, frames] of [
  ["circle", 720, 720, 100, 3000],
  ["lines", 3840, 2160, 60, 1800]
] as const) {
  test(`${name} retains the benchmark's animated, self-contained source data`, () => {
    const data = JSON.parse(
      readFileSync(
        new URL(`../public/teaser/story-${name}.json`, import.meta.url),
        "utf8"
      )
    );
    assert.deepEqual(
      [data.w, data.h, data.fr, data.ip, data.op],
      [width, height, rate, 0, frames]
    );
    assert.ok(data.layers.length > 0);
    assert.ok(data.assets.length > 0);
    const serialized = JSON.stringify(data);
    assert.match(serialized, /"a":1/);
    assert.doesNotMatch(serialized, /https?:\/\/|"x":\s*"|"p":\s*"/);
    assert.deepEqual(getArtworkTiming(data), { frames, seconds: 30 });
  });
}

test("frame timing rejects invalid metadata instead of starting an unbounded clock", () => {
  for (const data of [
    { fr: 0, ip: 0, op: 30 },
    { fr: 60, ip: 2, op: 2 },
    { fr: NaN, ip: 0, op: 30 }
  ]) {
    assert.throws(() => getArtworkTiming(data), /Invalid/);
  }
  assert.deepEqual(getArtworkTiming({ fr: 30, ip: 10, op: 70 }), {
    frames: 60,
    seconds: 2
  });
});

test("both artwork tones render decorative static fallbacks before client hydration", () => {
  for (const [tone, fallback] of [
    ["dark", "story-orbit.webp"],
    ["green", "story-lines.webp"]
  ] as const) {
    const html = renderToStaticMarkup(
      createElement(StoryArtwork, { tone, playing: false })
    );
    assert.ok(html.includes(fallback));
    assert.match(html, /aria-hidden="true"/);
    if (tone === "dark") assert.match(html, /class="story-artwork story-artwork-dark story-orb"/);
    assert.match(html, /data-artwork-ready="false"/);
    assert.doesNotMatch(html, /<svg/);
  }
});

test("artwork uses Motion's clock rather than autonomous Lottie playback", () => {
  const source = readFileSync(
    new URL("../components/teaser/story-artwork.tsx", import.meta.url),
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
    new URL("../components/teaser/story-artwork.tsx", import.meta.url),
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
