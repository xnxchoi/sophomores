import type { Album, Track } from "@/payload-types";
import type { HowlOptions } from "howler";
import type { MotionValue } from "motion/react";

/**
 * Minimal track shape consumed by the HideawayFM runtime. Derived from
 * the Payload `Track` collection but stripped of relational noise so the
 * player only depends on what it actually renders.
 */
export interface RP_Track {
  title: string;
  album: string;
  artist: string;
  id: string;
  albumId?: string;
  albumSlug?: string;
  slug?: string;
  duration: number;
  url: string;
  cover?: string | null;
}

/**
 * Tri-state play model.
 * - `real`: the Howl's actual reported status (source of truth)
 * - `optimistic`: the user-intent projection (UI treats this as the value
 *   until `real` catches up)
 * - `previous`: the last-committed `real` value, kept so consumers can
 *   distinguish a bounce (pause→play→pause) from a stable state.
 */
export interface RP_PlayState {
  real: "playing" | "paused" | "loading" | "error" | "idle";
  optimistic: "playing" | "paused" | "idle";
  previous: "playing" | "paused" | "idle";
}

export type RP_PlayEvent =
  | { type: "USER_PLAY" }
  | { type: "USER_PAUSE" }
  | { type: "USER_TOGGLE" }
  | { type: "HOWL_PLAY" }
  | { type: "HOWL_PAUSE" }
  | { type: "HOWL_END" }
  | { type: "HOWL_LOAD" }
  | { type: "HOWL_ERROR"; error?: unknown }
  | { type: "RESET" }
  | { type: "RECONCILE" };

export interface NowPlaying {
  track: RP_Track | null;
  trackIndex: number;
  elapsedMs: number;
  durationMs: number;
  progress: number; // 0..1
  crossfading: boolean;
}

export interface HideawayFMState {
  /** Complete roll of tracks loaded from the server. */
  tracks: RP_Track[];
  /** Index into `tracks` for the currently playing foreground channel. */
  currentIndex: number;
  /** Index of the preloaded background channel (may equal -1 when none). */
  nextIndex: number;
  /** Tri-state play model. */
  playState: RP_PlayState;
  /** Howl-reported elapsed seek position, in seconds. */
  elapsedSec: number;
  /** Howl-reported total duration, in seconds. */
  durationSec: number;
  /**
   * 0..1 audio envelope used by visualisers. Exposed as a Motion
   * `MotionValue` so consumers can bind to it without triggering React
   * re-renders on every RAF tick. The identity is stable for the lifetime
   * of the store — it is created once in init and mutated via `.set()`.
   */
  audioLevelMV: MotionValue<number>;
  /**
   * Two-phase crossfade state.
   * - `play`: single foreground channel audible.
   * - `crossfade`: foreground fading to 0 while source plays at full volume;
   *   `msRemaining` counts down the fade envelope.
   */
  crossfade: { phase: "play" } | { phase: "crossfade"; msRemaining: number };
  /** True while tracks are loading from Payload. */
  loading: boolean;
  /** Populated when a fetch or playback error fires. */
  error: string | null;
  /** True once the user has unlocked audio via a gesture. */
  unlocked: boolean;
  /** Initial playhead seek offset chosen on first load (radio-style). */
  initialSeekSec: number;
}

export interface HideawayFMControls {
  play(): Promise<void>;
  pause(): void;
  toggle(): void;
  /** Role-gated — no-ops for `user`/`patron`. */
  next(): Promise<void>;
  /** Role-gated — no-ops for `user`/`patron`. */
  previous(): Promise<void>;
  /** Role-gated — no-ops for `user`/`patron`. */
  seek(seconds: number): void;
  /** Reload tracks (e.g. after role change). */
  refresh(): Promise<void>;
  /** Force a re-hydrate from localStorage. */
  restoreFromStorage(): void;
}

/**
 * Options for constructing an `RP_Studio` Howl channel.
 * Extends `HowlOptions` so Howler defaults remain configurable.
 */
export interface RPStudioOptions extends HowlOptions {
  trackIndex: number;
  track: (Pick<RP_Track, "id"> & Partial<Omit<RP_Track, "id">>) | RP_Track;
}

/** Helper: map a Payload `Track` doc (possibly with populated album) to RP_Track. */
export type PayloadTrackDoc = Track & { album?: string | Album };
