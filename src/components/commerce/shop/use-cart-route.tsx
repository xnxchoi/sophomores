"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { CartPhase } from "./use-cart-mode";

const CART_PATH = "/shop/cart";

/**
 * The in-place cart's address (their router entering and leaving /cart), moved out of shop-home unchanged in policy:
 * - the site's links to the cart open it in place (a plain click on the shelf, not over an open book): a shallow push of
 *   /shop/cart, so the scene stays;
 * - Escape and the cart's back control close it, and push back the address it came from when it is on /shop/cart;
 * - Back off /shop/cart closes it in place (no push); Forward (or Back) onto /shop/cart opens it again.
 * Review-B, 28 Nov: the native listeners are subscribed once and read the cart's mode and phase as each transition is
 * accepted (modeRef, phaseRef: set inside the toggle, before React commits), with the shop's open and close motions as of
 * the last commit. Each intent is accepted or refused synchronously, and the address changes only after an accepted one,
 * so two intents in one task never restart a motion or add a history entry. When a motion that had to ignore a Back or
 * Forward settles, the address decides: the popstate rule above applied late, with no push of its own.
 */
export function useCartRoute({ enabled, cart, detailOpen, open, close }: {
  /** The shop carries the in-place cart (its panel is mounted). */
  enabled: boolean;
  cart: { cartMode: boolean; phase: CartPhase; modeRef: { current: boolean }; phaseRef: { current: CartPhase } };
  /** A book is open: the site's cart links load the page instead. */
  detailOpen: boolean;
  /** The cart's open motion, from where the scene stands; false if the cart refused it. */
  open: () => boolean;
  /** The cart's close motion; false if the cart refused it (a close already under way). */
  close: () => boolean;
}) {
  const from = useRef("/shop");
  const live = useRef({ enabled, cart, detailOpen, open, close });
  useLayoutEffect(() => { live.current = { enabled, cart, detailOpen, open, close }; });

  const openCart = useCallback((): boolean => {
    if (live.current.cart.modeRef.current) return false;
    return live.current.open();
  }, []);
  /** Close in place; `push`: put back the address it came from (Escape and the back control, not Back). */
  const closeCart = useCallback((push = true): boolean => {
    const { cart: now } = live.current;
    if (!now.modeRef.current || now.phaseRef.current === "toBrowse" || !live.current.close()) return false;
    if (push && window.location.pathname === CART_PATH) window.history.pushState(null, "", from.current);
    return true;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !live.current.cart.modeRef.current) return;
      event.preventDefault(); closeCart();
    };
    const pop = () => {
      const onCart = window.location.pathname === CART_PATH;
      if (live.current.cart.modeRef.current && !onCart) closeCart(false);
      else if (!live.current.cart.modeRef.current && onCart) openCart();
    };
    const click = (event: MouseEvent) => {
      if (live.current.detailOpen) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || new URL(link.href, window.location.href).pathname !== CART_PATH) return;
      // A cart link while the cart is on (opening, open or closing) is refused here, never left to the link's own
      // navigation, which would add an entry for the address the cart already holds.
      event.preventDefault(); event.stopPropagation();
      const origin = window.location.pathname + window.location.search;
      if (!openCart()) return;
      from.current = origin;
      window.history.pushState(null, "", CART_PATH);
    };
    window.addEventListener("keydown", key); window.addEventListener("popstate", pop);
    window.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("keydown", key); window.removeEventListener("popstate", pop);
      window.removeEventListener("click", click, true);
    };
  }, [enabled, openCart, closeCart]);

  // At rest the cart follows its address: a Back or Forward that arrived while a motion couldn't take it.
  useEffect(() => {
    if (!enabled || cart.phase !== "idle" || live.current.cart.phaseRef.current !== "idle") return;
    const onCart = window.location.pathname === CART_PATH;
    if (!cart.cartMode && onCart) openCart();
    else if (cart.cartMode && !onCart) closeCart(false);
  }, [enabled, cart.phase, cart.cartMode, openCart, closeCart]);

  return { openCart, closeCart };
}
