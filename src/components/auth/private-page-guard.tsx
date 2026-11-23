"use client";

import { useEffect } from "react";
import { watchPrivateView } from "@/lib/member-auth/private-view";

const reloadPage = () => window.location.reload();

/**
 * Mounted by every private page's layout (src/lib/member-auth/private-pages.ts). The page is hidden when it is left
 * (before the back-forward cache can keep a frame of it) and while its tab is hidden. A page restored from that cache
 * stays hidden and reloads, so the server re-checks the session and renders it afresh, or sends a signed-out visitor
 * to sign in. It renders nothing.
 */
export function PrivatePageGuard({ reload = reloadPage }: { reload?: () => void }) {
  useEffect(() => {
    let restoring = false;
    const setHidden = (hidden: boolean) => { document.body.hidden = hidden; };
    return watchPrivateView({
      conceal: () => setHidden(true),
      reveal: () => { if (!restoring) setHidden(false); },
      restore: () => {
        restoring = true;
        setHidden(true);
        reload();
      }
    });
  }, [reload]);
  return null;
}
