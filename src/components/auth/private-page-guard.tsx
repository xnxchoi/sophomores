"use client";

import { useEffect } from "react";
import { readSignedInMemberID, watchPrivateView } from "@/lib/member-auth/private-view";

const reloadPage = () => window.location.reload();

type Props = {
  /** The member the server rendered this page for (null: rendered signed out). */
  principal: string | null;
  reload?: () => void;
  readPrincipal?: () => Promise<string | null | undefined>;
};

/**
 * Mounted by every private page's layout through PrivateRoute (src/lib/member-auth/private-pages.ts). The page is
 * hidden when it is left and while its tab is hidden. On every return (the tab shown again, the window refocused) it
 * is hidden at once and the server is asked who is signed in now: the page shows again only for the member it was
 * rendered for (or, rendered signed out, only while still signed out). A different member, a sign-in since, a
 * sign-out, or no answer keeps it hidden and reloads it, so the server renders it for whoever is signed in now. A page
 * restored from the back-forward cache always reloads. Unmounted, it drops any check still in flight. It renders
 * nothing.
 */
export function PrivatePageGuard({ principal, reload = reloadPage, readPrincipal = readSignedInMemberID }: Props) {
  useEffect(() => {
    let leaving = false;
    let disposed = false;
    let check = 0;
    const setHidden = (hidden: boolean) => { document.body.hidden = hidden; };
    const leave = () => {
      if (disposed) return;
      leaving = true;
      setHidden(true);
      reload();
    };
    const recheck = async () => {
      if (leaving || disposed) return;
      const mine = ++check;
      // Hidden before asking: nothing shows while the answer is pending, or if it never comes.
      setHidden(true);
      const current = await readPrincipal();
      // Unmounted, a newer check, a hide since, or a reload under way decides instead.
      if (disposed || leaving || mine !== check) return;
      // Only the exact member the page was rendered for (null: still signed out) may see it again. A sign-in since
      // a signed-out render reloads too: nothing proves the member now signed in owns what this page holds.
      if (current === undefined || current !== principal) return leave();
      if (document.visibilityState === "visible") setHidden(false);
    };
    const stop = watchPrivateView({
      conceal: () => { check += 1; setHidden(true); },
      reveal: () => { void recheck(); },
      restore: leave,
      recheckOnFocus: true
    });
    return () => {
      disposed = true;
      check += 1;
      stop();
    };
  }, [principal, reload, readPrincipal]);
  return null;
}
