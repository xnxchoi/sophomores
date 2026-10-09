import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "motion/react";
import { textKeyframes, textTransition } from "../lib/teaser/text-tokens";

test("held text is completely sharp and opaque", () => {
  for (let index = 0; index < 3; index++) {
    const input = textKeyframes(index);
    assert.equal(transform(input, textTransition.opacity)(index), 1);
    assert.equal(transform(input, textTransition.blur)(index), "blur(0px)");
  }
});

test("text hands off briefly without overlapping two readable paragraphs", () => {
  const first = transform(textKeyframes(0), textTransition.opacity);
  const second = transform(textKeyframes(1), textTransition.opacity);
  for (let i = 0; i <= 100; i++) {
    const position = i / 100;
    assert.ok(first(position) === 0 || second(position) === 0);
    if (position !== 0.5) assert.ok(first(position) + second(position) > 0);
    if (position <= 0.4 || position >= 0.6)
      assert.ok(first(position) + second(position) >= 0.999);
  }
  assert.equal(first(0.2), 1);
  assert.equal(second(0.8), 1);
});
