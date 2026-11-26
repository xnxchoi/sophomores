"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { listGuestCart, removeGuestCartLine, subscribeGuestCart, type GuestCartLine } from "@/lib/commerce/browser-cart";
import type { CartProduct } from "@/lib/commerce/cart-products";
import type { Cart } from "@/payload-types";

type CartAction =
  | { kind: "removing" | "removed-or-unconfirmed" | "remove-error"; itemID: string; cartID: string }
  | { kind: "refreshing" | "refreshed" | "refresh-error" }
  | null;

export type CartLine = Readonly<{
  id: string; productID: string; kind: "membership" | "edition" | "unknown"; title: string | null;
  image: CartProduct["image"]; unitPriceKRW: number | null; quantity: number; maxQuantity: number;
  available: boolean; quoted: boolean; productHref: string | null;
}>;

export type CheckoutReason = "ready" | "loading" | "empty" | "busy" | "purchased" | "multiple-lines" | "not-quoted"
  | "quantity" | "variant" | "sold-out" | "edition-on-product-page";

// Auth's browser cart parses storage on every read, so keep one snapshot per content for useSyncExternalStore.
let guestSnapshot: { key: string; lines: readonly GuestCartLine[] } = { key: "[]", lines: [] };
const noGuestLines: readonly GuestCartLine[] = [];
function readGuestLines() {
  const lines = listGuestCart();
  const key = JSON.stringify(lines);
  if (key !== guestSnapshot.key) guestSnapshot = { key, lines };
  return guestSnapshot.lines;
}

/**
 * The cart's state for any view of it (Cordy, 26 Nov: split from cart.tsx with no change in behaviour; Hamlet's cart
 * redesign renders from it). Signed in, the lines are the member's cart from CommerceProvider; signed out, Auth's
 * browser cart (src/lib/commerce/browser-cart.ts). Each line is named and priced from `products` (loadCartProducts).
 * Checkout from the cart is the membership offer's, the one line the server cart accepts; an edition line points to its
 * product page. One per account, so there is no quantity control. This hook never submits payment.
 */
export function useCommerceCartState({ signedIn, products }: { signedIn: boolean; products: readonly CartProduct[] }) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { cart, isLoading, removeItem, refreshCart } = useCart();
  const { user } = useEcommerce();
  const guestLines = useSyncExternalStore(subscribeGuestCart, readGuestLines, () => noGuestLines);
  const guest = !signedIn;
  // A signed-in member's cart arrives after the provider reads the member; until then (or while the cart it named loads) it's loading, not empty.
  const savedCarts = (user as { cart?: { docs?: unknown[] } } | null | undefined)?.cart?.docs?.length ?? 0;
  const waiting = !guest && !cart && (isLoading || !user || savedCarts > 0);
  const [action, setAction] = useState<CartAction>(null);
  const changing = useRef(false);
  const items: NonNullable<Cart["items"]> = guest
    ? guestLines.map((line) => ({ id: line.productID, product: line.productID, quantity: line.quantity }))
    : cart?.items ?? [];
  const pending = action?.kind === "removing" || action?.kind === "refreshing";
  const busy = pending || isLoading;
  const purchased = !!cart?.purchasedAt || cart?.status === "purchased";

  const lines: CartLine[] = items.map((item) => {
    const productID = String((typeof item.product === "object" ? item.product?.id : item.product) ?? "");
    const product = products.find((known) => known.productID === productID);
    const quantity = item.quantity;
    const validQuantity = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= (product?.maxQuantity ?? 0);
    const variant = "variant" in item && item.variant != null;
    return { id: item.id ?? "", productID, kind: product?.kind ?? "unknown", title: product?.title ?? null, image: product?.image ?? null,
      unitPriceKRW: product?.unitPriceKRW ?? null, quantity, maxQuantity: product?.maxQuantity ?? 0,
      quoted: !!product && validQuantity && Number.isSafeInteger(product.unitPriceKRW * quantity),
      available: product?.kind === "membership" && validQuantity && !variant && !purchased && (product.availableQuantity ?? 0) >= quantity,
      productHref: product?.productHref ?? null };
  });

  // The cart-level quote and checkout: one membership line, exactly as cart.tsx had it.
  const line = items.length === 1 ? items[0] : undefined;
  const resolved = lines.length === 1 ? lines[0] : undefined;
  const membership = resolved?.kind === "membership" ? products.find((known) => known.productID === resolved.productID) : undefined;
  const quantity = line?.quantity ?? 0;
  const subtotal = membership ? membership.unitPriceKRW * quantity : 0;
  const total = membership ? subtotal + (membership.shippingKRW ?? 0) : 0;
  const quoted = !!membership && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= membership.maxQuantity
    && Number.isSafeInteger(subtotal) && Number.isSafeInteger(total) && !purchased;
  const variant = !!line && "variant" in line && line.variant != null;
  const checkoutAvailable = quoted && !!line && !busy && quantity === 1 && !variant
    && (membership.availableQuantity ?? 0) >= quantity;
  const checkoutReason: CheckoutReason = checkoutAvailable ? "ready"
    : waiting ? "loading"
    : items.length === 0 ? "empty"
    : purchased ? "purchased"
    : items.length > 1 ? "multiple-lines"
    : resolved?.kind === "edition" ? "edition-on-product-page"
    : !quoted ? "not-quoted"
    : busy ? "busy"
    : quantity !== 1 ? "quantity"
    : variant ? "variant"
    : "sold-out";

  let feedback = "";
  if (action?.kind === "removing") feedback = t("removing");
  else if (action?.kind === "remove-error") feedback = t("removeFailed");
  else if (action?.kind === "removed-or-unconfirmed") {
    // The installed SDK catches removal errors. Only observed same-cart state confirms removal.
    feedback = cart?.id === action.cartID && !items.some((item) => item.id === action.itemID)
      ? t("removed") : t("removalUnconfirmed");
  } else if (action?.kind === "refreshing") feedback = t("refreshing");
  else if (action?.kind === "refreshed") feedback = t("refreshed");
  else if (action?.kind === "refresh-error") feedback = t("refreshFailed");

  async function remove(lineID: string) {
    // Signed out the line is the browser's (its ID is the product ID); removing it is immediate.
    if (guest) { removeGuestCartLine(lineID); return; }
    if (changing.current || busy || !cart?.id) return;
    changing.current = true;
    const cartID = String(cart.id);
    setAction({ kind: "removing", itemID: lineID, cartID });
    let failed = false;
    try { await removeItem(lineID); }
    catch { failed = true; }
    finally {
      changing.current = false;
      setAction({ kind: failed ? "remove-error" : "removed-or-unconfirmed", itemID: lineID, cartID });
    }
  }

  async function refresh() {
    if (changing.current || busy || !cart?.id) return;
    changing.current = true;
    setAction({ kind: "refreshing" });
    try { await refreshCart(); setAction({ kind: "refreshed" }); }
    catch { setAction({ kind: "refresh-error" }); }
    finally { changing.current = false; }
  }

  return {
    lines, waiting, busy, feedback, purchased,
    subtotalKRW: quoted ? subtotal : null, shippingKRW: quoted ? membership.shippingKRW : null, totalKRW: quoted ? total : null,
    checkoutAvailable, checkoutReason, checkoutHref: checkoutAvailable ? "/shop/checkout" : null,
    removingLineID: action?.kind === "removing" ? action.itemID : null, refreshing: action?.kind === "refreshing",
    canRefresh: !!cart, remove, refresh,
  };
}
