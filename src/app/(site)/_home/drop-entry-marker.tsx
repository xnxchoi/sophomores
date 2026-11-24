"use client";

import { useEffect } from "react";
import { homeEntryMarker } from "@/lib/content/home";

/**
 * The home-entry gate brings an open-window visitor back as "/?entry=1" so that request is never sent round again
 * (src/lib/content/home-entry.server.ts). Once the Warp home is here, the marker leaves the address bar; the native
 * History API keeps Next's router in step (Next 16 docs, Linking and Navigating: Native History API).
 */
export function DropEntryMarker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(homeEntryMarker)) return;
    url.searchParams.delete(homeEntryMarker);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
