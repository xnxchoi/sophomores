import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("entry delegates scheduling to Motion and cleans up controls instead of running a frame loop", () => {
  const source = readFileSync(
    new URL("../../../src/hooks/use-entry.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /from ['"]motion\/react['"]/);
  assert.match(source, /useMotionValue/);
  assert.match(source, /animate\(/);
  assert.match(source, /control\.pause\(/);
  assert.match(source, /control\.play\(/);
  assert.match(source, /control\?\.state === ['"]running['"]/);
  assert.match(source, /control\?\.state === ['"]paused['"]/);
  assert.match(source, /control\?\.stop\(/);
  assert.match(source, /removeEventListener\(['"]visibilitychange['"]/);
  assert.doesNotMatch(
    source,
    /requestAnimationFrame|performance\.now|style\.setProperty|entryPose|setTimeout|setInterval/
  );
});
