// Where a page change leaves the scroll, for TransitionProvider's entry (v9 rev 3, Review-B).
//
// The Hideaway reset to the top on every entry. Next keeps each history entry's place (docs: Link `scroll`),
// so a reset may only follow a link (a push), never a Back/Forward step, including one taken while a link's
// curtain is still leaving: next-transition-router then enters the restored entry too. The browser's own
// restore can't keep that place here: the incoming page mounts in the transition's fixed, viewport-high
// "none" state (stores/RP_Ui.ts), so the restore clamps to 0 (row-6 live pass). Each entry's place is saved
// when it is left (the Navigation API's navigate event, before the entry changes) and put back once the
// restored route has committed (arrived) and has room for it. That runs whether or not the router is in a
// transition: an ordinary Back after a page has landed leaves the router idle, so its enter never runs
// (Review-B). Without the Navigation API, the browser's own restore stands.
// That holds only when the step changes the pathname: the router (0.2.11, dist/index.js:147) ends a leave
// only on a pathname change, so a Back to an earlier entry of the same page (a #hash) lets the link finish,
// as in The Hideaway, rather than strand the router "leaving" with the next click ignored (Review-B, rev 4.2).
// A link with a #hash lands on its target, which can stream in after the entry (a loading boundary,
// connection()); it is waited for, bounded, and nothing resets to the top meanwhile.
//
// A .ts module beside the provider: plain DOM logic the provider and its narrow test share.

type Scroller =
  | {
      scrollTo: (
        target: number | HTMLElement,
        options: { immediate: true; force?: true }
      ) => void;
      resize?: () => void;
    }
  | undefined;

/** Long enough for a streamed policy page; the reader's own scroll or the next page change stops it sooner. */
const HASH_WAIT_MS = 8000;
/** About two seconds of frames for the restored page to grow back; then take what room there is. */
const RESTORE_FRAMES = 120;
/** Frames a put-back place must hold before the restore ends (the page may still be settling its height). */
const HOLD_FRAMES = 6;
const PLACES = 100;

const entryKey = () =>
  (typeof navigation === "undefined" ? null : navigation.currentEntry?.key) ?? null;
const INTENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/** A pathname as the router routes it: `location` keeps percent-escapes that `usePathname` may not. */
function routed(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path; // a malformed escape: compare as written
  }
}

function hashId(hash: string): string | null {
  if (!hash || hash === "#") return null;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return null; // a malformed fragment (e.g. "#%") names no target
  }
}

