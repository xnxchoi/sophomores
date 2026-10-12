const glslNumber = (value: number) =>
  Number.isInteger(value) ? `${value}.0` : `${value}`;
// Short configured clocks compress the whole attack instead of truncating its settle.
const burstDuration = (durationSeconds: number) =>
  Math.max(durationSeconds, 0.65);

/** Footer substance only. Reuses the renderer's ignition progress; no extra clock. */
export function footerIgnitionFunctions(durationSeconds: number): string {
  return `float footerIgnitionHeight(float seconds) {
  if (seconds >= .65) return 1.0;
  if (seconds <= .06) return .20 + .08 * smoothstep(0.0, .06, seconds);
  if (seconds < .22) return .28 + .80 * smoothstep(.06, .22, seconds);
  return 1.08 - .08 * smoothstep(.22, .65, seconds);
}
float flameIgnition(float x, float lift, float progress) {
  if (progress <= 0.0) return 0.0;
  if (progress >= 1.0) return 1.0;
  float seconds = progress * ${glslNumber(burstDuration(durationSeconds))};
  if (seconds >= .65) return 1.0;
  float arrival = min(1.0, abs(x)) * .012;
  float catchGain = smoothstep(0.0, .06, seconds - arrival);
  float surge = smoothstep(.06, .22, seconds) * (1.0 - smoothstep(.22, .65, seconds));
  return catchGain * (1.0 + .12 * surge);
}
`;
}

/** Hard bypass after settling leaves the original point untouched, including at progress=1. */
export function footerIgnitionField(durationSeconds: number): string {
  const duration = glslNumber(burstDuration(durationSeconds));
  return `
  if (uIgnitionProgress < 1.0 && uIgnitionProgress * ${duration} < .65) {
    p.y /= footerIgnitionHeight(uIgnitionProgress * ${duration});
  }`;
}
