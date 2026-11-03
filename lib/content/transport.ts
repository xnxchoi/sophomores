/** Skip step for the file player. Hideaway's radio rewind changes tracks. */
export const SEEK_STEP_SECONDS = 10;

export function clampSeek(current: number, delta: number, duration: number) {
  const next = current + delta;
  if (duration <= 0) return Math.max(0, next);
  return Math.min(duration, Math.max(0, next));
}

export function playbackProgress(position: number, duration: number) {
  if (duration <= 0) return 0;
  return Math.min(1, Math.max(0, position / duration));
}

function clockPart(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

const FLANGE = 38;
const PACK_INNER = FLANGE * 0.45;

/** Supply pack shrinks and the takeup pack grows as playback advances. */
export function reelPack(progress: number) {
  const amount = Math.min(1, Math.max(0, progress));
  const travel = FLANGE - PACK_INNER;
  return {
    supply: FLANGE - amount * travel,
    takeup: PACK_INNER + amount * travel
  };
}

/** Elapsed on the left, remaining on the right. Same split as the tape counter. */
export function counterReadout(position: number, duration: number) {
  const elapsed = Math.max(0, position);
  const span = duration > 0 ? duration : elapsed;
  return {
    elapsed: clockPart(elapsed),
    remaining: clockPart(Math.max(0, span - elapsed))
  };
}
