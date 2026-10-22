// Normalized silhouette coordinates; one continuous field, with no internal cutout.
export const ENVELOPE_PATH = [
  'M -15 47',
  'C -4 43 1 40 10 42',
  'C 20 45 21 32 33 34',
  'C 43 35 43 42 52 38',
  'C 60 35 61 29 70 30',
  'C 79 31 80 40 90 37',
  'C 101 33 105 37 115 40',
  'C 119 55 116 73 110 83',
  'C 101 95 95 82 82 83',
  'C 70 84 67 94 53 94',
  'C 36 94 18 96 5 89',
  'C -7 83 -16 70 -15 47 Z'
].join(' ');

export const FEATHER = { min: 0, max: 8, step: .5, default: 6.5 } as const;
export const EDGE_FALLOFF = { min: 1, max: 4, step: .1, default: 2.2 } as const;
export const CENTER_FADE = { origin: [50, 62], layers: 128, exponent: 1.20, smoothing: 1.39, maxSmoothing: 2, centerLift: .18, maxCenterLift: .4 } as const;

/** Radius is relative to a scaled copy of the amorphous outline, not a circular distance. */
export function centerOpacityAt(radius: number, exponent: number, centerLift = 0): number {
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0) {
    throw new RangeError('Contour radius must be a finite nonnegative number.');
  }
  edgeFalloffAlpha(1, exponent);
  const position = Math.min(1, radius);
  const smooth = position * position * (3 - 2 * position);
  if (typeof centerLift !== 'number' || !Number.isFinite(centerLift) || centerLift < 0 || centerLift > CENTER_FADE.maxCenterLift) {
    throw new RangeError('Center lift must be a finite number between 0 and 0.4.');
  }
  const alpha = (1 - smooth) ** exponent;
  // Strengthen only the high-alpha inner region; preserve the airy low-opacity outskirts.
  const inner = Math.max(0, Math.min(1, (alpha - .45) / (.9 - .45)));
  const weight = inner * inner * (3 - 2 * inner);
  return Math.min(1, alpha + centerLift * weight * (1 - alpha));
}

/** Source-over layer alphas accumulate to sqrt(A); the matching guard multiplies back to A. */
export function envelopeFadeLayers(exponent: number, centerLift = 0): ReadonlyArray<{ readonly scale: number; readonly opacity: number }> {
  edgeFalloffAlpha(1, exponent);
  const scaleAt = (index: number) => Math.max(.001, 1 - index / (CENTER_FADE.layers - 1));
  const targetAt = (index: number) => index === CENTER_FADE.layers - 1 ? 1 : Math.sqrt(centerOpacityAt(scaleAt(index), exponent, centerLift));
  return Array.from({ length: CENTER_FADE.layers }, (_, index) => {
    const previous = index ? targetAt(index - 1) : 0;
    return { scale: scaleAt(index), opacity: (targetAt(index) - previous) / (1 - previous) };
  });
}

/** Reference for the SVG alpha-only gamma transfer; RGB and opaque centers stay intact. */
export function edgeFalloffAlpha(alpha: number, exponent: number): number {
  if (typeof alpha !== 'number' || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError('Envelope alpha must be a finite number between 0 and 1.');
  }
  if (typeof exponent !== 'number' || !Number.isFinite(exponent) || exponent < EDGE_FALLOFF.min || exponent > EDGE_FALLOFF.max) {
    throw new RangeError('Edge exponent must be a finite number between 1 and 4.');
  }
  return alpha ** exponent;
}

export function envelopeBlurPixels(height: number, feather: number): number {
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('Viewport height must be a positive finite number.');
  }
  if (typeof feather !== 'number' || !Number.isFinite(feather) || feather < FEATHER.min || feather > FEATHER.max) {
    throw new RangeError('Envelope feather must be between 0 and 8 percent.');
  }
  return height * feather / 100;
}
