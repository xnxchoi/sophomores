/**
 * Live-tunable parameters for the beat detector.
 *
 * "Beat" rather than "kick" because the band can be retuned at runtime to
 * track snares, claps, hats, or whatever transient drives the perceptual
 * groove for a given track. Defaults below sit in the snare/clap/upper-mid
 * range (~550-1226 Hz) which carries the rhythmic punch in most pop, rock,
 * hip-hop, and funk — that ended up tracking groove better than a true
 * kick-band (50-100 Hz) detector, partly because bin 0 of a 256-fft is
 * noisy at the low end.
 *
 * Mutable singleton: the audio analyser tick reads these every frame, the
 * Leva control panel writes to them on slider drag. Plain object (not a
 * store) because reads happen in a hot RAF loop and we don't want any
 * subscription/selector overhead — direct property access only.
 *
 * To tune: render <BeatDetectorControls /> anywhere on a page where you
 * want the panel to appear (typically the Radio page in development).
 */

export interface BeatDetectorParams {
  /** Low-end cutoff for the beat band, in Hz. Converted to bin index per tick. */
  lowCutHz: number;
  /** High-end cutoff for the beat band, in Hz. Converted to bin index per tick. */
  highCutHz: number;
  /** Absolute level (0..1) below which the detector outputs silence. */
  absoluteFloor: number;
  /** Gate applied to the transient (after baseline + floor subtraction). */
  gate: number;
  /** Multiplier applied to the surviving signal. */
  amplify: number;
  /** Lerp alpha for the slow baseline tracker on rising values. */
  baselineRiseAlpha: number;
  /** Lerp alpha for the slow baseline tracker on falling values. */
  baselineFallAlpha: number;
  /** Web Audio AnalyserNode smoothingTimeConstant. */
  analyserSmoothing: number;
}

export const beatDetectorParams: BeatDetectorParams = {
  lowCutHz: 550,
  highCutHz: 1226,
  absoluteFloor: 0.18,
  gate: 0.06,
  amplify: 6.5,
  baselineRiseAlpha: 0.04,
  baselineFallAlpha: 0.1,
  analyserSmoothing: 0.2
};
