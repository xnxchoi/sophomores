"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { listGuestCart, removeGuestCartLine, subscribeGuestCart, type GuestCartLine } from "@/lib/commerce/browser-cart";
import type { CartProduct } from "@/lib/commerce/cart-products";
import type { Cart } from "@/payload-types";

type CartAction =
  | { kind: "local-remove-error" }
  | { kind: "removing" | "removed-or-unconfirmed" | "remove-error"; itemID: string; cartID: string }
  | { kind: "refreshing" | "refreshed" | "refresh-error" }
  | null;

export type CartLine = Readonly<{
  id: string; productID: string; kind: "membership" | "edition" | "unknown"; title: string | null;
  image: CartProduct["image"]; unitPriceKRW: number | null; quantity: number; maxQuantity: number;
  available: boolean; quoted: boolean; productHref: string | null;
}>;

export type CheckoutReason = "checkout-held" | "loading" | "empty" | "busy" | "purchased" | "multiple-lines" | "not-quoted"
  | "quantity" | "variant" | "sold-out" | "edition-on-product-page";

// Auth's browser cart parses storage on every read, so keep one snapshot per content for useSyncExternalStore.
let guestSnapshot: { key: string; lines: readonly GuestCartLine[] } = { key: "[]", lines: [] };
const noGuestLines: readonly GuestCartLine[] = [];
function readGuestLines(memberID?: string) {
  const lines = listGuestCart(undefined, memberID);
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
 * unknown. The shop's cart views pass resolveCartEditions (shop/cart/resolve-cart-editions.ts, the bounded server-side
 * loadCartEditionProducts), so edition lines are named and priced from the published catalogue (owner launch gap, 28 Nov).
 *
 * An edition line shows its price and a subtotal, never a guessed total: its shipping is set at checkout. One saved
 * native edition, one unit, named and priced, with nothing kept only on this browser, links to `editionCheckoutHref`
 * (Auth-editions, 28 Nov: /shop/checkout, the account cart is authoritative, no product query or browser totals; the
 * link is not payment permission, the checkout decides), and only when (Review-A HOLD on 5147095f): the candidate
 * passes that href (its route works), the saved cart is active and the signed-in member's own, and nothing is unknown
 * or in progress (loading, resolving, removing, refreshing). Anything else keeps checkout closed.
 */
export function useCommerceCartState({ signedIn, products: loaded, resolveProducts, editionCheckoutHref }: {
  signedIn: boolean; products: readonly CartProduct[];
  resolveProducts?: (productIDs: string[]) => Promise<readonly CartProduct[]>;
  /** Where one saved edition checks out, given only by a candidate whose account-cart checkout route works (Auth's
   * editions-pay); without it the cart never links an edition to checkout (Review-A HOLD on 5147095f). */
  editionCheckoutHref?: string;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { cart, isLoading, removeItem, refreshCart } = useCart();
  const { user } = useEcommerce();
  const memberID = signedIn && user?.id != null ? String(user.id) : undefined;
  const guestLines = useSyncExternalStore(subscribeGuestCart, () => readGuestLines(memberID), () => noGuestLines);
  const guest = !signedIn;
  // A signed-in member's cart arrives after the provider reads the member; until then (or while the cart it named loads) it's loading, not empty.
  const savedCarts = (user as { cart?: { docs?: unknown[] } } | null | undefined)?.cart?.docs?.length ?? 0;
  const [action, setAction] = useState<CartAction>(null);
  const changing = useRef(false);
  const browserItems: NonNullable<Cart["items"]> = guestLines.map((line) => ({ id: line.productID, product: line.productID, quantity: line.quantity }));
  const items: NonNullable<Cart["items"]> = guest ? browserItems : cart?.items ?? [];
  // Signed in, what the browser's cart still holds is what its transfer kept back or the account's cart refused
  // (Review-B HOLD, 27 Nov): shown apart from the account's lines and removable here, never added to them by this view.
  const localItems: NonNullable<Cart["items"]> = guest ? [] : browserItems;
  const [named, setNamed] = useState<readonly CartProduct[]>([]);
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());
  const asked = useRef(new Set<string>());
  const products = named.length ? [...loaded, ...named.filter((r) => !loaded.some((known) => known.productID === r.productID))] : loaded;
  const lineProductID = (item: (typeof items)[number]) => String((typeof item.product === "object" ? item.product?.id : item.product) ?? "");
  const unknownIDs = [...new Set([...items, ...localItems].map(lineProductID))].filter((id) => id && !products.some((known) => known.productID === id)).sort();
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

  const toLine = (item: (typeof items)[number]): CartLine => {
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
  };
  const lines: CartLine[] = items.map(toLine);
  const localLines: CartLine[] = localItems.map(toLine);

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
  const edition = resolved?.kind === "edition" && resolved.quoted && resolved.unitPriceKRW !== null ? resolved : undefined;
  const cartOwner = typeof cart?.customer === "object" ? cart?.customer?.id : cart?.customer;
  const ownActiveCart = !!cart && cart.status === "active" && memberID !== undefined && cartOwner != null && String(cartOwner) === memberID;
  const editionCheckout = !!editionCheckoutHref && !!edition && !guest && !waiting && !resolving && !busy && !purchased && !variant
    && quantity === 1 && localItems.length === 0 && ownActiveCart;
  const checkoutReason: CheckoutReason = waiting ? "loading"
    : items.length === 0 ? "empty"
    : purchased ? "purchased"
    : items.length > 1 ? "multiple-lines"
    : resolved?.kind === "edition" ? "edition-on-product-page"
    : resolving ? "loading"
    : !quoted ? "not-quoted"
    : busy ? "busy"
    : quantity !== 1 ? "quantity"
    : variant ? "variant"
    : (membership.availableQuantity ?? 0) < quantity ? "sold-out"
    : "checkout-held";

  let feedback = "";
  if (action?.kind === "removing") feedback = t("removing");
  else if (action?.kind === "remove-error" || action?.kind === "local-remove-error") feedback = t("removeFailed");
  else if (action?.kind === "removed-or-unconfirmed") {
    // The installed SDK catches removal errors. Only observed same-cart state confirms removal.
    feedback = cart?.id === action.cartID && !items.some((item) => item.id === action.itemID)
      ? t("removed") : t("removalUnconfirmed");
  } else if (action?.kind === "refreshing") feedback = t("refreshing");
  else if (action?.kind === "refreshed") feedback = t("refreshed");
  else if (action?.kind === "refresh-error") feedback = t("refreshFailed");

  async function remove(lineID: string) {
    if (guest) { await removeLocal(lineID); return; }
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

  /** Takes a line off the browser's cart (signed in: one of `localLines`); it never touches the account's cart. */
  async function removeLocal(productID: string) {
    if (!await removeGuestCartLine(productID, undefined, memberID)) setAction({ kind: "local-remove-error" });
    else setAction(null);
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
    subtotalKRW: quoted ? subtotal : edition ? (edition.unitPriceKRW ?? 0) * edition.quantity : null,
    shippingKRW: quoted ? membership.shippingKRW : null, totalKRW: quoted ? total : null,
    checkoutAvailable: editionCheckout, checkoutReason, checkoutHref: editionCheckout ? editionCheckoutHref : null,
    removingLineID: action?.kind === "removing" ? action.itemID : null, refreshing: action?.kind === "refreshing",
    canRefresh: !!cart, remove, refresh, localLines, removeLocal, memberID,
  };
}
