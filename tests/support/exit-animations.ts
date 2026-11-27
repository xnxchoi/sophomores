/**
 * Plays the browser's part at the end of a sheet's exit animation, which JSDOM can't.
 *
 * Why: vaul injects its stylesheet once `document` exists, including
 * `[data-vaul-drawer][data-state=closed]{animation-name:slideToBottom}` (and the overlay's fadeOut). JSDOM cascades
 * that into getComputedStyle, so Radix Presence sees an exit animation and keeps the closed sheet mounted until its
 * `animationend`. JSDOM never runs CSS animations, so that event never comes: the closed dialog stays in the tree,
 * still labelled, and its aria-hidden siblings (the caller's controls) stay hidden. A browser fires `animationend` when
 * the 0.5 s exit ends; there the sheet leaves and focus returns to the trigger (Hamlet, real-browser check, 27 Nov).
 *
 * This fires that event, with the computed animation name, on every node that turns data-state="closed" while an
 * exit animation applies, one macrotask later (the exit phase still renders first). It does not shorten or skip
 * anything else: the tests still wait, bounded, for the node to leave and focus to return. Presence's handler
 * calls the global `CSS.escape`, which Node lacks, so the window's CSS is exposed while installed.
 */
export function finishExitAnimations(window: Window & typeof globalThis): () => void {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  const hadCSS = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  if (!hadCSS) Object.defineProperty(globalThis, "CSS", { configurable: true, writable: true, value: window.CSS });

  const finish = (element: Element) => {
    const name = window.getComputedStyle(element).animationName;
    if (!name || name === "none") return;
    const id = setTimeout(() => {
      pending.delete(id);
      if (!element.isConnected || element.getAttribute("data-state") !== "closed") return;
      const event = new window.Event("animationend", { bubbles: true });
      Object.defineProperty(event, "animationName", { value: name });
      element.dispatchEvent(event);
    }, 0);
    pending.add(id);
  };
  const observer = new window.MutationObserver((records) => {
    for (const record of records) {
      const target = record.target as Element;
      if (record.type === "attributes" && target.getAttribute("data-state") === "closed") finish(target);
    }
  });
  observer.observe(window.document, { subtree: true, attributes: true, attributeFilter: ["data-state"] });

  return () => {
    observer.disconnect();
    for (const id of pending) clearTimeout(id);
    pending.clear();
    if (!hadCSS) Reflect.deleteProperty(globalThis, "CSS");
  };
}
