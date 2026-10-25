import { resolveFlameConfig, type FlameConfig } from '../config';

/** Footer-only definition; no new texture, mask, palette or alpha treatment. */
export const FIELD_VISIBILITY = Object.freeze({ softnessScale: .15, brightnessGain: 4 });

export function resolveVisibleFieldConfig(config: FlameConfig): FlameConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('Field visibility requires a resolved flame config.');
  }
  const original = resolveFlameConfig(config);
  return resolveFlameConfig({
    fire: { frontSoftness: Math.max(.005, original.fire.frontSoftness * FIELD_VISIBILITY.softnessScale) },
    visual: { brightness: Math.min(3, original.visual.brightness * FIELD_VISIBILITY.brightnessGain) },
  }, original);
}
