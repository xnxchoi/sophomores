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

import {
  DEFAULT_SCHEDULER_BOUNDS,
  type SchedulerBounds
} from "./useLaneScheduler";

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