export function createEntryScroll() {
  let traversal = false;
  // Each push or pop starts a new generation: a link's delayed leave only goes on if no Back/Forward came
  // after it (the router would otherwise push the link's page over the restored entry).
  let generation = 0;
  // The pathname the pending leave started from (the router keys its leave on it); null when none is pending.
  let leavingFrom: string | null = null;
  let stopWait: (() => void) | null = null;
  // Where each entry was left, by Navigation API entry key. Not saved from a Back/Forward step until its route
  // has arrived, nor while its place is being put back: the position showing then isn't the entry's own.
  const places = new Map<string, number>();
  let restoring = false;
  // The committed pathname, and the entry (key and pathname) a Back/Forward step is waiting to put back once
  // that pathname commits.
  let committedPath: string | null = null;
  // The entry showing when that pathname committed, and the scroller it handed over.
  let committedKey: string | null = null;
  // Whether the history step under way stays on the same pathname (a #hash entry), from its traverse event.
  let samePathStep = false;
  let scroller: Scroller;
  let awaiting: { key: string; path: string } | null = null;
  const save = () => {
    const key = entryKey();
    if (!key || awaiting || restoring) return;
    places.delete(key);
    places.set(key, Math.round(window.scrollY));
    if (places.size > PLACES) places.delete(places.keys().next().value as string);
  };
  const cancel = () => {
    stopWait?.();
    stopWait = null;
  };

  const land = (target: HTMLElement, lenis: Scroller) => {
    // A target that streamed in grew the page: Lenis's cached limit is stale until it measures again.
    lenis?.resize?.();
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else target.scrollIntoView();
  };

  // Put entry `key` back at `y` once the page has room, then hold it a few frames in case the page is still
  // settling. Ends early on a newer entry, and on the reader's own scroll or key, as the hash wait does.
  const restore = (key: string, y: number, lenis: Scroller) => {
    let id = 0;
    let count = 0;
    let held = 0;
    const step = () => {
      if (entryKey() !== key || ++count > RESTORE_FRAMES + HOLD_FRAMES * 2) return cancel();
      const room = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (room >= y || count >= RESTORE_FRAMES) {
        const top = Math.min(y, room);
        if (Math.abs(window.scrollY - top) > 1) {
          held = 0;
          lenis?.resize?.();
          if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
          else window.scroll(0, top);
        } else if (++held >= HOLD_FRAMES) return cancel();
      }
      id = window.requestAnimationFrame(step);
    };
    id = window.requestAnimationFrame(step);
    restoring = true;
    INTENTS.forEach((type) => window.addEventListener(type, cancel, { capture: true, passive: true }));
    stopWait = () => {
      restoring = false;
      window.cancelAnimationFrame(id);
      INTENTS.forEach((type) => window.removeEventListener(type, cancel, true));
    };
  };

  return {
    /** Save each entry's place as it is left. Returns the unsubscribe. */
    listen() {
      if (typeof navigation === "undefined") return () => {};
      // Only steps that leave the entry: Next rewrites the destination with replaceState during a Back or
      // Forward while the outgoing page's scroll still shows (row-6 live, rev 5), so a replace must not save.
      const onNavigate = (event: Event) => {
        const { navigationType: type, destination } = event as NavigateEvent;
        if (type === "push" || type === "traverse") save();
        // A same-path history step (a #hash entry) remounts nothing: the browser's own restore applies, whatever
        // the last commit was (Review-B rev 7). The event names both ends before the entry changes.
        if (type === "traverse") {
          let to: string | null = null;
          try {
            to = new URL(destination.url).pathname;
          } catch {
            // no destination URL: treat it as a pathname change
          }
          // Both are browser-serialized, so compare them as written: decoding could merge two distinct routes
          // (/essays/a%2Fb and /essays/a%252Fb, Review-B rev 8).
          samePathStep = to === window.location.pathname;
        }
      };
      navigation.addEventListener("navigate", onNavigate);
      return () => navigation.removeEventListener("navigate", onNavigate);
    },
    /** A link was followed: the next entry is a new page. Returns the leave's generation. */
    push() {
      cancel();
      traversal = false;
      leavingFrom = window.location.pathname;
      return ++generation;
    },
    /** Whether a leave started at `leave` may still go on (no Back/Forward since). */
    current(leave: number) {
      return leave === generation;
    },
    /** Back/Forward: the next entry is a history entry, put back where it was left once its route arrives. */
    pop() {
      const samePath = samePathStep;
      samePathStep = false;
      // Any earlier pending or active restore ends here, whatever this step is (Review-B rev 3).
      cancel();
      // Same pathname during a leave: the router won't enter the restored entry, so the link goes on.
      if (leavingFrom === window.location.pathname) return;
      // Another pathname: the router ends the leave on this change, so a later step back to the leave's own
      // pathname (a quick Back then Forward mid-curtain) is an ordinary traversal, not the same-path case.
      leavingFrom = null;
      traversal = true;
      generation++;
      const key = entryKey();
      const path = routed(window.location.pathname);
      if (!key) return;
      // A same-path step (a #hash entry): nothing remounts, so the browser's own restore stands.
      if (samePath) return;
      // Next commits a Back/Forward synchronously in its own popstate handler, so the destination has usually
      // committed (arrived() for this very entry) before this listener runs (row-6 live, rev 4): put it back now.
      if (path === committedPath && committedKey === key) {
        if (places.has(key)) restore(key, places.get(key) as number, scroller);
        return;
      }
      // The same page under another entry (a #hash): nothing remounts, so the browser's own restore stands.
      if (path === committedPath) return;
      // Otherwise wait for the destination's commit.
      awaiting = { key, path };
      // The reader's own scroll or key before the route commits drops the pending restore, as it stops an
      // active one.
      INTENTS.forEach((type) => window.addEventListener(type, cancel, { capture: true, passive: true }));
      stopWait = () => {
        awaiting = null;
        INTENTS.forEach((type) => window.removeEventListener(type, cancel, true));
      };
    },
    /**
     * The router committed `pathname` (the provider's effect on it). Only the commit of the pending step's own
     * pathname, with its entry still current, puts the place back; any other call (an earlier commit's effect,
     * a rerun for a new Lenis) leaves the pending step alone.
     */
    arrived(pathname: string, lenis: Scroller) {
      committedPath = routed(pathname);
      committedKey = entryKey();
      scroller = lenis;
      const pending = awaiting;
      if (!pending || pending.path !== committedPath) return;
      cancel();
      if (pending.key === entryKey() && places.has(pending.key))
        restore(pending.key, places.get(pending.key) as number, lenis);
    },
    cancel,
    /** Called once the incoming page is in place. `keep`: the page stayed mounted (the shop shelf ↔ a product), so
     *  its scroll stays where the reader left it rather than going to the top. */
    settle(lenis: Scroller, keep = false) {
      leavingFrom = null;
      // A Back/Forward entry (a Back taken mid-curtain): arrived() puts it back; nothing resets it here.
      if (traversal) return;
      cancel();
      if (keep) return;
      const id = hashId(window.location.hash);
      const target = id ? document.getElementById(id) : null;
      if (target) return land(target, lenis);
      if (!id) {
        window.scroll(0, 0);
        lenis?.scrollTo(0, { immediate: true });
        return;
      }
      // The target hasn't streamed in yet: wait for it.
      const address = window.location.href;
      const observer = new MutationObserver(() => {
        if (window.location.href !== address) return cancel();
        const arrived = document.getElementById(id);
        if (!arrived) return;
        cancel();
        land(arrived, lenis);
      });
      const timer = window.setTimeout(cancel, HASH_WAIT_MS);
      observer.observe(document.body, { childList: true, subtree: true });
      INTENTS.forEach((type) =>
        window.addEventListener(type, cancel, { capture: true, passive: true })
      );
      stopWait = () => {
        observer.disconnect();
        window.clearTimeout(timer);
        INTENTS.forEach((type) =>
          window.removeEventListener(type, cancel, true)
        );
      };
    }
  };
}
