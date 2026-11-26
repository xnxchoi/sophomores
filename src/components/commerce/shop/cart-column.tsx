"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * stripe.press's cart column and what sits behind it (06w9 page chunk), all faded by the cart's frame variables, not CSS
 * transitions (their hook writes them on :root every frame):
 * - CartRightColumn: fixed, 80 px down, the right 40 %, 39/24/24 padding, its bottom-left corner 8 px, scrolling on its
 *   own; on a phone the whole screen, 110 px of top padding and 60vh under (its stack scrolls with it). Fades with
 *   --cart-panel-enter.
 * - CartTopAbyss: the top 125 px of that column, the ground fading out from 62 px, over what scrolls under it.
 * - CartBackdrop: the rest of the window from 80 px (the left 60 % on desktop), catching clicks without closing the
 *   cart (theirs is an aria-hidden div there). Fades with --cart-backdrop-opacity.
 * - CartStackBackground: the art card behind the stacked books, 76 px down, 16 px in, 60 % of the padded width, 8 px
 *   corners; desktop only. Theirs is a fixed painting; ours is the open book's own art.
 * - The return link (ReturnToShelfWrap, 1imu): at 60vw + 24 px, 46 px down; in over 320 ms (opacity) and 420 ms
 *   (from 28 px right), 220 ms after it's asked for, out at once; desktop only.
 */
/** What the column's contents can reach: its close (the way back to the shelf), that link's label, and where the lines
 * report their quantities (the stack's cartQuantitiesByBookId), or null when they leave. */
type CartColumnValue = { close: () => void; back: string; report: (quantities: Record<string, number> | null) => void };
const CartColumnContext = createContext<CartColumnValue | null>(null);
/** The cart column around the caller, or null outside one (the cart's own page). */
export function useCartColumn() { return useContext(CartColumnContext); }

export function CartColumn({ open, shown, back, onBack, onLines, children }: {
  /** The cart mode is on (the column is mounted and faded by the frame). */
  open: boolean;
  /** The column takes input (theirs: cartPanelOpen). */
  shown: boolean; back: string; onBack: () => void; onLines: CartColumnValue["report"]; children: ReactNode }) {
  const value = useMemo(() => ({ close: onBack, back, report: onLines }), [onBack, back, onLines]);
  if (!open) return null;
  return <>
    <div aria-hidden="true" className="pointer-events-none fixed top-0 right-0 z-[31] h-[125px] w-[40%] bg-background [mask-image:linear-gradient(#000_0_62px,transparent_100%)] max-[900px]:w-full"
      style={{ opacity: "var(--cart-panel-enter, 1)" }} />
    <div className={cn("fixed top-[calc(46px+var(--shop-shift,0px))] left-[calc(60vw+24px)] z-[32] max-[900px]:hidden",
      shown ? "translate-x-0 opacity-100 transition-[opacity,translate] delay-220 duration-[320ms,420ms] ease-[ease-out]" : "pointer-events-none translate-x-7 opacity-0")}>
      <button type="button" tabIndex={shown ? 0 : -1} onClick={onBack}
        className="inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:min-h-11">
        <ArrowLeftIcon aria-hidden="true" className="mr-1.5 size-3.5" />{back}
      </button>
    </div>
    <aside inert={!shown} data-lenis-prevent=""
      className="fixed top-[calc(80px+var(--shop-shift,0px))] right-0 z-30 isolate flex h-[calc(100vh-80px-var(--shop-shift,0px))] w-[40%] flex-col overflow-y-auto overscroll-contain rounded-bl-[8px] bg-background px-6 pt-[39px] pb-6 text-foreground max-[900px]:top-0 max-[900px]:h-dvh max-[900px]:w-full max-[900px]:rounded-none max-[900px]:pt-[110px] max-[900px]:pb-[60vh]"
      style={{ opacity: "var(--cart-panel-enter, 1)" }}>
      <div className="mb-auto"><CartColumnContext value={value}>{children}</CartColumnContext></div>
    </aside>
  </>;
}

/** The click-catching backdrop and the art card behind the stack (CartBackdrop, CartStackBackground). */
export function CartBehind({ open, art, cardTop }: { open: boolean; art: { url: string; alt?: string | null } | null | undefined; cardTop: number }) {
  if (!open) return null;
  return <>
    <div aria-hidden="true" className="fixed top-[calc(80px+var(--shop-shift,0px))] left-0 z-[11] h-[calc(100vh-80px-var(--shop-shift,0px))] w-full min-[900px]:w-[60vw]"
      style={{ opacity: "var(--cart-backdrop-opacity, 0)" }} />
    {art && <div aria-hidden="true" className="pointer-events-none fixed bottom-6 left-4 z-[9] w-[calc((100vw-32px)*0.6)] overflow-hidden rounded-[8px] bg-muted max-[900px]:hidden"
      style={{ top: cardTop, opacity: "var(--cart-backdrop-opacity, 0)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art.url} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
    </div>}
  </>;
}
