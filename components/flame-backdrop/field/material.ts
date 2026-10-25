import {
  resolveFooterConfig,
  resolveFooterComposition
} from "../footer-config";
import { type FlameConfig } from "../config";
import { FOOTER_SUBSTANCE_GLSL } from "../footer-material";
import { createFragmentShader } from "../shaders";
import { FLAME_APPEARANCE } from "../appearance";

export type HistoricalVariant = "initial" | "stronger" | "breathing";

export const BREATHING_CONFIG = FLAME_APPEARANCE.exposure.breathing;

/** Starts at selected B; active elapsed time is owned by the renderer, not wall time. */
export function emissionGainAt(
  elapsedSeconds: number,
  periodSeconds: number = BREATHING_CONFIG.periodSeconds
): number {
  if (
    typeof elapsedSeconds !== "number" ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0
  ) {
    throw new RangeError(
      "Breathing elapsed time must be finite and nonnegative"
    );
  }
  if (
    typeof periodSeconds !== "number" ||
    !Number.isFinite(periodSeconds) ||
    periodSeconds <= 0
  ) {
    throw new RangeError("Breathing period must be finite and positive");
  }
  const phase =
    ((elapsedSeconds % periodSeconds) / periodSeconds) * Math.PI * 2;
  return (
    BREATHING_CONFIG.minimumGain +
    (BREATHING_CONFIG.maximumGain - BREATHING_CONFIG.minimumGain) *
      (0.5 + 0.5 * Math.cos(phase))
  );
}

// Exact recovered material snapshots; provenance hashes retained below. Do not retune during mask edits.
// 02-gaseous-initial.ts.txt file SHA256: 4018393b00ba72b415e2faf268de3998b11492c350fd69d7a462d02fd8db3132
export const HISTORICAL_INITIAL_GLSL = `
  float materialTravel = phase / 6.283185307179586 * 8.0;
  float materialPatch = flameNoise(x * 2.1 + 7.3, lift * .60 - materialTravel);
  float materialBacklight = flameNoise(x * 1.3 + 23.1, lift * .42 - materialTravel + 3.7);
  float materialFuel = smoothstep(.24, .70, materialPatch);
  float materialFront = flameFront(reaction, softness * (.45 + .55 * materialBacklight));
  float materialGlow = flameFront(reaction, softness * 2.6);
  float materialEmission = materialFront * (.24 + .95 * materialBacklight) * materialFuel;
  float materialDiffusion = materialGlow * .22 * smoothstep(.18, .72, materialBacklight)
    * (.25 + .75 * materialFuel);
  float materialInterior = smoothstep(softness * .7, softness * 3.5, reaction)
    * .055 * materialFuel * materialBacklight;
  float materialLight = materialEmission + materialDiffusion + materialInterior;
`;

// 03-gaseous-1p9-no-root.ts.txt file SHA256: 9a5c3496dbf378d84e7bd064656eefacda3036f25a7f3d3ca93f4ba3525d5a94
export const HISTORICAL_STRONGER_GLSL = `
  float materialTravel = phase / 6.283185307179586 * 8.0;
  float materialPatch = flameNoise(x * 2.1 + 7.3, lift * .60 - materialTravel);
  float materialBacklight = flameNoise(x * 1.3 + 23.1, lift * .42 - materialTravel + 3.7);
  float materialFuel = smoothstep(.24, .70, materialPatch);
  float materialFront = flameFront(reaction, softness * (.85 + .55 * materialBacklight));
  float materialGlow = flameFront(reaction, softness * 2.6);
  float materialEmission = materialFront * (.24 + .95 * materialBacklight) * materialFuel;
  float materialDiffusion = materialGlow * .22 * smoothstep(.18, .72, materialBacklight)
    * (.25 + .75 * materialFuel);
  float materialInterior = smoothstep(softness * .7, softness * 3.5, reaction)
    * .055 * materialFuel * materialBacklight;
  float materialLight = (materialEmission + materialDiffusion) * 1.9 + materialInterior;
`;

// Live OG optics use the central controls. Recovered historical blocks above stay immutable.
const optics = FLAME_APPEARANCE.originalMaterial;
const LIVE_MATERIAL_GLSL = `
  float materialTravel = phase / 6.283185307179586 * 8.0;
  float materialPatch = flameNoise(x * 2.1 + 7.3, lift * .60 - materialTravel);
  float materialBacklight = flameNoise(x * 1.3 + 23.1, lift * .42 - materialTravel + 3.7);
  float materialFuel = smoothstep(${optics.fuelLow}, ${optics.fuelHigh}, materialPatch);
  float materialFront = flameFront(reaction, softness * (${optics.frontWidthBase} + ${optics.frontWidthBacklight} * materialBacklight));
  float materialGlow = flameFront(reaction, softness * ${optics.diffusionWidth});
  float materialEmission = materialFront * (${optics.emissionFloor} + ${optics.emissionBacklight} * materialBacklight) * materialFuel;
  float materialDiffusion = materialGlow * ${optics.diffusionGain} * smoothstep(${optics.diffusionBacklightLow}, ${optics.diffusionBacklightHigh}, materialBacklight)
    * (${optics.diffusionFuelFloor} + ${optics.diffusionFuel} * materialFuel);
  float materialInterior = smoothstep(softness * ${optics.interiorStart}, softness * ${optics.interiorEnd}, reaction)
    * ${optics.interiorGain} * materialFuel * materialBacklight;
  float materialLight = (materialEmission + materialDiffusion) * uEmissionGain + materialInterior;
`;

export function referenceConfig(width: number, height: number) {
  return resolveFooterConfig({
    composition: resolveFooterComposition(width, height),
    ignition: { enabled: false }
  });
}

export function replaceHistoricalOnce(
  source: string,
  marker: string,
  replacement: string
): string {
  const index = source.indexOf(marker);
  if (
    !marker ||
    index < 0 ||
    source.indexOf(marker, index + marker.length) >= 0
  ) {
    throw new Error(
      "Historical shader marker must occur exactly once; canonical source has drifted."
    );
  }
  return (
    source.slice(0, index) + replacement + source.slice(index + marker.length)
  );
}

export function createHistoricalShader(
  config: FlameConfig,
  variant: HistoricalVariant
): string {
  if (
    variant !== "initial" &&
    variant !== "stronger" &&
    variant !== "breathing"
  )
    throw new TypeError("Unknown historical material");
  const block =
    variant === "initial"
      ? HISTORICAL_INITIAL_GLSL
      : variant === "stronger"
        ? HISTORICAL_STRONGER_GLSL
        : LIVE_MATERIAL_GLSL;
  const shader = replaceHistoricalOnce(
    createFragmentShader(config, "substance"),
    FOOTER_SUBSTANCE_GLSL,
    block
  );
  const historical = replaceHistoricalOnce(
    shader,
    " + materialRoot * stemEnvelope * (1.0 - envelope)",
    ""
  );
  if (variant !== "breathing") return historical;
  return replaceHistoricalOnce(
    historical,
    "precision highp float;",
    "precision highp float;\nuniform float uEmissionGain;"
  );
}

export const HISTORICAL_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = position.xy * .5 + .5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
