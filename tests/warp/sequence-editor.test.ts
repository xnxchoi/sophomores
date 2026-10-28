import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultSequence,
  SEQUENCE_CLIPS,
  validateSequenceDraft
} from "../../components/Warp/_shared/sequence-editor";
import {
  createSequenceMappers,
  getFrame,
  getOpeningFrame
} from "../../components/Warp/sequence";

test("sequence defaults are serializable, independently owned and valid", () => {
  const first = createDefaultSequence();
  const second = createDefaultSequence();
  assert.equal(first.version, 1);
  assert.equal(first.openingDuration, 2.4);
  assert.deepEqual(first.clips.openingText, {
    start: 0.1, end: 1.62,
    ease: [0.42, 0, 0.30258184523809517, 1.0132068452380953]
  });
  assert.deepEqual(first.clips.openingField, {
    start: 0.7, end: 2.33,
    ease: [0.501748511904762, 0.009709821428571429, 0.4370312499999999, 0.9958333333333333]
  });
  assert.equal(SEQUENCE_CLIPS.length, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(validateSequenceDraft(first).success, true);
  assert.notEqual(first.clips, second.clips);
  assert.notEqual(
    first.clips.headlineSplit.ease,
    second.clips.headlineSplit.ease
  );
  const parsed = validateSequenceDraft(first);
  assert.ok(parsed.success);
  assert.notEqual(
    parsed.data.clips.headlineSplit.ease,
    first.clips.headlineSplit.ease
  );
});

test("authored opening duration stays fixed while the owner fits every headline glyph into its clip", () => {
  const draft = createDefaultSequence(100);
  assert.equal(draft.clips.openingText.end, 1.62);
  assert.equal(draft.openingDuration, 2.4);
  assert.equal(validateSequenceDraft(draft).success, true);
  assert.equal(createDefaultSequence(0).clips.openingText.end, 1.62);
  assert.throws(() => createDefaultSequence(NaN), RangeError);
});

test("validation rejects malformed domains, unsafe ranges, curves and handoff contracts", () => {
  const valid = createDefaultSequence();
  const altered = (id: keyof typeof valid.clips, value: object) => ({
    ...valid,
    clips: { ...valid.clips, [id]: { ...valid.clips[id], ...value } }
  });
  for (const invalid of [
    null,
    {},
    { ...valid, version: 2 },
    { ...valid, openingDuration: Infinity },
    { ...valid, openingDuration: 0.5 },
    { ...valid, extra: true },
    altered("headlineSplit", { start: NaN }),
    altered("headlineSplit", { start: -1 }),
    altered("headlineSplit", { end: 71 }),
    altered("headlineSplit", { end: 0.5 }),
    altered("headlineSplit", { end: 0.51 }),
    altered("openingText", { end: 0.1001 }),
    altered("headlineSplit", { ease: [-0.1, 0, 1, 1] }),
    altered("headlineSplit", { ease: [0, 0, 1.1, 1] }),
    altered("headlineSplit", { ease: [0, -3.1, 1, 1] }),
    altered("headlineSplit", { ease: [0, 0, 1, Infinity] }),
    altered("ringSettlement", { end: 69 }),
    altered("ringSettlement", { start: 69 }),
    altered("warpApproach", { start: 1 }),
    altered("warpApproach", { end: 65 })
  ])
    assert.equal(validateSequenceDraft(invalid).success, false);
  assert.equal(
    validateSequenceDraft(altered("headlineSplit", { ease: [0, -2, 1, 2] }))
      .success,
    true
  );
  assert.equal(
    validateSequenceDraft(altered("passageLine2", { start: 4, end: 20 }))
      .success,
    true
  );
});

test("refined defaults preserve every scroll pose and imported legacy openings stay compatible", () => {
  const defaults = createDefaultSequence();
  const compiled = createSequenceMappers(defaults);
  const legacy = createSequenceMappers({
    ...defaults,
    openingDuration: 2.8,
    clips: {
      ...defaults.clips,
      openingText: { start: 0.1, end: 1.68, ease: [0.42, 0, 0.58, 1] },
      openingField: { start: 0.2, end: 2.1, ease: [0, 0, 1, 1] }
    }
  });
  for (let sample = 0; sample <= 10000; sample++) {
    const progress = sample / 10000;
    for (const [actual, expected] of [
      [compiled.frame(progress), getFrame(progress)],
      [legacy.opening(progress), getOpeningFrame(progress)]
    ]) {
      for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
        const value = actual[key];
        const baseline = expected[key];
        if (typeof baseline === "number") {
          assert.ok(
            Math.abs(Number(value) - baseline) < 0.00002,
            `${sample} ${key}: ${value} vs ${baseline}`
          );
        } else assert.equal(value, baseline, `${sample} ${key}`);
      }
    }
  }
});

test("editing one track changes only its channel and preserves terminal poses", () => {
  const defaults = createDefaultSequence();
  const changed = {
    ...defaults,
    clips: {
      ...defaults.clips,
      headlineScale: { ...defaults.clips.headlineScale, end: 12 }
    }
  };
  const baseline = createSequenceMappers(defaults);
  const compiled = createSequenceMappers(changed);
  const { headlineScale: oldScale, ...oldOthers } = baseline.frame(0.05);
  const { headlineScale: newScale, ...newOthers } = compiled.frame(0.05);
  assert.notEqual(newScale, oldScale);
  assert.deepEqual(newOthers, oldOthers);
  assert.deepEqual(compiled.frame(0.7), baseline.frame(0.7));
  assert.deepEqual(compiled.frame(1), baseline.frame(1));
  assert.ok(Object.isFrozen(compiled.frame(0)));
});

test("compiled snapshots reject bad progress, clamp overscroll and do not follow later input edits", () => {
  const draft = createDefaultSequence();
  const compiled = createSequenceMappers(draft);
  const before = compiled.frame(0.1);
  Object.assign(draft.clips.headlineSplit, { end: 30 });
  assert.deepEqual(compiled.frame(0.1), before);
  for (const map of [compiled.frame, compiled.opening]) {
    assert.deepEqual(map(-2), map(0));
    assert.deepEqual(map(2), map(1));
    for (const value of [NaN, Infinity, -Infinity, null, "0.5"]) {
      assert.throws(() => map(value as number), RangeError);
    }
  }
});

test("custom approach and settlement remain pinned to the exact corona handoff", () => {
  const defaults = createDefaultSequence();
  const compiled = createSequenceMappers({
    ...defaults,
    clips: {
      ...defaults.clips,
      warpApproach: { ...defaults.clips.warpApproach, end: 45 },
      ringSettlement: { ...defaults.clips.ringSettlement, start: 50 }
    }
  });
  assert.equal(compiled.frame(0.45).warpProgress, 0.74);
  assert.equal(compiled.frame(0.68).warpProgress, 0.74);
  assert.equal(compiled.frame(0.7).warpProgress, 0.76);
  assert.equal(compiled.frame(0.7).settlement, 1);
  assert.deepEqual(compiled.frame(0.7), getFrame(0.7));
});

test("opening phase identifies field-first edits without calling a visible field black", () => {
  const defaults = createDefaultSequence();
  const compiled = createSequenceMappers({
    ...defaults,
    clips: {
      ...defaults.clips,
      openingText: { ...defaults.clips.openingText, start: 1 },
      openingField: { ...defaults.clips.openingField, start: 0 }
    }
  });
  assert.ok(compiled.opening(0.2).fieldOpacity > 0);
  assert.equal(compiled.opening(0.2).phase, "Field reveal");
});
