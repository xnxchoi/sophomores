"use client";

import { useEffect, useState } from "react";
import { useDayNNightScene, useDayNNightStore } from "../store";

// Sticky window. The two bookend title blocks (Closing's "Day n Night"
// at viewport-left, and the duplicate ActSet's Opening "Day n Night"
// entering from viewport-right) overlap in the viewport across the
// loop's modulo wrap. To avoid seeing TWO identical titles
// simultaneously, Timeline's `bookendFade` opacity-fades both blocks
// to 0 while the user's progress is inside this window. The wrap then
// reads as a quiet beat — no title for a moment between the night and
// the next dawn — instead of a UI-chrome transition.
//
// 2026-05-21: simplified from a wider 0.85→0.13 + fixed-position
// overlay (the prior SeamBridge component) to a single
// hook-driven fade. The overlay was sliding 30vw horizontally across
// 28% of every cycle and registered as separate chrome rather than
// continuous content. Removing it lets the cycle's own day→night arc
// sell the loop.
const STICKY_ACTIVATE = 0.92;
const STICKY_RELEASE = 0.08;

/**
 * Returns true during the narrow seam window — the moment near the
 * loop's modulo wrap where the primary set's Closing title and the
 * duplicate set's Opening title would both be partially in viewport.
 *
 * Consumed by Timeline to opacity-fade the two bookend title blocks so
 * only one (or briefly neither) is visible at a time. Outside this
 * window the bookend titles render normally and move with the GSAP
 * track.
 *
 * The `hasCrossedMidpoint` latch prevents the window from firing on
 * the initial paint at progress=0 (which sits inside the
 * `<= STICKY_RELEASE` branch). The user must scroll into mid-loop
 * before the fade is allowed to arm; thereafter the latch stays true
 * for the rest of the session.
 */
export function useStickyZone(): boolean {
  const store = useDayNNightStore();
  const [crossed, setCrossed] = useState(false);
  const inProgressWindow = useDayNNightScene(
    (s) => s.progress >= STICKY_ACTIVATE || s.progress <= STICKY_RELEASE
  );
  useEffect(() => {
    if (store.getState().progress > 0.3 && store.getState().progress < 0.7) {
      setCrossed(true);
      return;
    }
    return store.subscribe((s) => {
      if (s.progress > 0.3 && s.progress < 0.7) setCrossed(true);
    });
  }, [store]);
  return crossed && inProgressWindow;
}
