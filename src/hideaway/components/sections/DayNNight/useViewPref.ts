"use client";

import { useCallback, useEffect, useState } from "react";

export type DayNNightView = "immersive" | "simplified";

const COOKIE_NAME = "day-n-night.view-pref";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function readCookie(): DayNNightView | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const raw = match.split("=")[1];
  return raw === "simplified" || raw === "immersive" ? raw : null;
}

function writeCookie(value: DayNNightView) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

interface UseViewPrefOptions {
  /** Initial value resolved server-side from the cookie. */
  initial: DayNNightView;
}

/**
 * Client-side cookie-backed view preference for the Day n Night landing.
 * Server reads the cookie via Next's cookies() API; that value is passed in
 * as `initial`. Toggling here writes the cookie immediately and updates state.
 */
export function useViewPref({ initial }: UseViewPrefOptions) {
  const [view, setView] = useState<DayNNightView>(initial);

  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie && fromCookie !== view) {
      setView(fromCookie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: DayNNightView) => {
    writeCookie(next);
    setView(next);
  }, []);

  return { view, setView: update } as const;
}

export const DAY_N_NIGHT_VIEW_COOKIE = COOKIE_NAME;
