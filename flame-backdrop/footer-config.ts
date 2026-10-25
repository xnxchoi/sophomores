import { resolveFlameConfig, type FlameConfigInput } from './config';
import { FLAME_APPEARANCE } from './appearance';

/** Footer art direction only. The original full-ring component keeps its approved defaults. */
export const DEFAULT_FOOTER_CONFIG = resolveFlameConfig({
  composition: { mode: 'footer', heightRatio: .90, verticalScale: .60 },
  visual: { ringThickness: 1.65, breathingAmount: 1.35, inwardLeakAmount: .7, brightness: FLAME_APPEARANCE.exposure.brightness, overlapWhitening: 0 },
  fire: { intensity: FLAME_APPEARANCE.exposure.intensity, plumeHeight: .25, plumeFrequency: 9, flowCycles: 2, warmth: 1, rimStrength: 0, baseColor: '#155BFF', tipColor: '#5CBFFF',
    stemStrength: FLAME_APPEARANCE.exposure.stemStrength, alternateBaseColor: '#086FBA', alternateTipColor: '#48BFA6', colorCycleSeconds: 32 },
  motion: { loopSeconds: 16 },
  ignition: { enabled: true, durationSeconds: 1.6, sweepFraction: .55 },
  prism: { amount: 0, pointerAmount: 0, nativeSplit: 0, spread: .01 },
});

export function resolveFooterConfig(input: FlameConfigInput = {}) {
  return resolveFlameConfig(input, DEFAULT_FOOTER_CONFIG);
}


const FOOTER_COMPOSITION = { widthRatio: 1.2, heightRatio: 1.9 } as const;
const FOOTER_COMPACT = { maxWidth: 767, verticalScale: .6 } as const;

/** Shared ribbon proportions; the aurora blend lifts this existing field in viewport space. */
export function resolveFooterComposition(width: number, height: number) {
  const valid =
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0;
  const viewportWidth = valid ? width : 1440;
  const viewportHeight = valid ? height : 900;
  const composition = FOOTER_COMPOSITION;
  const radius = Math.min(
    (viewportWidth * composition.widthRatio) / 2,
    viewportHeight * composition.heightRatio
  );
  // Approved footer: radius .35 and plume height .25. The renderer bounds verticalScale to [.25, 2].
  const verticalScale = Math.max(
    0.25,
    Math.min(2, (viewportHeight * 0.78) / (radius * (1 + 0.25 / 0.35)))
  );
  // Do not stretch a narrow flame to fill a tall phone. A stable portrait scale
  // also avoids recreating WebGL whenever Safari expands/collapses its toolbar.
  return {
    ...composition,
    verticalScale: viewportWidth <= FOOTER_COMPACT.maxWidth
      ? Math.min(verticalScale, FOOTER_COMPACT.verticalScale)
      : verticalScale
  };
}
