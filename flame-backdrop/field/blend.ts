import { FLAME_APPEARANCE } from '../appearance';

/** Independent approved OG:NG controls; surface identity is never blended away. */
export const FLAME_BLEND_WEIGHTS = Object.freeze({
  silhouette: Object.freeze({ original: .7, next: .3 }),
  material: FLAME_APPEARANCE.materialMix,
  color: Object.freeze({ original: .8, next: .2 }),
  surface: Object.freeze({ original: 1, next: 0 }),
  motion: Object.freeze({ original: .3, next: .7 }),
  animation: Object.freeze({ original: 0, next: 1 }),
});

export const FLAME_NEW_MOTION_PACE = 1.6;

/** Continuous active seconds avoid adding a discontinuity at the old loop boundary. */
export function flameMotionSeconds(activeSeconds: number): number {
  if (typeof activeSeconds !== 'number' || !Number.isFinite(activeSeconds) || activeSeconds < 0) {
    throw new RangeError('Flame motion time must be finite and nonnegative.');
  }
  return activeSeconds * (FLAME_BLEND_WEIGHTS.motion.original
    + FLAME_BLEND_WEIGHTS.motion.next * FLAME_NEW_MOTION_PACE);
}
