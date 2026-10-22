import { type FlameConfig, linearColor, type RGB } from './config';

const number = (value: number) => Number.isInteger(value) ? `${value}.0` : `${value}`;
const color = (value: RGB) => `vec3(${value.map(number).join(',')})`;

/** Move the existing wispy substance field as one object; never leave a root behind.
 * All temporal harmonics are integral, preserving the renderer's existing loop.
 */
export const AURORA_MOTION_GLSL = `float auroraEntry(float progress) {
  return smoothstep(0.0, 1.0, progress);
}
float auroraRise(float progress) {
  return .15 * auroraEntry(progress);
}
float auroraDrift(float x, float phase) {
  return .009 * sin(x * 4.0 + phase) + .006 * sin(x * 7.0 - 2.0 * phase);
}`;

/** Small atmospheric echo of the original advected fuel, never a replacement curtain. */
export function auroraAtmosphere(fire: FlameConfig['fire']): string {
  return `
${AURORA_MOTION_GLSL}
vec3 auroraAtmosphere(vec2 uv, float phase, float progress) {
  float travel = phase / 6.283185307179586 * 8.0;
  float patch = flameNoise(uv.x * 3.1 + 7.3, uv.y * 1.2 - travel);
  float drift = auroraDrift(uv.x, phase);
  float distance = (uv.y - .22 - auroraRise(progress) - drift) / .38;
  float field = exp(-distance * distance) * smoothstep(.30, .78, patch);
  float hueCycle = ${fire.colorCycleSeconds > 0 ? `.5 - .5 * cos(uColorTime * 6.283185307179586 / ${number(fire.colorCycleSeconds)})` : '0.0'};
  vec3 baseTint = mix(${color(linearColor(fire.baseColor))}, ${color(linearColor(fire.alternateBaseColor))}, hueCycle);
  vec3 tipTint = mix(${color(linearColor(fire.tipColor))}, ${color(linearColor(fire.alternateTipColor))}, hueCycle);
  vec3 tint = mix(baseTint, tipTint, .40);
  return tint * field * .018 * ${number(fire.intensity)};
}
`;
}
