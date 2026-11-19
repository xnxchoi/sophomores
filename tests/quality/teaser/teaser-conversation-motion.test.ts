import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stagger } from "motion/react";
test("message words use Motion's native fifty-millisecond stagger", () => {
  assert.deepEqual([0, 1, 2].map((index) => stagger(0.05)(index, 3)), [0, 0.05, 0.1]);
  const source = readFileSync(new URL("../../../src/components/teaser/conversation.tsx", import.meta.url), "utf8");
  assert.match(source, /delay: stagger\(0\.05\)\(wordIndex, words\.length\)/);
  assert.match(source, /duration: 0\.2/);
  assert.match(source, /step === 1 && activeViewport/);
});
