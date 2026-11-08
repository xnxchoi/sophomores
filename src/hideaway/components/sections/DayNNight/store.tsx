"use client";

import { clamp } from "@/hideaway/utilities/mathUtilities";
import { MotionValue, useMotionValue, useTransform } from "motion/react";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * Day n Night — page-local scene store.
 *
 * Shared between the HTML content (horizontal-scroll timeline) and the
 * sky/sun renderer. All time-of-day visuals are driven by a single
 * `progress` value in [0, 1] that maps to the story arc:
 *
 *   0.00 — daytime (loop wrap point — matches 1.00 for seamless wrap)
 *   0.088 — Opening center: full daytime bright
 *   0.279 — Cookout center: golden hour (the cookout window)
 *   0.478 — Dress center: sunset
 *   0.664 — Night center: deep night
 *   0.876 — Closing center: pre-dawn / dawn break beginning
 *   1.00 — daytime (matches 0.00 — seamless wrap)
 *
 * The loop reads as a full day → night → dawn cycle. After Closing the
 * sky lifts through pre-dawn into a quick sunrise that returns to
 * daytime exactly at the wrap point, so 1.0 → 0.0 is invisible.
 *
 * The loader writes 0 → horizonLoop; the scroll-driven timeline writes
 * loopProgress in [0, 1].
 */

type Phase = "loading" | "loaded" | "playing";

/**
 * Live-measured geometry of the act track. Widths live in SCSS (each
 * `.actOpening / .actCookout / ...` declares its own `--act-w`);
 * Timeline measures the resulting DOM widths at mount + on resize and
 * writes this shape into the store. The Scrubber and the loader-handoff
 * math both read from here — no parallel JS widths table.
 */
export interface ActLayout {
  /** Section keys in render order. */
  keys: readonly string[];
  /** Per-act widths in px, length == keys.length. */
  widths: readonly number[];
  /** Cumulative starts in px. */
  starts: readonly number[];
  /** Cumulative centers in px (starts[i] + widths[i] / 2). */
  centers: readonly number[];
  /** Width of one set of acts in px (sum of widths). */
  setWidth: number;
  /** Viewport width / setWidth — used for centering math. */
  viewportFrac: number;
  /** starts[i] / setWidth — section-start positions in loop fraction. */
  startsFrac: readonly number[];
  /** centers[i] / setWidth — section-center positions in loop fraction. */
  centersFrac: readonly number[];
}

/**
 * The 5 acts in render order. Identity only — widths and positions live
 * in SCSS and get measured live (see ActLayout). Both Timeline (renders
 * the acts) and Scrubber (renders the labels) import this so the order
 * is a single source of truth.
 */
