"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";

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

/**
 * Bezel-feel easings.
 *
 *   - `easeInOutQuart` (entries 0 + 1) — sharper shoulders than sine/cubic,
 *     more felt acceleration into the middle, slower entry and exit. Reads
 *     as "weighted" rather than "drifty." Doubled in the array so it shows
 *     up ~2/3 of the time.
 *
 *   - `easeInOutBack` with reduced back amount (entry 2) — undershoots at
 *     start (loading the spring) and overshoots ~3% at end (the "click"
 *     into a detent). Picked ~1/3 of the time so most clicks settle, some
 *     just glide.
 */
const EASINGS: ReadonlyArray<(t: number) => number> = [
  (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  (t) => {
    const c1 = 0.5;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }
];

interface LaneMovement {
  startOffsetPx: number;
  distancePx: number;
  easeIdx: number;
}

interface CycleState {
  cycleStartMs: number;
  isMoving: boolean;
  cycleDurationMs: number;
  /** Raw (un-scaled) per-lane primary eased offset accumulator, in px. */
  primaryOffsets: Float32Array;
  /** Per-lane move recipe (only meaningful when `isMoving`). */
  movements: LaneMovement[];
}

/**
 * Hard cap on lanes. Must match the `u_offsetsPx[24]` declaration and the
 * `lookupOffset` switch in the GLSL fragment shader (`LineFieldMesh.tsx`).
 * Changing it here without updating the shader will produce an off-by-one
 * read or a silent truncation.
 */
export const MAX_LANES = 24;

function pickInRange(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min);
}

function pickSigned(min: number, max: number): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * pickInRange(min, max);
}

function makeCycle(
  prev: CycleState | null,
  isMoving: boolean,
  nowMs: number,
  numLanes: number,
  bounds: SchedulerBounds
): CycleState {
  const cycleDurationMs = isMoving
    ? pickInRange(bounds.moveMinMs, bounds.moveMaxMs)
    : pickInRange(bounds.pauseMinMs, bounds.pauseMaxMs);

  const primaryOffsets = prev
    ? Float32Array.from(prev.primaryOffsets)
    : new Float32Array(numLanes);

  const movements: LaneMovement[] = new Array(numLanes);
  for (let i = 0; i < numLanes; i++) {
    if (isMoving) {
      const distancePx = pickSigned(
        bounds.laneDistanceMinPx,
        bounds.laneDistanceMaxPx
      );
      const easeIdx = Math.floor(Math.random() * EASINGS.length);
      movements[i] = {
        startOffsetPx: primaryOffsets[i],
        distancePx,
        easeIdx
      };
    } else {
      movements[i] = {
        startOffsetPx: primaryOffsets[i],
        distancePx: 0,
        easeIdx: 0
      };
    }
  }

  return {
    cycleStartMs: nowMs,
    isMoving,
    cycleDurationMs,
    primaryOffsets,
    movements
  };
}

/**
 * Advances the move/pause cycle for the current frame.
 *
 * **Mutation contract:** this function mutates `state.primaryOffsets` in
 * place, and may also return a brand-new `CycleState` from `makeCycle`
 * when the cycle flips. Callers must treat the return value as the
 * authoritative state and discard the input reference. The mutation is
 * safe within `useFrame` only because the strict in-frame ordering is
 *
 *   1. snap state machine reads `primaryOffsets`
 *   2. `tickPrimary` mutates `primaryOffsets`
 *   3. output composition reads `primaryOffsets`
 *
 * Reordering callers would observe inconsistent intermediate state.
 */
function tickPrimary(
  state: CycleState,
  nowMs: number,
  numLanes: number,
  bounds: SchedulerBounds
): CycleState {
  const intoCycle = nowMs - state.cycleStartMs;
  if (intoCycle >= state.cycleDurationMs) {
    if (state.isMoving) {
      for (let i = 0; i < numLanes; i++) {
        const m = state.movements[i];
        state.primaryOffsets[i] = m.startOffsetPx + m.distancePx;
      }
    }
    return makeCycle(state, !state.isMoving, nowMs, numLanes, bounds);
  }

  if (state.isMoving && state.cycleDurationMs > 0) {
    const progress = Math.min(1, intoCycle / state.cycleDurationMs);
    for (let i = 0; i < numLanes; i++) {
      const m = state.movements[i];
      const eased = EASINGS[m.easeIdx](progress);
      state.primaryOffsets[i] = m.startOffsetPx + m.distancePx * eased;
    }
  }

  return state;
}

/**
 * Build a per-lane sign array (length = `MAX_LANES`).
 *
 * Each active lane gets a random ±1. Constraint: not all active lanes may
 * share the same sign — at least one must differ. This breaks the "rigid
 * single ring" feel; the bezel reads as multiple lens elements that turn
 * with subtly different orientations relative to user input.
 *
 * Inactive slots (beyond `numLanes`) are left at 0 so the unused tail of
 * the offset array doesn't accidentally drift.
 */
