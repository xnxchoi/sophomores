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
 * hidden when it is left and while its tab is hidden. On every return (the tab shown again, the window refocused)
 * the server is asked who is signed in now: the page shows again only for the same member; otherwise, or when the
 * server cannot say, it stays hidden and reloads, so the server renders it for whoever is signed in or sends a
 * signed-out visitor to sign in. A page restored from the back-forward cache always reloads. It renders nothing.
 *
 * A page rendered signed out (the sign-in steps) takes the first member it then sees as its own: that member
 * signed in on this page.
 */
export function PrivatePageGuard({ principal, reload = reloadPage, readPrincipal = readSignedInMemberID }: Props) {
  useEffect(() => {
    let expected = principal;
    let leaving = false;
    let check = 0;
    const setHidden = (hidden: boolean) => { document.body.hidden = hidden; };
    const leave = () => {
      leaving = true;
      setHidden(true);
      reload();
    };
    const recheck = async () => {
      if (leaving) return;
      const mine = ++check;
      const current = await readPrincipal();
      // A newer check, a hide since, or a reload already under way decides instead.
      if (leaving || mine !== check) return;
      if (current === undefined) return leave();
      if (expected === null) expected = current;
      if (current !== expected) return leave();
      if (document.visibilityState === "visible") setHidden(false);
    };
    return watchPrivateView({
      conceal: () => { check += 1; setHidden(true); },
      reveal: () => { void recheck(); },
      restore: leave,
      recheckOnFocus: true
    });
  }, [principal, reload, readPrincipal]);
  return null;
}
