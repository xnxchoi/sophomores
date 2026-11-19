/**
 * Who may reset the scroll at the end of a page change (S4/D4). A change has two halves that can finish
 * in either order: the leave (`exfil`, which resets the outgoing page) and the entry (which resets the new
 * page, then lands a #hash). A Back/Forward step while either half is still pending means the page
 * showing is the restored history entry, so neither half may reset it, whichever finishes later. A step
 * after both halves have settled is ordinary history and is not this change's business.
 *
 * Pure and colocated with the transition provider, which is its only caller; the orderings are
 * enumerated in tests/navigation/change-scroll.test.ts.
 */
export function createChangeScroll() {
  let leaving = false;
  let entering = false;
  let popped = false;
  return {
    /** A link-initiated change starts: both halves are pending. */
    leave() {
      leaving = true;
      entering = true;
      popped = false;
    },
    /** A Back/Forward step. */
    pop() {
      if (leaving || entering) popped = true;
    },
    /** The leave finished. True: it may reset the scroll. */
    exfil() {
      leaving = false;
      return !popped;
    },
    /** The entry finished. True: it may reset the scroll and land a #hash. */
    entry() {
      entering = false;
      return !popped;
    }
  };
}
