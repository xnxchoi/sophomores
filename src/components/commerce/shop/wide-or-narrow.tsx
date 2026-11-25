"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * Renders `wide` from 900 px up and `narrow` below, mounting only one of them (both arrive from the server). 900 px is
 * the width at which stripe.press's scene switches to its phone layout (06w9:11490 `ah = width < 900`); the site's own
 * useIsMobile uses other breakpoints and starts unset, so it can't make this call on the first frame.
 * The server and the first client frame render `wide` (most product links are opened on a desktop); a phone swaps to
 * `narrow` as it hydrates.
 */
const query = "(min-width: 900px)";
const subscribe = (change: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", change);
  return () => list.removeEventListener("change", change);
};

export function WideOrNarrow({ wide, narrow }: { wide: ReactNode; narrow: ReactNode }) {
  const isWide = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
  return isWide ? wide : narrow;
}
