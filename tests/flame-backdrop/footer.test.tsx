import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveFlameConfig } from '../../flame-backdrop/config';
import { artworkLayout, artworkPoint } from '../../flame-backdrop/layout';
import { FlameFooterBackdrop, resolveFooterConfig } from '../../flame-backdrop/react/FlameFooterBackdrop';

test('footer presets do not change the original default ring or mutate caller overrides', () => {
  const original = resolveFlameConfig();
  assert.equal(original.composition.mode, 'ring');
  assert.equal(original.fire.intensity, 0);
  const overrides = { fire: { plumeHeight: .12 }, pointer: { enabled: false } };
  const footer = resolveFooterConfig(overrides);
  assert.equal(footer.composition.mode, 'footer');
  assert.equal(footer.fire.intensity, 1);
  assert.equal(footer.fire.plumeHeight, .12);
  assert.equal(footer.pointer.enabled, false);
  assert.deepEqual(overrides, { fire: { plumeHeight: .12 }, pointer: { enabled: false } });
  assert.equal(resolveFlameConfig().fire.intensity, 0);
  assert.equal(footer.fire.flowCycles, 2);
  assert.equal(footer.fire.rimStrength, 0);
  assert.equal(footer.composition.verticalScale, .6);
  assert.equal(footer.composition.heightRatio, .9);
  assert.equal(footer.fire.curlAmount, .7);
  assert.equal(original.fire.rimStrength, 1);
});

test('blue alcohol footer preset suppresses warm rim, white overlap and rainbow dispersion', () => {
  const footer = resolveFooterConfig();
  assert.equal(footer.fire.baseColor, '#155BFF');
  assert.equal(footer.fire.tipColor, '#5CBFFF');
  assert.equal(footer.fire.warmth, 1);
  assert.equal(footer.fire.rimStrength, 0);
  assert.equal(footer.visual.brightness, .65);
  assert.equal(footer.visual.overlapWhitening, 0);
  assert.equal(footer.prism.amount, 0);
  assert.equal(footer.prism.pointerAmount, 0);
  assert.equal(footer.prism.nativeSplit, 0);
  const ring = resolveFlameConfig();
  assert.equal(ring.visual.brightness, 1);
  assert.equal(ring.visual.overlapWhitening, 1);
  assert.equal(ring.prism.amount, .42);
  assert.equal(ring.prism.pointerAmount, .18);
  assert.equal(ring.prism.nativeSplit, .0018);
});

test('footer blue colors and suppressed material contributions remain independently configurable', () => {
  const input = { fire: { baseColor: '#124578', tipColor: '#abcdef', warmth: .4, rimStrength: .3 },
    visual: { brightness: .8, overlapWhitening: .2 },
    prism: { amount: .25, pointerAmount: .15, nativeSplit: .002 } };
  const before = structuredClone(input);
  const config = resolveFooterConfig(input);
  for (const group of ['fire', 'visual', 'prism'] as const) {
    for (const [name, value] of Object.entries(input[group])) {
      assert.equal((config[group] as Record<string, unknown>)[name], value);
    }
  }
  assert.deepEqual(input, before);
  assert.equal(resolveFooterConfig().fire.baseColor, '#155BFF');
  assert.equal(resolveFooterConfig().prism.amount, 0);
});

test('ring artwork transform retains approved wide and square coordinates', () => {
  const config = resolveFlameConfig();
  const layout = artworkLayout(800, 400, config);
  assert.equal(layout.side, 400);
  assert.deepEqual(layout.origin, [0, 0]);
  assert.deepEqual(artworkPoint(540, 200, layout), [.35, 0]);
  assert.deepEqual(artworkPoint(400, 60, layout), [0, .35]);
});

test('footer drawing and pointer use the same bottom-anchored transform across viewports', () => {
  const config = resolveFooterConfig();
  for (const [width, height] of [[1280, 480], [390, 420], [640, 320]]) {
    const layout = artworkLayout(width, height, config);
    const radiusPixels = layout.side * config.visual.ringRadius;
    assert.equal(layout.centerY, height);
    assert.ok(radiusPixels <= width * config.composition.widthRatio / 2 + 1e-10);
    assert.ok(radiusPixels <= height * config.composition.heightRatio + 1e-10);
    const apex = artworkPoint(width / 2, height - radiusPixels * config.composition.verticalScale, layout);
    assert.ok(Math.abs(apex[0]) < 1e-10 && Math.abs(apex[1] - .35) < 1e-10);
    assert.ok(layout.origin[1] < 0);
  }
});

