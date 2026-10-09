import {
  type FlameConfig,
  linearColor,
  PALETTES,
  PRISM_BANDS,
  RINGS
} from "./config";

const f = (value: number) =>
  Number.isInteger(value) ? `${value}.0` : `${value}`;
const vec = (values: readonly number[]) => `vec3(${values.map(f).join(",")})`;
// Weight strength * pigment together in linear light; mixing them separately creates cross terms.
const paletteFunction = () =>
  RINGS.map(
    (_, index) => `
  if (index == ${index}) return ${PALETTES.map(
    (palette, i) =>
      `uPaletteWeights.${"rgb"[i]} * ${f(palette.strength)} * mix(${vec(palette.colors[index][0])}, ${vec(palette.colors[index][1])}, blend)`
  ).join(" + ")};`
  ).join("");
const ringCalls = () =>
  RINGS.map(
    (ring, i) => `
  layer(${i}, ${[ring.inner, ring.outer, ring.offset, ring.spin, ring.breath, ring.cycles, ring.phase].map(f).join(",")},
    radius, theta, phase, pointer, spread, color, density, bodySum, sourceDensity, sourceSum, densityA, sumA, densityB, sumB);`
  ).join("");
const meanRadius = () =>
  RINGS.map(
    (ring) =>
      `radiusAt(${[ring.offset, ring.spin, ring.breath, ring.cycles, ring.phase].map(f).join(",")}, theta, phase)`
  ).join(" + ");

/** A seamless advected fuel field: luminous reaction fronts, almost no body or smoke. */
const fireFunctions = (
  fire: FlameConfig["fire"],
  ignition: FlameConfig["ignition"]
) => `
float flameHash(float x, float y) {
  x = mod(x, 64.0);
  y = mod(y, 8.0);
  return fract(sin(x * 127.1 + y * 311.7) * 43758.5453);
}
float flameNoise(float x, float y) {
  float ix = floor(x), iy = floor(y);
  float fx = fract(x), fy = fract(y);
  float sx = fx * fx * (3.0 - 2.0 * fx), sy = fy * fy * (3.0 - 2.0 * fy);
  float bottom = mix(flameHash(ix, iy), flameHash(ix + 1.0, iy), sx);
  float top = mix(flameHash(ix, iy + 1.0), flameHash(ix + 1.0, iy + 1.0), sx);
  return mix(bottom, top, sy);
}
float flameReaction(float x, float lift, float phase) {
  float travel = phase / 6.283185307179586 * ${f(fire.flowCycles)} * 8.0;
  float curl = ${f(fire.curlAmount)};
  float frequency = ${f(fire.plumeFrequency)};
  float warpX = flameNoise(x * 3.1, lift * .55 - travel) - .5;
  float warpY = flameNoise(x * 2.2 + 17.4, lift * .65 - travel + 3.3) - .5;
  float qx = x * frequency * .48 + warpX * curl * 1.15;
  float qy = lift * .85 - travel + warpY * curl * .75;
  float fuel = .80 * flameNoise(qx, qy)
    + .20 * flameNoise(qx * 2.0 + 11.3, qy * 2.0 + 4.7);
  float threshold = .32 + .42 * max(0.0, lift)
    + .06 * (flameNoise(x * 2.4 + 13.2, -travel) - .5);
  return fuel - threshold;
}
float flameFront(float reaction, float softness) {
  float distance = reaction / softness;
  return exp(-distance * distance);
}
${
  ignition.enabled
    ? `float flameIgnition(float x, float lift, float progress) {
  if (progress <= 0.0) return 0.0;
  if (progress >= 1.0) return 1.0;
  float arrival = min(1.0, abs(x)) * ${f(ignition.sweepFraction)};
  float riseDelay = smoothstep(-.35, 1.25, lift) * .18 * ${f(1 - ignition.sweepFraction)};
  float local = (progress - arrival - riseDelay) / ${f(1 - ignition.sweepFraction)};
  float lit = smoothstep(0.0, .65, local);
  float bloomDistance = (local - .65) / .18;
  float bloom = .22 * exp(-bloomDistance * bloomDistance) * (1.0 - progress);
  return lit * (1.0 + bloom);
}
`
    : ""
}vec3 alcoholFlame(vec2 point, float ringRadius, float phase, float pointer) {
  float height = ${f(fire.plumeHeight)};
  float rootY = sqrt(max(0.0, ringRadius * ringRadius - point.x * point.x));
  float lift = (point.y - rootY) / height;
  float x = point.x / ringRadius;
  float launch = smoothstep(-.30, .12, lift);
  float dissolve = 1.0 - smoothstep(.65, 1.35, lift);
  float shoulders = 1.0 - smoothstep(.85, 1.04, abs(x));
  float crown = smoothstep(0.0, .18, point.y / ringRadius);
  float envelope = launch * dissolve * shoulders * crown;
${
  fire.stemStrength > 0
    ? `  float stemEnvelope = smoothstep(-.65, -.30, lift) * (1.0 - smoothstep(-.05, .20, lift)) * shoulders * crown;
