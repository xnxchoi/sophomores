import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createEnvelopeShader, envelopeMaterialPoint, envelopeCoordinatesForAspect, ENVELOPE_COORDINATES, MASK_MAIN, MASK_UNIFORM } from '../components/flame-backdrop/field/shader';
import { createEnvelopeMaskUrl } from '../components/flame-backdrop/mask/svg';
import { ENVELOPE_PATH } from '../components/flame-backdrop/mask/profile';
import { createHistoricalShader, referenceConfig } from '../app/(site)/studies/flame-reference/historical-shaders';

test('study changes only coverage and coordinates, retaining accepted helpers, stems, shade, and tone mapping', () => {
  const config = referenceConfig(1440, 900);
  const source = createHistoricalShader(config, 'breathing');
  const shader = createEnvelopeShader(config);
  assert.equal(shader.replace(MASK_MAIN, '').replace(MASK_UNIFORM, '').replace('void renderEnvelopeMaterial()', 'void main()').replace(ENVELOPE_COORDINATES, 'vec2 p = (vUv - .5) * uScale - uOrigin;')
    .replace('float envelope = 1.0;', 'float envelope = launch * dissolve * shoulders * crown;'), source);
  assert.equal(config.fire.rimStrength, 0);
  assert.equal(config.visual.overlapWhitening, 0);
  assert.match(shader, /materialLight \* envelope \+ stems/);
  assert.match(shader, /uEmissionGain/);
  for (const key of ['fire', 'visual'] as const) {
    const changed = key === 'fire' ? { ...config, fire: { ...config.fire, rimStrength: 1 } } : { ...config, visual: { ...config.visual, overlapWhitening: 1 } };
    assert.throws(() => createEnvelopeShader(changed), /ring/);
  }
  assert.throws(() => createEnvelopeShader({ ...config, fire: { ...config.fire, plumeHeight: .3 } }), /fuel domain/);
  assert.throws(() => createEnvelopeShader({ ...config, visual: { ...config.visual, ringRadius: .4 } }), /fuel domain/);
});

test('expanded envelope samples full fuel height without recreating an arch or changing x density', () => {
  for (const x of [0, .25, .5, .75, 1]) {
    for (const [y, expectedLift] of [[.06, -.2], [.70, .9]] as const) {
      const point = envelopeMaterialPoint(x, y);
      const root = Math.sqrt(Math.max(0, .35 ** 2 - point[0] ** 2));
      assert.ok(Math.abs((point[1] - root) / .25 - expectedLift) < 1e-12);
      assert.ok(Math.abs(point[0] / .35) < .85, 'original shoulder gate is fully open');
      assert.ok(point[1] / .35 > .18, 'original crown gate is fully open');
    }
  }
  for (const invalid of [null, undefined, '', NaN, Infinity, -.1, 1.1]) {
    assert.throws(() => envelopeMaterialPoint(invalid as number, .5), /UV/);
    assert.throws(() => envelopeMaterialPoint(.5, invalid as number), /UV/);
  }
});

test('portrait material center-crops its horizontal domain instead of squeezing desktop texture', () => {
  const desktopAspect = 1.6;
  assert.equal(envelopeCoordinatesForAspect(desktopAspect), ENVELOPE_COORDINATES);
  assert.equal(envelopeCoordinatesForAspect(2.4), ENVELOPE_COORDINATES);
  for (const [width, height] of [[390, 844], [375, 667], [768, 1024], [1440, 900]]) {
    const aspect = width / height;
    const left = envelopeMaterialPoint(0, .5, aspect);
    const right = envelopeMaterialPoint(1, .5, aspect);
    const pixelScale = (right[0] - left[0]) / width;
    assert.ok(Math.abs(pixelScale - (.35 * 2 / 1.2) / (height * 1.6)) < 1e-12);
    assert.equal(envelopeMaterialPoint(.5, .5, aspect)[0], 0);
    assert.ok(Math.abs(right[0]) <= .35 / 1.2);
    const config = referenceConfig(width, height);
    const shader = createEnvelopeShader(config, aspect);
    assert.equal(shader.replace(MASK_MAIN, '').replace(MASK_UNIFORM, '').replace('void renderEnvelopeMaterial()', 'void main()').replace(envelopeCoordinatesForAspect(aspect), 'vec2 p = (vUv - .5) * uScale - uOrigin;')
      .replace('float envelope = 1.0;', 'float envelope = launch * dissolve * shoulders * crown;'), createHistoricalShader(config, 'breathing'));
  }
  for (const invalid of [null, undefined, '', NaN, Infinity, -1, 0]) {
    if (invalid === undefined) continue; // Omitted optional aspect intentionally uses the desktop domain.
    assert.throws(() => envelopeCoordinatesForAspect(invalid as number), /aspect/);
    assert.throws(() => envelopeMaterialPoint(.5, .5, invalid as number), /aspect/);
  }
});

test('one validated serialized SVG provides identical render-mask and debug-image opacity', () => {
  const url = createEnvelopeMaskUrl(390, 844, .75, 3);
  assert.match(url, /^data:image\/svg\+xml,/);
  const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1));
  assert.ok(svg.includes(ENVELOPE_PATH));
  assert.match(svg, /width="390" height="844"/);
  assert.match(svg, /stdDeviation="6.33"/);
  assert.match(svg, /mask="url\(#edge-guard\)"/);
  assert.match(svg, /x="-50%" y="-50%" width="200%" height="200%"/);
  assert.doesNotMatch(svg, /feFunc[RGB]/);
  assert.match(decodeURIComponent(createEnvelopeMaskUrl(1440, 900, 0, 1)), /stdDeviation="0"/);
  for (const invalid of [null, undefined, '', NaN, Infinity, -1, 0]) {
    assert.throws(() => createEnvelopeMaskUrl(invalid as number, 900, .75, 3), /width/);
    assert.throws(() => createEnvelopeMaskUrl(1440, invalid as number, .75, 3), /height/);
  }
  assert.throws(() => createEnvelopeMaskUrl(1440, 900, 9, 3), /smoothing/);
  assert.throws(() => createEnvelopeMaskUrl(1440, 900, .75, 5), /exponent/);
});

test('isolated renderer retains active-time breathing, resize and failure cleanup', () => {
  const source = readFileSync(new URL('../components/flame-backdrop/field/renderer.ts', import.meta.url), 'utf8');
  for (const token of ['document.hidden', 'visibilitychange', 'webglcontextlost', 'emissionGainAt(seconds)', 'lastTime = null', 'geometry.dispose()', 'material.dispose()', 'renderer.dispose()', 'observer.disconnect()', 'cancelAnimationFrame']) assert.ok(source.includes(token), token);
  assert.doesNotMatch(source, /createHistoricalShader|createHistoricalRenderer/);
});

test('shader applies only texture alpha after every material branch, including background returns', () => {
  const shader = createEnvelopeShader(referenceConfig(1440, 900));
  assert.equal((shader.match(/void main\(\)/g) ?? []).length, 1);
  assert.match(shader, /uniform sampler2D uMask/);
  assert.match(shader, /renderEnvelopeMaterial\(\);[\s\S]*gl_FragColor\.a \*= texture2D\(uMask, vUv\)\.a/);
});
