"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
 *
 * `products` holds what the page loaded up front (the membership offer). A line whose product isn't there is named on
 * demand through `resolveProducts` (Review-B, 26 Nov: resolve only the edition IDs actually in the cart), asked once per
 * set of unknown IDs. Until it settles those lines are unknown and `resolvingDetails` is true, but the cart is not
 * loading: known rows and Remove stay usable (Review-B LOW); only checkout waits ("loading"). A failure leaves them
 * unknown. Nothing passes a resolver yet: editions in the cart wait on the owner (Cordy, 27 Nov), and the server-side
 * loader (loadCartEditionProducts) is not exposed to the browser.
 */
export function useCommerceCartState({ signedIn, products: loaded, resolveProducts }: {
  signedIn: boolean; products: readonly CartProduct[];
  resolveProducts?: (productIDs: string[]) => Promise<readonly CartProduct[]>;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { cart, isLoading, removeItem, refreshCart } = useCart();
  const { user } = useEcommerce();
  const guestLines = useSyncExternalStore(subscribeGuestCart, readGuestLines, () => noGuestLines);
  const guest = !signedIn;
  // A signed-in member's cart arrives after the provider reads the member; until then (or while the cart it named loads) it's loading, not empty.
  const savedCarts = (user as { cart?: { docs?: unknown[] } } | null | undefined)?.cart?.docs?.length ?? 0;
  const [action, setAction] = useState<CartAction>(null);
  const changing = useRef(false);
  const items: NonNullable<Cart["items"]> = guest
    ? guestLines.map((line) => ({ id: line.productID, product: line.productID, quantity: line.quantity }))
    : cart?.items ?? [];
  const [named, setNamed] = useState<readonly CartProduct[]>([]);
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());
  const asked = useRef(new Set<string>());
  const products = named.length ? [...loaded, ...named.filter((r) => !loaded.some((known) => known.productID === r.productID))] : loaded;
  const lineProductID = (item: (typeof items)[number]) => String((typeof item.product === "object" ? item.product?.id : item.product) ?? "");
  const unknownIDs = [...new Set(items.map(lineProductID))].filter((id) => id && !products.some((known) => known.productID === id)).sort();
  const unknownKey = resolveProducts && unknownIDs.length ? JSON.stringify(unknownIDs) : "";
  useEffect(() => {
    if (!resolveProducts || !unknownKey || asked.current.has(unknownKey)) return;
    asked.current.add(unknownKey);
    const ids = JSON.parse(unknownKey) as string[];
    resolveProducts(ids)
      // Only editions for the IDs asked about; a resolver never names the membership product.
      .then((found) => setNamed((prev) => [...prev, ...found.filter((product) => product.kind === "edition"
        && ids.includes(product.productID) && !prev.some((known) => known.productID === product.productID))]), () => {})
      .finally(() => setSettled((prev) => new Set(prev).add(unknownKey)));
  }, [resolveProducts, unknownKey]);
  const resolving = !!unknownKey && !settled.has(unknownKey);
  const pending = action?.kind === "removing" || action?.kind === "refreshing";
  const busy = pending || isLoading;
  const purchased = !!cart?.purchasedAt || cart?.status === "purchased";
  const waiting = !guest && !cart && (isLoading || !user || savedCarts > 0);

  const lines: CartLine[] = items.map((item) => {
    const productID = lineProductID(item);
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
    : resolving ? "loading"
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
    lines, waiting, resolvingDetails: resolving, busy, feedback, purchased,
    subtotalKRW: quoted ? subtotal : null, shippingKRW: quoted ? membership.shippingKRW : null, totalKRW: quoted ? total : null,
    checkoutAvailable, checkoutReason, checkoutHref: checkoutAvailable ? "/shop/checkout" : null,
    removingLineID: action?.kind === "removing" ? action.itemID : null, refreshing: action?.kind === "refreshing",
    canRefresh: !!cart, remove, refresh,
  };
}
