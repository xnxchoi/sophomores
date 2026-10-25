/** Active time never catches up after a suspended tab or a stalled GPU frame. */
export function advanceFieldTime(elapsed: number, delta: number, playing: boolean): number {
  if (![elapsed, delta].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
    throw new RangeError('Field clocks must be finite nonnegative numbers.');
  }
  return playing ? elapsed + Math.min(delta, .1) : elapsed;
}
