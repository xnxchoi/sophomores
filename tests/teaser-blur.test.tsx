import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { BlurText } from "../components/blur-text";
import { blurTextTokens, wordTransition, blurWordTransition } from "../lib/teaser/blur-tokens";

test("text resolves from the reference blur and vertical offset into sharp stationary words", () => {
  assert.deepEqual(blurTextTokens.hidden, {
    opacity: 0,
    filter: "blur(12px)",
    y: 20
  });
  assert.deepEqual(blurTextTokens.visible, {
    opacity: 1,
    filter: "blur(0px)",
    y: 0
  });
});

test("words start together and use progressively longer capped durations, not staggered delays", () => {
  for (const index of [0, 1, 2, 5, 10, 11, 12, 10000]) {
    const transition = wordTransition(index);
    assert.ok(
      Math.abs(transition.duration - Math.min(index * 0.2, 2.2)) < 1e-9
    );
    assert.equal(transition.delay, 0);
    assert.deepEqual(transition.ease, [0.42, 0, 0.58, 1]);
  }
});

test("blur text keeps one complete accessible reading and preserves visual word separators", () => {
  const text = "One two.\nThree";
  const html = renderToStaticMarkup(
    <BlurText text={text} active={false} />
  );
  assert.match(html, /class="[^"]*\bsr-only\b[^"]*">One two\.\nThree<\/span>/);
  assert.match(html, /aria-hidden="true"/);
  const words = [
    ...html.matchAll(
      /<span\b[^>]*class="[^"]*\bblur-word\b[^"]*"[^>]*>(.*?)<\/span>/gs
    )
  ];
  assert.deepEqual(
    words.map((word) => word[1]),
    ["One", " ", "two.", "\n", "Three"]
  );
  const visual = html
    .slice(html.indexOf('aria-hidden="true"'))
    .replace(/^[^>]*>/, "");
  assert.equal(
    visual.replace(/<br\s*\/?\s*>/g, "\n").replace(/<[^>]*>/g, ""),
    text
  );
});


test("empty text produces no visual words and literal special characters remain escaped", () => {
  const empty = renderToStaticMarkup(<BlurText text="" active />);
  assert.equal((empty.match(/class="[^"]*\bblur-word\b/g) ?? []).length, 0);
  const special = renderToStaticMarkup(
    <BlurText text={'Hello 👋 <script> & "friends"'} active />
  );
  assert.ok(special.includes("👋"));
  assert.ok(special.includes("&lt;script&gt;"));
  assert.ok(special.includes("&amp;"));
  assert.ok(!special.includes("<script>"));
});


test("animated reversal gives every word, including the first, one coherent nonzero transition", () => {
  for (const index of [0, 1, 2, 5, 11, 10000]) {
    assert.deepEqual(blurWordTransition(index, false), {
      duration: 0.55,
      delay: 0,
      ease: blurTextTokens.ease
    });
  }
});

test("forward word timing stays exact", () => {
  for (const index of [0, 1, 2, 5, 11, 10000]) {
    assert.deepEqual(blurWordTransition(index, true), wordTransition(index));
  }
});

test("BlurText retargets existing Motion words with directional timing, rather than snapping hidden", () => {
  const source = readFileSync(new URL("../components/blur-text.tsx", import.meta.url), "utf8");
  assert.match(source, /blurWordTransition\(Math\.floor\(index \/ 2\), visible\)/);
  assert.doesNotMatch(source, /still \|\| !visible\s*\? \{ duration: 0 \}/);
});
