"use client";

import { useEffect } from "react";
import { useRPStore } from "@/providers/RP_Pro";

/**
 * The product page turns the shell's FX foot band off (owner, 23 Nov, on its red and yellow over the art: "Switch it off
 * on certain page -> e.g. this"). footer-visibility's CoveredPage turns the band back on as the footer hides again, so
 * this holds it off for as long as the page is mounted, and hands it back on leaving. UI-Shell is confirming the
 * opt-out contract; this follows DayNNight's use of the same setter.
 */
export function FXFrameOff() {
  const shown = useRPStore((store) => store.showFXFrame);
  const setFXFrameVisibility = useRPStore((store) => store.setFXFrameVisibility);
  useEffect(() => { if (shown) setFXFrameVisibility(false); }, [shown, setFXFrameVisibility]);
  useEffect(() => () => setFXFrameVisibility(true), [setFXFrameVisibility]);
  return null;
}
