import { subscribeVisibility } from "@/utils/browser/visibility";

export type PrivateViewHandlers = {
  /** Hide (and stop reading) private content. Runs before the browser can freeze the page in its back-forward cache. */
  conceal: () => void;
  /** Show private content again after a hide; for data read in the browser, read it fresh from the server. */
  reveal: () => void;
  /** A page restored from the back-forward cache. The default conceals, then reveals (a fresh read). */
  restore?: () => void;
  /** Also conceal while the window has no focus (a receipt's delivery address); off for whole pages. */
  concealOnBlur?: boolean;
};

/**
 * The one private-view mechanism (owner, 23 Nov: standard web security is the baseline). It is used by whole private
 * pages (PrivatePageGuard) and by private data read in the browser (the receipt's delivery address). Returns the
 * unsubscribe function.
 */
export function watchPrivateView({ conceal, reveal, restore, concealOnBlur = false }: PrivateViewHandlers): () => void {
  let blurred = false;
  const show = () => { if (!blurred && document.visibilityState === "visible") reveal(); };
  const onPageHide = () => conceal();
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    if (restore) restore();
    else { conceal(); show(); }
  };
  const onBlur = () => { blurred = true; conceal(); };
  const onFocus = () => { blurred = false; show(); };
  const unsubscribe = subscribeVisibility(() => (document.visibilityState === "visible" ? show() : conceal()));
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  if (concealOnBlur) {
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
  }
  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
  };
}
