import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  advanceIgnition,
  INITIAL_IGNITION,
  IGNITION_TIMING,
  ignitionProgressAt,
  latchReverseIntent,
  retainPilotOnExit,
  viewportExposure
} from "@/components/gl/flame-backdrop/field/ignition";

test("first entry holds true black before a catch, spread and sustained flame", () => {
  assert.equal(ignitionProgressAt(0), 0);
  assert.equal(ignitionProgressAt(IGNITION_TIMING.blackHoldSeconds), 0);
  assert.ok(ignitionProgressAt(0.6) > 0);
  assert.ok(ignitionProgressAt(1.2) > IGNITION_TIMING.pilotProgress);
  assert.equal(ignitionProgressAt(IGNITION_TIMING.durationSeconds), 1);
  assert.equal(ignitionProgressAt(100), 1);
});

test("viewport exposure measures the enclosing section, clamping both edges", () => {
  assert.equal(viewportExposure(1000, 1000, 1000), 0);
  assert.equal(viewportExposure(750, 2000, 1000), 0.25);
  assert.equal(viewportExposure(250, 500, 1000), 1);
  assert.equal(viewportExposure(-500, 1000, 1000), 1);
  assert.equal(viewportExposure(0, 0, 1000), 0);
});

test("paused, hidden or offscreen ignition remains frozen and cannot catch up", () => {
  const frozen = advanceIgnition(INITIAL_IGNITION, 40, false, 0.5, false);
  assert.deepEqual(frozen, INITIAL_IGNITION);
  const resumed = advanceIgnition(frozen, 40, true, 0.5, false);
  assert.equal(resumed.elapsed, 0.1);
  assert.equal(resumed.progress, 0);
  assert.deepEqual(INITIAL_IGNITION, {
    elapsed: 0,
    progress: 0,
    hasLit: false,
    scrubbing: false
  });
});

test("first entry autoplays once without requiring continuous scrolling", () => {
  let current = INITIAL_IGNITION;
  for (let frame = 0; frame < 200; frame++)
    current = advanceIgnition(current, 1 / 60, true, 0.15, false);
  assert.equal(current.progress, 1);
  assert.equal(current.hasLit, true);
  assert.equal(current.scrubbing, false);
});

test("reverse scroll preserves a lit pilot; reentry never repeats blackness", () => {
  const lit = { elapsed: 3, progress: 1, hasLit: true, scrubbing: false };
  let pilot = advanceIgnition(lit, 0.1, true, 0, true);
  for (let frame = 0; frame < 100; frame++)
    pilot = advanceIgnition(pilot, 0.1, true, 0, false);
  assert.ok(pilot.progress >= IGNITION_TIMING.pilotProgress);
  assert.ok(pilot.progress < IGNITION_TIMING.pilotProgress + 0.001);
  assert.equal(pilot.scrubbing, true);
  const hidden = advanceIgnition(pilot, 10, false, 0, false);
  assert.deepEqual(hidden, pilot);
  let restored = hidden;
  for (let frame = 0; frame < 100; frame++)
    restored = advanceIgnition(restored, 0.1, true, 1, false);
  assert.ok(restored.progress > 0.999);
  assert.equal(restored.hasLit, true);
  assert.equal(lit.progress, 1);
});

test("scrolling upward before first light cannot bypass the opening black hold", () => {
  const current = advanceIgnition(INITIAL_IGNITION, 0.1, true, 0, true);
  assert.equal(current.progress, 0);
  assert.equal(current.scrubbing, false);
});

test("a fast reverse exit latches intent across down reentry before any advancing frame", () => {
  const lit = { elapsed: 2.5, progress: 0.9, hasLit: true, scrubbing: false };
  const reverse = latchReverseIntent(false, 2000, 1000);
  assert.equal(reverse, true);
  const stillPending = latchReverseIntent(reverse, 1000, 1100);
  assert.equal(stillPending, true);
  const retained = retainPilotOnExit(lit, 1000, 1000, stillPending);
  assert.deepEqual(retained, {
    ...lit,
    progress: IGNITION_TIMING.pilotProgress,
    scrubbing: true
  });
  const paused = advanceIgnition(retained, 30, false, 0, stillPending);
  assert.deepEqual(paused, retained);
  const reentry = advanceIgnition(paused, 0, true, 0.02, stillPending);
  assert.equal(reentry.progress, IGNITION_TIMING.pilotProgress);
  assert.equal(reentry.elapsed, lit.elapsed);
  assert.equal(reentry.scrubbing, true);
  assert.equal(lit.progress, 0.9);
});

test("exit retention cannot ignite a cold flame or shrink normal downward travel", () => {
  assert.deepEqual(
    retainPilotOnExit(INITIAL_IGNITION, 1100, 1000, true),
    INITIAL_IGNITION
  );
  const lit = { elapsed: 3, progress: 1, hasLit: true, scrubbing: false };
  assert.deepEqual(retainPilotOnExit(lit, 1000, 1000, false), lit);
  assert.deepEqual(retainPilotOnExit(lit, 900, 1000, true), lit);
  assert.deepEqual(retainPilotOnExit(lit, -1000, 1000, true), lit);
  assert.equal(latchReverseIntent(false, 1000, 1100), false);
  assert.equal(latchReverseIntent(false, 1000, 1000), false);
  const scrubbed = retainPilotOnExit(
    { ...lit, scrubbing: true },
    1100,
    1000,
    false
  );
  assert.equal(scrubbed.progress, IGNITION_TIMING.pilotProgress);
});

test("canvas scroll and observer wiring retain the pilot and consume intent only on advancing frames", () => {
  const source = readFileSync(
    new URL("../../src/components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
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

test("invalid clock and geometry values fail explicitly", () => {
  for (const invalid of [NaN, Infinity, -1]) {
    assert.throws(() => ignitionProgressAt(invalid), RangeError);
    assert.throws(
      () => advanceIgnition(INITIAL_IGNITION, invalid, true, 0.5, false),
      RangeError
    );
  }
  for (const invalid of [NaN, Infinity])
    assert.throws(() => viewportExposure(invalid, 100, 100), RangeError);
  assert.throws(
    () => advanceIgnition(INITIAL_IGNITION, 0.1, true, NaN, false),
    RangeError
  );
});
test("a queued exit followed by entry uses the latest viewport state", async () => {
  const { latestViewportIntersection } =
    await import("@/components/gl/flame-backdrop/field/ignition");
  assert.equal(
    latestViewportIntersection([
      { isIntersecting: false },
      { isIntersecting: true }
    ]),
    true
  );
  assert.equal(
    latestViewportIntersection([
      { isIntersecting: true },
      { isIntersecting: false }
    ]),
    false
  );
  assert.equal(latestViewportIntersection([]), undefined);
});
