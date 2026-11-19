import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("canvas scroll and observer wiring retain the pilot and consume intent only on advancing frames", () => {
  const source = readFileSync(
    new URL("../../../src/components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    source,
    /reversing: latchReverseIntent\(viewport\.current\.reversing, scrollY, next\)/
  );
  assert.match(
    source,
    /ignitionState\.current = retainPilotOnExit\(\s*ignitionState\.current,\s*bounds\.top,\s*window\.innerHeight,\s*viewport\.current\.reversing\s*\)/
  );
  assert.match(
    source,
    /if \(advancing\)\s*viewport\.current = \{ \.\.\.viewport\.current, reversing: false \}/
  );
  assert.match(
    source,
    /const target = canvas\.closest\(["']section["']\) \?\? canvas/
  );
  assert.match(source, /onViewportChange\(intersecting\);\s*measure\(\)/);
  assert.match(source, /uViewportExposure: \{ value: 1 \}/);
  assert.match(
    source,
    /values\.uViewportExposure\.value = ignition \? viewport\.current\.exposure : 1/
  );
  assert.match(
    source,
    /dataset\.footerExposure =\s*values\.uViewportExposure\.value\.toFixed\(6\)/
  );
});
