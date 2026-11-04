"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createStore, useStore } from "zustand";

/**
 * Footer visibility — two layers.
 *
 *   1. **Path-based default** (`FOOTER_HIDDEN_PATTERNS` below). The footer
 *      is hidden by default on routes where it would distract or compete
 *      with the page's own bottom-of-screen content (auth flows,
 *      long-form reading, checkout). Most other routes show it.
 *
 *   2. **Page-level override** (`useFooterVisibility`). A page can force
 *      the footer visible or hidden regardless of the path-based default.
 *      Useful for one-off exceptions in either direction. The override
 *      is automatically cleared when the page unmounts.
 *
 * Resolution: override (if set) wins; otherwise the path default applies.
 */

type Override = "show" | "hide" | null;

interface FooterVisibilityState {
  override: Override;
  setOverride: (next: Override) => void;
}

const footerVisibilityStore = createStore<FooterVisibilityState>((set) => ({
  override: null,
  setOverride: (next) => set({ override: next })
}));

/**
 * Path patterns where the footer is hidden by default. Adding a new
 * pattern is the right move when a route's chrome shouldn't include the
 * legal/colophon block — anything immersive, transactional, or focused.
 */
export const FOOTER_HIDDEN_PATTERNS: ReadonlyArray<RegExp> = [
  // Auth flows — keep the user on the form, no chrome below.
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/forgot-password(\/|$)/,
  /^\/radio(\/|$)/,
  /^\/me(\/|$)/,
  /^\/reset-password(\/|$)/,
  /^\/the-team(\/|$)/,
  /^\/two-factor(\/|$)/,
  /^\/accept-invitation(\/|$)/,
  // Long-form reading — footer breaks immersion at the end of an essay.
  /^\/essays\/[^/]+$/,
  /^\/surf\/[^/]+$/,
  // Checkout — focused transactional flow.
  /^\/checkout(\/|$)/,
  // LOSTINSEOUL owns its own legal/footer surface.
  /^\/lostinseoul(\/|$)/,
  /^\/day-n-night(\/|$)/,
  /^\/tickets(\/|$)/
];

/**
 * Returns true when the path matches a pattern where the footer is
 * hidden by default. Exposed for callers that need to check without
 * mounting (e.g., server-side guards, tests).
 */
export function pathHidesFooterByDefault(pathname: string): boolean {
  return FOOTER_HIDDEN_PATTERNS.some((p) => p.test(pathname));
}

export function pathHidesHeaderByDefault(pathname: string): boolean {
  return /^\/lostinseoul(\/|$)/.test(pathname);
}

/**
 * Page-level override. Pass `"hide"` to force the footer hidden on a
 * route that would otherwise show it; pass `"show"` to force it visible
 * on a route that would otherwise hide it; pass `null` (or omit) to use
 * the path-based default.
 *
 * The override clears automatically when the calling component unmounts.
 *
 * @example
 *   // A bespoke landing page that wants no footer chrome.
 *   useFooterVisibility("hide");
 *
 *   // A page under a "hidden by default" prefix that wants the footer.
 *   useFooterVisibility("show");
 */
export function useFooterVisibility(state: Override = null): void {
  useEffect(() => {
    footerVisibilityStore.setState({ override: state });
    return () => {
      // Only clear if the override is still ours — guards against a
      // concurrent page mount/unmount race overwriting the next page's
      // override with `null`.
      if (footerVisibilityStore.getState().override === state) {
        footerVisibilityStore.setState({ override: null });
      }
    };
  }, [state]);
}

/**
 * Resolves whether the footer should render right now, taking the
 * path-based default + active override into account. Used internally by
 * `LegalFooterGate`; exposed in case other chrome (e.g., a bottom nav)
 * wants to mirror the same visibility signal.
 */
export function useFooterVisible(): boolean {
  const pathname = usePathname();
  const override = useStore(footerVisibilityStore, (s) => s.override);
  if (override === "show") return true;
  if (override === "hide") return false;
  return !pathHidesFooterByDefault(pathname ?? "");
}