`
    : ""
}  if (${fire.stemStrength > 0 ? "max(envelope, stemEnvelope)" : "envelope"} < .0001) return vec3(0.0);
  float reaction = flameReaction(x, lift, phase);
  float softness = ${f(fire.frontSoftness)} + min(.030, .30 * uCssPixel / height) + .012 * pointer;
  float edge = flameFront(reaction, softness);
  float halo = flameFront(reaction, softness * 2.2) * .060;
  float body = smoothstep(0.0, .25, reaction) * ${f(fire.bodyOpacity)};
${
  fire.stemStrength > 0
    ? `  float stemTravel = phase / 6.283185307179586 * ${f(fire.flowCycles)} * 8.0;
  float stemGate = smoothstep(-.04, .20, reaction) * (.35 + .65 * flameNoise(x * ${f(fire.plumeFrequency)} * .7, -stemTravel - lift * 1.2));
  float stems = stemGate * stemEnvelope * ${f(fire.stemStrength)};
`
    : ""
}  float tip = smoothstep(.05, .95, lift);
${
  fire.colorCycleSeconds > 0
    ? `  float hueCycle = .5 - .5 * cos(uColorTime * 6.283185307179586 / ${f(fire.colorCycleSeconds)});
  vec3 cycleBase = mix(${vec(linearColor(fire.baseColor))}, ${vec(linearColor(fire.alternateBaseColor))}, hueCycle);
  vec3 cycleTip = mix(${vec(linearColor(fire.tipColor))}, ${vec(linearColor(fire.alternateTipColor))}, hueCycle);
  vec3 dedicatedTint = mix(cycleBase, cycleTip, tip);`
    : `  vec3 dedicatedTint = mix(${vec(linearColor(fire.baseColor))}, ${vec(linearColor(fire.tipColor))}, tip);`
}
  vec3 paletteTint = mix(paletteColor(3, .5), paletteColor(1, .5), tip);
  vec3 tint = mix(paletteTint, dedicatedTint, ${f(fire.warmth)});
  return tint * ${fire.stemStrength > 0 ? "((edge + halo + body) * envelope + stems)" : "(edge + halo + body) * envelope"} * (.22 + .06 * pointer) * ${f(fire.intensity)};
}
`;

