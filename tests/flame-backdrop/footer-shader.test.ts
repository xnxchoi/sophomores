import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linearColor, resolveFlameConfig } from '../../components/flame-backdrop/config';
import { createFragmentShader } from '../../components/flame-backdrop/shaders';

test('zero fire intensity omits all fire geometry and keeps the approved ring shader', () => {
  const original = createFragmentShader(resolveFlameConfig());
  const disabled = createFragmentShader(resolveFlameConfig({
    fire: { intensity: 0, plumeHeight: .15, plumeFrequency: 13, flowCycles: 5, warmth: 1,
      baseColor: '#FFFFFF', tipColor: '#000000' },
  }));
  assert.equal(disabled, original);
  assert.doesNotMatch(original, /firePlume|firePigment|fireField|flameNoise|alcoholFlame/);
});

test('footer coordinates use the renderer origin and do not square-clip rising tips', () => {
  const ring = createFragmentShader(resolveFlameConfig());
  const footer = createFragmentShader(resolveFlameConfig({ composition: { mode: 'footer' } }));
  assert.match(footer, /uniform vec2 uOrigin/);
  assert.match(footer, /\(vUv - \.5\) \* uScale - uOrigin/);
  assert.match(ring, /if \(abs\(p.x\) > \.5 \|\| abs\(p.y\) > \.5\)/);
  assert.doesNotMatch(footer, /if \(abs\(p.x\) > \.5/);
});

test('only the footer softly fades escaping plume tips into its top background', () => {
  const ring = createFragmentShader(resolveFlameConfig());
  const footer = createFragmentShader(resolveFlameConfig({ composition: { mode: 'footer' } }));
  assert.doesNotMatch(ring, /float topFade/);
  assert.match(footer, /float topFade = smoothstep\(0\.0, \.06, 1\.0 - vUv.y\)/);
  assert.match(footer, /linear = mix\(vec3\([^;]+linear, topFade\)/);
});

test('fire is one shared reaction-front field rather than per-ring sine ridges or strands', () => {
  const source = createFragmentShader(resolveFlameConfig({ fire: { intensity: 1 } }));
  assert.match(source, /float flameReaction/);
  assert.match(source, /float flameNoise/);
  assert.equal((source.match(/color \+= alcoholFlame\(/g) ?? []).length, 1);
  const layer = source.split('void layer(')[1].split('vec3 shade(')[0];
  assert.doesNotMatch(layer, /alcoholFlame|flameReaction|flameNoise/);
  assert.doesNotMatch(source, /sampler|texture2D|fireFold|firePlume|emitter|centerX|fireLife/);
  assert.doesNotMatch(source, /undefined|NaN|Infinity/);
});

test('all fire controls compile into the field and preserve palette selection', () => {
  const source = createFragmentShader(resolveFlameConfig({
    fire: { intensity: .8, plumeHeight: .123, plumeFrequency: 11, flowCycles: 3, warmth: .63, curlAmount: .82, rimStrength: .36,
      baseColor: '#155BFF', tipColor: '#5CBFFF', frontSoftness: .075, bodyOpacity: .04 },
  }));
  assert.match(source, /3\.0 \* 8\.0/);
  assert.match(source, /float height = 0\.123/);
  assert.match(source, /11\.0/);
  assert.match(source, /\* 0\.8/);
  assert.match(source, /mix\(paletteTint, dedicatedTint, 0\.63\)/);
  assert.match(source, /vec3 pigment = paletteColor/);
  assert.match(source, /uPaletteWeights/);
  assert.match(source, /float curl = 0\.82/);
  assert.match(source, /float rim = 0\.36/);
  assert.equal((source.match(/\* intensity \* rim/g) ?? []).length, 5);
  for (const hex of ['#155BFF', '#5CBFFF']) assert.ok(source.includes(linearColor(hex).join(',')));
  assert.match(source, /softness[^;]+pointer/);
  assert.match(source, /float softness = 0\.075/);
  assert.match(source, /float body = smoothstep\(0\.0, \.25, reaction\) \* 0\.04/);
});

test('reaction contours are hollow, periodic, finite, and change topology over time', () => {
  const source = createFragmentShader(resolveFlameConfig({ fire: { intensity: 1 } }));
  const helpers = ['flameHash', 'flameNoise', 'flameReaction', 'flameFront'].map(name => {
    const fn = source.match(new RegExp(`float ${name}\\(([^)]*)\\) \\{([^}]+)\\}`));
    assert.ok(fn, name);
    return `function ${name}(${fn[1].replace(/float /g, '')}) {${fn[2].replace(/float /g, 'let ')}}`;
  }).join('\n');
  const generated = new Function('sin', 'exp', 'floor', 'fract', 'mod', 'mix', 'max',
    `${helpers}; return {noise:flameNoise, reaction:flameReaction, front:flameFront};`)(
    Math.sin, Math.exp, Math.floor, (v: number) => v - Math.floor(v),
    (a: number, b: number) => a - b * Math.floor(a / b),
    (a: number, b: number, t: number) => a * (1 - t) + b * t, Math.max) as {
      noise: (x: number, y: number) => number;
      reaction: (x: number, lift: number, phase: number) => number;
      front: (reaction: number, softness: number) => number;
    };
  assert.equal(generated.front(0, .04), 1);
  assert.ok(generated.front(.3, .04) < .00001, 'interior stays almost dark, not opaque fill');
  assert.ok(generated.front(-.3, .04) < .00001);
  let changing = 0;
  let signChanges = 0;
  for (let ix = 0; ix < 15; ix++) for (let iy = 0; iy < 10; iy++) {
    const x = -.95 + ix * .13, y = -.2 + iy * .13;
    const noise = generated.noise(x, y);
    assert.ok(noise >= 0 && noise <= 1);
    assert.ok(Math.abs(noise - generated.noise(x, y + 8)) < 1e-12);
    const start = generated.reaction(x, y, 0), later = generated.reaction(x, y, .7);
    assert.ok(Number.isFinite(start));
    assert.ok(Math.abs(start - generated.reaction(x, y, Math.PI * 2)) < 1e-10);
    if (Math.abs(start - later) > .05) changing++;
    if (Math.sign(start) !== Math.sign(later)) signChanges++;
  }
  assert.ok(changing > 70, `${changing} of 150 field samples visibly change`);
  assert.ok(signChanges > 20, `${signChanges} of 150 cells ignite or extinguish`);
});

test('stems are optional noise-gated downward connections, not a continuous bright arc', () => {
  const base = createFragmentShader(resolveFlameConfig({ fire: { intensity: 1 } }));
  const stems = createFragmentShader(resolveFlameConfig({ fire: { intensity: 1, stemStrength: .1 } }));
  assert.doesNotMatch(base, /float stemEnvelope/);
  assert.match(stems, /float stemEnvelope/);
  assert.match(stems, /float stemGate = smoothstep/);
  assert.match(stems, /flameNoise\(/);
  assert.match(stems, /stemGate \* stemEnvelope \* 0\.1/);
});

test('hue cycle starts in the selected blue, reaches alternate hue, and closes independently', () => {
  const source = createFragmentShader(resolveFlameConfig({ fire: { intensity: 1, colorCycleSeconds: 32,
    alternateBaseColor: '#167D84', alternateTipColor: '#65BDD0' } }));
  const expression = source.match(/float hueCycle = ([^;]+);/)?.[1];
  assert.ok(expression);
  const cycle = new Function('uColorTime', 'cos', `return ${expression}`) as (t: number, cosine: typeof Math.cos) => number;
  assert.equal(cycle(0, Math.cos), 0);
  assert.equal(cycle(16, Math.cos), 1);
  assert.equal(cycle(32, Math.cos), 0);
  assert.ok(source.includes(linearColor('#167D84').join(',')));
  assert.match(source, /uniform float uColorTime/);
  assert.doesNotMatch(createFragmentShader(resolveFlameConfig({ fire: { intensity: 1 } })), /float hueCycle/);
});

test('ignition is center-out spatial onset with exact off and neutral fully-lit endpoints', () => {
  const source = createFragmentShader(resolveFlameConfig({ fire: { intensity: 1 }, ignition: { enabled: true } }));
  assert.match(source, /uniform float uIgnitionProgress/);
  const fn = source.match(/float flameIgnition\(([^)]*)\) \{([\s\S]+?)\n\}/);
  assert.ok(fn);
  const onset = new Function('x', 'lift', 'progress', 'abs', 'min', 'max', 'exp', 'smoothstep',
    fn[2].replace(/float /g, 'let ')) as (...args: unknown[]) => number;
  const smooth = (a: number, b: number, value: number) => {
    const t = Math.min(1, Math.max(0, (value - a) / (b - a))); return t * t * (3 - 2 * t);
  };
  const sample = (x: number, progress: number, lift = .1) => onset(x, lift, progress, Math.abs, Math.min, Math.max, Math.exp, smooth);
  for (const x of [-1, -.5, 0, .5, 1]) {
    assert.equal(sample(x, 0), 0);
    assert.equal(sample(x, 1), 1);
  }
  assert.ok(sample(0, .25) > sample(.9, .25), 'center ignites before shoulders');
  assert.ok(sample(0, .25, 0) > sample(0, .25, 1), 'roots ignite before upper membranes');
  assert.doesNotMatch(createFragmentShader(resolveFlameConfig()), /uIgnitionProgress|flameIgnition/);
});
