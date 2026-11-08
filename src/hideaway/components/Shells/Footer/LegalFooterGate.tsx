"use client";

import type { ReactNode } from "react";
import { useFooterVisible } from "./footer-visibility";

/**
 * Conditionally renders its children based on the resolved footer
 * visibility (path-based default + page-level override).
 *
 * The expected usage is to wrap a server-rendered `<LegalFooter />` in
 * the root layout — the footer's data fetching always runs server-side,
 * but its DOM output is mounted only when the gate resolves to visible.
 *
 * @example
 *   <LegalFooterGate>
 *     <LegalFooter />
 *   </LegalFooterGate>
 */
export function LegalFooterGate({ children }: { children: ReactNode }) {
  return useFooterVisible() ? <>{children}</> : null;
}
