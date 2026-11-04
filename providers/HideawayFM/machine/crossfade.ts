/**
 * Two-phase crossfade reducer.
 *
 * The HideawayFM provider keeps a foreground RP_Studio Howl and a "source"
 * RP_Studio Howl preloaded with the next track. When the foreground's
 * remaining playback falls below the threshold, the machine transitions:
 *
 *   play → crossfade → play
 *
 * During `crossfade`, BOTH Howls are audible: the foreground fades from its
 * current volume to 0 while the source plays at full volume. This guarantees
 * zero audio vacuum across the transition. The orchestrator MUST call
 * `source.play()` synchronously BEFORE `fg.fade(→0)` (no awaits between) when
 * applying `beginCrossfade`.
 *
 * `nextCrossfadeStep` is a pure reducer: same input → same decision. It never
 * touches Howler, the DOM, or storage. The orchestrator reads the returned
 * `action` and applies the side effect.
 *
 * User-initiated next/previous (premium roles only) bypass this reducer
 * entirely — the orchestrator hard-cuts via fg.stop() + ring rotation.
 */

export type CrossfadePhase = "play" | "crossfade";

export type CrossfadeAction =
  | "noop"
  | "beginCrossfade"
  | "deferCrossfade"
  | "commitCrossfade";

export interface CrossfadeInput {
  phase: CrossfadePhase;
  /** Foreground channel's current seek (seconds). */
  elapsedSec: number;
  /** Foreground channel's total duration (seconds). */
  durationSec: number;
  /** Monotonic ms spent in the current phase. Reset on every phase change. */
  phaseElapsedMs: number;
  /** Crossfade envelope (ms) — both Howls audible across this window. */
  fadeMs: number;
  /** Seconds of remaining playback that trigger crossfade. */
  thresholdSec: number;
  /** True iff the source (next) Howl reports loaded and is safe to play(). */
  sourceLoaded: boolean;
}

export interface CrossfadeDecision {
  nextPhase: CrossfadePhase;
  action: CrossfadeAction;
  /** When true, the provider resets its phase-elapsed clock to zero. */
  resetPhaseClock: boolean;
}

const noop = (phase: CrossfadePhase): CrossfadeDecision => ({
  nextPhase: phase,
  action: "noop",
  resetPhaseClock: false
});

export function nextCrossfadeStep(input: CrossfadeInput): CrossfadeDecision {
  const {
    phase,
    elapsedSec,
    durationSec,
    phaseElapsedMs,
    fadeMs,
    thresholdSec,
    sourceLoaded
  } = input;

  if (
    !Number.isFinite(elapsedSec) ||
    !Number.isFinite(durationSec) ||
    !Number.isFinite(phaseElapsedMs) ||
    !Number.isFinite(fadeMs) ||
    !Number.isFinite(thresholdSec) ||
    durationSec <= 0 ||
    elapsedSec < 0 ||
    phaseElapsedMs < 0 ||
    fadeMs <= 0 ||
    thresholdSec < 0
  ) {
    return noop(phase);
  }

  switch (phase) {
    case "play": {
      const remaining = durationSec - elapsedSec;
      if (remaining <= thresholdSec) {
        if (!sourceLoaded) {
          return {
            nextPhase: "play",
            action: "deferCrossfade",
            resetPhaseClock: false
          };
        }
        return {
          nextPhase: "crossfade",
          action: "beginCrossfade",
          resetPhaseClock: true
        };
      }
      return noop(phase);
    }

    case "crossfade": {
      if (phaseElapsedMs >= fadeMs) {
        return {
          nextPhase: "play",
          action: "commitCrossfade",
          resetPhaseClock: true
        };
      }
      return noop(phase);
    }

    default: {
      const _exhaustive: never = phase;
      return noop(_exhaustive);
    }
  }
}
