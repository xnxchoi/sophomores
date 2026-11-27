"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Where the footer prints the seller's facts in full (owner, 22 Nov: "the seller information should ALWAYS be shown - not
 * as a link, but the actual content", and "always shown in commerce-related pages, which excludes essays and other
 * content-related parts. But policy etc should"). Owner, 23 Nov, on the front page: "No, drop it there." So: the shop and
 * its product, cart, checkout and payment steps, the ticket shop and checkout, order history
 * (owner, 23 Nov: "Yes, show them"), and the policy pages (shipping and returns, terms,
 * privacy, refund). A layout can't read the pathname on the server, so this client gate wraps the server-streamed facts.
 */
const COMMERCE_PATHS: ReadonlyArray<RegExp> = [
  /^\/shop(\/|$)/,
  /^\/tickets(\/|$)/,
  /^\/me\/orders(\/|$)/,
  /^\/help\/shipping(\/|$)/,
  /^\/(terms|privacy|refund)(\/|$)/
];

export function pathShowsSellerFacts(pathname: string | null): boolean {
  return pathname !== null && COMMERCE_PATHS.some((pattern) => pattern.test(pathname));
}

export function CommerceFacts({ children }: { children: ReactNode }) {
  return pathShowsSellerFacts(usePathname()) ? children : null;
}
