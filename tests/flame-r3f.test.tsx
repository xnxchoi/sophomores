import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { advanceFieldTime } from '../flame-backdrop/field/runtime';
import { referenceConfig } from '../flame-backdrop/field/material';
import { createEnvelopeShader, createResponsiveEnvelopeShader } from '../flame-backdrop/field/shader';

test('field time advances only for active rendering and does not catch up after suspension', () => {
  assert.equal(advanceFieldTime(7, 0.016, true), 7.016);
  assert.equal(advanceFieldTime(7, 30, false), 7);
  assert.equal(advanceFieldTime(7, 30, true), 7.1);
  assert.equal(advanceFieldTime(7, 0, true), 7);
  assert.equal(advanceFieldTime(0, 0.1, true), 0.1);
});

test('field time rejects invalid clocks instead of sending NaN into GPU uniforms', () => {
  for (const invalid of [-1, NaN, Infinity, -Infinity, null, undefined, '1']) {
    assert.throws(() => advanceFieldTime(invalid as number, 0.016, true), RangeError);
    assert.throws(() => advanceFieldTime(0, invalid as number, true), RangeError);
  }
});

test('R3F owns field rendering rather than nesting a second renderer or animation loop', () => {
  const canvas = readFileSync(new URL('../flame-backdrop/react/FieldCanvas.tsx', import.meta.url), 'utf8');
  assert.match(canvas, /from ['"]@react-three\/fiber['"]/);
  assert.match(canvas, /<Canvas\b/);
  assert.match(canvas, /useFrame/);
  assert.doesNotMatch(canvas, /new WebGLRenderer|requestAnimationFrame|new ResizeObserver/);
  assert.doesNotMatch(canvas, /prefers-reduced-motion|useReducedMotion/);
});

test('native R3F frameloop pauses the retained field without a parallel scheduler', () => {
  const canvas = readFileSync(new URL('../flame-backdrop/react/FieldCanvas.tsx', import.meta.url), 'utf8');
  assert.match(canvas, /frameloop=\{playing\s*&&\s*available\s*\?\s*['"]always['"]\s*:\s*['"]demand['"]\}/,
    'Canvas prop must remain the single authority through incidental parent re-renders');
  assert.doesNotMatch(canvas, /setFrameloop/,
    'an imperative setter races Canvas reconfiguration and can silently stop an active field');
  assert.doesNotMatch(canvas, /setTimeout|clearTimeout|requestAnimationFrame|cancelAnimationFrame/);
  const frameBody = canvas.slice(canvas.indexOf('  useFrame('), canvas.indexOf('\n  return <mesh'));
  assert.ok(frameBody.includes('advanceFieldTime'), 'frame loop still owns the active-time clock');
  assert.doesNotMatch(frameBody, /invalidate\(/, 'useFrame must not create a self-invalidating animation loop');
});

test('responsive field uses a width uniform without changing the accepted material or mask', () => {
  const config = referenceConfig(1440, 900);
  const responsive = createResponsiveEnvelopeShader(config);
  assert.match(responsive, /uniform float uMaterialWidth;/);
  assert.match(responsive, /float studyX = [^;]*\* uMaterialWidth;/);
  const canonical = responsive
    .replace(/uniform float uMaterialWidth;\n?/, '')
    .replace('(2.0 / 1.2) * uMaterialWidth;', '(2.0 / 1.2);');
  assert.equal(canonical, createEnvelopeShader(config));
});

test('responsive field retains the canonical shader precondition guards', () => {
  const config = referenceConfig(1440, 900);
  assert.throws(() => createResponsiveEnvelopeShader({ ...config, fire: { ...config.fire, rimStrength: 1 } }));
  assert.throws(() => createResponsiveEnvelopeShader({ ...config, visual: { ...config.visual, ringRadius: 0.4 } }));
});

test('vertical presentation validates a bounded finite stretch before it reaches the GPU', async () => {
  const { validateVerticalStretch } = await import('../flame-backdrop/field/presentation');
  for (const value of [.5, 1, 1.4, 3]) {
    assert.doesNotThrow(() => validateVerticalStretch(value));
  }
  for (const invalid of [.4999, 3.0001, 0, -1, NaN, Infinity, -Infinity, null, undefined, '1.4', true]) {
    assert.throws(() => validateVerticalStretch(invalid as number), RangeError);
  }
});

test('vertical presentation transforms the shared mask/material UV while keeping the viewport plane fixed', async () => {
  const { FIELD_VERTEX_SHADER } = await import('../flame-backdrop/field/presentation');
  assert.match(FIELD_VERTEX_SHADER, /uniform float uVerticalStretch;/);
  assert.match(FIELD_VERTEX_SHADER, /vUv\.y\s*\/=\s*uVerticalStretch;/);
  assert.match(FIELD_VERTEX_SHADER, /gl_Position\s*=\s*vec4\(position\.xy,\s*0\.0,\s*1\.0\)/,
    'presentation stretches samples, not the viewport-fixed plane or camera');
  assert.doesNotMatch(FIELD_VERTEX_SHADER, /vUv\.x\s*\/=|modelMatrix|projectionMatrix/);
});

test('footer opts into vertical presentation without changing the editor or remounting its clock', () => {
  const canvas = readFileSync(new URL('../flame-backdrop/react/FieldCanvas.tsx', import.meta.url), 'utf8');
  assert.match(canvas, /verticalStretch\s*=\s*1\b/);
  assert.match(canvas, /validateVerticalStretch\(verticalStretch\)/);
  assert.match(canvas, /uVerticalStretch/);
  assert.match(canvas, /vertexShader=\{FIELD_VERTEX_SHADER\}/);
  assert.doesNotMatch(canvas, /key=\{verticalStretch\}/);
  assert.equal((canvas.match(/const elapsed = useRef\(0\)/g) ?? []).length, 1);
  const scene = readFileSync(new URL('../components/teaser/scene.tsx', import.meta.url), 'utf8');
  assert.match(scene, /verticalStretch=\{backdropTokens\.footerVerticalStretch\}/);
  const editor = readFileSync(new URL('../components/devtools/flame-editor/flame-editor.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(editor, /verticalStretch=/,
    'the shared editor retains its canonical default presentation');
});

test('production footer raises the field through a validated art-direction token', async () => {
  const { backdropTokens } = await import('../lib/teaser/backdrop-tokens');
  const { validateVerticalStretch } = await import('../flame-backdrop/field/presentation');
  assert.ok(backdropTokens.footerVerticalStretch > 1,
    'production footer must lift its upper reach above the canonical editor presentation');
  assert.doesNotThrow(() => validateVerticalStretch(backdropTokens.footerVerticalStretch));
});
