import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { BlurText, BlurWord } from "@/components/blur-text";

test("text resolves from the reference blur and vertical offset into sharp stationary words", () => {
  assert.deepEqual(BlurWord({ children: "word", index: 0, visible: false }).props.initial, {
    opacity: 0,
    filter: "blur(12px)",
    y: 20
  });
  assert.deepEqual(BlurWord({ children: "word", index: 0, visible: true }).props.animate, {
    opacity: 1,
    filter: "blur(0px)",
    y: 0
  });
});

test("words start together and use progressively longer capped durations, not staggered delays", () => {
  for (const index of [0, 1, 2, 5, 10, 11, 12, 10000]) {
    const transition = BlurWord({ children: "word", index, visible: true }).props.transition;
    assert.ok(
      Math.abs(transition.duration - Math.min(index * 0.2, 2.2)) < 1e-9
    );
    assert.equal(transition.delay, 0);
    assert.deepEqual(transition.ease, [0.42, 0, 0.58, 1]);
  }
});

test("repeated whitespace and Unicode copy never become animated whitespace-only boxes", () => {
  const text = "One  two.\n\n세 번째 👋";
  const html = renderToStaticMarkup(<BlurText text={text} active />);
  const words = [...html.matchAll(/<span\b[^>]*class="[^"]*\bblur-word\b[^"]*"[^>]*>(.*?)<\/span>/gs)];
  assert.deepEqual(words.map(word => word[1]), ["One", "two.", "세", "번째", "👋"]);
  assert.ok(words.every(word => !/^\s+$/.test(word[1])));
  const visual = html.slice(html.indexOf('aria-hidden="true"')).replace(/^[^>]*>/, "");
  assert.equal(visual.replace(/<[^>]*>/g, ""), text);
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
    assert.deepEqual(BlurWord({ children: "word", index, visible: false }).props.transition, {
      duration: 0.55,
      delay: 0,
      ease: [0.42, 0, 0.58, 1]
    });
  }
});

test("forward word timing stays exact", () => {
  for (const index of [0, 1, 2, 5, 11, 10000]) {
    const props = BlurWord({ children: "word", index, visible: true }).props;
    assert.equal(props.transition.duration, Math.min(index * 0.2, 2.2));
    assert.deepEqual(props.exit, props.initial);
  }
});
