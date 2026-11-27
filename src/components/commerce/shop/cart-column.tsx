"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { Button } from "@/components/core/Button";

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
/** What the column's contents can reach: its close (the way back to the shelf), that link's label, where the lines
 * report their quantities (the stack's cartQuantitiesByBookId), or null when they leave, and the stack's concealment:
 * the lines hide the cart's books with their private page's guard (Review-B HOLD on 38f56878). */
type CartColumnValue = {
  close: () => void; back: string; report: (quantities: Record<string, number> | null) => void; conceal: (hidden: boolean) => void;
};
const CartColumnContext = createContext<CartColumnValue | null>(null);
/** Whether the cart owns input now: the shop's global keys and wheel stand down while it does (Review-B, 27 Nov). */
export function cartOwnsInput() { return document.documentElement.hasAttribute("data-cart-owns"); }
/** Marks (or clears) the cart owning input, on the root so every shop listener can read it. */
export function ownInput(owns: boolean) { document.documentElement.toggleAttribute("data-cart-owns", owns); }

/** The cart column around the caller, or null outside one (the cart's own page). */
export function useCartColumn() { return useContext(CartColumnContext); }

export function CartColumn({ open, shown, back, onBack, onLines, onConceal, children }: {
  /** The cart mode is on (the column is mounted and faded by the frame). */
  open: boolean;
  /** The column takes input (theirs: cartPanelOpen). */
  shown: boolean; back: string; onBack: () => void; onLines: CartColumnValue["report"]; onConceal: CartColumnValue["conceal"];
  children: ReactNode }) {
  const value = useMemo(() => ({ close: onBack, back, report: onLines, conceal: onConceal }), [onBack, back, onLines, onConceal]);
  // Focus moves into the cart when it takes input (Review-B, 27 Nov); the column itself, so no control is pressed by it.
  const column = useRef<HTMLElement>(null);
  useEffect(() => { if (shown) column.current?.focus({ preventScroll: true }); }, [shown]);
  if (!open) return null;
  return <>
    <div aria-hidden="true" className="pointer-events-none fixed top-0 right-0 z-[31] h-[125px] w-[40%] bg-background [mask-image:linear-gradient(#000_0_62px,transparent_100%)] max-[900px]:w-full"
      style={{ opacity: "var(--cart-panel-enter, 1)" }} />
    <div className={cn("fixed top-[calc(46px+var(--shop-shift,0px))] left-[calc(60vw+24px)] z-[32] max-[900px]:hidden",
      shown ? "translate-x-0 opacity-100 transition-[opacity,translate] delay-220 duration-[320ms,420ms] ease-[ease-out]" : "pointer-events-none translate-x-7 opacity-0")}>
      <Button variant="bare" type="button" tabIndex={shown ? 0 : -1} onClick={onBack}
        className="group/focus inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:min-h-11">
        <FocusShape className="inline-flex items-center outline-offset-4"><ArrowLeftIcon aria-hidden="true" className="mr-1.5 size-3.5" />{back}</FocusShape>
      </Button>
    </div>
    {/* On a phone the way back sits in the label's slot under the nav (theirs: "Return to shelf" top left over the
        column), coming in from +10 px 100 ms after it's asked for, as the open book's phone link does. */}
    <Button variant="bare" type="button" tabIndex={shown ? 0 : -1} aria-hidden={!shown} onClick={onBack}
      className={cn("group/focus fixed top-[calc(53px+var(--shop-shift,0px))] left-4 z-[32] -my-3.5 inline-flex min-h-11 min-w-11 items-center text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground transition-[opacity,translate,color] duration-300 ease-[ease] hover:text-foreground min-[900px]:hidden",
        shown ? "delay-100" : "pointer-events-none translate-x-2.5 opacity-0")}>
      <FocusShape className="inline-flex items-center outline-offset-4"><ArrowLeftIcon aria-hidden="true" className="mr-1.5 size-3.5" />{back}</FocusShape>
    </Button>
    <aside ref={column} tabIndex={-1} inert={!shown} data-lenis-prevent=""
      className="fixed top-[calc(80px+var(--shop-shift,0px))] right-0 z-30 isolate flex outline-none h-[calc(100vh-80px-var(--shop-shift,0px))] w-[40%] flex-col overflow-y-auto overscroll-contain rounded-bl-[8px] bg-background px-6 pt-[39px] pb-6 text-foreground max-[900px]:top-0 max-[900px]:h-dvh max-[900px]:w-full max-[900px]:rounded-none max-[900px]:pt-[110px] max-[900px]:pb-[60vh]"
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
