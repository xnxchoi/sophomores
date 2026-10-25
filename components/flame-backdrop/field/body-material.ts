import { MathUtils } from "three";
import { FLAME_APPEARANCE } from "../appearance";
import type { FlameConfig } from "../config";
import { FLAME_BLEND_WEIGHTS } from "./blend";
import { replaceHistoricalOnce } from "./material";
import { createResponsiveEnvelopeShader } from "./shader";

/** Compatibility name for the one editable profile; independent gains are clamped after summing. */
export const BODY_MATERIAL_PROFILE = FLAME_APPEARANCE.bodyMaterial;

export const ORIGINAL_MATERIAL_LIGHT =
  "float materialLight = (materialEmission + materialDiffusion) * uEmissionGain + materialInterior;";
const p = BODY_MATERIAL_PROFILE;
const originalProfile = FLAME_APPEARANCE.originalMaterial;
export interface MaterialLightingWeights {
  readonly original: number;
  readonly next: number;
}

function resolveMaterialWeights(
  weights: MaterialLightingWeights = FLAME_BLEND_WEIGHTS.material
): MaterialLightingWeights {
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    throw new TypeError(
      "Material weights require a normalized original/next pair."
    );
  }
  const { original, next } = weights;
  if (
    ![original, next].every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1
    ) ||
    original + next !== 1
  ) {
    throw new RangeError(
      "Material weights must be finite, nonnegative and sum to one."
    );
  }
  return { original, next };
}

function glslWeight(value: number): string {
  const fixed = value.toFixed(2);
  return Number(fixed) === value ? fixed : String(value);
}

/** Keep OG radiance exact. NG's final clamp, not normalized profile weights, bounds its radiance. */
export function createBodyMaterialBlock(
  weights?: MaterialLightingWeights
): string {
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
export function createBodyMaterialShader(
  config: FlameConfig,
  weights?: MaterialLightingWeights
): string {
  return replaceHistoricalOnce(
    createResponsiveEnvelopeShader(config),
    ORIGINAL_MATERIAL_LIGHT,
    createBodyMaterialBlock(weights)
  );
}

interface LightingSample {
  readonly reaction: number;
  readonly softness: number;
  readonly fuel: number;
  readonly backlight: number;
  readonly emissionGain: number;
}

/** CPU mirror of canonical OG and the shared frozen NG profile for diagnostic sampling. */
export function sampleBodyMaterialLighting(
  input: LightingSample,
  weights?: MaterialLightingWeights
) {
  const w = resolveMaterialWeights(weights);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Body lighting requires a finite lighting sample.");
  }
  const { reaction, softness, fuel, backlight, emissionGain } = input;
  if (
    ![reaction, softness, fuel, backlight, emissionGain].every(
      (value) => typeof value === "number" && Number.isFinite(value)
    ) ||
    softness <= 0 ||
    fuel < 0 ||
    fuel > 1 ||
    backlight < 0 ||
    backlight > 1 ||
    emissionGain < 0
  ) {
    throw new RangeError(
      "Body lighting requires finite reaction, positive softness, normalized fuel/backlight and nonnegative gain."
    );
  }
  const front = (width: number) =>
    Math.exp(-((reaction / (softness * width)) ** 2));
  const emission =
    front(
      originalProfile.frontWidthBase +
        originalProfile.frontWidthBacklight * backlight
    ) *
    (originalProfile.emissionFloor +
      originalProfile.emissionBacklight * backlight) *
    fuel;
  const diffusion =
    front(originalProfile.diffusionWidth) *
    originalProfile.diffusionGain *
    MathUtils.smoothstep(
      backlight,
      originalProfile.diffusionBacklightLow,
      originalProfile.diffusionBacklightHigh
    ) *
    (originalProfile.diffusionFuelFloor + originalProfile.diffusionFuel * fuel);
  const interior =
    MathUtils.smoothstep(
      reaction,
      softness * originalProfile.interiorStart,
      softness * originalProfile.interiorEnd
    ) *
    originalProfile.interiorGain *
    fuel *
    backlight;
  const original = (emission + diffusion) * emissionGain + interior;
  const body =
    MathUtils.smoothstep(reaction, 0, p.bodyThreshold) *
    fuel *
    (p.bodyFloor + p.bodyBacklight * backlight) *
    p.bodyWeight;
  const edge =
    front(p.edgeWidth) *
    fuel *
    (p.bodyFloor + p.bodyBacklight * backlight) *
    p.edgeWeight;
  const halo = front(p.haloWidth) * fuel * backlight * p.haloWeight;
  const next = MathUtils.clamp(body + edge + halo, 0, 1) * emissionGain;
  return {
    original,
    next,
    blended: original * w.original + next * w.next,
    body,
    edge,
    halo
  };
}
