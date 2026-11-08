"use client";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";

/**
 * Closed-state pull-up affordance for the mobile SideDrawer.
 *
 * Lives as a fixed-position pill at the bottom of the viewport on
 * touch-mobile when the drawer is closed. Tapping it opens the drawer
 * — same `setSideDrawerOpen(true)` semantics as any other open trigger.
 *
 * Design intent: discoverability without visual noise. The pill matches
 * the in-drawer `Drawer.Handle` (44×6px, rounded-full, `bg-foreground/70`)
 * so once the drawer opens and the in-drawer handle reveals at the top,
 * the user reads them as the same affordance — one closed, one open.
 *
 * Stacking:
 *   - z-[238]  pull tab (this component)        ← lower
 *   - z-[239]  SideDrawer Mrawer / shell        ← rises above when open
 *   - z-[260]  SearchSheet overlay (full screen)
 *
 * Hit area is intentionally inflated by transparent padding to ~44×30
 * (Apple's minimum tap target) while the visible pill stays 44×6.
 */
export const SideDrawerPullTab = () => {
  const { isMobile, isTouch } = useIsMobile();
  const sidebarOpen = useRPStore(useShallow((s) => s.sidebarOpen));
  const setSideDrawerOpen = useRPStore((s) => s.setSideDrawerOpen);
  // Portal target must be resolved client-side. Initial null suppresses
  // SSR rendering of the pill entirely (correct — it's touch-only UI).
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!(isMobile && isTouch) || !portalTarget) return null;

  // Portal to <body>. The pill is fixed-positioned, and any transformed
  // ancestor (Lenis wrappers, ContentMask's motion.divs, the LazyMotion
  // tree) turns `position: fixed` into ancestor-relative positioning,
  // which is what shifted the pill off-center on real iOS.
  return createPortal(
    <AnimatePresence>
      {!sidebarOpen && (
        <m.button
          key="side-drawer-pull-tab"
          type="button"
          aria-label="Open navigation"
          onClick={() => setSideDrawerOpen(true)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          className={cn(
            "fixed left-1/2 z-[238] -translate-x-1/2 touch-manipulation",
            // Inflate hit target. The pill itself is the visible h-[6px]
            // span inside; py-3 + px-5 around it bring the button to
            // ~84×30 hit area, well above the 44px floor.
            "px-5 py-3",
            "transition-opacity active:opacity-80"
          )}
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 12px)"
          }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "block h-[6px] w-[44px] rounded-full",
              "bg-foreground/70",
              // Faint outer halo so the pill reads against busy backdrops
              // without committing to a real shadow.
              "shadow-[0_0_0_1px_rgb(0_0_0/0.04),0_2px_8px_-4px_rgb(0_0_0/0.2)]"
            )}
          />
        </m.button>
      )}
    </AnimatePresence>,
    portalTarget
  );
};
