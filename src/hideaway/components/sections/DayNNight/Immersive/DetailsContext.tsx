"use client";

import { createContext, useContext } from "react";

/**
 * Shared open-state for the right-side Details drawer. Multiple triggers
 * (top-right QuickActions, in-act OpeningCard) need to open the same
 * drawer instance, and the drawer itself is rendered once at the
 * Immersive root. Context keeps those three points coupled without
 * prop-drilling through Timeline + ActSet.
 */
interface DetailsContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DetailsContext = createContext<DetailsContextValue | null>(null);

export function useDetailsContext(): DetailsContextValue {
  const value = useContext(DetailsContext);
  if (!value) {
    throw new Error(
      "useDetailsContext must be used inside <DetailsContext.Provider>"
    );
  }
  return value;
}
