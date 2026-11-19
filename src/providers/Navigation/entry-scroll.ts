// Where a page change leaves the scroll, for TransitionProvider's entry (v9 rev 3, Review-B).
//
// The Hideaway reset to the top on every entry. Next keeps each history entry's place itself (docs: Link
// `scroll`), so a reset may only follow a link (a push), never a Back/Forward step, including one taken
// while a link's curtain is still leaving: next-transition-router then enters the restored entry too.
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
const INTENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

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

  return {
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
    /** Back/Forward: the next entry is a history entry the browser restores. */
    pop() {
      // Same pathname during a leave: the router won't enter the restored entry, so the link goes on.
      if (leavingFrom === window.location.pathname) return;
      cancel();
      traversal = true;
      generation++;
    },
    cancel,
    /** Called once the incoming page is in place. */
    settle(lenis: Scroller) {
      cancel();
      leavingFrom = null;
      if (traversal) return;
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
