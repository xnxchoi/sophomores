import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { motionValue, transform } from "motion/react";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StoryArtwork,
  getArtworkTiming
} from "../../components/teaser/story-artwork";

for (const [name, width, height, rate, frames] of [
  ["circle", 720, 720, 100, 3000],
  ["lines", 3840, 2160, 60, 1800]
] as const) {
  test(`${name} retains the benchmark's animated, self-contained source data`, () => {
    const data = JSON.parse(
      readFileSync(
        new URL(`../../public/teaser/story-${name}.json`, import.meta.url),
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
      const classLists = [...html.matchAll(/\bclass="([^"]*)"/g)].map(
        ([, value]) => value.split(/\s+/)
      );
      assert.match(html, /data-story-artwork=""/);
      assert.ok(
        classLists.some((classes) =>
          ["pointer-events-none", "relative", "size-35", "shrink-0", "self-center"].every(
            (name) => classes.includes(name)
          )
        )
      );
    }
    assert.match(html, /data-artwork-ready="false"/);
    assert.doesNotMatch(html, /<svg/);
  }
});

test("artwork uses Motion's clock rather than autonomous Lottie playback", () => {
  const source = readFileSync(
    new URL("../../components/teaser/story-artwork.tsx", import.meta.url),
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
    new URL("../../components/teaser/story-artwork.tsx", import.meta.url),
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

function artworkPlayback(inView: boolean, revealed: boolean, visible: boolean) {
  const refs: { current: unknown }[] = [];
  const effects: (() => void)[] = [];
  const require = createRequire(import.meta.url);
  const modules: Record<string, unknown> = {
    react: {
      useRef: (current: unknown) => {
        const ref = { current };
        refs.push(ref);
        return ref;
      },
      useState: (value: unknown) => [value, () => {}],
      useEffect: (effect: () => void) => effects.push(effect)
    },
    "motion/react": { useInView: () => inView, useMotionValueEvent() {} },
    "next/image": () => null,
    "@/lib/utils": { cn: () => "" }
  };
  const source = readFileSync(
    new URL("../../components/teaser/story-artwork.tsx", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  const exports = {} as { StoryArtwork: typeof StoryArtwork };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => modules[name] ?? require(name),
    document: { hidden: !visible }
  });
  exports.StoryArtwork({ tone: "dark", reveal: motionValue(revealed ? 1 : 0) });
  const calls = { play: 0, pause: 0 };
  refs[2].current = { play: () => calls.play++, pause: () => calls.pause++ };
  // The first effect applies eligibility to the native Motion clock. The second
  // effect loads renderer assets and is deliberately outside this clock test.
  effects[0]();
  return calls;
}

test("artwork's native clock needs partial visibility, a visible page and a revealed card", () => {
  for (const inView of [false, true])
    for (const visible of [false, true])
      for (const revealed of [false, true]) {
        const calls = artworkPlayback(inView, revealed, visible);
        assert.deepEqual(
          calls,
          inView && visible && revealed
            ? { play: 1, pause: 0 }
            : { play: 0, pause: 1 }
        );
      }
});

test("each artwork observes partial visibility independently of the active card or reading clock", () => {
  const story = readFileSync(
    new URL("../../components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  const artwork = readFileSync(
    new URL("../../components/teaser/story-artwork.tsx", import.meta.url),
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

test("viewport intersection alone cannot run a zero-opacity or zero-scale future card", () => {
  const cardReveal = transform([1, 2], [0, 1]);
  assert.equal(artworkPlayback(true, cardReveal(1) > 0, true).play > 0, false);
  assert.equal(
    artworkPlayback(true, cardReveal(1.001) > 0, true).play > 0,
    true,
    "even the beginning of a real reveal can play"
  );
  assert.equal(
    artworkPlayback(true, cardReveal(3) > 0, true).play > 0,
    true,
    "preceding visible cards keep playing after the active card moves on"
  );
  assert.equal(
    artworkPlayback(true, cardReveal(0) > 0, true).play > 0,
    false,
    "reversing before a card's reveal pauses it"
  );
});

test("artwork receives the continuous visual reveal rather than an active-index flag", () => {
  const story = readFileSync(
    new URL("../../components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  const artwork = readFileSync(
    new URL("../../components/teaser/story-artwork.tsx", import.meta.url),
    "utf8"
  );
  assert.equal((story.match(/reveal=\{opacity\}/g) || []).length, 2);
  assert.match(artwork, /useMotionValueEvent\(reveal,\s*"change"/);
});
