import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFlameConfig, type FlameConfig } from '../flame-backdrop/config';
import { referenceConfig } from '../flame-backdrop/field/material';
import { FIELD_VISIBILITY, resolveVisibleFieldConfig } from '../flame-backdrop/field/visibility';

test('footer definition tightens only the existing softness and brightness controls', () => {
  const original = referenceConfig(1440, 900);
  const before = structuredClone(original);
  const tuned = resolveVisibleFieldConfig(original);
  assert.equal(tuned.fire.frontSoftness, .065 * .15);
  assert.equal(tuned.visual.brightness, .65 * 4);
  assert.ok(tuned.fire.frontSoftness <= (.065 * .62) * .25,
    'definition must improve substantially over the rejected mild refinement');
  assert.ok(tuned.visual.brightness >= (.65 * 1.12) * 3,
    'visibility must improve substantially over the rejected dark refinement');
  assert.deepEqual({ ...tuned, fire: { ...tuned.fire, frontSoftness: original.fire.frontSoftness },
    visual: { ...tuned.visual, brightness: original.visual.brightness } }, original);
  assert.deepEqual(original, before);
  assert.notEqual(tuned, original);
  assert.ok(Object.isFrozen(tuned));
  assert.ok(Object.isFrozen(tuned.fire));
  assert.ok(Object.isFrozen(FIELD_VISIBILITY));
});

test('already valid extreme controls remain within the supported shader domain', () => {
  const original = resolveFlameConfig({ fire: { frontSoftness: .005 }, visual: { brightness: 3 } });
  const tuned = resolveVisibleFieldConfig(original);
  assert.equal(tuned.fire.frontSoftness, .005);
  assert.equal(tuned.visual.brightness, 3);
  assert.equal(resolveVisibleFieldConfig(resolveFlameConfig({ visual: { brightness: 0 } })).visual.brightness, 0);
});

test('malformed visibility input fails before tuning instead of hiding invalid controls', () => {
  for (const invalid of [null, undefined, false, '', [], 1]) {
    assert.throws(() => resolveVisibleFieldConfig(invalid as unknown as FlameConfig), TypeError);
  }
  const original = referenceConfig(1440, 900);
  for (const invalid of [-1, NaN, Infinity, 4]) {
    assert.throws(() => resolveVisibleFieldConfig({ ...original, visual: { ...original.visual, brightness: invalid } }), RangeError);
  }
  assert.throws(() => resolveVisibleFieldConfig({ ...original, fire: { ...original.fire, frontSoftness: .001 } }), RangeError);
});
