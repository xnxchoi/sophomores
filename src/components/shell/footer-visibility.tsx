"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import * as m from "motion/react-m";

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
  // A single essay; the archive keeps it.
  /^\/essays\/[^/]+$/
];

export function pathHidesFooter(pathname: string): boolean {
  return FOOTER_HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Renders the footer only where it shows, and reveals it as it scrolls into view (owner, 19 Nov: "I do want
 * to make it so that it's revealed", with no clear dividing line).
 */
export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathHidesFooter(pathname)) return null;
  return (
    <m.div
      initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
