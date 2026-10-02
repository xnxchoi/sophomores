export { FlameBackdrop, default } from './FlameBackdrop';
export { FlameFooterBackdrop, resolveFooterConfig, DEFAULT_FOOTER_CONFIG } from './FlameFooterBackdrop';
export type { FlameBackdropProps } from './FlameBackdrop';
export { DEFAULT_FLAME_CONFIG, resolveFlameConfig } from './config';
export type { FlameConfig, FlameConfigInput } from './config';
export { createFlame } from './renderer';
export type { CreateFlameOptions, FlameEnvironment, FlameHandle, FlameState } from './renderer';
export {
  paletteWeights, resolvePaletteWeights, paletteAtProgress, scrollProgress,
  cyclePaletteWeights, resolveScrollStops, DEFAULT_SCROLL_PALETTE_STOPS,
} from './palette';
export type { FlamePalette, PaletteInput, PaletteWeights, ScrollPaletteStop, PaletteCycleOptions } from './palette';
