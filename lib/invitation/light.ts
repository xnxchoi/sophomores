import { resolveFlameConfig } from "../../flame-backdrop/config";
import { artworkLayout } from "../../flame-backdrop/layout";
import { paletteWeights } from "../../flame-backdrop/palette";
import { backdropTokens } from "../teaser/backdrop-tokens";

export const studyLightConfig = resolveFlameConfig();

export function createLightUniforms(
  width: number,
  height: number
) {
  const layout = artworkLayout(width, height, studyLightConfig);
  return {
    uScale: { value: [...layout.scale] },
    uOrigin: { value: [...layout.origin] },
    uTime: { value: 0 },
    uColorTime: { value: 0 },
    uIgnitionProgress: { value: 1 },
    uPointer: { value: [0, 0] },
    uPointerStrength: { value: 0 },
    uChromatic: { value: 1 },
    uCssPixel: { value: layout.side > 0 ? 1 / layout.side : 0 },
    uPaletteWeights: { value: [...paletteWeights(backdropTokens.palette)] }
  };
}

/** Only R3F's delta advances this clock; background/paused time never accumulates. */
export function advanceLightTime(
  elapsed: number,
  delta: number,
  running: boolean
) {
  if (!running) return elapsed;
  const safeDelta = Number.isFinite(delta)
    ? Math.min(0.1, Math.max(0, delta))
    : 0;
  return (elapsed + safeDelta) % studyLightConfig.motion.loopSeconds;
}

export function lightPixelRatio(
  width: number,
  height: number,
  deviceRatio: number
) {
  const ratio =
    Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  return Math.min(
    ratio,
    1.5,
    studyLightConfig.quality.maxPixelRatio,
    studyLightConfig.quality.maxRenderSize / Math.max(1, width, height)
  );
}
