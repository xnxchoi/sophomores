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
 * Review-B, 28 Nov: the native listeners are subscribed once and read the cart as of the last commit (its mode as set by
 * every toggle, its phase, and the shop's open and close motions), so a Back or Forward in the middle of a motion never
 * acts on a closure from an earlier render. When a motion that had to ignore one settles, the address decides: the
 * popstate rule above applied late, with no push of its own.
 */
export function useCartRoute({ enabled, cart, detailOpen, open, close }: {
  /** The shop carries the in-place cart (its panel is mounted). */
  enabled: boolean;
  cart: { cartMode: boolean; phase: CartPhase; modeRef: { current: boolean } };
  /** A book is open: the site's cart links load the page instead. */
  detailOpen: boolean;
  /** The cart's open motion, from where the scene stands. */
  open: () => void;
  /** The cart's close motion. */
  close: () => void;
}) {
  const from = useRef("/shop");
  const live = useRef({ enabled, cart, detailOpen, open, close });
  useLayoutEffect(() => { live.current = { enabled, cart, detailOpen, open, close }; });

  const openCart = useCallback(() => {
    if (live.current.cart.modeRef.current) return;
    live.current.open();
  }, []);
  const closeCart = useCallback(() => {
    const { cart: now } = live.current;
    if (!now.modeRef.current || now.phase === "toBrowse") return;
    live.current.close();
    if (window.location.pathname === CART_PATH) window.history.pushState(null, "", from.current);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !live.current.cart.modeRef.current) return;
      event.preventDefault(); closeCart();
    };
    const pop = () => {
      const { cart: now } = live.current, onCart = window.location.pathname === CART_PATH;
      if (now.modeRef.current && !onCart) { if (now.phase !== "toBrowse") live.current.close(); }
      else if (!now.modeRef.current && onCart) openCart();
    };
    const click = (event: MouseEvent) => {
      if (live.current.cart.modeRef.current || live.current.detailOpen) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || new URL(link.href, window.location.href).pathname !== CART_PATH) return;
      event.preventDefault(); event.stopPropagation();
      from.current = window.location.pathname + window.location.search;
      window.history.pushState(null, "", CART_PATH);
      openCart();
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
    if (!enabled || cart.phase !== "idle") return;
    const onCart = window.location.pathname === CART_PATH;
    if (!cart.cartMode && onCart) openCart();
    else if (cart.cartMode && !onCart) live.current.close();
  }, [enabled, cart.phase, cart.cartMode, openCart]);

  return { openCart, closeCart };
}