export const SECTION_KEYS = [
  "opening",
  "cookout",
  "dress",
  "night",
  "closing"
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/**
 * Which act we want the viewport CENTER to sit on right after the loader
 * handoff. Index 0 = Opening — "the day at the Hideaway begins" — so the
 * page lands at daytime, matching SKY_STOPS[0] (full daytime bright).
 *
 * With anchor=0, the derived `horizonLoop` collapses to ~0 (Opening's
 * center sits at the start of the loop). The loader's staged sun-rise
 * gesture therefore can't play out in scene-progress space; SunLoader
 * keeps scene-progress pinned at the handoff target and animates only its
 * chrome (bar fill) in time-u space. SceneView's loader-phase sun branch
 * guards the resulting NaN by falling through to the playing-phase path
 * (sampleCelestial) when horizonLoop is too small for a staged rise.
 */
export const ANCHOR_SECTION_INDEX = 0;
type SceneState = {
  progress: number;
  phase: Phase;
  /** Null until Timeline measures the DOM on mount. */
  layout: ActLayout | null;
  /**
   * Loader-local time progress in [0, 1]. SunLoader writes this each
   * tick during the loading phase; the Opening act's choreographed
   * reveal reads it to fade copy in lockstep with the sun rise. After
   * the loader completes it stays at 1, so re-entries (user scrolls
   * back to Opening) read fully-revealed copy with no lingering hidden
   * state. Distinct from `progress` because with anchor=0 the scene's
   * progress is 0 throughout the loader, so it can't drive the reveal.
   */
  loaderProgress: number;
  /**
   * loopProgress at which the viewport center sits on the anchor act's
   * center. Derived from layout — re-computed every time layout updates.
   * Loader handoff and Scrubber.handleJump both reference this so the
   * "you land here on reload" position is a single source of truth.
   */
  initialLoopPosition: number;
  /**
   * Alias used by the celestial sampler. Sun-at-horizon coincides with
   * INITIAL_LOOP_POSITION by definition (the loader hands off with sun
   * at horizon, scene starts at the same loopProgress).
   */
  horizonLoop: number;
  /**
   * Liminal → Nighttime handoff (§ 2.9 of DAY_N_NIGHT_HANDOFF.md).
   *
   * False from mount until the cassette button press in the cinematic
   * handoff sequence — at which point `<LiminalHandoff>` (§ 3.6) calls
   * `fireLiminalHandoff()` synchronously with the click SFX frame.
   *
   * `<DayNNightScore>` reads this to swap its bed from the Act 1
   * country track to the Act 2 house track. Event-driven, not
   * scroll-driven. Once true, stays true for the session; reset on
   * Immersive unmount so a re-entry replays the handoff.
   */
  liminalHandoffFired: boolean;
};
type SceneAct = {
  setProgress: (p: number) => void;
  setPhase: (p: Phase) => void;
  setLayout: (layout: ActLayout) => void;
  setLoaderProgress: (u: number) => void;
  fireLiminalHandoff: () => void;
  resetLiminalHandoff: () => void;
};
type SceneStore = SceneState & SceneAct;
/**
 * Fallback used before Timeline measures. With anchor=0 (Opening),
 * Opening's center lands at viewport center when loopProgress sits at
 * (Opening.centerFrac − viewportFrac/2). For a uniform 5-act layout
 * that's 0; for the actual variable widths it stays very close to 0.
 * Using 0 here matches the post-measurement value and prevents a sun
 * pop when Timeline finishes measuring.
 */
const FALLBACK_HORIZON = 0;
const createDayCycle = (
  initial: SceneState = {
    progress: 0,
    loaderProgress: 0,
    phase: "loading",
    layout: null,
    initialLoopPosition: FALLBACK_HORIZON,
    horizonLoop: FALLBACK_HORIZON,
    liminalHandoffFired: false
  }
) =>
  createStore<SceneStore>()((set) => ({
    ...initial,
    setProgress: (progress) => set({ progress }),
    setPhase: (phase) => set({ phase }),
    setLoaderProgress: (loaderProgress) => set({ loaderProgress }),
    fireLiminalHandoff: () => set({ liminalHandoffFired: true }),
    resetLiminalHandoff: () => set({ liminalHandoffFired: false }),
    setLayout: (layout) => {
      // Derive the loopProgress where the viewport center sits at the
      // anchor act's center:
      //   centerInTrackPx          = anchor.center
      //   viewportCenterInTrackPx  = loopProgress * setWidth + viewportWidth/2
      // solving:
      //   loopProgress = (anchor.center - viewportWidth/2) / setWidth
      //                = anchor.centerFrac - viewportFrac/2
      const anchor = Math.min(
        ANCHOR_SECTION_INDEX,
        Math.max(0, layout.keys.length - 1)
      );
      const initialLoopPosition =
        layout.centersFrac[anchor] - layout.viewportFrac / 2;
      set({
        layout,
        initialLoopPosition,
        horizonLoop: initialLoopPosition
      });
    }
  }));
type DayCycleAPI = ReturnType<typeof createDayCycle>;
const DayCycleCtx = createContext<DayCycleAPI | null>(null);
export const DayCycleProvider = ({ children }: { children: ReactNode }) => {
  const f = useRef<DayCycleAPI>(null);
  if (!f.current) {
    f.current = createDayCycle();
  }
  return <DayCycleCtx value={f.current}>{children}</DayCycleCtx>;
};
export const useDayNNightScene = <T,>(r: (s: SceneStore) => T) => {
  const f = useContext(DayCycleCtx);
  if (!f) throw new Error("DayCycleCtx not found");
  return useStore(f, r);
};

/**
 * Imperative handle to the scene store — exposes `.getState()`,
 * `.setState()`, and `.subscribe()` for callers that need to read fresh
 * values inside requestAnimationFrame loops or other non-React contexts
 * without forcing a component re-render per tick.
 *
 * The hook itself is React (must run inside DayCycleProvider); the
 * returned API is plain Zustand-vanilla. Capture once at component
 * mount, then call methods on it imperatively for the lifetime of the
 * effect.
 *
 * This existed implicitly on `useDayNNightScene` itself when the store
 * was built with `create()` from the standard `zustand` package
 * (pre-vanilla refactor). The refactor to `createStore` from
 * `zustand/vanilla` + React context dropped that surface — every prior
 * `useDayNNightScene.getState()` call site was silently breaking until
 * this hook restored the imperative path.
 */
export const useDayNNightStore = () => {
  const f = useContext(DayCycleCtx);
  if (!f) throw new Error("DayCycleCtx not found");
  return f;
};

/**
 * Find which section index currently sits at viewport center, given a
 * loopProgress in [0, 1) and a layout. Wraps modulo so loopProgress near
 * 1.0 lands cleanly on the first section. Returns 0 when layout is null.
 */
export function sectionAtLoop(
  loopProgress: number,
  layout: ActLayout | null
): number {
  if (!layout) return 0;
  const vc = loopProgress + layout.viewportFrac / 2;
  const vcMod = ((vc % 1) + 1) % 1;
  for (let i = 0; i < layout.startsFrac.length; i++) {
    const start = layout.startsFrac[i];
    const end = i + 1 < layout.startsFrac.length ? layout.startsFrac[i + 1] : 1;
    if (vcMod >= start && vcMod < end) return i;
  }
  return 0;
}

/**
 * Sample the sky palette at a given progress. Returns OKLCH-ish RGB tuples in
 * [0,1] space (linear). The R3F shader and any CSS gradient consumers read
 * from the same source of truth.
 */
export interface SkyStop {
  at: number;
  top: [number, number, number];
  mid: [number, number, number];
  bottom: [number, number, number];
}

// Palette samples across one full daytime→night→dawn→back-to-daytime cycle.
// Opening (centered at 0.088) reads as full daytime — that's the user's
// "the day at the Hideaway begins in bright daylight" intent. The arc then
// warms through golden hour (Cookout), sunsets (Dress), deepens into night,
// breaks pre-dawn at Closing, and lifts back to bright daytime by the wrap
// point. The last stop at 1.0 matches the first stop at 0.0 so the modulo
// wrap is invisible.
export const SKY_STOPS: SkyStop[] = [
  // 0.00 — daytime (loop wrap, identical to 1.00)
  {
    at: 0.0,
    top: [0.4, 0.62, 0.85],
    mid: [0.65, 0.8, 0.94],
    bottom: [0.95, 0.92, 0.85]
  },
  // 0.088 — Opening center: full daytime bright
  {
    at: 0.088,
    top: [0.4, 0.62, 0.85],
    mid: [0.65, 0.8, 0.94],
    bottom: [0.95, 0.92, 0.85]
  },
  // 0.18 — late afternoon, sky warming
  {
    at: 0.18,
    top: [0.42, 0.62, 0.85],
    mid: [0.85, 0.78, 0.65],
    bottom: [0.99, 0.85, 0.62]
  },
  // 0.279 — Cookout center: golden hour
  {
    at: 0.279,
    top: [0.48, 0.69, 0.84],
    mid: [1.0, 0.82, 0.48],
    bottom: [1.0, 0.71, 0.42]
  },
  // 0.39 — approaching sunset
  {
    at: 0.39,
    top: [0.4, 0.5, 0.65],
    mid: [0.95, 0.55, 0.32],
    bottom: [1.0, 0.65, 0.38]
  },
  // 0.478 — Dress center: sunset
  {
    at: 0.478,
    top: [0.23, 0.21, 0.31],
    mid: [0.85, 0.38, 0.17],
    bottom: [0.94, 0.66, 0.35]
  },
  // 0.575 — post-sunset / dusk
  {
    at: 0.575,
    top: [0.1, 0.1, 0.22],
    mid: [0.3, 0.18, 0.32],
    bottom: [0.55, 0.32, 0.4]
  },
  // 0.664 — Night center: deep night
  {
    at: 0.664,
    top: [0.008, 0.012, 0.08],
    mid: [0.04, 0.04, 0.15],
    bottom: [0.1, 0.09, 0.22]
  },
  // 0.78 — late night
  {
    at: 0.78,
    top: [0.02, 0.018, 0.1],
    mid: [0.06, 0.03, 0.17],
    bottom: [0.13, 0.05, 0.22]
  },
  // 0.876 — Closing center: pre-dawn / dawn break beginning
  {
    at: 0.876,
    top: [0.04, 0.03, 0.14],
    mid: [0.12, 0.05, 0.23],
    bottom: [0.22, 0.08, 0.28]
  },
  // 0.94 — dawn rising (purple-orange)
  {
    at: 0.94,
    top: [0.19, 0.14, 0.32],
    mid: [0.45, 0.21, 0.35],
    bottom: [0.85, 0.55, 0.32]
  },
  // 0.98 — sunrise bright
  {
    at: 0.98,
    top: [0.3, 0.45, 0.7],
    mid: [0.85, 0.72, 0.58],
    bottom: [1.0, 0.85, 0.65]
  },
  // 1.00 — daytime (identical to 0.0 — seamless wrap)
  {
    at: 1.0,
    top: [0.4, 0.62, 0.85],
    mid: [0.65, 0.8, 0.94],
    bottom: [0.95, 0.92, 0.85]
  }
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface SkySample {
  top: [number, number, number];
  mid: [number, number, number];
  bottom: [number, number, number];
}

/**
 * Celestial-body state at a given progress.
 *
 * Single-direction motion: the sun rises vertically and only vertically,
 * passing fully through the viewport once per loop. Position is given as
 * an x/y pair where y is a viewport-y fraction (0 = bottom edge, 1 = top
 * edge). The sun starts below the horizon at the loop start and exits
 * above the viewport at the loop end — both off-screen states. The loop
 * wrap from y ≈ 1.15 back to y ≈ -0.15 happens entirely outside the
 * visible viewport, so the user never sees the seam.
 */
export interface CelestialBodyState {
  x: number;
  y: MotionValue<number>;
  opacity: MotionValue<number>;
  color: MotionValue<[number, number, number]>;
  size: MotionValue<number>;
}

export interface CelestialMoonState {
  x: number;
  y: number;
  opacity: number;
  color: [number, number, number];
  size: number;
}

export interface CelestialState {
  sun: CelestialBodyState;
  moon: CelestialMoonState;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Sun-y at horizon, in viewport-y fraction. The loader hands the sun to
 * the scene at exactly this position so the handoff has no visual jump.
 * Also where the horizon glow band sits.
 */
export const HORIZON_Y = 0.5;

export function useSampleCelestial(): CelestialState {
  // progress IS loopProgress in [0, 1]. The sun rises from just below
  // the horizon at progress=0, hits the horizon at progress=HORIZON_LOOP
  // (the anchor-act center == initial-scroll position), then continues
  // rising and exits well above the viewport top before wrapping back
  // to "below the bottom" — both endpoints off-screen. Because the sky
  // palette's first and last stops are identical (pre-dawn), the modulo
  // wrap 1.0 → 0.0 is visually invisible.
  //
  // HORIZON_LOOP defaults to whatever the store currently holds (Timeline
  // measures the act track on mount and writes the derived value). The
  // fallback (0.2) covers SSR and pre-measurement frames.
  const store = useDayNNightStore();
  const initialState = store.getState();
  const horizonLoop = useMotionValue(initialState.horizonLoop);
  const progress = useMotionValue(initialState.progress);
  useEffect(
    () =>
      store.subscribe((state) => {
        horizonLoop.set(state.horizonLoop);
        progress.set(state.progress);
      }),
    [horizonLoop, progress, store]
  );
  const sunY = useTransform(() => {
    const t = progress.get();
    const HORIZON_LOOP = horizonLoop.get();
    const loopProgress = clamp(t, 0, 1);
    return loopProgress < HORIZON_LOOP
      ? -0.15 + (loopProgress / HORIZON_LOOP) * (HORIZON_Y + 0.15)
      : HORIZON_Y +
          ((loopProgress - HORIZON_LOOP) / (1 - HORIZON_LOOP)) *
            (1.15 - HORIZON_Y);
  });

  // Sun stays horizontally centered. No lateral motion — the user's one
  // direction rule.
  const sunX = 0;

  // Visibility envelope — invisible while off-screen so the wrap is clean.
  const sunFadeIn = useTransform(() => smoothstep(-0.08, 0.05, sunY.get()));
  const sunFadeOut = useTransform(() => 1 - smoothstep(0.98, 1.1, sunY.get()));
  const sunOpacity = useTransform(() =>
    Math.min(sunFadeIn.get(), sunFadeOut.get())
  );

  // Warm at the horizon, paler higher up.
  const heatT = useTransform(() => smoothstep(0.5, 1.0, sunY.get()));
  const sunColor = useTransform(
    () =>
      [1, lerp(0.78, 0.95, heatT.get()), lerp(0.42, 0.85, heatT.get())] as [
        number,
        number,
        number
      ]
  );
  const sunSize = useTransform(() => lerp(0.115, 0.085, heatT.get()));

  // Moon removed — single-direction rule means we only show the sun.
  return {
    sun: {
      x: sunX,
      y: sunY,
      opacity: sunOpacity,
      color: sunColor,
      size: sunSize
    },
    moon: {
      x: 0,
      y: -10,
      opacity: 0,
      color: [0.91, 0.94, 1.0],
      size: 0.075
    }
  };
}
