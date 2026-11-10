/**
 * Configuration for the FooterTickerCrown bezel strip.
 *
 *   - Cycles alternate between `move` and `pause` windows of random duration
 *     (clamped per `SchedulerBounds`).
 *   - During a `move` cycle each lane gets its own random direction, ease,
 *     and displacement — lanes resettle like puzzle pieces, not in lockstep.
 *   - Per-line widths are modulated by a procedural displacement texture
 *     (horizontal Gaussian + sharp central bar) so the bezel reads as a
 *     ruler with a bright reference indicator at center.
 */

/**
 * Bounds for the scheduler.
 *
 * Each lane's final offset is composed of TWO pieces:
 *   1. A **base accumulator** advanced by user input (scroll wheel +
 *      hover/tap "spin" impulses). Idle = no drift; the bezel rests.
 *      Per-lane sign array determines whether a given lane responds in the
 *      same or opposite direction relative to the input.
 *   2. A scaled eased per-lane displacement from a move/pause schedule
 *      (`primaryScale × eased per-lane offset`). Adds character on top of
 *      the input-driven motion.
 *
 *   finalOffset[i] = laneSigns[i] × baseAccum + primaryScale × primaryEased[i]
 */
export interface SchedulerBounds {
  readonly pauseMinMs: number;
  readonly pauseMaxMs: number;
  readonly moveMinMs: number;
  readonly moveMaxMs: number;
  /** Each lane displaces by a random amount in this signed range, in px. */
  readonly laneDistanceMinPx: number;
  readonly laneDistanceMaxPx: number;
  /** Multiplier on the eased per-lane primary displacement (0..1). */
  readonly primaryScale: number;
  /** px accumulated per px of document scroll delta. */
  readonly scrollMultiplier: number;
  /** Target velocity (px/sec) when a spin trigger (hover/tap) is active. */
  readonly spinPxPerSec: number;
  /** Time constant (sec) for spin velocity easing in/out. */
  readonly spinTauSec: number;
  /**
   * Quantization unit (px) for post-motion snap. Should match the field's
   * `space` so each groove aligns with a canonical line position.
   */
  readonly grooveSizePx: number;
  /** Time of stillness before snap begins (ms). Short = "snapped" feel. */
  readonly snapDwellMs: number;
  /** Duration of the snap easing itself (ms). Short = decisive click. */
  readonly snapDurationMs: number;
}

export const DEFAULT_SCHEDULER_BOUNDS: SchedulerBounds = {
  // Rest dominates motion — long pauses, short committed clicks.
  pauseMinMs: 1800,
  pauseMaxMs: 4500,
  moveMinMs: 700,
  moveMaxMs: 1300,
  // Detent-scale displacement — small, decisive turns of the bezel.
  laneDistanceMinPx: 10,
  laneDistanceMaxPx: 30,
  primaryScale: 0.2,
  // 1:1 scroll mapping — each px of scroll advances the bezel one px.
  scrollMultiplier: 1.0,
  // Spin: ~28 px/sec when hovered or tapped — a leisurely steady turn.
  spinPxPerSec: 28,
  spinTauSec: 0.35,
  // Snap: after 600ms of stillness the natural settle has fully read;
  // each lane then magnets to the nearest groove over 260ms — long
  // enough to feel like a quiet drift into place rather than a click.
  grooveSizePx: 14,
  snapDwellMs: 600,
  snapDurationMs: 260
};

export interface FieldConfig {
  /** Number of stacked rows. */
  readonly numRows: number;
  /** Spacing between line centers, in CSS pixels. Smaller = denser. */
  readonly space: number;
  /** Min line width (px). The "skinny" baseline width away from the indicator. */
  readonly minWidth: number;
  /** Max line width (px). Reached under the central displacement bar. */
  readonly maxWidth: number;
  /** Move/pause scheduler bounds — the breath rhythm of the band. */
  readonly scheduler: SchedulerBounds;
  /**
   * Band height (CSS px) at desktop & mobile breakpoints.
   */
  readonly heightPxDesktop: number;
  readonly heightPxMobile: number;
  /**
   * Constrained band width (CSS px) at desktop & mobile breakpoints. On
   * mobile (< sm), `null` means full-width.
   */
  readonly widthPxDesktop: number | null;
  readonly widthPxMobile: number | null;
}

/**
 * Default configuration. Three lanes of vertical tick marks over a thin
 * horizontal strip — reads as a focus-ring bezel viewed edge-on. Motion
 * follows a "shifting puzzle" scheduler with long pauses and short clicks,
 * snap-to-groove on rest.
 */
export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  numRows: 3,
  space: 14,
  minWidth: 0.75,
  maxWidth: 7,
  scheduler: DEFAULT_SCHEDULER_BOUNDS,
  // Bezel-strip silhouette: thin horizontal panel reading as a focus ring
  // viewed edge-on. Per-lane height ~10.7px desktop, ~8.3px mobile. Width
  // sits a touch wider than the LegalFooter "The Hideaway" wordmark below.
  heightPxDesktop: 32,
  widthPxDesktop: 220,
  heightPxMobile: 25,
  widthPxMobile: 170
};
