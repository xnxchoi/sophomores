import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveFlameConfig } from '../config';
import { resolveFooterConfig } from '../FlameFooterBackdrop';
import { createFragmentShader } from '../shaders';
import { FOOTER_SUBSTANCE_GLSL } from '../footer-material';

const hash = (source: string) => createHash('sha256').update(source).digest('hex');

test('approved hero and light footer shader bytes remain unchanged', () => {
  assert.equal(hash(createFragmentShader(resolveFlameConfig())), '2bba88c4e00f1aa9cf367df36bb9205a58f39b954977534fdd42f316d848e2f5');
  assert.equal(hash(createFragmentShader(resolveFooterConfig())), '1f63467aeaa1837b02e0629bdbeed2f1a779a9a0b4a4c701cd6e29d24eb835ac');
});

test('substance is explicit and restricted to an emitting footer', () => {
  const footer = resolveFooterConfig();
  const before = JSON.stringify(footer);
  const substance = createFragmentShader(footer, 'substance');
  assert.match(substance, /float materialDensity/);
  assert.notEqual(substance, createFragmentShader(footer));
  assert.equal(createFragmentShader(footer, 'light'), createFragmentShader(footer));
  for (const config of [resolveFlameConfig(), resolveFlameConfig({ fire: { intensity: 1 } }), resolveFooterConfig({ fire: { intensity: 0 } })]) {
    assert.equal(createFragmentShader(config, 'substance'), createFragmentShader(config));
  }
  assert.equal(JSON.stringify(footer), before);
});

test('material preserves settled geometry, color and clocks without textures or new animation', () => {
  const config = resolveFooterConfig();
  const original = createFragmentShader(config);
  const substance = createFragmentShader(config, 'substance');
  for (const name of ['flameReaction']) {
    const fn = new RegExp(`float ${name}\\([^}]+\\}`);
    assert.equal(substance.match(fn)?.[0], original.match(fn)?.[0]);
  }
  assert.match(substance, /materialRidge/);
  assert.match(substance, /materialTransmission/);
  assert.match(substance, /float envelope = launch \* dissolve \* shoulders \* crown/);
  assert.equal(substance.match(/float hueCycle[^;]+;/)?.[0], original.match(/float hueCycle[^;]+;/)?.[0]);
  assert.doesNotMatch(substance, /sampler|texture2D|dFdx|dFdy|undefined|NaN|Infinity/);
  assert.equal((substance.match(/flameReaction\(/g) ?? []).length, 4, 'definition, existing field, two bounded slope samples');
});

test('only the substance footer changes transient ignition, with an exact settled neutral endpoint', () => {
  const fn = /float flameIgnition\([^}]+\}/;
  const footer = resolveFooterConfig();
  const original = createFragmentShader(footer);
  const substance = createFragmentShader(footer, 'substance');
  assert.notEqual(substance.match(fn)?.[0], original.match(fn)?.[0]);
  assert.match(substance.match(fn)?.[0] ?? '', /if \(progress >= 1\.0\) return 1\.0/);
  const ring = resolveFlameConfig({ fire: { intensity: 1 }, ignition: { enabled: true } });
  assert.equal(createFragmentShader(ring, 'substance').match(fn)?.[0], createFragmentShader(ring).match(fn)?.[0]);
  const still = createFragmentShader(resolveFooterConfig({ ignition: { enabled: false } }), 'substance');
  assert.doesNotMatch(still, /flameIgnition|footerIgnitionHeight|uIgnitionProgress/);
});

test('invalid runtime material selectors fail rather than silently choosing a style', () => {
  for (const invalid of [null, '', 'glass', 1, {}, []]) {
    assert.throws(() => createFragmentShader(resolveFooterConfig(), invalid as never), /footerMaterial/);
  }
});

test('backlit substance has broad transmission and short glints, not nested neon contours', () => {
  assert.doesNotMatch(FOOTER_SUBSTANCE_GLSL, /materialFront|materialRear|materialFolds/);
  assert.equal((FOOTER_SUBSTANCE_GLSL.match(/flameFront\(/g) ?? []).length, 1, 'only one localized edge highlight, no offset bands');
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialPatch/);
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialGlintGate/);
  assert.match(FOOTER_SUBSTANCE_GLSL, /materialRidge \* materialGlintGate/);
  assert.doesNotMatch(FOOTER_SUBSTANCE_GLSL, /\bedge\s*\*|\bhalo\s*\*|uColorTime|uTime|vUv|gl_FragCoord/);
  assert.ok((FOOTER_SUBSTANCE_GLSL.match(/flameReaction\(|flameNoise\(/g) ?? []).length <= 4, 'material field work remains bounded');
});

test('site opts in on the footer only and material changes recreate its renderer', () => {
  const scene = readFileSync(new URL('../../teaser/scene.tsx', import.meta.url), 'utf8');
  const hero = scene.match(/<FlameBackdrop\s([\s\S]*?)\/>/)?.[1];
  const footer = scene.match(/<FlameFooterBackdrop\s([\s\S]*?)\/>/)?.[1];
  assert.ok(hero);
  assert.ok(footer);
  assert.doesNotMatch(hero, /footerMaterial|config=/);
  assert.match(footer, /footerMaterial=\{backdropTokens\.footerMaterial\}/);
  const component = readFileSync(new URL('../FlameBackdrop.tsx', import.meta.url), 'utf8');
  assert.match(component, /config: settings, footerMaterial/);
  assert.match(component, /\[configKey, viewportActivation, viewportThreshold, footerMaterial\]/);
});
