import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("orbit uses its current native Motion presence handoff, not the unused scroll-text engine", () => {
  const source = readFileSync(new URL("../../src/components/teaser/orbit.tsx", import.meta.url), "utf8");
  assert.match(source, /<AnimatePresence mode="wait" initial=\{false\}>/);
  assert.match(source, /initial=\{\{ opacity: 0, y: 40 \}\}/);
  assert.match(source, /animate=\{\{ opacity: 1, y: 0 \}\}/);
  assert.match(source, /y: -60/);
  assert.match(source, /transition: \{ duration: 0\.6, delay: 0\.2 \}/);
  assert.match(source, /transition=\{\{ duration: 1\.2, ease: \[0\.5, 0, 0, 1\] \}\}/);
  assert.doesNotMatch(source, /text-tokens|textKeyframes|conversation-motion/);
});
