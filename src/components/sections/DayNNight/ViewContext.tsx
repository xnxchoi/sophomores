"use client";

import { createContext, useContext } from "react";
import type { DayNNightView } from "./useViewPref";

/**
 * View preference shared across the DayNNight tree. Parent owns state
 * (cookie-backed via `useViewPref`); descendants — Immersive's
 * bottom-action pill, future simplified-view chrome — consume to read
 * the current view and trigger a switch without prop-drilling.
 */
interface ViewContextValue {
  view: DayNNightView;
  setView: (next: DayNNightView) => void;
}

export const ViewContext = createContext<ViewContextValue | null>(null);

export function useViewContext(): ViewContextValue {
  const value = useContext(ViewContext);
  if (!value) {
    throw new Error(
      "useViewContext must be used inside <ViewContext.Provider>"
    );
  }
  return value;
}
