/** Reference opening is approximately .2s; hold it 50% longer before the gas catches. */
export const IGNITION_TIMING = {
  blackHoldSeconds: .3,
  durationSeconds: 3,
  pilotProgress: .18,
  scrubResponse: 14,
} as const;

export interface IgnitionState {
  readonly elapsed: number;
  readonly progress: number;
  readonly hasLit: boolean;
  readonly scrubbing: boolean;
}

export const INITIAL_IGNITION: IgnitionState = { elapsed: 0, progress: 0, hasLit: false, scrubbing: false };

/** Resize/scroll may queue an exit and reentry in the same observer delivery. */
export function latestViewportIntersection(entries: ReadonlyArray<{ readonly isIntersecting: boolean }>): boolean | undefined {
  return entries.at(-1)?.isIntersecting;
}

function finite(value: number, nonnegative = false): void {
  if (!Number.isFinite(value) || (nonnegative && value < 0)) throw new RangeError('Ignition values must be finite and clocks nonnegative.');
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Linear reference time; the shader owns the catch, rapid base spread and plume rise. */
export function ignitionProgressAt(seconds: number): number {
  finite(seconds, true);
  return clamp((seconds - IGNITION_TIMING.blackHoldSeconds) / (IGNITION_TIMING.durationSeconds - IGNITION_TIMING.blackHoldSeconds));
}

/** Fixed canvas rectangles do not move: measure the enclosing footer section instead. */
export function viewportExposure(top: number, height: number, viewportHeight: number): number {
  [top, height, viewportHeight].forEach(value => finite(value));
  if (height <= 0 || viewportHeight <= 0) return 0;
  return clamp((viewportHeight - top) / Math.min(height, viewportHeight));
}

/** A down event cannot erase a reverse that has not reached an advancing render yet. */
export function latchReverseIntent(pending: boolean, previousScrollY: number, nextScrollY: number): boolean {
  finite(previousScrollY);
  finite(nextScrollY);
  return pending || nextScrollY < previousScrollY;
}

/** Keep the first-light frame on a fast upward exit without advancing either clock. */
export function retainPilotOnExit(state: IgnitionState, sectionTop: number, viewportHeight: number, reversing: boolean): IgnitionState {
  finite(sectionTop);
  finite(viewportHeight, true);
  if (!state.hasLit || (!reversing && !state.scrubbing) || sectionTop < viewportHeight) return state;
  return { ...state, progress: IGNITION_TIMING.pilotProgress, scrubbing: true };
}

/** A one-time entry clock yields permanently to scroll scrubbing after the first reverse. */
export function advanceIgnition(state: IgnitionState, delta: number, playing: boolean, exposure: number, reversing: boolean): IgnitionState {
  finite(state.elapsed, true);
  finite(state.progress, true);
  finite(delta, true);
  finite(exposure);
  if (!playing) return state;
  const frameDelta = Math.min(delta, .1);
  const elapsed = Math.min(IGNITION_TIMING.durationSeconds, state.elapsed + frameDelta);
  const scrubbing = state.scrubbing || (state.hasLit && reversing);
  const target = IGNITION_TIMING.pilotProgress + clamp(exposure) * (1 - IGNITION_TIMING.pilotProgress);
  const progress = scrubbing
    ? Math.max(IGNITION_TIMING.pilotProgress, state.progress + (target - state.progress) * (1 - Math.exp(-IGNITION_TIMING.scrubResponse * frameDelta)))
    : ignitionProgressAt(elapsed);
  return { elapsed, progress, hasLit: state.hasLit || progress >= IGNITION_TIMING.pilotProgress, scrubbing };
}
