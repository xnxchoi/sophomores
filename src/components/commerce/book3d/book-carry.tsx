"use client";

import type { ComponentProps } from "react";
import { Link } from "@/components/core/Link/Link";

/**
 * The shop → product carry (stripe.press, TEARDOWN §5): a click on a shop card records where that product's cover sits
 * on screen; the product page's book then starts from that rect and travels into its stage (book-stage.tsx). Kept in the
 * module, not in React state, because the shop page unmounts as the product page mounts. A record older than
 * CARRY_TTL_MS is ignored, so a later direct visit never starts from a stale rect.
 */
const CARRY_TTL_MS = 1500;
let pending: { id: string; rect: { left: number; top: number; width: number; height: number }; at: number } | null = null;

/** The clicked card's cover rect for this product, if the click was recent; the book clears it when its carry ends. */
export function peekCarry(id: string) {
  return pending && pending.id === id && performance.now() - pending.at < CARRY_TTL_MS ? pending.rect : null;
}
export function endCarry(id: string) {
  if (pending?.id === id) pending = null;
}

/** A shop card's link that records its cover (`[data-carry-cover]`) as the start of the book's carry. */
export function CarryLink({ productId, onClick, ...props }: ComponentProps<typeof Link> & { productId: string }) {
  return <Link {...props} onClick={(event) => {
    const cover = event.currentTarget.querySelector("[data-carry-cover]")?.getBoundingClientRect();
    if (cover) pending = { id: productId, rect: { left: cover.left, top: cover.top, width: cover.width, height: cover.height }, at: performance.now() };
    onClick?.(event);
  }} />;
}
