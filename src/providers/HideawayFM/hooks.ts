"use client";

/**
 * Selector hooks for the HideawayFM store.
 *
 * These are the canonical read APIs for UI code. Each hook returns the
 * minimal derived shape the consumer needs, avoiding whole-store
 * subscriptions that would re-render on every tick.
 *
 * Why `useShallow`:
 * Hooks that return an object literal are re-computed on every store
 * update. Without shallow equality the returned object is a fresh
 * reference each call, defeating React's bail-out. `useShallow` compares
 * keys one level deep so the subscription only fires when a tracked
 * field actually changed.
 *
 * The only exception is `useAudioLevel` — the store holds a stable
 * `MotionValue<number>` identity, so a bare selector is already
 * reference-stable and `useShallow` would add cost for no benefit.
 */

import type { MotionValue } from "motion/react";
import { useShallow } from "zustand/shallow";

import { useHideawayFM } from "./index";
import type { NowPlaying, RP_PlayState } from "./types";

/**
 * Snapshot of the currently playing track with progress metadata.
 * Durations are expressed in milliseconds to match Media Session API
 * and visualiser conventions.
 */
export function useNowPlaying(): NowPlaying {
  return useHideawayFM(
    useShallow((state) => {
      const track = state.tracks[state.currentIndex] ?? null;
      const durationSec = state.durationSec;
      const elapsedSec = state.elapsedSec;
      const progress =
        durationSec > 0
          ? Math.min(1, Math.max(0, elapsedSec / durationSec))
          : 0;

      return {
        track,
        trackIndex: state.currentIndex,
        elapsedMs: Math.round(elapsedSec * 1000),
        durationMs: Math.round(durationSec * 1000),
        progress,
        crossfading: state.crossfade.phase === "crossfade"
      };
    })
  );
}

/**
 * Returns the store's stable `MotionValue<number>` (0..1 audio envelope).
 *
 * The identity is guaranteed stable for the lifetime of the store —
 * `store.ts` creates it once in init and only mutates via `.set()`.
 * Consumers bind via `useMotionValueEvent` or `motion/react-m` elements
 * without triggering React re-renders.
 */
export function useAudioLevel(): MotionValue<number> {
  return useHideawayFM((state) => state.audioLevelMV);
}

/**
 * Tri-state play projection: real (Howl truth), optimistic (user intent),
 * previous (last-committed real). Consumers typically read `optimistic`
 * for UI affordances and `real` for audio-state-dependent effects.
 */
export function usePlayState(): RP_PlayState {
  return useHideawayFM(useShallow((state) => state.playState));
}

/**
 * Whether the radio has tracks loaded and is mountable. Gate UI that
 * assumes `useNowPlaying().track` is non-null or that depends on a
 * populated track list.
 */
export function useHasRadio(): boolean {
  return useHideawayFM((state) => state.tracks.length > 0);
}
