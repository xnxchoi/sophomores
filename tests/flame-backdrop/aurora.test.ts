import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { AURORA_MOTION_GLSL } from '../../components/flame-backdrop/aurora';
import { resolveFlameConfig } from '../../components/flame-backdrop/config';
import { resolveFooterConfig } from '../../components/flame-backdrop/FlameFooterBackdrop';
import { FOOTER_SUBSTANCE_GLSL } from '../../components/flame-backdrop/footer-material';
import { createFragmentShader } from '../../components/flame-backdrop/shaders';

const hash = (source: string) => createHash('sha256').update(source).digest('hex');
const smoothstep = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const functions = new Function('smoothstep', 'sin',
  `${AURORA_MOTION_GLSL.replace(/float (\w+)\(([^)]*)\)/g, (_, name: string, args: string) =>
    `function ${name}(${args.replace(/float /g, '')})`).replace(/\bfloat\b/g, 'const')}
return { auroraEntry, auroraRise, auroraDrift };`)(smoothstep, Math.sin) as {
  auroraEntry: (progress: number) => number;
  auroraRise: (progress: number) => number;
  auroraDrift: (x: number, phase: number) => number;
};

test('hybrid reuses original reaction, noise and complete substance material instead of replacing the ribbons', () => {
  const source = createFragmentShader(resolveFooterConfig(), 'aurora');
  const original = createFragmentShader(resolveFooterConfig({ ignition: { enabled: false } }), 'substance');
  for (const name of ['flameHash', 'flameNoise', 'flameReaction', 'flameFront', 'alcoholFlame']) {
    const functionPattern = new RegExp(`(?:float|vec3) ${name}\\([^]*?\\n\\}`);
    assert.ok(original.match(functionPattern), `${name} exists in the original shader`);
    assert.equal(source.match(functionPattern)?.[0], original.match(functionPattern)?.[0]);
  }
  assert.ok(source.includes(FOOTER_SUBSTANCE_GLSL));
  assert.doesNotMatch(source, /auroraCurtain|nearCurtain|middleCurtain|farCurtain/);
});

test('legacy variants remain byte-identical and hybrid is restricted to an emitting footer', () => {
  assert.equal(hash(createFragmentShader(resolveFlameConfig())), '2bba88c4e00f1aa9cf367df36bb9205a58f39b954977534fdd42f316d848e2f5');
  assert.equal(hash(createFragmentShader(resolveFooterConfig())), '1f63467aeaa1837b02e0629bdbeed2f1a779a9a0b4a4c701cd6e29d24eb835ac');
  assert.equal(hash(createFragmentShader(resolveFooterConfig(), 'substance')), '9b510e5a216e61fb43134e63d889eb1383d2cb888b4aa2bf0cc30e6b7c6cd981');
  for (const config of [resolveFlameConfig(), resolveFlameConfig({ fire: { intensity: 1 } }), resolveFooterConfig({ fire: { intensity: 0 } })]) {
    assert.equal(createFragmentShader(config, 'aurora'), createFragmentShader(config));
  }
});

test('original ribbon field rises together with no separate anchored stems and begins fully dark', () => {
  const source = createFragmentShader(resolveFooterConfig(), 'aurora');
  assert.match(source, /p\.y -= uScale\.y \* \(auroraRise/);
  assert.ok(source.indexOf('p.y -=') < source.indexOf('float radius = length(p)'));
  assert.match(source, /linear = .* \+ \(linear - .*\) \* auroraEntry\(uIgnitionProgress\)/);
  assert.doesNotMatch(source, /flameIgnition|footerIgnitionHeight/);
  assert.equal(functions.auroraEntry(0), 0);
  assert.equal(functions.auroraEntry(1), 1);
  assert.equal(functions.auroraRise(0), 0);
  assert.equal(functions.auroraRise(1), .15);
  for (let i = 0; i < 100; i++) {
    assert.ok(functions.auroraRise((i + 1) / 100) >= functions.auroraRise(i / 100));
  }
});

test('drift is modest, seamless and nonuniform; entry endpoints have no jumps', () => {
  for (let i = 0; i < 10000; i++) {
    const x = (i % 101) / 100;
    const phase = (i % 97) / 97 * Math.PI * 2;
    const drift = functions.auroraDrift(x, phase);
    assert.ok(Number.isFinite(drift) && Math.abs(drift) <= .015);
    assert.ok(Math.abs(functions.auroraDrift(x, phase + 2 * Math.PI) - drift) < 1e-12);
  }
  assert.notEqual(functions.auroraDrift(.1, 0), functions.auroraDrift(.9, 0));
  assert.ok(functions.auroraRise(.00001) < 1e-8);
  assert.ok(.15 - functions.auroraRise(.99999) < 1e-8);
});

test('ambient contribution is restrained and shares the existing palette and clocks', () => {
  const source = createFragmentShader(resolveFooterConfig(), 'aurora');
  assert.match(source, /auroraAtmosphere/);
  assert.match(source, /return tint \* field \* \.018/);
  assert.match(source, /exp\(-distance \* distance\)/);
  assert.doesNotMatch(source, /sampler|texture2D|undefined|NaN|Infinity/);
  const still = createFragmentShader(resolveFooterConfig({ ignition: { enabled: false }, fire: { colorCycleSeconds: 0 } }), 'aurora');
  assert.doesNotMatch(still, /uIgnitionProgress|uColorTime/);
  assert.match(still, /auroraRise\(1\.0\)/);
});
