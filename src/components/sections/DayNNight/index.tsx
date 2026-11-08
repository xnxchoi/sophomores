"use client";

import { DayCycleProvider } from "@/components/sections/DayNNight/store";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useTheme } from "@/providers/Theme";
import { useFooterVisibility } from "@/components/Shells/Footer/footer-visibility";
import { useRPStore } from "@/providers/RP_Pro";
import { SimplifiedView } from "./SimplifiedView";
import { ImmersiveView } from "./Immersive";
import { ViewToggle } from "./ViewToggle";
import { ViewContext } from "./ViewContext";
import { useViewPref, type DayNNightView } from "./useViewPref";
import { ViewportMask } from "./ViewportMask";
import "./dn.css";
import { Link } from "@/components/core/Link/Link";
import type { DayNNightRsvpState } from "./MainLanding";

interface DayNNightLandingProps {
  initialView: DayNNightView;
  rsvpCount: number;
  rsvpState: DayNNightRsvpState;
  isSignedIn: boolean;
  guestNames: string[];
}

/**
 * Day n Night landing — top-level entry.
 *
 * Owns the original immersive visual shell while the act copy now maps
 * to the canonical five-part content flow: Intro, Details, Our friends,
 * Music by YM.FM, RSVP.
 */
export function DayNNightLanding({
  initialView,
  rsvpState,
  isSignedIn
}: DayNNightLandingProps) {
  const { view, setView } = useViewPref({ initial: initialView });
  const setPageTheme = useTheme(useShallow((r) => r.setPageTheme));
  const clearPageTheme = useTheme(useShallow((r) => r.clearPageTheme));
  const setHeaderVisibility = useRPStore((r) => r.setHeaderVisibility);
  const setFXFrameVisibility = useRPStore((r) => r.setFXFrameVisibility);

  // Hide the site's legal footer for both views — the landing owns its own
  // bottom-of-page treatment and the global colophon competes with it.
  useFooterVisibility("hide");

  // The immersive view forces dark to match its night-mode endpoint;
  // the simplified view defers to the user's theme.
  useEffect(() => {
    if (view === "immersive") {
      setPageTheme("dark", true);
    } else {
      clearPageTheme();
    }
    return () => {
      clearPageTheme();
    };
  }, [view, setPageTheme, clearPageTheme]);

  useEffect(() => {
    if (view !== "immersive") {
      setHeaderVisibility(true);
      setFXFrameVisibility(true);
      document.body.removeAttribute("data-dn-immersive");
      document.getElementById("rp-header")?.style.removeProperty("display");
      return;
    }

    const header = document.getElementById("rp-header");
    setHeaderVisibility(false);
    setFXFrameVisibility(false);
    document.body.setAttribute("data-dn-immersive", "true");
    if (header) header.style.display = "none";
    return () => {
      setHeaderVisibility(true);
      setFXFrameVisibility(true);
      document.body.removeAttribute("data-dn-immersive");
      if (header) header.style.display = "";
    };
  }, [view, setHeaderVisibility, setFXFrameVisibility]);

  return (
    <ViewContext.Provider value={{ view, setView }}>
      <div
        data-dn-shell
        data-view={view}
        className="relative isolate min-h-svh bg-[var(--dn-bg)] p-0 text-[var(--dn-fg)]"
      >
        {view === "immersive" && <ViewportMask />}
        {view === "immersive" && <ExitAffordance />}
        {view === "simplified" && (
          <ViewToggle value={view} onChange={setView} />
        )}
        {view === "immersive" ? (
          <DayCycleProvider>
            <ImmersiveView rsvpState={rsvpState} isSignedIn={isSignedIn} />
          </DayCycleProvider>
        ) : (
          <SimplifiedView />
        )}
      </div>
    </ViewContext.Provider>
  );
}

function ExitAffordance() {
  return (
    <Link
      href="/public"
      data-dn-chrome-pill
      aria-label="Back to The Hideaway"
      className="group fixed top-5 left-5 z-[46] inline-flex items-center gap-[10px] rounded-full border border-[var(--dn-chrome-line)] py-[7px] pr-[14px] pl-3 font-sans text-[10px] tracking-[0.18em] text-[var(--dn-chrome-fg-mute)] uppercase no-underline transition-colors hover:text-[var(--dn-chrome-fg)] md:top-8 md:left-8 xl:top-10 xl:left-12"
    >
      <span
        aria-hidden
        className="-translate-y-px text-sm leading-none transition-transform group-hover:-translate-x-[3px]"
      >
        ←
      </span>
      <span>The Hideaway</span>
    </Link>
  );
}

export default DayNNightLanding;