function makeLaneSigns(numLanes: number): Float32Array {
  const signs = new Float32Array(MAX_LANES);
  if (numLanes <= 0) return signs;

  for (let i = 0; i < numLanes; i++) {
    signs[i] = Math.random() < 0.5 ? -1 : 1;
  }

  if (numLanes >= 2) {
    let allSame = true;
    for (let i = 1; i < numLanes; i++) {
      if (signs[i] !== signs[0]) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      const flipIdx = Math.floor(Math.random() * numLanes);
      signs[flipIdx] = -signs[flipIdx];
    }
  }

  return signs;
}

/**
 * Hook driving a single per-lane offset array.
 *
 * Each lane's final offset combines:
 *   - a `baseAccum` driven by document scroll deltas and a hover/tap
 *     spin-velocity (eased), multiplied by a per-lane ±1 sign with the
 *     constraint that not all active lanes share the same sign.
 *   - the per-lane eased move/pause displacement scaled by `primaryScale`.
 *
 * No time-based ambient drift — when the user is neither scrolling nor
 * hovering/tapping, the base accumulator holds steady. The bezel rests.
 */
type SnapPhase = "natural" | "settling" | "settled";

export function useLaneScheduler(
  numLanes: number,
  bounds: SchedulerBounds,
  enabled: boolean,
  spinActive: boolean
): RefObject<Float32Array> {
  const offsetsRef = useRef<Float32Array>(new Float32Array(MAX_LANES));
  const stateRef = useRef<CycleState | null>(null);

  const baseAccumRef = useRef<number>(0);
  const laneSignsRef = useRef<Float32Array>(makeLaneSigns(numLanes));
  const lastTickMsRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const spinVelRef = useRef<number>(0);
  const spinActiveRef = useRef<boolean>(false);
  // Wall-clock timestamp of the moment the loop was paused (i.e. enabled
  // flipped to false). Null while running. On resume, all wall-clock
  // anchors (`cycleStartMs`, `snapStartMs`, `lastMotionMs`) are shifted
  // forward by the elapsed pause so the animation continues from where
  // it left off instead of "snapping forward" through skipped time —
  // which would look like a frozen frame followed by a jolt.
  const pausedAtRef = useRef<number | null>(null);
  // Cached scrollY updated by a passive scroll listener — avoids reading
  // `window.scrollY` inside `useFrame`, which can force a layout flush
  // when other code on the page has dirtied layout between frames.
  const currentScrollYRef = useRef<number>(0);

  // Snap state — captured when phase transitions natural → settling, used
  // to ease each lane from its natural position to the nearest groove.
  const snapPhaseRef = useRef<SnapPhase>("natural");
  const lastMotionMsRef = useRef<number>(0);
  const snapStartMsRef = useRef<number>(0);
  const snapStartOffsetsRef = useRef<Float32Array>(new Float32Array(MAX_LANES));
  const snapTargetOffsetsRef = useRef<Float32Array>(
    new Float32Array(MAX_LANES)
  );

  useEffect(() => {
    spinActiveRef.current = spinActive;
  }, [spinActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    currentScrollYRef.current = window.scrollY;
    const onScroll = () => {
      currentScrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    offsetsRef.current = new Float32Array(MAX_LANES);
    stateRef.current = null;
    baseAccumRef.current = 0;
    spinVelRef.current = 0;
    laneSignsRef.current = makeLaneSigns(numLanes);
    snapPhaseRef.current = "natural";
    snapStartOffsetsRef.current = new Float32Array(MAX_LANES);
    snapTargetOffsetsRef.current = new Float32Array(MAX_LANES);
    pausedAtRef.current = null;
    if (typeof window !== "undefined") {
      lastScrollYRef.current = window.scrollY;
      currentScrollYRef.current = window.scrollY;
    }
  }, [numLanes]);

  useFrame(() => {
    const now = performance.now();

    if (!enabled) {
      // First frame of pause — record timestamp. Keep `lastScrollY` in
      // sync with `currentScrollY` so a resume doesn't see accumulated
      // out-of-view scroll as a single huge delta in one frame.
      if (pausedAtRef.current === null) pausedAtRef.current = now;
      lastScrollYRef.current = currentScrollYRef.current;
      return;
    }

    // Resume — shift all wall-clock anchors forward by the pause
    // duration so cycle / snap / dwell timing carries on as if nothing
    // happened, rather than fast-forwarding through the skipped window.
    if (pausedAtRef.current !== null) {
      const pauseDur = now - pausedAtRef.current;
      if (stateRef.current) stateRef.current.cycleStartMs += pauseDur;
      snapStartMsRef.current += pauseDur;
      lastMotionMsRef.current += pauseDur;
      lastTickMsRef.current = now;
      pausedAtRef.current = null;
    }

    const prevTick = lastTickMsRef.current || now;
    const dt = Math.max(0, Math.min(0.1, (now - prevTick) / 1000));
    lastTickMsRef.current = now;

    if (!stateRef.current) {
      stateRef.current = makeCycle(null, false, now, numLanes, bounds);
      lastMotionMsRef.current = now;
    }

    // ─── Scroll-driven displacement ────────────────────────────────────
    // Reads from the cached `currentScrollYRef` populated by a passive
    // scroll listener — no `window.scrollY` access inside the frame loop.
    const currentY = currentScrollYRef.current;
    const scrollDelta = currentY - lastScrollYRef.current;
    lastScrollYRef.current = currentY;
    baseAccumRef.current += scrollDelta * bounds.scrollMultiplier;

    // ─── Spin (hover/tap) — eased velocity toward target, integrated ──
    const targetVel = spinActiveRef.current ? bounds.spinPxPerSec : 0;
    const easeFactor = 1 - Math.exp(-dt / Math.max(0.001, bounds.spinTauSec));
    spinVelRef.current += (targetVel - spinVelRef.current) * easeFactor;
    baseAccumRef.current += spinVelRef.current * dt;

    // ─── Snap state machine (runs BEFORE tickPrimary) ──────────────────
    // Running the state machine before move/pause cycle progression means
    // any bake to primaryOffsets is in place by the time tickPrimary may
    // transition pause→move and capture startOffsetPx from primaryOffsets.
    const isInMoveCycle = stateRef.current.isMoving;
    const isScrolling = Math.abs(scrollDelta) > 0.5;
    const isSpinning = Math.abs(spinVelRef.current) > 0.5;
    const motionDetected = isInMoveCycle || isScrolling || isSpinning;

    const signs = laneSignsRef.current;
    const scale = bounds.primaryScale;
    const base = baseAccumRef.current;
    const starts = snapStartOffsetsRef.current;
    const targets = snapTargetOffsetsRef.current;
    const groove = Math.max(1, bounds.grooveSizePx);

    if (motionDetected) {
      // Mid-snap interruption — bake the current eased visible value into
      // primaryOffsets so the natural composition continues smoothly from
      // where the snap had got to, rather than reverting to the
      // un-snapped natural target.
      if (snapPhaseRef.current === "settling") {
        const elapsed = Math.max(0, now - snapStartMsRef.current);
        const t = Math.min(1, elapsed / Math.max(1, bounds.snapDurationMs));
        const eased = 1 - (1 - t) * (1 - t);
        const primary = stateRef.current.primaryOffsets;
        for (let i = 0; i < numLanes; i++) {
          const visible = starts[i] + (targets[i] - starts[i]) * eased;
          primary[i] = (visible - signs[i] * base) / scale;
        }
      }
      // (settled phase already had primaryOffsets baked at target — no-op.)
      lastMotionMsRef.current = now;
      snapPhaseRef.current = "natural";
    } else if (snapPhaseRef.current === "natural") {
      const sinceMotion = now - lastMotionMsRef.current;
      if (sinceMotion >= bounds.snapDwellMs) {
        snapPhaseRef.current = "settling";
        snapStartMsRef.current = now;
        const src0 = stateRef.current.primaryOffsets;
        for (let i = 0; i < numLanes; i++) {
          const natural = signs[i] * base + scale * src0[i];
          starts[i] = natural;
          targets[i] = Math.round(natural / groove) * groove;
        }
      }
    } else if (snapPhaseRef.current === "settling") {
      const elapsed = now - snapStartMsRef.current;
      if (elapsed >= bounds.snapDurationMs) {
        snapPhaseRef.current = "settled";
        // Bake the snap target into primaryOffsets so that natural
        // composition produces the groove value — any subsequent move
        // cycle (or scroll/spin start) begins seamlessly from here
        // rather than jumping back to the un-snapped position.
        const primary = stateRef.current.primaryOffsets;
        for (let i = 0; i < numLanes; i++) {
          primary[i] = (targets[i] - signs[i] * base) / scale;
        }
      }
    }

    // ─── Move/pause cycles (after snap state machine + bake) ───────────
    stateRef.current = tickPrimary(stateRef.current, now, numLanes, bounds);

    // ─── Compose output ────────────────────────────────────────────────
    const out = offsetsRef.current;
    const src = stateRef.current.primaryOffsets;
    const n = Math.min(src.length, out.length);
    const phase = snapPhaseRef.current;

    if (phase === "settling") {
      const elapsed = Math.max(0, now - snapStartMsRef.current);
      const t = Math.min(1, elapsed / Math.max(1, bounds.snapDurationMs));
      // easeOutQuad — quick draw, soft landing at the groove.
      const eased = 1 - (1 - t) * (1 - t);
      for (let i = 0; i < n; i++) {
        out[i] = starts[i] + (targets[i] - starts[i]) * eased;
      }
    } else {
      // natural and settled both use the natural composition. In settled
      // phase, primaryOffsets has been baked so this expression equals
      // the captured groove target — and any subsequent base change
      // (scroll/spin) flows through smoothly with no transition jolt.
      for (let i = 0; i < n; i++) {
        out[i] = signs[i] * base + scale * src[i];
      }
    }
    for (let i = n; i < out.length; i++) out[i] = 0;
  });

  return offsetsRef;
}
