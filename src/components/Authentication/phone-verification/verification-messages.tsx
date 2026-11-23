"use client";

import { createContext, type ReactNode } from "react";
import type { VerificationCatalogues } from "../../../lib/phone-verification/i18n";

// Kept apart from the flow so a segment layout can hand over the copy without pulling the flow into its bundle.
export const VerificationCataloguesContext =
  createContext<VerificationCatalogues | null>(null);

/** Hands the phone verification flow its copy in both locales, picked on the server. */
export function VerificationMessages({
  messages,
  children
}: {
  messages: VerificationCatalogues;
  children: ReactNode;
}) {
  return (
    <VerificationCataloguesContext.Provider value={messages}>
      {children}
    </VerificationCataloguesContext.Provider>
  );
}
