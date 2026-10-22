const glslNumber = (value: number) =>
  Number.isInteger(value) ? `${value}.0` : `${value}`;

/** Footer substance only. Normalized local age reuses the existing ignition clock. */
export function footerIgnitionFunctions(sweepFraction: number): string {
  return `float footerIgnitionLocal(float x, float progress) {
  float arrival = (asin(clamp(x, -1.0, 1.0)) / 3.141592653589793 + .5) * ${glslNumber(sweepFraction)};
  return (progress - arrival) / ${glslNumber(1 - sweepFraction)};
}
float footerIgnitionHeight(float x, float progress) {
  if (progress >= 1.0) return 1.0;
  float local = footerIgnitionLocal(x, progress);
  if (local >= 1.0) return 1.0;
  if (local <= .08) return .20 + .08 * smoothstep(0.0, .08, local);
  if (local < .30) return .28 + .80 * smoothstep(.08, .30, local);
  return 1.08 - .08 * smoothstep(.30, 1.0, local);
}
float flameIgnition(float x, float lift, float progress) {
  if (progress <= 0.0) return 0.0;
  if (progress >= 1.0) return 1.0;
  float local = footerIgnitionLocal(x, progress);
  float catchGain = smoothstep(0.0, .12, local);
  float surge = smoothstep(.08, .30, local) * (1.0 - smoothstep(.30, 1.0, local));
  return catchGain * (1.0 + .12 * surge);
}
`;
}

/** Move only the plume field relative to its arc root; the hearth stays in place. */
export function footerIgnitionField(): string {
  return `
  if (uIgnitionProgress < 1.0) {
    point.y = rootY + (point.y - rootY) / footerIgnitionHeight(point.x / ringRadius, uIgnitionProgress);
  }`;
}
