"use client";

/**
 * HideawayFMProvider
 *
 * Owns the singleton runtime: a vanilla Zustand store, a three-slot ring buffer
 * of `RP_Studio` (Howl) instances (prev/curr/next), the RAF loop that feeds the audio-level
 * `MotionValue` and advances the crossfade state machine, the Media Session
 * handlers, and localStorage persistence for random-seek resume.
 *
 * Design notes:
 * - The store is created once and parked in a ref so React re-renders do not
 *   rebuild it. Children subscribe via `useStore(ctx, selector)` — there is no
 *   React-owned state in this provider beyond the ref cell for the store itself.
 * - The two Howl channels live in refs for the same reason. The crossfade
 *   action dispatcher mutates Howl state (fade/seek/switch) as a side effect
 *   of the pure reducer in `machine/crossfade.ts`.
 * - An `AnalyserNode` is attached to `Howler.masterGain` exactly once, after
 *   Howler's AudioContext comes online (first play). The RAF loop reads it and
 *   writes the normalised level into `audioLevelMV` so visualisers avoid React
 *   re-renders.
 * - The provider exposes the full controls surface; role-based gating happens
 *   in `useRadioControls`, which only exposes `skip`/`rewind` for premium
 *   roles. Auto-advance always crossfades; user-initiated next/previous
 *   hard-cuts (parity with Apple Music / Spotify "crossfade" mode).
 *
 * GOTCHA: Howler's global AudioContext is not usable until after the first
 * gesture-triggered play(). The analyser wiring and the fg `unmute()` both
 * wait on a one-shot gesture listener.
 */

import { Howler } from "howler";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode
} from "react";
import { useStore } from "zustand";

import {
  CROSSFADE_THRESHOLD_SEC,
  DEFAULT_FADE_MS,
  PRELOAD_LEAD_RATIO,
  PRELOAD_LEAD_SEC,
  SESSION_RESUME_TTL_MIN,
  STORAGE_KEYS
} from "./constants";
import { nextCrossfadeStep } from "./machine/crossfade";
import { fetchTracks, pickSeed } from "./machine/fetchTracks";
import {
  clearActionHandlers,
  hasMediaSession,
  setNowPlayingMetadata,
  wireActionHandlers
} from "./mediaSession";
import { beatDetectorParams } from "./beatDetectorParams";
import { RP_Studio } from "./RP_Studio";
import { createHideawayFMStore, type HideawayFMStore } from "./store";
import type { HideawayFMControls, RP_Track } from "./types";

interface PersistedSeed {
  index: number;
  timeSec: number;
  timestamp: number;
}

interface HideawayFMContextValue {
  store: ReturnType<typeof createHideawayFMStore>;
  controls: HideawayFMControls;
}

export const HideawayFMContext = createContext<HideawayFMContextValue | null>(
  null
);

/**
 * Safely read the persisted seed from localStorage. Returns null if the
 * persisted blob is missing, malformed, or outside the 30-minute TTL.
 */
function readPersistedSeed(): PersistedSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const rawIndex = window.localStorage.getItem(STORAGE_KEYS.INDEX);
    const rawTime = window.localStorage.getItem(STORAGE_KEYS.TIME);
    const rawTs = window.localStorage.getItem(STORAGE_KEYS.TIMESTAMP);
    if (rawIndex == null || rawTime == null || rawTs == null) return null;

    const index = Number(JSON.parse(rawIndex));
    const timeSec = Number(JSON.parse(rawTime));
    const timestamp = Number(JSON.parse(rawTs));
    if (
      !Number.isFinite(index) ||
      !Number.isFinite(timeSec) ||
      !Number.isFinite(timestamp)
    ) {
      return null;
    }
    return { index, timeSec, timestamp };
  } catch {
    return null;
  }
}

function writePersistedSeed(index: number, timeSec: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(index));
    window.localStorage.setItem(STORAGE_KEYS.TIME, JSON.stringify(timeSec));
    window.localStorage.setItem(
      STORAGE_KEYS.TIMESTAMP,
      JSON.stringify(Date.now())
    );
  } catch {
    // localStorage may be disabled (private mode / quota); silently drop.
  }
}

