export type ViewportActivation = 'none' | 'once' | 'repeat';
export interface ViewportState { readonly inView: boolean; readonly started: boolean }
type ObserverConstructor = new (callback: IntersectionObserverCallback, options?: IntersectionObserverInit) =>
  Pick<IntersectionObserver, 'observe' | 'disconnect'>;

export function validateViewportOptions(mode: ViewportActivation, threshold: number): void {
  if (mode !== 'none' && mode !== 'once' && mode !== 'repeat') {
    throw new RangeError('viewportActivation must be none, once or repeat.');
  }
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError('viewportThreshold must be a finite number between 0 and 1.');
  }
}

/** Start at the threshold, then latch until a genuine exit rather than flickering around the threshold. */
function nextViewportState(state: ViewportState, entry: IntersectionObserverEntry,
  mode: ViewportActivation, threshold: number, previousInView: boolean): ViewportState {
  const next = !entry.isIntersecting ? { inView: false, started: mode === 'once' && state.started }
    : previousInView || entry.intersectionRatio >= threshold ? { inView: true, started: true } : state;
  return next.inView === state.inView && next.started === state.started ? state : next;
}

/** Injectable observer boundary; cleanup also invalidates already queued callbacks (including StrictMode). */
export function watchViewport({ target, mode, threshold, previousStarted = false, previousInView = false, Observer, onChange }: {
  target: Element; mode: ViewportActivation; threshold: number; previousStarted?: boolean;
  previousInView?: boolean;
  Observer?: ObserverConstructor; onChange(state: ViewportState): void;
}) {
  validateViewportOptions(mode, threshold);
  const observing = mode !== 'none' && Boolean(Observer);
  let state: ViewportState = { inView: !observing, started: !observing || previousStarted };
  let entryLatch = previousInView;
  let active = true;
  const observer = observing && Observer ? new Observer(entries => {
    if (!active) return;
    for (const entry of entries) {
      if (entry.target !== target) continue;
      if (!entry.isIntersecting) entryLatch = false;
      const next = nextViewportState(state, entry, mode, threshold, entryLatch);
      if (next !== state) { state = next; onChange(state); }
    }
  }, { threshold: [0, threshold] }) : undefined;
  observer?.observe(target);
  return {
    get state(): ViewportState { return state; },
    // An unobserved replacement must not discard a prior latch during back-to-back config changes.
    get checkpoint(): ViewportState { return { ...state, inView: state.inView || entryLatch }; },
    initialProgress: observing ? 0 : 1,
    disconnect() { if (active) { active = false; observer?.disconnect(); } },
  };
}
