/**
 * Centralised timing + storage constants for the HideawayFM radio subsystem.
 * Consumers MUST NOT hardcode these values — import from here so the whole
 * runtime agrees on fade, preload, and resume semantics.
 */

/**
 * Crossfade envelope duration (ms). The foreground Howl fades from its
 * current volume to 0 across this window while the source (next) Howl plays
 * concurrently at full volume — guaranteeing zero audio vacuum.
 */
export const DEFAULT_FADE_MS = 600;

/**
 * Seconds of remaining playback that trigger the crossfade state machine.
 * When `duration - elapsed <= CROSSFADE_THRESHOLD_SEC`, the orchestrator
 * begins (or defers, if source not yet loaded) the crossfade.
 */
export const CROSSFADE_THRESHOLD_SEC = 3;

/**
 * Preload thresholds for the ring buffer's "next" slot.
 * The deferred Howl starts loading when the current track's remaining time
 * drops below `max(PRELOAD_LEAD_SEC, duration × PRELOAD_LEAD_RATIO)`.
 * For short tracks where the threshold exceeds duration, preload fires
 * immediately on the first RAF tick.
 */
export const PRELOAD_LEAD_SEC = 30;
export const PRELOAD_LEAD_RATIO = 0.5;

/** localStorage keys. All values are JSON-stringified on write. */
export const STORAGE_KEYS = {
  INDEX: "hideaway_fm_index",
  TIME: "hideaway_fm_time",
  TIMESTAMP: "hideaway_fm_ts"
} as const;

/**
 * Resume TTL (minutes). If the stored `TIMESTAMP` is older than this window,
 * the provider discards the saved `INDEX`/`TIME` and picks a fresh random seed.
 */
export const SESSION_RESUME_TTL_MIN = 30;