function clearPersistedSeed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.INDEX);
    window.localStorage.removeItem(STORAGE_KEYS.TIME);
    window.localStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
  } catch {
    // ignore
  }
}

function isPersistedSeedFresh(seed: PersistedSeed): boolean {
  const ageMin = (Date.now() - seed.timestamp) / 60_000;
  return ageMin <= SESSION_RESUME_TTL_MIN;
}

interface HideawayFMProviderProps {
  children: ReactNode;
}

export function HideawayFMProvider({
  children
}: HideawayFMProviderProps): ReactElement {
  // Store is created once with an empty seed, then hydrated after fetch.
  // This lets children mount immediately and render "loading" surfaces without
  // waiting on the network.
  const storeRef = useRef<ReturnType<typeof createHideawayFMStore> | null>(
    null
  );
  if (storeRef.current === null) {
    storeRef.current = createHideawayFMStore({
      tracks: [],
      seedIndex: 0,
      seedSeek: 0
    });
  }
  const store = storeRef.current;

  // Three-slot ring buffer: prev (last-played, kept for backward navigation),
  // curr (foreground/audible), next (preloaded for upcoming crossfade).
  // Only 3 RP_Studio instances ever exist — on transition the oldest is
  // recycled via switchTrack rather than destroyed and rebuilt.
  const ringRef = useRef<{
    prev: RP_Studio | null;
    curr: RP_Studio | null;
    next: RP_Studio | null;
  }>({ prev: null, curr: null, next: null });
  const nextPreloadedRef = useRef(false);

  // Stable RAF handle for teardown.
  const rafRef = useRef<number | null>(null);

  // Analyser wiring — attached once after Howler.ctx is live.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const analyserAttachedRef = useRef(false);
  // Slow-tracking baseline of beat-band energy. Used as an adaptive threshold:
  // sustained content (basslines, pads, sustained vocals) gets baked into the
  // baseline and suppressed; only TRANSIENTS (rising sharply above baseline)
  // survive — these correspond to whatever the band is tuned for (kick, snare,
  // clap, etc., depending on the Hz cutoffs in beatDetectorParams).
  const beatBaselineRef = useRef(0);
  // HTML5-mode <audio> elements bypass Web Audio by default, so the analyser
  // sees silence. We bridge each element via createMediaElementSource() the
  // first time we encounter it, then route through masterGain so the analyser
  // tap picks it up. WeakSet prevents double-bridging the same element
  // (which would throw `InvalidStateError: HTMLMediaElement already connected`).
  const bridgedElementsRef = useRef<WeakSet<HTMLMediaElement>>(new WeakSet());

  // Crossfade state tracked outside the store so the RAF loop does not
  // thrash the Zustand reducer every frame. Two-phase machine: `play` is the
  // steady state; `crossfade` runs while both Howls are audible.
  const crossfadePhaseRef = useRef<"play" | "crossfade">("play");
  // Monotonic ms when the current phase began. Reset on every phase change.
  const phaseStartTsRef = useRef<number>(0);
  // Reentrancy lock: prevents a second beginCrossfade during an in-flight one.
  const transitioningRef = useRef<boolean>(false);

  // Bridges so the bootstrap useEffect and RAF tick can call into the
  // orchestrator that lives inside the `controls` useMemo closure.
  const wireFgListenersRef = useRef<((studio: RP_Studio) => void) | null>(null);
  const beginCrossfadeRef = useRef<
    ((targetIndex: number, direction: "forward" | "backward") => boolean) | null
  >(null);
  const commitCrossfadeRef = useRef<
    ((direction: "forward" | "backward") => void) | null
  >(null);
  const autoAdvanceRef = useRef<(() => void) | null>(null);

  const controls = useMemo<HideawayFMControls>(() => {
    function buildStudio(
      track: RP_Track,
      trackIndex: number,
      preload = true
    ): RP_Studio {
      return new RP_Studio({
        track,
        trackIndex,
        src: [track.url],
        html5: true,
        preload,
        volume: 0
      });
    }

    function wireFgListeners(studio: RP_Studio): void {
      studio.on("play", () => {
        store.getState().dispatchPlay({ type: "HOWL_PLAY" });
        store.getState().dispatchPlay({ type: "RECONCILE" });
      });
      studio.on("pause", () => {
        store.getState().dispatchPlay({ type: "HOWL_PAUSE" });
        store.getState().dispatchPlay({ type: "RECONCILE" });
      });
      studio.on("end", () => {
        try {
          autoAdvance();
        } catch {
          store.getState().setError("advance-failed");
        }
      });
      studio.on("loaderror", () => {
        store.getState().setError("load-error");
      });
      studio.on("playerror", () => {
        store.getState().setError("play-error");
      });
    }

    function recycleOrBuild(
      slot: RP_Studio | null,
      track: RP_Track,
      trackIndex: number
    ): RP_Studio {
      if (slot) {
        slot.switchTrack({
          src: [track.url],
          trackIndex,
          track,
          html5: true,
          preload: false
        });
        return slot;
      }
      return buildStudio(track, trackIndex, false);
    }

    async function play(): Promise<void> {
      const fg = ringRef.current.curr;
      if (!fg) return;
      store.getState().dispatchPlay({ type: "USER_PLAY" });
      fg.volume(1);
      fg.play();
    }

    function pause(): void {
      const fg = ringRef.current.curr;
      if (!fg) return;
      store.getState().dispatchPlay({ type: "USER_PAUSE" });
      fg.pause();
      const elapsed = fg.seek();
      if (typeof elapsed === "number" && Number.isFinite(elapsed)) {
        writePersistedSeed(store.getState().currentIndex, elapsed);
      }
    }

    function toggle(): void {
      const real = store.getState().playState.real;
      if (real === "playing") {
        pause();
      } else {
        void play();
      }
    }

    /**
     * Resolve the source Howl for a transition. Returns the existing
     * preloaded slot when the trackIndex matches, otherwise builds a new
     * `RP_Studio` and kicks off `load()`. The caller checks `state()`
     * before play() — never await here, the orchestrator must remain
     * synchronous to preserve the vacuum guarantee.
     */
    function resolveSource(
      targetIndex: number,
      direction: "forward" | "backward",
      track: RP_Track
    ): RP_Studio {
      const ring = ringRef.current;
      const incoming = direction === "forward" ? ring.next : ring.prev;
      if (incoming && incoming.trackIndex === targetIndex) {
        if (incoming.state() === "unloaded") incoming.load();
        return incoming;
      }
      const built = buildStudio(track, targetIndex, true);
      return built;
    }

    /**
     * Synchronously start the crossfade envelope.
     *
     * Vacuum guarantee: `source.play()` runs BEFORE `fg.fade(→0)` with no
     * awaits between. If the source is not yet loaded, returns false so
     * the RAF loop can retry on the next tick.
     */
    function beginCrossfade(
      targetIndex: number,
      direction: "forward" | "backward"
    ): boolean {
      if (transitioningRef.current) return false;

      const s = store.getState();
      const tracks = s.tracks;
      if (tracks.length === 0) return false;

      const clampedIndex =
        ((targetIndex % tracks.length) + tracks.length) % tracks.length;
      const nextTrack = tracks[clampedIndex];
      if (!nextTrack) return false;

      const ring = ringRef.current;
      const fg = ring.curr;
      if (!fg) return false;

      const source = resolveSource(clampedIndex, direction, nextTrack);
      if (source.state() !== "loaded") {
        return false;
      }

      transitioningRef.current = true;
      crossfadePhaseRef.current = "crossfade";
      phaseStartTsRef.current = performance.now();

      // ORDER MATTERS: source.play() before fg.fade(→0), no awaits.
      const currentVol =
        typeof fg.volume() === "number" ? (fg.volume() as number) : 1;
      source.volume(0);
      source.play();
      source.fade(0, 1, DEFAULT_FADE_MS);
      fg.fade(currentVol, 0, DEFAULT_FADE_MS);

      store.getState().setNextIndex(clampedIndex);
      store.getState().setCurrentIndex(clampedIndex);
      store.getState().setElapsed(0);
      store.getState().setCrossfade({
        phase: "crossfade",
        msRemaining: DEFAULT_FADE_MS
      });
      const duration = source.duration();
      if (Number.isFinite(duration) && duration > 0) {
        store.getState().setDuration(duration);
      }

      if (hasMediaSession()) {
        setNowPlayingMetadata(nextTrack);
      }

      writePersistedSeed(clampedIndex, 0);
      return true;
    }

    /**
     * Finalise the crossfade: detach the old foreground, rotate the ring,
     * wire listeners on the promoted source, and rebuild the next preload.
     */
    function commitCrossfade(direction: "forward" | "backward"): void {
      const ring = ringRef.current;
      const oldFg = ring.curr;
      const tracks = store.getState().tracks;
      if (tracks.length === 0) {
        transitioningRef.current = false;
        crossfadePhaseRef.current = "play";
        phaseStartTsRef.current = performance.now();
        store.getState().setCrossfade({ phase: "play" });
        store.getState().setNextIndex(-1);
        return;
      }

      // Determine which slot was promoted: source is the slot whose
      // trackIndex matches currentIndex post-beginCrossfade.
      const currIdx = store.getState().currentIndex;
      const incoming = direction === "forward" ? ring.next : ring.prev;
      const toRecycle = direction === "forward" ? ring.prev : ring.next;

      let promoted: RP_Studio | null = null;
      if (incoming && incoming.trackIndex === currIdx) {
        promoted = incoming;
      } else if (oldFg && oldFg.trackIndex === currIdx) {
        // resolveSource built a fresh Howl that lived only as `source` —
        // already audible; we cannot recover it from the ring. Fall back:
        // do nothing, the RAF will reseed on the next play.
        promoted = null;
      }

      if (oldFg) {
        try {
          oldFg.stop();
          oldFg.off();
        } catch {
          // ignore — Howl may already be torn down.
        }
      }

      if (promoted) {
        if (direction === "forward") {
          ring.prev = oldFg;
          ring.curr = promoted;
          const recycleIdx = (currIdx + 1) % tracks.length;
          const recycleTrack = tracks[recycleIdx];
          ring.next = recycleTrack
            ? recycleOrBuild(toRecycle, recycleTrack, recycleIdx)
            : null;
        } else {
          ring.next = oldFg;
          ring.curr = promoted;
          const recycleIdx =
            (((currIdx - 1) % tracks.length) + tracks.length) % tracks.length;
          const recycleTrack = tracks[recycleIdx];
          ring.prev = recycleTrack
            ? recycleOrBuild(toRecycle, recycleTrack, recycleIdx)
            : null;
        }
        promoted.volume(1);
        wireFgListeners(promoted);
      }

      store.getState().dispatchPlay({ type: "HOWL_PLAY" });
      store.getState().dispatchPlay({ type: "RECONCILE" });

      nextPreloadedRef.current = false;
      crossfadePhaseRef.current = "play";
      phaseStartTsRef.current = performance.now();
      transitioningRef.current = false;
      store.getState().setCrossfade({ phase: "play" });
      store.getState().setNextIndex(-1);
    }

    /**
     * User-initiated next/previous: hard-cut the current Howl, rotate the
     * ring, and start the new track at full volume. No fade — parity with
     * Apple Music / Spotify behaviour when the user taps skip.
     */
    function hardCutTo(
      targetIndex: number,
      direction: "forward" | "backward"
    ): void {
      const s = store.getState();
      const tracks = s.tracks;
      if (tracks.length === 0) return;
      const clampedIndex =
        ((targetIndex % tracks.length) + tracks.length) % tracks.length;
      const nextTrack = tracks[clampedIndex];
      if (!nextTrack) return;

      const ring = ringRef.current;
      const fg = ring.curr;
      if (!fg) return;

      if (clampedIndex === fg.trackIndex) {
        fg.seek(0);
        store.getState().setElapsed(0);
        writePersistedSeed(clampedIndex, 0);
        return;
      }

      const incoming = direction === "forward" ? ring.next : ring.prev;
      const toRecycle = direction === "forward" ? ring.prev : ring.next;

      let source: RP_Studio;
      if (incoming && incoming.trackIndex === clampedIndex) {
        source = incoming;
        if (source.state() === "unloaded") source.load();
      } else {
        source = buildStudio(nextTrack, clampedIndex, true);
      }

      try {
        fg.stop();
        fg.off();
      } catch {
        // ignore
      }

      if (direction === "forward") {
        ring.prev = fg;
        ring.curr = source;
        const recycleIdx = (clampedIndex + 1) % tracks.length;
        const recycleTrack = tracks[recycleIdx];
        ring.next = recycleTrack
          ? recycleOrBuild(toRecycle, recycleTrack, recycleIdx)
          : null;
      } else {
        ring.next = fg;
        ring.curr = source;
        const recycleIdx =
          (((clampedIndex - 1) % tracks.length) + tracks.length) %
          tracks.length;
        const recycleTrack = tracks[recycleIdx];
        ring.prev = recycleTrack
          ? recycleOrBuild(toRecycle, recycleTrack, recycleIdx)
          : null;
      }

      source.volume(1);
      source.play();
      wireFgListeners(source);

      store.getState().setCurrentIndex(clampedIndex);
      store.getState().setElapsed(0);
      store.getState().setNextIndex(-1);
      store.getState().setCrossfade({ phase: "play" });
      const duration = source.duration();
      if (Number.isFinite(duration) && duration > 0) {
        store.getState().setDuration(duration);
      }
      store.getState().dispatchPlay({ type: "HOWL_PLAY" });
      store.getState().dispatchPlay({ type: "RECONCILE" });

      nextPreloadedRef.current = false;
      crossfadePhaseRef.current = "play";
      phaseStartTsRef.current = performance.now();
      transitioningRef.current = false;

      if (hasMediaSession()) {
        setNowPlayingMetadata(nextTrack);
      }
      writePersistedSeed(clampedIndex, 0);
    }

    /**
     * End-of-track auto-advance. Tries crossfade first; falls back to
     * hard-cut when the source is not yet loaded (the listener fired
     * before the RAF preload kicked in).
     */
    function autoAdvance(): void {
      const s = store.getState();
      if (s.tracks.length === 0) return;
      const targetIdx = (s.currentIndex + 1) % s.tracks.length;
      const ok = beginCrossfade(targetIdx, "forward");
      if (!ok) {
        hardCutTo(targetIdx, "forward");
      }
    }

    async function next(): Promise<void> {
      const s = store.getState();
      if (s.tracks.length === 0) return;
      hardCutTo(s.currentIndex + 1, "forward");
    }

    async function previous(): Promise<void> {
      const s = store.getState();
      if (s.tracks.length === 0) return;
      hardCutTo(s.currentIndex - 1, "backward");
    }

    function seek(seconds: number): void {
      const fg = ringRef.current.curr;
      if (!fg) return;
      if (!Number.isFinite(seconds) || seconds < 0) return;
      fg.seek(seconds);
      store.getState().setElapsed(seconds);
      writePersistedSeed(store.getState().currentIndex, seconds);
    }

    async function refresh(): Promise<void> {
      store.getState().setLoading(true);
      try {
        const tracks = await fetchTracks();
        store.getState().setTracks(tracks);
        store.getState().setError(null);
      } catch {
        store.getState().setError("refresh-failed");
      } finally {
        store.getState().setLoading(false);
      }
    }

    function restoreFromStorage(): void {
      const persisted = readPersistedSeed();
      if (!persisted || !isPersistedSeedFresh(persisted)) return;
      const s = store.getState();
      if (persisted.index < 0 || persisted.index >= s.tracks.length) return;
      s.setCurrentIndex(persisted.index);
      s.setInitialSeek(persisted.timeSec);
    }

    wireFgListenersRef.current = wireFgListeners;
    beginCrossfadeRef.current = beginCrossfade;
    commitCrossfadeRef.current = commitCrossfade;
    autoAdvanceRef.current = autoAdvance;

    return {
      play,
      pause,
      toggle,
      next,
      previous,
      seek,
      refresh,
      restoreFromStorage
    };
  }, [store]);

  // Bootstrap: fetch tracks, seed store, instantiate fg Howl.
  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      store.getState().setLoading(true);
      try {
        const tracks = await fetchTracks();
        if (cancelled) return;

        const persisted = readPersistedSeed();
        const freshPersisted =
          persisted && isPersistedSeedFresh(persisted) ? persisted : null;

        const seed = pickSeed(tracks, freshPersisted);

        store.getState().setTracks(tracks);
        store.getState().setCurrentIndex(seed.index);
        store.getState().setInitialSeek(seed.seekSec);
        store.getState().setDuration(tracks[seed.index]?.duration ?? 0);
        store.getState().setError(null);

        const seedTrack = tracks[seed.index];
        if (!seedTrack) return;

        const fg = new RP_Studio({
          track: seedTrack,
          trackIndex: seed.index,
          src: [seedTrack.url],
          html5: true,
          preload: true,
          volume: 0,
          onload: () => {
            const f = ringRef.current.curr;
            if (!f) return;
            const duration = f.duration();
            if (Number.isFinite(duration)) {
              store.getState().setDuration(duration);
            }
            // Random-seek first-impression: seek to the chosen offset the
            // moment the track is loadable, so unmute lands mid-track.
            if (seed.seekSec > 0 && seed.seekSec < duration) {
              f.seek(seed.seekSec);
              store.getState().setElapsed(seed.seekSec);
            }
          }
        });

        const ring = ringRef.current;
        ring.curr = fg;
        // Wire orchestrator-aware listeners so end-of-track auto-advances
        // through the crossfade machine instead of hard-cutting.
        wireFgListenersRef.current?.(fg);

        if (tracks.length > 1) {
          const nextIdx = (seed.index + 1) % tracks.length;
          const nextBgTrack = tracks[nextIdx];
          if (nextBgTrack) {
            ring.next = new RP_Studio({
              track: nextBgTrack,
              trackIndex: nextIdx,
              src: [nextBgTrack.url],
              html5: true,
              preload: false,
              volume: 0
            });
          }
        }
        nextPreloadedRef.current = false;

        if (hasMediaSession()) {
          setNowPlayingMetadata(seedTrack);
          wireActionHandlers({
            play: () => void controls.play(),
            pause: () => controls.pause()
          });
        }
      } catch {
        if (!cancelled) store.getState().setError("boot-failed");
      } finally {
        if (!cancelled) store.getState().setLoading(false);
      }
    }

    void boot();

    // Gesture unlock — required before Howler can resume its AudioContext.
    // One-shot: removes itself after first user gesture.
    function unlock(): void {
      const fg = ringRef.current.curr;
      if (fg) {
        fg.volume(1);
        store.getState().setUnlocked(true);
      }
      attachAnalyser();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
    }

    function attachAnalyser(): void {
      if (analyserAttachedRef.current) return;
      const ctx = Howler.ctx as AudioContext | undefined;
      const master = Howler.masterGain as AudioNode | undefined;
      if (!ctx || !master) return;

      try {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        // Initial smoothing from params; updated each tick if Leva changes it.
        analyser.smoothingTimeConstant = beatDetectorParams.analyserSmoothing;
        master.connect(analyser);
        analyserRef.current = analyser;
        analyserBufferRef.current = new Uint8Array(analyser.frequencyBinCount);
        analyserAttachedRef.current = true;
      } catch {
        // Audio graph not ready yet; RAF loop will retry on next frame.
      }
    }

    // Bridge HTML5 <audio> elements into Web Audio so the analyser can see
    // them. Howler is configured with html5: true (needed for streaming long
    // tracks), which means the audio plays through HTMLAudioElement and
    // bypasses Howler's masterGain/AudioContext entirely. Without this bridge
    // every visualiser reads silence regardless of what's actually playing.
    function bridgeStudioToAnalyser(studio: RP_Studio | null): void {
      if (!studio) return;
      const ctx = Howler.ctx as AudioContext | undefined;
      const master = Howler.masterGain as AudioNode | undefined;
      if (!ctx || !master) return;
      try {
        // RP_Studio extends Howl directly — `_sounds` are on the studio itself.
        // In html5 mode each Sound's `_node` is actually an HTMLAudioElement
        // (the existing type declaration says GainNode|AudioNode for the
        // Web Audio path, hence the `unknown` widening before the runtime
        // instanceof check).
        const sounds = studio._sounds ?? [];
        for (const snd of sounds) {
          const node = snd._node as unknown;
          if (!node || !(node instanceof HTMLMediaElement)) continue;
          if (bridgedElementsRef.current.has(node)) continue;
          // Each HTMLMediaElement can have at most ONE MediaElementAudioSource
          // ever; double-bridging throws InvalidStateError. WeakSet guards.
          const src = ctx.createMediaElementSource(node);
          src.connect(master);
          bridgedElementsRef.current.add(node);
        }
      } catch {
        // Element may already be connected from a prior bridge; safe to ignore.
      }
    }

    document.addEventListener("pointerdown", unlock, { passive: true });
    document.addEventListener("keydown", unlock);
    document.addEventListener("touchstart", unlock, { passive: true });

    // RAF loop: update elapsed, feed audio-level MotionValue, drive crossfade
    // state machine pre-emptively near track end.
    function tick(): void {
      const fg = ringRef.current.curr;
      const s = store.getState();

      if (fg && s.playState.real === "playing") {
        const elapsed = fg.seek();
        if (typeof elapsed === "number" && Number.isFinite(elapsed)) {
          s.setElapsed(elapsed);

          if (!nextPreloadedRef.current && s.durationSec > 0) {
            const remaining = s.durationSec - elapsed;
            const threshold = Math.max(
              PRELOAD_LEAD_SEC,
              s.durationSec * PRELOAD_LEAD_RATIO
            );
            if (remaining <= threshold) {
              const next = ringRef.current.next;
              if (next && next.state() === "unloaded") {
                next.load();
              }
              nextPreloadedRef.current = true;
            }
          }

          if (s.durationSec > 0) {
            const phase = crossfadePhaseRef.current;
            const phaseElapsedMs =
              phase === "crossfade"
                ? performance.now() - phaseStartTsRef.current
                : 0;
            const sourceLoaded = ringRef.current.next?.state() === "loaded";

            const decision = nextCrossfadeStep({
              phase,
              elapsedSec: elapsed,
              durationSec: s.durationSec,
              phaseElapsedMs,
              fadeMs: DEFAULT_FADE_MS,
              thresholdSec: CROSSFADE_THRESHOLD_SEC,
              sourceLoaded
            });

            if (decision.action === "beginCrossfade") {
              const targetIndex =
                (s.currentIndex + 1) % Math.max(s.tracks.length, 1);
              beginCrossfadeRef.current?.(targetIndex, "forward");
            } else if (decision.action === "commitCrossfade") {
              commitCrossfadeRef.current?.("forward");
            }
          }
        }
      }

      // Analyser feed
      if (!analyserAttachedRef.current) {
        attachAnalyser();
      }
      // Each frame, ensure foreground+next studios' audio elements are bridged
      // into Web Audio. Cheap (WeakSet check) for already-bridged elements.
      bridgeStudioToAnalyser(ringRef.current.curr);
      bridgeStudioToAnalyser(ringRef.current.next);
      const analyser = analyserRef.current;
      const buffer = analyserBufferRef.current;
      if (analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
        // ── Beat-band transient detector ─────────────────────────────────
        // All thresholds/weights live in `beatDetectorParams` so they can
        // be tuned live via the Leva panel. See ./beatDetectorParams.ts and
        // ./BeatDetectorControls.tsx for the control surface.
        // Defaults target the snare/clap/upper-mid range (~550-1226 Hz)
        // which carries the perceptual groove for most modern music.
        const params = beatDetectorParams;

        // Live-update analyser smoothing if it changed via the panel.
        if (analyser.smoothingTimeConstant !== params.analyserSmoothing) {
          analyser.smoothingTimeConstant = params.analyserSmoothing;
        }

        // Convert Hz cutoffs → bin indices using the analyser's actual sample
        // rate. binWidth = sampleRate / fftSize. Clamped to valid bin range.
        const binWidth = analyser.context.sampleRate / analyser.fftSize;
        const lowBin = Math.max(
          0,
          Math.min(buffer.length - 1, Math.floor(params.lowCutHz / binWidth))
        );
        const highBin = Math.max(
          lowBin + 1,
          Math.min(buffer.length, Math.ceil(params.highCutHz / binWidth))
        );

        let sumSq = 0;
        for (let i = lowBin; i < highBin; i++) {
          const v = buffer[i] / 255;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / (highBin - lowBin));

        // Adaptive baseline — slow rise (absorbs sustained content),
        // configurable fall (re-arms detector after silence).
        const prevBaseline = beatBaselineRef.current;
        const baselineAlpha =
          rms > prevBaseline
            ? params.baselineRiseAlpha
            : params.baselineFallAlpha;
        const baseline = prevBaseline + (rms - prevBaseline) * baselineAlpha;
        beatBaselineRef.current = baseline;

        // Absolute floor — anything quieter than this is silence regardless
        // of how it compares to the baseline.
        const aboveFloor = Math.max(0, rms - params.absoluteFloor);
        // Transient = current EXCEEDS both the floor AND the baseline.
        const transient = Math.max(
          0,
          aboveFloor - Math.max(0, baseline - params.absoluteFloor)
        );
        // Hard gate on the surviving transient (filter low-level noise).
        const gated = Math.max(0, transient - params.gate);
        // Amplify surviving signal into the visual range.
        const level = Math.min(1, gated * params.amplify);
        s.audioLevelMV.set(level);
      }

      rafRef.current = window.requestAnimationFrame(tick);
    }

    rafRef.current = window.requestAnimationFrame(tick);

    // Persistence: write on hide + unload.
    function persist(): void {
      const fg = ringRef.current.curr;
      if (!fg) return;
      const elapsed = fg.seek();
      if (typeof elapsed === "number" && Number.isFinite(elapsed)) {
        writePersistedSeed(store.getState().currentIndex, elapsed);
      }
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === "hidden") persist();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", persist);
    window.addEventListener("pagehide", persist);

    return () => {
      cancelled = true;

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // unlock removes itself on first fire; clean up in case it never fired.
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", persist);
      window.removeEventListener("pagehide", persist);

      persist();

      if (hasMediaSession()) clearActionHandlers();

      const ring = ringRef.current;
      for (const slot of [ring.prev, ring.curr, ring.next]) {
        try {
          slot?.unload();
        } catch {}
      }
      ring.prev = null;
      ring.curr = null;
      ring.next = null;

      analyserRef.current = null;
      analyserBufferRef.current = null;
      analyserAttachedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<HideawayFMContextValue>(
    () => ({ store, controls }),
    [store, controls]
  );

  return (
    <HideawayFMContext value={value}>
      {children}
      <div id="hideaway-fm-popovers" />
    </HideawayFMContext>
  );
}

/** Internal helper — subscribe to the HideawayFM store via a selector. */
export function useHideawayFM<T>(selector: (state: HideawayFMStore) => T): T {
  const ctx = useContext(HideawayFMContext);
  if (!ctx) {
    throw new Error(
      "HideawayFM hooks must be used inside <HideawayFMProvider>."
    );
  }
  return useStore(ctx.store, selector);
}

export function useHideawayFMControls(): HideawayFMControls {
  const ctx = useContext(HideawayFMContext);
  if (!ctx) {
    throw new Error(
      "HideawayFM hooks must be used inside <HideawayFMProvider>."
    );
  }
  return ctx.controls;
}
