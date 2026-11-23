/**
 * Awaits a real interface state, bounded, without the waitFor timeout race.
 *
 * Why: under full-suite load the event loop stalls. When it wakes, a component's own timer (a simulated delay, a
 * Motion exit frame, an expiry) and waitFor's timeout timer are due in the same timers pass. React commits the
 * resulting update later, in the check phase, and waitFor's timeout reports its last stale failure without checking
 * again.
 *
 * Here the state is checked now, after every DOM mutation, on focus and input events (properties, not mutations), and
 * on a short poll (for changes with no DOM effect, such as a mock's calls or a notice list). The deadline is a bound
 * for a state that never arrives, not a timing window: when it passes, React first gets a turn to commit whatever its
 * scheduler already holds, the state is checked once more, and only then does the wait reject, with the last
 * diagnostic. Every observer, listener and timer is released on any outcome. It runs through testing-library's
 * asyncWrapper (outside act), so React renders through its scheduler as it does for waitFor.
 */
export type DomStateOptions = {
  /** Subtree whose mutations trigger a check. */
  root?: Node;
  /** Bound for a state that never arrives (default 10 s). */
  deadlineMs?: number;
  /** Poll for changes with no DOM effect (default 50 ms). */
  pollMs?: number;
};
type Wrapper = { getConfig: () => { asyncWrapper: (cb: () => Promise<unknown>) => Promise<unknown> } };

const DEFAULT_DEADLINE_MS = 10_000;
const DEFAULT_POLL_MS = 50;
const EVENTS = ["focusin", "focusout", "input", "change"] as const;

function settle(predicate: () => boolean, describe: () => string, options: DomStateOptions): Promise<void> {
  const { root = document.body, deadlineMs = DEFAULT_DEADLINE_MS, pollMs = DEFAULT_POLL_MS } = options;
  return new Promise<void>((resolve, reject) => {
    let done = false;
    let observer: MutationObserver | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      done = true;
      observer?.disconnect();
      for (const type of EVENTS) document.removeEventListener(type, check, true);
      if (poll !== undefined) clearInterval(poll);
      if (deadline !== undefined) clearTimeout(deadline);
    };
    function check() {
      if (done) return;
      let reached: boolean;
      try { reached = predicate(); }
      catch (error) { release(); reject(error); return; }
      if (reached) { release(); resolve(); }
    }
    check();
    if (done) return;
    observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
    for (const type of EVENTS) document.addEventListener(type, check, true);
    poll = setInterval(check, pollMs);
    deadline = setTimeout(() => {
      // React commits in the check phase: let it run what it already holds, then a fresh macrotask, then judge.
      setImmediate(() => setTimeout(() => {
        check();
        if (done) return;
        release();
        reject(new Error(`State not reached within ${deadlineMs} ms. Last check: ${describe()}`));
      }, 0));
    }, deadlineMs);
  });
}

export function untilDomState(ui: Wrapper, predicate: () => boolean, options: DomStateOptions = {}): Promise<void> {
  return ui.getConfig().asyncWrapper(() => settle(predicate, () => "the predicate was false", options)) as Promise<void>;
}

/**
 * untilDomState for an assertion: settles at the moment it stops throwing and returns its value from that moment (it
 * does not assert again after asyncWrapper's drain, when the interface may have moved on). On the deadline it rejects
 * with the last assertion's message.
 */
export async function untilAsserted<T>(ui: Wrapper, assertion: () => T, options: DomStateOptions = {}): Promise<T> {
  let value: T | undefined;
  let last: unknown;
  await ui.getConfig().asyncWrapper(() => settle(() => {
    try { value = assertion(); return true; }
    catch (error) { last = error; return false; }
  }, () => last instanceof Error ? last.message : String(last), options));
  return value as T;
}
