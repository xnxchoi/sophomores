/**
 * Zustand vanilla store for the HideawayFM runtime.
 *
 * The store is the single source of truth for everything the UI reads:
 * the track roll, which index is foreground/background, the tri-state
 * play model, elapsed/duration seconds, the crossfade phase, and a
 * stable `MotionValue<number>` that visualisers subscribe to without
 * triggering React re-renders.
 *
 * Architecture notes:
 *
 * - Vanilla Zustand (not the React wrapper) is used because the provider
 *   owns the store instance, wires up Howl callbacks, and passes it into
 *   a React context. Components consume via `useStore(ctx, selector)`.
 * - `subscribeWithSelector` is enabled so the provider can attach cheap
 *   imperative subscriptions (e.g. for the RAF loop and media-session
 *   metadata updates) without paying the full store-subscription cost.
 * - Play events are funnelled through `dispatchPlay` so the tri-state
 *   reducer remains the only code path that writes `playState`. This
 *   matches the `STATE_PATTERN` shape in `src/stores/Radio/Radio.tsx`
 *   (actions-as-methods on the store) while keeping the reducer pure.
 *
 * GOTCHA: `audioLevelMV` MUST be created once here in init. If it were
 * created inside a selector or on every render, every visualiser would
 * re-subscribe each tick and the Motion binding would be worthless.
 */

import { motionValue } from "motion/react";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { reducePlayState } from "./machine/playState";
import type { HideawayFMState, RP_PlayEvent, RP_Track } from "./types";

export interface HideawayFMActions {
  setTracks(tracks: RP_Track[]): void;
  setCurrentIndex(index: number): void;
  setNextIndex(index: number): void;
  dispatchPlay(event: RP_PlayEvent): void;
  setElapsed(seconds: number): void;
  setDuration(seconds: number): void;
  setCrossfade(crossfade: HideawayFMState["crossfade"]): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  setUnlocked(unlocked: boolean): void;
  setInitialSeek(seconds: number): void;
  reset(): void;
}

export type HideawayFMStore = HideawayFMState & HideawayFMActions;

export interface HideawayFMStoreSeed {
  tracks: RP_Track[];
  seedIndex: number;
  seedSeek: number;
}

const IDLE_CROSSFADE: HideawayFMState["crossfade"] = { phase: "play" };

const buildInitialState = ({
  tracks,
  seedIndex,
  seedSeek
}: HideawayFMStoreSeed): HideawayFMState => ({
  tracks,
  currentIndex: seedIndex,
  nextIndex: -1,
  playState: { real: "idle", optimistic: "idle", previous: "idle" },
  elapsedSec: 0,
  durationSec: tracks[seedIndex]?.duration ?? 0,
  audioLevelMV: motionValue(0),
  crossfade: IDLE_CROSSFADE,
  loading: false,
  error: null,
  unlocked: false,
  initialSeekSec: seedSeek
});
export type HideawayFMAPI = ReturnType<typeof createHideawayFMStore>;
export function createHideawayFMStore(seed: HideawayFMStoreSeed) {
  const initialState = buildInitialState(seed);

  return createStore<HideawayFMStore>()(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      setTracks: (tracks) =>
        set((state) => ({
          ...state,
          tracks,
          currentIndex: Math.min(
            state.currentIndex,
            Math.max(tracks.length - 1, 0)
          ),
          durationSec:
            tracks[Math.min(state.currentIndex, Math.max(tracks.length - 1, 0))]
              ?.duration ?? 0
        })),

      setCurrentIndex: (index) =>
        set((state) => ({
          ...state,
          currentIndex: index,
          durationSec: state.tracks[index]?.duration ?? state.durationSec
        })),

      setNextIndex: (index) => set({ nextIndex: index }),

      dispatchPlay: (event) => {
        const prev = get().playState;
        const next = reducePlayState(prev, event);
        if (next === prev) return;
        set({ playState: next });
      },

      setElapsed: (seconds) => set({ elapsedSec: seconds }),

      setDuration: (seconds) => set({ durationSec: seconds }),

      setCrossfade: (crossfade) => set({ crossfade }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setUnlocked: (unlocked) => set({ unlocked }),

      setInitialSeek: (seconds) => set({ initialSeekSec: seconds }),

      reset: () => {
        // Preserve the MotionValue identity so existing visualiser bindings
        // keep working after a reset. Only mutate its value.
        initialState.audioLevelMV.set(0);
        set({
          ...initialState,
          tracks: get().tracks,
          currentIndex: 0,
          nextIndex: -1,
          initialSeekSec: 0
        });
      }
    }))
  );
}