export const vertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * .5 + .5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/** Build once per configuration change; animation and palette blending remain uniforms. */
export function createFragmentShader(config: FlameConfig): string {
  const {
    visual,
    pointer: pointerConfig,
    prism,
    motion,
    fire,
    composition,
    ignition
  } = config;
  const hasFire = fire.intensity > 0;
  return `
precision highp float;
varying vec2 vUv;
uniform vec2 uScale;
uniform vec2 uOrigin;
uniform float uTime;
${hasFire && ignition.enabled ? "uniform float uIgnitionProgress;\n" : ""}${hasFire && fire.colorCycleSeconds > 0 ? "uniform float uColorTime;\n" : ""}uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uChromatic;
uniform float uCssPixel;
uniform vec3 uPaletteWeights;

vec3 paletteColor(int index, float blend) {
  ${paletteFunction()}
  return vec3(0.0);
}

float radiusAt(float offset, float spin, float breath, float cycles, float phaseOffset, float theta, float phase) {
  float local = theta - spin * phase + phaseOffset;
  return ${f(visual.ringRadius)} + offset + .009 * sin(2.0 * local + .6)
    + .004 * cos(3.0 * local + 1.7) + .002 * sin(5.0 * local)
    + breath * ${f(visual.breathingAmount)} * sin(cycles * phase + phaseOffset);
}

// Mirrors pointerWeightAt: one animated centerline focus, not a cursor-centered disk.
float pointerWeightAt(vec2 point, float phase) {
  float pointerRadius = length(uPointer);
  if (uPointerStrength <= 0.0 || pointerRadius < .000001) return 0.0;
  float theta = atan(uPointer.y, uPointer.x);
  float ringRadius = (${meanRadius()}) / ${f(RINGS.length)};
  float proximity = 1.0 - smoothstep(0.0, ${f(pointerConfig.proximityRadius)}, abs(pointerRadius - ringRadius));
  vec2 axis = uPointer / pointerRadius;
  vec2 offset = point - axis * ringRadius;
  vec2 local = vec2(dot(offset, axis) / ${f(pointerConfig.radialRadius)},
    dot(offset, vec2(-axis.y, axis.x)) / ${f(pointerConfig.tangentRadius)});
  float focus = 1.0 - smoothstep(0.0, 1.0, length(local));
  return proximity * proximity * focus * focus * uPointerStrength;
}

vec3 profile(vec3 distance, float inner, float outer) {
  vec3 inward = max(vec3(0.0), -distance) / inner;
  vec3 outward = max(vec3(0.0), distance) / outer;
  return exp(-inward * inward - outward * outward);
}
vec3 prismSource(vec3 density) {
  vec3 white = .72 * ${f(visual.overlapWhitening)} * (1.0 - exp(-.8 * density * density));
  return white * smoothstep(vec3(${f(prism.gateLow)}), vec3(${f(prism.gateHigh)}), white);
}
${hasFire ? fireFunctions(fire, ignition) : ""}
void layer(int index, float innerBase, float outerBase, float offset,
  float spin, float breath, float cycles, float phaseOffset,
  float radius, float theta, float phase, float pointer, float spread,
  inout vec3 color, inout vec3 density, inout vec3 bodySum,
  inout float sourceDensity, inout float sourceSum,
  inout vec3 densityA, inout vec3 sumA, inout vec3 densityB, inout vec3 sumB) {
  float local = theta - spin * phase + phaseOffset;
  float ringRadius = radiusAt(offset, spin, breath, cycles, phaseOffset, theta, phase);
  float lower = pow(.5 + .5 * cos(theta + 2.1), 2.0);
  float inner = ${f(visual.ringThickness)} * innerBase * (.60 + .48 * lower + .15 * cos(local + .8));
  float outer = ${f(visual.ringThickness)} * outerBase * (.85 + .15 * cos(local - .7));
  float intensity = .11 + .70 * pow(.5 + .5 * cos(local - .3), 3.0);
  ${hasFire ? `float rim = ${f(fire.rimStrength)};` : ""}
  float leakAxis = -2.1 + .24 * sin(2.0 * phase + phaseOffset);
  float leak = pow(.5 + .5 * cos(theta - leakAxis), 3.0);
  float pulse = breath > 0.0 ? .5 + .5 * sin(cycles * phase + phaseOffset) : .5;
  float veilInner = .025 + leak * (.085 + .100 * pulse);
  float veilStrength = (.055 + leak * (.19 + .12 * pulse)) * ${f(visual.inwardLeakAmount)};
  // Reuse this ring geometry for six cheap wavelength profiles plus its neutral source.
  // Branching here keeps chromatic-off free of the additional exponential work.
  if (uChromatic * ${prism.enabled ? "1.0" : "0.0"} > .5) {
    float distance = radius - ringRadius;
    float sourceBody = profile(vec3(distance), inner, outer).g * intensity${hasFire ? " * rim" : ""};
    sourceDensity += sourceBody * sourceSum;
    sourceSum += sourceBody;
    vec3 bodyA = profile(vec3(distance) - ${vec(PRISM_BANDS.slice(0, 3).map((band) => band.offset))} * spread, inner, outer) * intensity${hasFire ? " * rim" : ""};
    vec3 bodyB = profile(vec3(distance) - ${vec(PRISM_BANDS.slice(3).map((band) => band.offset))} * spread, inner, outer) * intensity${hasFire ? " * rim" : ""};
    densityA += bodyA * sumA; sumA += bodyA;
    densityB += bodyB * sumB; sumB += bodyB;
  }
  // Direct signed-distance field widening, not a filter over a pre-rendered image.
  inner *= 1.0 + pointer * ${f(pointerConfig.inwardExpansion)};
  outer *= 1.0 + pointer * ${f(pointerConfig.outwardExpansion)};
  veilInner += pointer * ${f(pointerConfig.veilReach)};
  veilStrength += pointer * ${f(pointerConfig.veilStrength)};
  vec3 split = vec3(-1.0, 0.0, 1.0) * ${f(prism.nativeSplit)} * (.7 + .3 * cos(theta - phase));
  vec3 distance = vec3(radius - ringRadius) + split;
  vec3 body = profile(distance, inner, outer);
  vec3 diffusion = profile(distance, veilInner, outer * 3.5 / ${f(visual.ringThickness)});
  vec3 field = (body * .78 + diffusion * veilStrength * (1.0 - exp(-pow(radius / .13, 2.0)))) * intensity${hasFire ? " * rim" : ""};
  vec3 pigment = paletteColor(index, .5 + .5 * cos(local));
  ${hasFire ? `pigment = mix(pigment, ${vec(linearColor(fire.baseColor))}, ${f(fire.warmth)});` : ""}
  color += field * pigment;
  vec3 weightedBody = body * intensity${hasFire ? " * rim" : ""};
  ${""}
  density += weightedBody * bodySum;
  bodySum += weightedBody;
}

vec3 shade(float radius, float theta, float phase, float pointer) {
  vec3 color = ${vec(linearColor(visual.backgroundColor))};
  vec3 density = vec3(0.0), bodySum = vec3(0.0);
  float sourceDensity = 0.0, sourceSum = 0.0;
  vec3 densityA = vec3(0.0), sumA = vec3(0.0), densityB = vec3(0.0), sumB = vec3(0.0);
  float weight = clamp(pointer, 0.0, 1.0);
  float spread = ${f(prism.spread)} + weight * ${f(prism.pointerSpread)};
  ${ringCalls()}
  vec3 overlapWhite = .72 * ${f(visual.overlapWhitening)} * (1.0 - exp(-.8 * density * density));
  vec3 white = (.96 - color) * overlapWhite;
  if (uChromatic * ${prism.enabled ? "1.0" : "0.0"} > .5) {
    vec3 sourceA = prismSource(densityA), sourceB = prismSource(densityB);
    float source = prismSource(vec3(sourceDensity)).g;
    vec3 spectral = ${PRISM_BANDS.map((band, i) => `${vec(band.weight)} * source${i < 3 ? "A" : "B"}.${"rgb"[i % 3]}`).join(" + ")};
    float fraction = ${f(prism.amount)} + weight * ${f(prism.pointerAmount)};
    // Only redistribute the additive neutral part; retain pigment * (1 - overlapWhite).
    vec3 neutral = .96 * overlapWhite;
    float neutralBudget = min(neutral.r, min(neutral.g, neutral.b));
    float neutralGain = source > .000001 ? min(.96, neutralBudget / source) : .96;
    vec3 removed = min(neutral, vec3(source * neutralGain * fraction));
    color += white - removed + spectral * neutralGain * fraction;
  } else {
    color += white;
  }
${hasFire ? `  color += alcoholFlame(vec2(cos(theta), sin(theta)) * radius, ${f(visual.ringRadius)}, phase, weight);\n` : ""}${
    hasFire && ignition.enabled
      ? `  vec2 ignitionPoint = vec2(cos(theta), sin(theta)) * radius;
  float ignitionRoot = sqrt(max(0.0, ${f(visual.ringRadius * visual.ringRadius)} - ignitionPoint.x * ignitionPoint.x));
  float ignitionGain = flameIgnition(ignitionPoint.x / ${f(visual.ringRadius)}, (ignitionPoint.y - ignitionRoot) / ${f(fire.plumeHeight)}, uIgnitionProgress);
  color = ${vec(linearColor(visual.backgroundColor))} + (color - ${vec(linearColor(visual.backgroundColor))}) * ignitionGain;
`
      : ""
  }  color = ${vec(linearColor(visual.backgroundColor))} + (color - ${vec(linearColor(visual.backgroundColor))}) * ${f(visual.brightness)};
  vec3 excess = max(vec3(0.0), color - .85);
  return color - excess + .15 * (1.0 - exp(-excess / .15));
}

float toSrgb(float value) {
  return value <= .0031308 ? value * 12.92 : 1.055 * pow(value, 1.0 / 2.4) - .055;
}
void main() {
  vec2 p = (vUv - .5) * uScale - uOrigin;
  ${
    composition.mode === "ring"
      ? `if (abs(p.x) > .5 || abs(p.y) > .5) {
    vec3 background = ${vec(linearColor(visual.backgroundColor))};
    gl_FragColor = vec4(toSrgb(background.r), toSrgb(background.g), toSrgb(background.b), 1.0);
    return;
  }`
      : ""
  }
  float radius = length(p);
  float theta = radius > .000001 ? atan(p.y, p.x) : 0.0;
  float phase = uTime * 6.283185307179586 / ${f(motion.loopSeconds)};
  float pointer = ${pointerConfig.enabled ? "1.0" : "0.0"} * pointerWeightAt(p, phase) * smoothstep(.09, .18, radius);
  vec3 linear = shade(radius, theta, phase, pointer);
  ${
    composition.mode === "footer"
      ? `
  // Let lifted tips dissolve before the canvas ends, never form a clipped ceiling.
  float topFade = smoothstep(0.0, .06, 1.0 - vUv.y);
  linear = mix(${vec(linearColor(visual.backgroundColor))}, linear, topFade);
  `
      : ""
  }
  gl_FragColor = vec4(toSrgb(linear.r), toSrgb(linear.g), toSrgb(linear.b), 1.0);
}`;
}
