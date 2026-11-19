/**
 * Where each history entry was scrolled to, so Back and Forward return to it (S6). The site owns this:
 * a link's page change resets the scroll to the top before the address changes, so the browser's own
 * restoration would always save 0 for the page being left.
 *
 * Positions are kept per entry key: the browser's own `navigation.currentEntry.key`, read by the
 * transition provider. Every push gets a new key, including a same-page hash push that copies
 * `history.state`, and a replace or reload keeps it. Recording pauses while the position showing isn't
 * the entry's own:
 * - from the start of a link's leave until the new entry is committed (the leave resets the scroll first);
 * - from a Back/Forward step until its restore is done (the outgoing page still shows at first).
 * An entry without a key records nothing.
 *
 * Pure and colocated with the transition provider, its only caller; tests/navigation/history-scroll.test.ts.
 */
const LIMIT = 100;

export function createHistoryScroll() {
  const positions = new Map<string, number>();
  let paused = false;
  const keep = (key: string, y: number) => {
    positions.delete(key);
    positions.set(key, Math.max(0, Math.round(y)));
    while (positions.size > LIMIT) positions.delete(positions.keys().next().value as string);
  };
  return {
    /** The reader scrolled. */
    record(key: string | null, y: number) {
      if (key && !paused) keep(key, y);
    },
    /** A link's page change starts: keep the position being left, then pause until the new entry. */
    leave(key: string | null, y: number) {
      if (key) keep(key, y);
      paused = true;
    },
    /** A Back/Forward step reached `key`: pause, and return where it was (null: no record). */
    pop(key: string | null): number | null {
      paused = true;
      return key ? (positions.get(key) ?? null) : null;
    },
    /** The new entry is committed, or the restore is done: recording resumes. */
    resume() {
      paused = false;
    },
    /** For the session copy, so a reload keeps the positions (the entry keys survive it). */
    dump(): Array<[string, number]> {
      return [...positions];
    },
    load(entries: unknown) {
      if (!Array.isArray(entries)) return;
      for (const entry of entries)
        if (Array.isArray(entry) && typeof entry[0] === "string" && Number.isFinite(entry[1])) keep(entry[0], entry[1]);
    }
  };
}

/**
 * An address as the router routes it: the decoded path and the normalised search, without the hash.
 * Both the shown address (`location`) and the committed one (`usePathname` + `useSearchParams`) go through
 * this, so percent-encoding and search serialisation never make them differ.
 */
export function routedAddress(path: string, search: string): string {
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    // A malformed escape: compare as written.
  }
  const query = new URLSearchParams(search).toString();
  return query ? `${decoded}?${query}` : decoded;
}

/** About two seconds of frames for the incoming page to commit and grow; after that, take what room there is. */
export const RESTORE_FRAMES = 120;
/** A few more frames to read back a forced position before giving up. */
const VERIFY_FRAMES = 12;

export type RestoreWorld = {
  /** The entry showing now; a different key means a newer step or push, which ends this restore. */
  currentKey(): string | null;
  /** The address the router has committed (routedAddress), or null before it reports one. */
  committed(): string | null;
  /** The page's scroll height and the viewport height. */
  height(): number;
  viewport(): number;
  /** Where the page is scrolled to now. */
  scrollY(): number;
  /** Bring the scroller up to date with the page (Lenis caches its limit), then scroll to `top` at once. */
  put(top: number): void;
  frame(callback: () => void): number;
  cancel(id: number): void;
};

/**
 * Restore entry `key` to `y` once its route `address` is committed and the incoming page has held its height
 * for a frame. Never scrolls in the calling tick (the popstate): the outgoing page is still showing then.
 * The position is read back a frame after it is applied and applied again if the scroller clamped it.
 * If the address never commits, nothing is scrolled. Calls `done` once, however it ends; returns a stop.
 */
export function restoreScroll(world: RestoreWorld, key: string, y: number, address: string, done: () => void) {
  let id = 0;
  let frames = 0;
  let lastHeight = -1;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    world.cancel(id);
    done();
  };
  const step = () => {
    if (world.currentKey() !== key) return end();
    frames += 1;
    if (world.committed() === address) {
      const height = world.height();
      const settled = height === lastHeight;
      lastHeight = height;
      const room = Math.max(0, height - world.viewport());
      const ready = (settled && room >= y) || frames >= RESTORE_FRAMES;
      if (ready) {
        const target = Math.min(y, room);
        if (Math.abs(world.scrollY() - target) <= 1) return end();
        world.put(target);
      }
    }
    if (frames >= RESTORE_FRAMES + VERIFY_FRAMES) return end();
    id = world.frame(step);
  };
  id = world.frame(step);
  return end;
}

/** The part of Lenis a restore uses. */
export type SmoothScroller = {
  resize(): void;
  scrollTo(top: number, options: { immediate: true; force: true }): void;
};

/**
 * Scroll to `top` at once. Lenis caches its limit and its resize is debounced, so it is measured first;
 * otherwise a page that just grew clamps the position. `force`: useScrollLock may have stopped it.
 */
export function putScroll(lenis: SmoothScroller | undefined, top: number, native: (top: number) => void) {
  if (!lenis) return native(top);
  lenis.resize();
  lenis.scrollTo(top, { immediate: true, force: true });
}
