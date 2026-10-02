import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_FLAME_CONFIG, resolveFlameConfig, type FlameConfigInput } from '../config';

test('defaults preserve the approved ring and sheen settings', () => {
  const config = resolveFlameConfig();
  assert.deepEqual(config, DEFAULT_FLAME_CONFIG);
  assert.equal(config.visual.ringThickness, 1.425);
  assert.equal(config.pointer.tangentRadius, .284375);
  assert.equal(config.prism.spread, .012);
  assert.ok(Object.isFrozen(config));
  for (const group of Object.values(config)) assert.ok(Object.isFrozen(group));
});

test('nested overrides retain defaults without mutating input', () => {
  const input = { visual: { brightness: .8 }, pointer: { enabled: false } };
  assert.equal(resolveFlameConfig(input).visual.brightness, .8);
  assert.equal(resolveFlameConfig(input).pointer.enabled, false);
  assert.equal(resolveFlameConfig(input).visual.ringRadius, .35);
  assert.deepEqual(input, { visual: { brightness: .8 }, pointer: { enabled: false } });
});

test('dedicated flame base and tip colors are immutable validated hex controls', () => {
  const fire = { baseColor: '#155BFF', tipColor: '#5cBFFF' };
  assert.equal(resolveFlameConfig({ fire }).fire.baseColor, fire.baseColor);
  assert.equal(resolveFlameConfig({ fire }).fire.tipColor, fire.tipColor);
  assert.deepEqual(fire, { baseColor: '#155BFF', tipColor: '#5cBFFF' });
  for (const key of ['baseColor', 'tipColor']) for (const value of [null, 0, '#fff', 'blue', '#ZZ1122']) {
    assert.throws(() => resolveFlameConfig({ fire: { [key]: value } } as never));
  }
});

test('flame membrane softness and faint body opacity are separately configurable and bounded', () => {
  const config = resolveFlameConfig({ fire: { frontSoftness: .07, bodyOpacity: .04 } });
  assert.equal(config.fire.frontSoftness, .07);
  assert.equal(config.fire.bodyOpacity, .04);
  for (const frontSoftness of [0, .201, Infinity]) assert.throws(() => resolveFlameConfig({ fire: { frontSoftness } }));
  for (const bodyOpacity of [-.001, .151, NaN]) assert.throws(() => resolveFlameConfig({ fire: { bodyOpacity } }));
});

test('optional stem, hue cycle and ignition controls default off and validate independently', () => {
  const defaults = resolveFlameConfig();
  assert.equal(defaults.fire.stemStrength, 0);
  assert.equal(defaults.fire.colorCycleSeconds, 0);
  assert.equal(defaults.ignition.enabled, false);
  const config = resolveFlameConfig({ fire: { stemStrength: .10, alternateBaseColor: '#167D84',
    alternateTipColor: '#65BDD0', colorCycleSeconds: 32 }, ignition: { enabled: true, durationSeconds: 1.6, sweepFraction: .55 } });
  assert.equal(config.fire.colorCycleSeconds, 32);
  assert.equal(config.ignition.sweepFraction, .55);
  for (const fire of [{ stemStrength: .301 }, { colorCycleSeconds: 601 }, { alternateBaseColor: 'green' }]) {
    assert.throws(() => resolveFlameConfig({ fire } as never));
  }
  for (const ignition of [{ enabled: 1 }, { durationSeconds: 0 }, { sweepFraction: 0 }, { sweepFraction: 1 }]) {
    assert.throws(() => resolveFlameConfig({ ignition } as never));
  }
});

test('vertical scale defaults to the approved circle and validates flattening bounds', () => {
  assert.equal(resolveFlameConfig().composition.verticalScale, 1);
  for (const verticalScale of [.25, .6, 1, 2]) {
    assert.equal(resolveFlameConfig({ composition: { verticalScale } }).composition.verticalScale, verticalScale);
  }
  for (const verticalScale of [0, .249, 2.001, undefined, null, '0.6']) {
    assert.throws(() => resolveFlameConfig({ composition: { verticalScale } } as never));
  }
});

test('all numeric controls reject nonfinite and unreasonable values', () => {
  for (const [group, values] of Object.entries(DEFAULT_FLAME_CONFIG)) {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== 'number') continue;
      for (const invalid of [NaN, Infinity, -1, 1e9, '2', null]) {
        assert.throws(() => resolveFlameConfig({ [group]: { [key]: invalid } } as FlameConfigInput), RangeError);
      }
    }
  }
});

test('invalid toggles, colors, groups and coupled prism settings fail clearly', () => {
  for (const input of [
    { pointer: { enabled: 1 } }, { prism: { enabled: 'yes' } },
    { visual: { backgroundColor: 'red' } }, { visual: { backgroundColor: '#abc' } },
    { prism: { gateLow: .2, gateHigh: .1 } },
    { prism: { amount: .8, pointerAmount: .3 } },
    { visual: null }, { visual: [] }, { nonsense: {} }, { motion: { typo: 3 } },
  ]) assert.throws(() => resolveFlameConfig(input as FlameConfigInput));
  assert.equal(resolveFlameConfig({ visual: { backgroundColor: '#Ab03fF' } }).visual.backgroundColor, '#Ab03fF');
});
