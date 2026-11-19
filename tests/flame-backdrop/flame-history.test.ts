import assert from "node:assert/strict";
import test from "node:test";
import {
  BREATHING_CONFIG,
  emissionGainAt,
  createHistoricalShader,
  replaceHistoricalOnce,
  referenceConfig
} from "@/components/gl/flame-backdrop/field/material";

test("historical replacement fails closed on missing or ambiguous source markers", () => {
  assert.equal(replaceHistoricalOnce("abc def", "def", "ghi"), "abc ghi");
  assert.throws(
    () => replaceHistoricalOnce("abc", "def", "ghi"),
    /exactly once/
  );
  assert.throws(
    () => replaceHistoricalOnce("abc abc", "abc", "ghi"),
    /exactly once/
  );
  assert.throws(() => replaceHistoricalOnce("abc", "", "ghi"), /exactly once/);
  assert.throws(
    () =>
      createHistoricalShader(referenceConfig(1440, 900), "unknown" as never),
    /historical/
  );
  assert.equal(referenceConfig(375, 568).composition.verticalScale, 0.6);
  assert.equal(referenceConfig(1440, 900).ignition.enabled, false);
});

test("breathing gain starts at B, turns smoothly through A and repeats every 24 active seconds", () => {
  assert.equal(BREATHING_CONFIG.periodSeconds, 24);
  assert.equal(emissionGainAt(0), 1.9);
  assert.equal(emissionGainAt(12), 1);
  assert.equal(emissionGainAt(24), 1.9);
  for (let index = 0; index < 10000; index++) {
    const seconds = index / 31;
    const gain = emissionGainAt(seconds);
    assert.ok(gain >= 1 && gain <= 1.9);
    assert.ok(Math.abs(gain - emissionGainAt(seconds + 24)) < 1e-12);
  }
  assert.ok(1.9 - emissionGainAt(0.001) < 1e-7);
  assert.ok(emissionGainAt(12.001) - 1 < 1e-7);
  assert.equal(emissionGainAt(5, 10), 1);
  for (const invalid of [NaN, Infinity, -1, null, undefined, "", {}]) {
    assert.throws(() => emissionGainAt(invalid as number), /elapsed/);
  }
  for (const invalid of [NaN, Infinity, 0, -1, null, "", {}]) {
    assert.throws(() => emissionGainAt(0, invalid as number), /period/);
  }
});