test('flattening preserves width and matches fragment and pointer positions across the arc', () => {
  for (const verticalScale of [.25, .6, 1, 2]) {
    const config = resolveFlameConfig({ composition: { mode: 'footer', verticalScale, baselineOffset: .1 } });
    const layout = artworkLayout(1200, 400, config);
    assert.equal(layout.side, artworkLayout(1200, 400, resolveFlameConfig({ composition: { mode: 'footer' } })).side);
    for (const angle of [0, Math.PI / 6, Math.PI / 2, Math.PI * .9]) {
      const target = [Math.cos(angle) * .35, Math.sin(angle) * .35];
      const x = layout.centerX + target[0] * layout.side;
      const y = layout.centerY - target[1] * layout.side * verticalScale;
      const pointer = artworkPoint(x, y, layout);
      const fragment = [(x / 1200 - .5) * layout.scale[0] - layout.origin[0],
        (.5 - y / 400) * layout.scale[1] - layout.origin[1]];
      for (const result of [pointer, fragment]) result.forEach((value, axis) => assert.ok(Math.abs(value - target[axis]) < 1e-12));
    }
  }
});

test('baseline offset sinks the dome without breaking pointer alignment; zero-size is safe', () => {
  const config = resolveFooterConfig({ composition: { baselineOffset: .1 } });
  const layout = artworkLayout(1000, 500, config);
  assert.equal(layout.centerY, 550);
  assert.deepEqual(artworkPoint(500, 550, layout), [0, 0]);
  assert.equal(artworkLayout(0, 0, config).side, 0);
  assert.deepEqual(artworkPoint(0, 0, artworkLayout(0, 0, config)), [0, 0]);
});

test('new controls validate modes, bounds and integer flow cycles', () => {
  for (const config of [{ composition: { mode: 'invalid' } }, { fire: { flowCycles: .5 } }, { fire: { intensity: Infinity } }]) {
    assert.throws(() => resolveFlameConfig(config as never));
  }
});
test('footer validates dependent overrides against footer defaults, not the original ring', () => {
  assert.equal(resolveFooterConfig({ prism: { amount: .84 } }).prism.amount, .84);
  assert.equal(resolveFooterConfig({ prism: { pointerAmount: .6 } }).prism.pointerAmount, .6);
  assert.equal(resolveFooterConfig({ prism: { amount: 1 } }).prism.amount, 1);
  assert.equal(resolveFooterConfig({ prism: { pointerAmount: 1 } }).prism.pointerAmount, 1);
  assert.throws(() => resolveFooterConfig({ prism: { amount: .9, pointerAmount: .2 } }));
  assert.throws(() => resolveFooterConfig({ prism: null } as never));
  assert.throws(() => resolveFooterConfig({ typo: {} } as never));
});

test('footer wrapper is a decorative image-backed field with mask overrides and no media', () => {
  const html = renderToStaticMarkup(<FlameFooterBackdrop maskSource="/masks/custom.svg" paused style={{ height: 420 }} />);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /height:420px/);
  assert.doesNotMatch(html, /<video|<img/);
});

 test('footer adds restrained stems, slow blue-green cycling, and viewport ignition without brightening', () => {
  const footer = resolveFooterConfig();
  assert.equal(footer.fire.stemStrength, .10);
  assert.equal(footer.fire.plumeHeight, .25);
  assert.equal(footer.fire.plumeFrequency, 9);
  assert.equal(footer.motion.loopSeconds, 16);
  assert.equal(footer.fire.colorCycleSeconds, 32);
  assert.equal(footer.fire.alternateBaseColor, '#086FBA');
  assert.equal(footer.fire.alternateTipColor, '#48BFA6');
  assert.equal(footer.ignition.enabled, true);
  assert.equal(footer.ignition.durationSeconds, 1.6);
  assert.equal(footer.visual.brightness, .65);
  assert.equal(resolveFlameConfig().ignition.enabled, false);
  assert.equal(resolveFlameConfig().fire.colorCycleSeconds, 0);
});
