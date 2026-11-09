export interface MagnifyConfig {
  focalIndex: number;
  radius: number;
  strength: number;
}

export interface TickTransform {
  scaleY: number;
  opacity: number;
}

export function magnifyTick(
  index: number,
  { focalIndex, radius, strength }: MagnifyConfig
): TickTransform {
  const distance = Math.abs(index - focalIndex);
  if (distance > radius) {
    return { scaleY: 1, opacity: 1 };
  }
  const t = 1 - distance / radius;
  const bell = t * t * t;
  return {
    scaleY: 1 + bell * strength,
    opacity: 1 + bell * 0.6
  };
}

export function closestIndex(value: number, count: number): number {
  if (count <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(clamped * (count - 1));
}

export interface TickSpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const DEFAULT_TICK_SPRING: TickSpringConfig = {
  stiffness: 700,
  damping: 28,
  mass: 0.6
};
