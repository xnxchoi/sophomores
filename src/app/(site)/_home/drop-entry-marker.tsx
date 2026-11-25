"use client";

import { useEffect } from "react";
import { homeEntryMarker } from "@/lib/content/home";

/**
 * The home-entry gate brings an open-window visitor back as "/?entry=1" so that request is never sent round again
 * (src/lib/content/home-entry.server.ts). Once the Warp home is here, the marker leaves the address bar through the
 * native History API, which Next's router follows (Next 16 docs, Linking and Navigating: Native History API), as the docs
 * call it: state `null`, so the router's patched replaceState syncs its own URL. Passing Next's own history state (it
 * carries `__NA`) made the patch skip the sync, and the router wrote "?entry=1" back on its next update (live check,
 * 25 Nov). The call also waits a task: the router installs that patch in its own effect, which runs after this child's.
 */
export function DropEntryMarker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(homeEntryMarker)) return;
    url.searchParams.delete(homeEntryMarker);
    const timer = window.setTimeout(() => window.history.replaceState(null, "", url.pathname + url.search + url.hash), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
