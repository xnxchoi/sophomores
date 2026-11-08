import { resolveFlameConfig, type FlameConfig } from "../config";
import { FLAME_APPEARANCE } from "../appearance";

/** Footer-only definition; no new texture, mask, palette or alpha treatment. */
export const FIELD_VISIBILITY = Object.freeze({
  softnessScale: FLAME_APPEARANCE.legacy.visibilitySoftnessScale,
  brightnessGain: FLAME_APPEARANCE.legacy.visibilityBrightnessGain
});

export function resolveVisibleFieldConfig(config: FlameConfig): FlameConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("Field visibility requires a resolved flame config.");
  }
  const original = resolveFlameConfig(config);
  return resolveFlameConfig(
    {
      fire: {
        frontSoftness: Math.max(
          0.005,
          original.fire.frontSoftness * FIELD_VISIBILITY.softnessScale
        )
      },
      visual: {
        brightness: Math.min(
          3,
          original.visual.brightness * FIELD_VISIBILITY.brightnessGain
        )
      }
    },
    original
  );
}
