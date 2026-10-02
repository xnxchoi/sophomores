'use client';

import { FlameBackdrop, type FlameBackdropProps } from './FlameBackdrop';
import { resolveFlameConfig, type FlameConfigInput } from './config';

/** Footer art direction only. The original full-ring component keeps its approved defaults. */
export const DEFAULT_FOOTER_CONFIG = resolveFlameConfig({
  composition: { mode: 'footer', heightRatio: .90, verticalScale: .60 },
  visual: { ringThickness: 1.65, breathingAmount: 1.35, inwardLeakAmount: .7, brightness: .65, overlapWhitening: 0 },
  fire: { intensity: 1, plumeHeight: .25, plumeFrequency: 9, flowCycles: 2, warmth: 1, rimStrength: 0, baseColor: '#155BFF', tipColor: '#5CBFFF',
    stemStrength: .10, alternateBaseColor: '#086FBA', alternateTipColor: '#48BFA6', colorCycleSeconds: 32 },
  motion: { loopSeconds: 16 },
  ignition: { enabled: true, durationSeconds: 1.6, sweepFraction: .55 },
  prism: { amount: 0, pointerAmount: 0, nativeSplit: 0, spread: .01 },
});

export function resolveFooterConfig(input: FlameConfigInput = {}) {
  return resolveFlameConfig(input, DEFAULT_FOOTER_CONFIG);
}

/** Translucent blue reaction fronts above an invisible low arc. Palette, interaction, visibility and external color drivers are unchanged. */
export function FlameFooterBackdrop({ palette = 'copper-ember', config, style, viewportActivation = 'once', viewportThreshold = .3, ...props }: FlameBackdropProps) {
  return <FlameBackdrop {...props} palette={palette} config={resolveFooterConfig(config)}
    viewportActivation={viewportActivation} viewportThreshold={viewportThreshold}
    style={{ height: 'clamp(300px, 42vw, 580px)', ...style }} />;
}

export default FlameFooterBackdrop;
