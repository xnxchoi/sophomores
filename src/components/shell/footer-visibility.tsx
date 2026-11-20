"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useInView, useIsPresent } from "motion/react";
import { create } from "zustand";
import { useRPStore } from "@/providers/RP_Pro";

/**
 * Where the site footer shows, ported from The Hideaway's footer visibility (its
 * `components/Shells/Footer/footer-visibility.ts` and `LegalFooterGate`). A layout can't read the pathname on
 * the server, so a client gate wraps the server-rendered footer (Next 16: `usePathname`).
 *
 * The Hideaway hid the footer on sign-in, account, reading, checkout and ticket routes. Here every commercial
 * page keeps it, along with the front page (owner, 19 Nov: "anything that is commercial needs to display the
 * footer. and, of course, the very front-page of the site as well"): it carries the seller disclosure.
 * The Hideaway's page override hook isn't ported: no page here needs one.
 */
export const FOOTER_HIDDEN_PATTERNS: ReadonlyArray<RegExp> = [
  /^\/team(\/|$)/,
  /^\/account(\/|$)/,
  // The account home and settings; order history is commercial and keeps the footer.
  /^\/me$/,
  /^\/me\/settings(\/|$)/,
  // A single essay; the archive and the paged listing (/essays/in, /essays/in/N) keep it.
  /^\/essays\/(?!in$)[^/]+$/
];

export function pathHidesFooter(pathname: string): boolean {
  return FOOTER_HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Whether the pinned footer is showing under the page. The Help pill steps aside while it is, since the footer's
 * strip sits where the pill floats.
 */
export const useFooterReveal = create<{ revealed: boolean; setRevealed: (revealed: boolean) => void }>((set) => ({
  revealed: false,
  setRevealed: (revealed) => set({ revealed })
}));

/**
 * Renders the footer only where it shows. From md up it is pinned under the page, which lifts off it (Osklen
 * study, owner 20 Nov: "yes to the pinned footer"): CSS `sticky` keeps it at the window's foot while the page,
 * one layer up with its own background, covers it until the page's end scrolls past. Below md it scrolls
 * normally. This replaces the 19 Nov fade, rise and blur, so the footer never reveals twice. `sticky` keeps
 * working when RPage scales or moves its inner div for the menu; a `fixed` footer would not.
 */
export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathHidesFooter(pathname)) return null;
  // From md up it tucks 22px under the page's end, so the footer itself shows behind the page's rounded bottom
  // corners and no other colour shows in them. Its own top padding (md:pt-14) keeps the links clear.
  return <div className="md:sticky md:bottom-0 md:z-0 md:-mt-[22px]">{children}</div>;
}

/**
 * The page's layer above the pinned footer, only where the footer shows. Elsewhere the page renders as it did,
 * with no stacking context, so in-page overlays such as /team's profile dialogs (z-99/100) still rise above the
 * header and the canvas. Without `isolate` on the page, the cover (z-1) and the footer (z-0) stack in the root
 * context: under the shared canvas (z-1, later in the document) and the header (z-2), as the page did before.
 *
 * The cover ends with a marker: once the marker is in the window, the page's end has risen past the window's
 * foot and the footer shows. Then the FXFrame band turns off, as The Hideaway's DayNNight turns it off, so its
 * contrast filter doesn't distort the footer's small print. A page that is leaving (its curtain still running)
 * doesn't write: only the arriving page owns the flag.
 */
export function PageCover({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathHidesFooter(pathname)) return <FooterlessPage>{children}</FooterlessPage>;
  return <CoveredPage>{children}</CoveredPage>;
}

/** No footer here: the band stays on and the pill may show. */
function FooterlessPage({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent();
  const setFXFrameVisibility = useRPStore((state) => state.setFXFrameVisibility);
  const setRevealed = useFooterReveal((state) => state.setRevealed);
  useEffect(() => {
    if (!isPresent) return;
    setFXFrameVisibility(true);
    setRevealed(false);
  }, [isPresent, setFXFrameVisibility, setRevealed]);
  return children;
}

function CoveredPage({ children }: { children: ReactNode }) {
  const end = useRef<HTMLDivElement>(null);
  const revealed = useInView(end);
  const isPresent = useIsPresent();
  const setFXFrameVisibility = useRPStore((state) => state.setFXFrameVisibility);
  const setRevealed = useFooterReveal((state) => state.setRevealed);
  useEffect(() => {
    if (!isPresent) return;
    setFXFrameVisibility(!revealed);
    setRevealed(revealed);
  }, [isPresent, revealed, setFXFrameVisibility, setRevealed]);
  return (
    // Rounded bottom corners (owner, 21 Nov: "And rounded corners it is"), the frame corners' own size from md up
    // (RP_Menu: 22 px off phones, The Hideaway's 2.2rem on its 10 px root), so the page visibly lifts off the pinned footer. Below md the footer isn't
    // pinned, so the page keeps square corners. overflow-clip keeps a page's own full-width background (such as
    // /shop's) inside the rounding; unlike overflow-hidden it isn't a scroll container, so sticky children still work.
    <div data-themed="background-color" className="relative z-1 bg-background md:overflow-clip md:rounded-b-[22px]">
      {children}
      <div ref={end} aria-hidden="true" />
    </div>
  );
}
