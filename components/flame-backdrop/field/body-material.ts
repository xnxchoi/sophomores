import type { FlameConfig } from '../config';
import { FLAME_BLEND_WEIGHTS } from './blend';
import { replaceHistoricalOnce } from './material';
import { createResponsiveEnvelopeShader } from './shader';

/** Independent, normalized lighting shapes; no new texture or reaction field. */
export const BODY_MATERIAL_PROFILE = Object.freeze({
  bodyThreshold: .1, bodyFloor: .6, bodyBacklight: .4,
  bodyWeight: .9, edgeWidth: 1.25, edgeWeight: .08,
  haloWidth: 2.6, haloWeight: .02,
});

export const ORIGINAL_MATERIAL_LIGHT = 'float materialLight = (materialEmission + materialDiffusion) * uEmissionGain + materialInterior;';
const p = BODY_MATERIAL_PROFILE;
export interface MaterialLightingWeights {
  readonly original: number;
  readonly next: number;
}

function resolveMaterialWeights(weights: MaterialLightingWeights = FLAME_BLEND_WEIGHTS.material): MaterialLightingWeights {
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
    throw new TypeError('Material weights require a normalized original/next pair.');
  }
  const { original, next } = weights;
  if (![original, next].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)
    || original + next !== 1) {
    throw new RangeError('Material weights must be finite, nonnegative and sum to one.');
  }
  return { original, next };
}

function glslWeight(value: number): string {
  const fixed = value.toFixed(2);
  return Number(fixed) === value ? fixed : String(value);
}

/** Keep OG radiance exact. NG's normalized sum cannot exceed the existing gain. */
export function createBodyMaterialBlock(weights?: MaterialLightingWeights): string {
  const w = resolveMaterialWeights(weights);
  return `float materialLightOG = (materialEmission + materialDiffusion) * uEmissionGain + materialInterior;
  float materialBody = smoothstep(0.0, ${p.bodyThreshold}, reaction) * materialFuel
    * (${p.bodyFloor} + ${p.bodyBacklight} * materialBacklight) * ${p.bodyWeight};
  float materialEdge = flameFront(reaction, softness * ${p.edgeWidth}) * materialFuel
    * (${p.bodyFloor} + ${p.bodyBacklight} * materialBacklight) * ${p.edgeWeight};
  float materialHalo = flameFront(reaction, softness * ${p.haloWidth})
    * materialFuel * materialBacklight * ${p.haloWeight};
  float materialLightNG = clamp(materialBody + materialEdge + materialHalo, 0.0, 1.0) * uEmissionGain;
  float materialLight = materialLightOG * ${glslWeight(w.original)} + materialLightNG * ${glslWeight(w.next)};`;
}

export const BODY_MATERIAL_GLSL = createBodyMaterialBlock();

/** Single-statement surgery makes source drift fail closed and surface preservation testable. */
export function createBodyMaterialShader(config: FlameConfig, weights?: MaterialLightingWeights): string {
  return replaceHistoricalOnce(createResponsiveEnvelopeShader(config), ORIGINAL_MATERIAL_LIGHT, createBodyMaterialBlock(weights));
}

interface LightingSample {
  readonly reaction: number;
  readonly softness: number;
  readonly fuel: number;
  readonly backlight: number;
  readonly emissionGain: number;
}

function smoothstep(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/** CPU mirror of canonical OG and the shared frozen NG profile for diagnostic sampling. */
export function sampleBodyMaterialLighting(input: LightingSample, weights?: MaterialLightingWeights) {
  const w = resolveMaterialWeights(weights);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Body lighting requires a finite lighting sample.');
  }
  const { reaction, softness, fuel, backlight, emissionGain } = input;
  if (![reaction, softness, fuel, backlight, emissionGain].every(value => typeof value === 'number' && Number.isFinite(value))
    || softness <= 0 || fuel < 0 || fuel > 1 || backlight < 0 || backlight > 1 || emissionGain < 0) {
    throw new RangeError('Body lighting requires finite reaction, positive softness, normalized fuel/backlight and nonnegative gain.');
  }
  const front = (width: number) => Math.exp(-((reaction / (softness * width)) ** 2));
  const emission = front(.85 + .55 * backlight) * (.24 + .95 * backlight) * fuel;
  const diffusion = front(2.6) * .22 * smoothstep(.18, .72, backlight) * (.25 + .75 * fuel);
  const interior = smoothstep(softness * .7, softness * 3.5, reaction) * .055 * fuel * backlight;
  const original = (emission + diffusion) * emissionGain + interior;
  const body = smoothstep(0, p.bodyThreshold, reaction) * fuel * (p.bodyFloor + p.bodyBacklight * backlight) * p.bodyWeight;
  const edge = front(p.edgeWidth) * fuel * (p.bodyFloor + p.bodyBacklight * backlight) * p.edgeWeight;
  const halo = front(p.haloWidth) * fuel * backlight * p.haloWeight;
  const next = Math.max(0, Math.min(1, body + edge + halo)) * emissionGain;
  return { original, next, blended: original * w.original + next * w.next, body, edge, halo };
}
