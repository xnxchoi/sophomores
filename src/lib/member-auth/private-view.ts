import { z } from "zod";
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
  /** Reveal (a fresh check) whenever the window regains focus, without concealing on blur (whole pages). */
  recheckOnFocus?: boolean;
};

/**
 * The one private-view mechanism (owner, 23 Nov: standard web security is the baseline). It is used by whole private
 * pages (PrivatePageGuard) and by private data read in the browser (the receipt's delivery address). Returns the
 * unsubscribe function.
 */
export function watchPrivateView({ conceal, reveal, restore, concealOnBlur = false, recheckOnFocus = false }: PrivateViewHandlers): () => void {
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
  if (concealOnBlur) window.addEventListener("blur", onBlur);
  if (concealOnBlur || recheckOnFocus) window.addEventListener("focus", onFocus);
  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
  };
}

const signedIn = z.object({ user: z.object({ id: z.union([z.string().min(1), z.number()]) }).nullable() });

/**
 * Who this browser's session belongs to now, read from the server: the member's ID, null when signed out, or
 * undefined when the server could not say (network, 5xx, an unexpected body).
 */
export async function readSignedInMemberID(fetcher: typeof fetch = fetch): Promise<string | null | undefined> {
  try {
    const response = await fetcher("/api/users/me?depth=0&select[id]=true", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return undefined;
    const body = signedIn.safeParse(await response.json());
    if (!body.success) return undefined;
    return body.data.user ? String(body.data.user.id) : null;
  } catch {
    return undefined;
  }
}
