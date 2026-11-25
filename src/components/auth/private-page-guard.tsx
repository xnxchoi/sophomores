"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readSignedInMemberID, watchPrivateView } from "@/lib/member-auth/private-view";

const reloadPage = () => window.location.reload();

// Where a private page's overlays (sheets, trays, dialogs) mount: a host inside the guard's own wrapper, so whatever
// hides the page hides them too. Null outside a private page: portals keep their usual place under <body>.
const PrivatePortalHost = createContext<HTMLElement | null>(null);

/** The portal container for an overlay on a private page (null elsewhere). Pass it as the portal's `container`. */
export function usePrivatePortalContainer(): HTMLElement | null {
  return useContext(PrivatePortalHost);
}

// The private page on screen now, for overlays mounted outside every guard: the layout's in-place sign-in sheet
// (Review-A, 24 Nov). The newest mounted guard wins; none mounted means null, the usual place under <body>.
let hosts: readonly HTMLElement[] = [];
const listeners = new Set<() => void>();
const activeHost = () => hosts.at(-1) ?? null;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
function registerHost(host: HTMLElement): () => void {
  hosts = [...hosts, host];
  listeners.forEach((listener) => listener());
  return () => {
    hosts = hosts.filter((entry) => entry !== host);
    listeners.forEach((listener) => listener());
  };
}

/**
 * For an overlay that lives outside the page (a layout's sheet): while a private page is on screen, the overlay
 * portals into that page's host, so the page's concealment (left, tab hidden, rechecking, a different member) hides
 * and blocks it too. On a public page it portals as usual.
 */
export function ActivePrivatePortal({ children }: { children: ReactNode }) {
  const host = useSyncExternalStore(subscribe, activeHost, () => null);
  return <PrivatePortalHost.Provider value={host}>{children}</PrivatePortalHost.Provider>;
}

type Props = {
  children: ReactNode;
  /** The member the server rendered this page for (null: rendered signed out). */
  principal: string | null;
  reload?: () => void;
  readPrincipal?: () => Promise<string | null | undefined>;
};

/**
 * Mounted by every private page's layout through PrivateRoute (src/lib/member-auth/private-pages.ts). The page is
 * concealed (visibility hidden and inert, never removed from display) when it is left and while its tab is hidden. On every return (the tab shown again, the window refocused) it
 * is hidden at once and the server is asked who is signed in now: the page shows again only for the member it was
 * rendered for (or, rendered signed out, only while still signed out). A different member, a sign-in since, a
 * sign-out, or no answer keeps it hidden and reloads it, so the server renders it for whoever is signed in now. A page
 * restored from the back-forward cache always reloads. It hides only its own wrapper (layout-neutral), so leaving the
 * route mid-check can never hide the page navigated to; unmounted, it drops any check still in flight. The page's
 * overlays portal into a host inside that wrapper (usePrivatePortalContainer), so they are hidden with it.
 */
export function PrivatePageGuard({ children, principal, reload = reloadPage, readPrincipal = readSignedInMemberID }: Props) {
  const content = useRef<HTMLDivElement>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useEffect(() => (portalHost ? registerHost(portalHost) : undefined), [portalHost]);
  useEffect(() => {
    let leaving = false;
    let disposed = false;
    let check = 0;
    // Concealed, not taken out of display (owner, 24 Nov: the sheet's entrance replayed on every switch). display:none
    // restarts CSS animations such as Vaul's slide-in when it is lifted; visibility:hidden plus inert hides and blocks
    // the page and its overlays without remounting or replaying anything. Focus inside returns when it is shown again.
    let focused: HTMLElement | null = null;
    const setHidden = (hidden: boolean) => {
      const node = content.current;
      if (!node || node.hasAttribute("data-concealed") === hidden) return;
      if (hidden) {
        const active = document.activeElement;
        focused = active instanceof HTMLElement && node.contains(active) ? active : null;
        node.setAttribute("data-concealed", "");
        node.setAttribute("inert", "");
        return;
      }
      node.removeAttribute("data-concealed");
      node.removeAttribute("inert");
      const restore = focused;
      focused = null;
      if (restore?.isConnected && (document.activeElement === null || document.activeElement === document.body)) restore.focus({ preventScroll: true });
    };
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
  return <div ref={content} data-private-page="" className="contents data-concealed:invisible">
    <PrivatePortalHost.Provider value={portalHost}>{children}</PrivatePortalHost.Provider>
    <div ref={setPortalHost} data-private-portal-host="" className="contents" />
  </div>;
}
