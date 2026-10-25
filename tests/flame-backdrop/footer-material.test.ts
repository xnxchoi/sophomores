import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveFlameConfig } from '../../flame-backdrop/config';
import { resolveFooterConfig } from '../../flame-backdrop/react/FlameFooterBackdrop';
import { createFragmentShader } from '../../flame-backdrop/shaders';
import { FOOTER_SUBSTANCE_GLSL } from '../../flame-backdrop/footer-material';
import { assertShaderFixture } from './support/shader-fixture';

test('approved hero and light footer retain Float32-equivalent shader source', () => {
  assertShaderFixture(createFragmentShader(resolveFlameConfig()), 'ring', '2bba88c4e00f1aa9cf367df36bb9205a58f39b954977534fdd42f316d848e2f5');
  assertShaderFixture(createFragmentShader(resolveFooterConfig()), 'footer-light', '1f63467aeaa1837b02e0629bdbeed2f1a779a9a0b4a4c701cd6e29d24eb835ac');
});

test('substance is explicit and restricted to an emitting footer', () => {
  const footer = resolveFooterConfig();
  const before = JSON.stringify(footer);
  const substance = createFragmentShader(footer, 'substance');
  assert.match(substance, /float materialEmission/);
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
  assert.match(substance, /materialEmission/);
  assert.match(substance, /materialDiffusion/);
  assert.match(substance, /float envelope = launch \* dissolve \* shoulders \* crown/);
  assert.equal(substance.match(/float hueCycle[^;]+;/)?.[0], original.match(/float hueCycle[^;]+;/)?.[0]);
  assert.doesNotMatch(substance, /sampler|texture2D|dFdx|dFdy|undefined|NaN|Infinity/);
  assert.equal((substance.match(/flameReaction\(/g) ?? []).length, 2, 'definition and existing field only; no surface-normal samples');
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

test('gaseous substance emits broken fronts and uneven glow without reflective membrane shading', () => {
  assert.doesNotMatch(FOOTER_SUBSTANCE_GLSL, /materialNormal|materialFacing|materialTransmission|materialGlint|normalize|dot\(/);
  assert.equal((FOOTER_SUBSTANCE_GLSL.match(/flameFront\(/g) ?? []).length, 2, 'one reaction front and its broad glow, not offset contour bands');
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialFuel/);
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialEmission/);
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialDiffusion/);
  assert.doesNotMatch(FOOTER_SUBSTANCE_GLSL, /\bedge\s*\*|\bhalo\s*\*|uColorTime|uTime|vUv|gl_FragCoord/);
  assert.equal((FOOTER_SUBSTANCE_GLSL.match(/flameReaction\(/g) ?? []).length, 0);
  assert.equal((FOOTER_SUBSTANCE_GLSL.match(/flameNoise\(/g) ?? []).length, 2, 'only two cheap advected patches');
});

// Evaluate the actual scalar emission equations, not a duplicated model. This verifies
// light-energy contracts; GPU compilation and perceptual appearance need browser QA.
function materialLightAt(reaction: number, patch: number, backlight: number, lift = .9): number {
  const smoothstep = (low: number, high: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
  };
  const evaluate = new Function('reaction', 'softness', 'phase', 'x', 'lift', 'flameNoise', 'flameFront', 'smoothstep',
    `${FOOTER_SUBSTANCE_GLSL.replace(/\bfloat\b/g, 'const')} return materialLight;`);
  return evaluate(reaction, .035, 0, 0, lift,
    (x: number) => x < 20 ? patch : backlight,
    (value: number, width: number) => Math.exp(-((value / width) ** 2)), smoothstep);
}

test('fronts have genuine dark interruptions and depth without a filled sheet', () => {
  const hotFront = materialLightAt(0, .9, .9);
  const coldGap = materialLightAt(0, .1, .1);
  const hotInterior = materialLightAt(.3, .9, .9);
  assert.ok(hotFront > 1.5, 'reaction front retains luminous energy through the existing scene opacity');
  assert.ok(coldGap < hotFront * .05, 'fuel gaps break the contour rather than forming a continuous neon edge');
  assert.ok(hotInterior < hotFront * .10, 'aloft interior stays gaseous rather than filling the ribbons');
  assert.ok(materialLightAt(.06, .9, .9) > hotInterior, 'soft emission extends around the reaction front');
  assert.ok(materialLightAt(0, .9, .8) > materialLightAt(0, .9, .3), 'independently advected depth changes luminosity');
});

test('root body fades upward into ribbons while low-fuel roots remain attached', () => {
  for (const patch of [.1, .5, .9]) {
    const root = materialLightAt(.3, patch, .6, 0);
    const mid = materialLightAt(.3, patch, .6, .4);
    const tip = materialLightAt(.3, patch, .6, .95);
    assert.ok(root > mid && mid > tip, 'root opacity grades continuously into transparent upper ribbons');
  }
  assert.ok(materialLightAt(-.3, .1, .1, 0) > .08, 'cold roots retain a restrained luminous connection');
  assert.ok(materialLightAt(-.3, .1, .1, .95) < .001, 'cold gaps aloft stay dark');
  assert.ok(materialLightAt(.3, .9, .9, 0) > materialLightAt(.3, .1, .1, 0), 'roots retain uneven field depth');
});

test('root glow continues through the existing smooth stem envelope without changing light shaders', () => {
  const substance = createFragmentShader(resolveFooterConfig(), 'substance');
  assert.match(substance, /materialRoot \* stemEnvelope \* \(1\.0 - envelope\)/);
  assert.doesNotMatch(createFragmentShader(resolveFooterConfig()), /materialRoot/);
  assert.doesNotMatch(createFragmentShader(resolveFooterConfig({ fire: { stemStrength: 0 } }), 'substance'), /stemEnvelope|stems/);
  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const coverage = (lift: number) => {
    const launch = smoothstep(-.30, .12, lift);
    const stem = smoothstep(-.65, -.30, lift) * (1 - smoothstep(-.05, .20, lift));
    return launch + stem * (1 - launch);
  };
  assert.equal(coverage(-.65), 0);
  assert.equal(coverage(.2), 1);
  for (let lift = -.65; lift <= .2; lift += .01) {
    assert.ok(coverage(lift) >= 0 && coverage(lift) <= 1);
    assert.ok(Math.abs(coverage(lift + .0001) - coverage(lift)) < .001, 'no seam at the arc root');
  }
});

test('emission remains finite, nonnegative and bounded across the fuel field', () => {
  for (const reaction of [-1, -.3, -.035, 0, .035, .3, 1]) {
    for (const patch of [0, .2, .5, .8, 1]) {
      for (const backlight of [0, .2, .5, .8, 1]) {
        for (const lift of [-.65, -.3, 0, .4, .95]) {
          const light = materialLightAt(reaction, patch, backlight, lift);
          assert.ok(Number.isFinite(light) && light >= 0 && light <= 3.5);
        }
      }
    }
  }
});

test('site uses the image-backed field while legacy material controls remain isolated', () => {
  const scene = readFileSync(new URL('../../components/teaser/scene.tsx', import.meta.url), 'utf8');
  const hero = scene.match(/<FlameBackdrop\s([\s\S]*?)\/>/)?.[1];
  const footer = scene.match(/<FlameFooterBackdrop\s([\s\S]*?)\/>/)?.[1];
  assert.ok(hero);
  assert.ok(footer);
  assert.doesNotMatch(hero, /footerMaterial|config=/);
  assert.doesNotMatch(footer, /footerMaterial|config=/);
  const component = readFileSync(new URL('../../flame-backdrop/react/FlameBackdrop.tsx', import.meta.url), 'utf8');
  assert.match(component, /config: settings, footerMaterial/);
  assert.match(component, /\[configKey, viewportActivation, viewportThreshold, footerMaterial\]/);
});
