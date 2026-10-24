import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { motionValue, transform } from "motion/react";
import { canPlayStoryArtwork } from "../lib/teaser/story-artwork";
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
      createElement(StoryArtwork, { tone, reveal: motionValue(1) })
    );
    assert.ok(html.includes(fallback));
    assert.match(html, /aria-hidden="true"/);
    if (tone === "dark") {
      const classLists = [...html.matchAll(/\bclass="([^"]*)"/g)]
        .map(([, value]) => value.split(/\s+/));
      assert.ok(classLists.some((classes) =>
        ["story-artwork", "story-artwork-dark", "story-orb"].every((name) => classes.includes(name))
      ));
    }
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


test("artwork playback needs any visible area, a visible page and an actual revealed card, not story progression", () => {
  for (const inView of [false, true])
    for (const visible of [false, true])
        for (const paused of [false, true])
          for (const complete of [false, true])
            for (const settled of [false, true]) {
              const state = { inView, visible, revealed: true, paused, complete, settled };
              assert.equal(canPlayStoryArtwork(state), inView && visible);
            }
});

test("each artwork observes partial visibility independently of the active card or reading clock", () => {
  const story = readFileSync(new URL("../components/teaser/story.tsx", import.meta.url), "utf8");
  const artwork = readFileSync(new URL("../components/teaser/story-artwork.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(story, /playing=\{playback\.playing\}|playing && index === step/);
  assert.match(artwork, /useInView\(host,\s*\{\s*amount:\s*"some"\s*\}\)/);
  assert.match(artwork, /canPlayStoryArtwork/);
  assert.match(artwork, /ref=\{host\}/);
  assert.doesNotMatch(artwork, /playing:\s*boolean/);
});


test("viewport intersection alone cannot run a zero-opacity or zero-scale future card", () => {
  const visibility = { inView: true, visible: true };
  const cardReveal = transform([1, 2], [0, 1]);
  assert.equal(canPlayStoryArtwork({ ...visibility, revealed: cardReveal(1) > 0 }), false);
  assert.equal(canPlayStoryArtwork({ ...visibility, revealed: cardReveal(1.001) > 0 }), true, "even the beginning of a real reveal can play");
  assert.equal(canPlayStoryArtwork({ ...visibility, revealed: cardReveal(3) > 0 }), true, "preceding visible cards keep playing after the active card moves on");
  assert.equal(canPlayStoryArtwork({ ...visibility, revealed: cardReveal(0) > 0 }), false, "reversing before a card's reveal pauses it");
});

test("artwork receives the continuous visual reveal rather than an active-index flag", () => {
  const story = readFileSync(new URL("../components/teaser/story.tsx", import.meta.url), "utf8");
  const artwork = readFileSync(new URL("../components/teaser/story-artwork.tsx", import.meta.url), "utf8");
  assert.equal((story.match(/reveal=\{opacity\}/g) || []).length, 2);
  assert.match(artwork, /useMotionValueEvent\(reveal,\s*"change"/);
});
