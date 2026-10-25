import type { FlameConfig } from "../config";
import { createHistoricalShader, replaceHistoricalOnce } from "./material";

export const MASK_UNIFORM = "\nuniform sampler2D uMask;\n";
export const MASK_MAIN = `
void main() {
  renderEnvelopeMaterial();
  gl_FragColor.a *= texture2D(uMask, vUv).a;
}
`;

/** Coordinate remap only: screen y94%..30% spans the accepted fuel lift -.2...9. */
export const ENVELOPE_COORDINATES = `float studyX = (vUv.x - .5) * (2.0 / 1.2);
  float studyLift = -.20 + 1.10 * (vUv.y - .06) / .64;
  float studyPx = studyX * .35;
  vec2 p = vec2(studyPx, sqrt(max(0.0, .35 * .35 - studyPx * studyPx)) + .25 * studyLift);`;

function materialWidthScale(aspect: number): number {
  if (typeof aspect !== "number" || !Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError("Material aspect must be a positive finite number.");
  }
  return Math.min(1, aspect / 1.6);
}

/** Portrait viewports center-crop the field, keeping its pixel proportions instead of squeezing. */
export function envelopeCoordinatesForAspect(aspect: number): string {
  const scale = materialWidthScale(aspect);
  return scale === 1
    ? ENVELOPE_COORDINATES
    : ENVELOPE_COORDINATES.replace(
        "(2.0 / 1.2);",
        `(2.0 / 1.2) * ${scale.toFixed(12)};`
      );
}

export function envelopeMaterialPoint(
  u: number,
  v: number,
  aspect = 1.6
): readonly [number, number] {
  if (
    ![u, v].every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1
    )
  ) {
    throw new RangeError(
      "Envelope UV values must be finite numbers between 0 and 1."
    );
  }
  const x = (u - 0.5) * (2 / 1.2) * 0.35 * materialWidthScale(aspect);
  const lift = -0.2 + (1.1 * (v - 0.06)) / 0.64;
  return [x, Math.sqrt(Math.max(0, 0.35 ** 2 - x ** 2)) + 0.25 * lift];
}

export function createEnvelopeShader(
  config: FlameConfig,
  aspect = 1.6
): string {
  if (config.fire.rimStrength !== 0 || config.visual.overlapWhitening !== 0) {
    throw new Error("Envelope study requires the accepted zero-ring preset.");
  }
  if (config.visual.ringRadius !== 0.35 || config.fire.plumeHeight !== 0.25) {
    throw new Error(
      "Envelope coordinate mapping no longer matches the accepted fuel domain."
    );
  }
  const historical = createHistoricalShader(config, "breathing");
  const mapped = replaceHistoricalOnce(
    historical,
    "vec2 p = (vUv - .5) * uScale - uOrigin;",
    envelopeCoordinatesForAspect(aspect)
  );
  // The image owns the silhouette; stems and all material/tone-map formulas stay intact.
  const expanded = replaceHistoricalOnce(
    mapped,
    "float envelope = launch * dissolve * shoulders * crown;",
    "float envelope = 1.0;"
  );
  // Wrap rather than edit the final color statement: even early-return branches receive the mask.
  return (
    replaceHistoricalOnce(
      expanded,
      "void main()",
      "void renderEnvelopeMaterial()"
    ) +
    MASK_UNIFORM +
    MASK_MAIN
  );
}

/** Resize changes a uniform, not the GPU program. Material and alpha remain canonical. */
export function createResponsiveEnvelopeShader(config: FlameConfig): string {
  return replaceHistoricalOnce(
    createEnvelopeShader(config),
    "(2.0 / 1.2);",
    "(2.0 / 1.2) * uMaterialWidth;"
  ).replace(
    "precision highp float;",
    "precision highp float;\nuniform float uMaterialWidth;"
  );
}
