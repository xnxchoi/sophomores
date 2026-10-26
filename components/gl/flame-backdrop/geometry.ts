import { MathUtils } from 'three';
import { RINGS, type FlameConfig } from "./config";
export type Point = readonly [number, number];
const validPoint = (point: Point) =>
  Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
/** Matches shader centerline exactly; centered artwork coordinates have Y pointing up. */
export function pointerWeightAt(
  point: Point,
  pointer: Point,
  strength: number,
  time: number,
  config: FlameConfig
): number {
  if (
    !config.pointer.enabled ||
    !validPoint(point) ||
    !validPoint(pointer) ||
    !Number.isFinite(strength) ||
    strength <= 0 ||
    !Number.isFinite(time)
  )
    return 0;
  const pointerRadius = Math.hypot(...pointer);
  if (pointerRadius < 0.000001) return 0;
  const theta = Math.atan2(pointer[1], pointer[0]);
  const phase = (time * Math.PI * 2) / config.motion.loopSeconds;
  const ringRadius =
    RINGS.reduce((sum, ring) => {
      const local = theta - ring.spin * phase + ring.phase;
      return (
        sum +
        config.visual.ringRadius +
        ring.offset +
        0.009 * Math.sin(2 * local + 0.6) +
        0.004 * Math.cos(3 * local + 1.7) +
        0.002 * Math.sin(5 * local) +
        ring.breath *
          config.visual.breathingAmount *
          Math.sin(ring.cycles * phase + ring.phase)
      );
    }, 0) / RINGS.length;
  const proximity =
    1 -
    MathUtils.smoothstep(
      Math.abs(pointerRadius - ringRadius),
      0,
      config.pointer.proximityRadius
    );
  const axis = pointer.map((value) => value / pointerRadius);
  const offset = point.map((value, i) => value - axis[i] * ringRadius);
  const radial =
    (offset[0] * axis[0] + offset[1] * axis[1]) / config.pointer.radialRadius;
  const tangent =
    (-offset[0] * axis[1] + offset[1] * axis[0]) / config.pointer.tangentRadius;
  const focus = 1 - MathUtils.smoothstep(Math.hypot(radial, tangent), 0, 1);
  return proximity ** 2 * focus ** 2 * Math.min(1, strength);
}
