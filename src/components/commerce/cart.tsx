"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import { listGuestCart, removeGuestCartLine, subscribeGuestCart, type GuestCartLine } from "@/lib/commerce/browser-cart";
import type { Cart } from "@/payload-types";
import { cn } from "@/lib/utils";
import { XCircleIcon } from "@phosphor-icons/react";

type CartAction =
  | { kind: "removing" | "removed-or-unconfirmed" | "remove-error"; itemID: string; cartID: string }
  | { kind: "refreshing" | "refreshed" | "refresh-error" }
  | null;

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
 * The cart for everyone. Signed in, its provider (CommerceProvider) loads the member's cart; signed out, the lines are
 * Auth's browser cart (src/lib/commerce/browser-cart.ts), written through to the member's cart after sign-in. This view never submits payment. With `onSignIn`, Checkout asks for sign-in first instead of linking on.
 */
export function CommerceCart({ offer, wide = false, signedIn = true, onSignIn }: {
  offer: CommerceOffer | null; wide?: boolean; signedIn?: boolean; onSignIn?: () => void;
}) {
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
  const line = items.length === 1 ? items[0] : undefined;
  const productID = typeof line?.product === "object" ? line.product?.id : line?.product;
  const quantity = line?.quantity ?? 0;
  const subtotal = offer ? offer.priceKRW * quantity : 0;
  const total = offer ? subtotal + offer.shippingFeeKRW : 0;
  const quoted = !!offer && productID === offer.productID && Number.isSafeInteger(quantity)
    && quantity > 0 && quantity <= offer.maximumQuantity
    && Number.isSafeInteger(subtotal) && Number.isSafeInteger(total)
    && !cart?.purchasedAt && cart?.status !== "purchased";
  const checkoutAvailable = quoted && !!line && !busy && quantity === 1
    && (!("variant" in line) || line.variant == null)
    && offer.availableQuantity >= quantity;
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

  async function remove(itemID: string) {
    // Signed out the line is the browser's (its ID is the product ID); removing it is immediate.
    if (guest) { removeGuestCartLine(itemID); return; }
    if (changing.current || busy || !cart?.id) return;
    changing.current = true;
    const cartID = String(cart.id);
    setAction({ kind: "removing", itemID, cartID });
    let failed = false;
    try { await removeItem(itemID); }
    catch { failed = true; }
    finally {
      changing.current = false;
      setAction({ kind: failed ? "remove-error" : "removed-or-unconfirmed", itemID, cartID });
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

  return <section aria-label={t("contents")} aria-busy={busy} className={cn("grid min-w-0 gap-8",
    wide && items.length > 0 && "lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-12")}>
    <div className="min-w-0">
      {waiting ? <div className="py-6">
        <h2 className="text-xs leading-5 text-muted-foreground">{t("loading")}</h2>
      </div> : items.length === 0 ? <div className="py-6">
        {/* stripe.press spec §6: one short line; the Visit the shop action sits below. */}
        <h2 className="text-xs leading-5">{t("empty")}</h2>
      </div> : <>
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item, index) => {
            const id = typeof item.product === "object" ? item.product?.id : item.product;
            const matching = !!offer && id === offer.productID;
            const title = matching ? offer.title : t("savedItem", { number: index + 1 });
            const image = matching ? offer.images.find(({ image }) => typeof image === "object" && image.url)?.image : undefined;
            return <li key={item.id ?? index} className="flex items-start gap-5 py-6 sm:gap-7 sm:py-8">
              {typeof image === "object" && image.url &&
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={image.alt || title} className="size-20 shrink-0 rounded-lg border border-border bg-muted object-contain sm:size-28" />}
              <div className="min-w-0 flex-1">
                <h2 className="text-xs uppercase leading-[1.6] tracking-[0.04em] [overflow-wrap:anywhere]">{title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">{Number.isSafeInteger(item.quantity) && item.quantity > 0 ? t("quantity", { count: item.quantity }) : t("quantityUnavailable")}</p>
                {matching ? <p className="mt-1 text-xs tabular-nums">{t("unitPrice", { amount: offer.priceKRW.toLocaleString("ko-KR") })}</p>
                  : <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("itemDetailsUnavailable")}</p>}
                <button type="button" aria-label={t("removeNamed", { title })} disabled={busy || !item.id || !!cart?.purchasedAt || cart?.status === "purchased"}
                  onClick={() => item.id && void remove(item.id)} className={cn("-ml-3 mt-1 inline-flex size-11 items-center justify-center rounded-full outline-offset-2 transition-opacity hover:opacity-70 focus-visible:outline-2 disabled:opacity-40", action?.kind === "removing" && action.itemID === item.id && "animate-pulse")}>
                  <XCircleIcon aria-hidden="true" className="size-5" /></button>
              </div>
            </li>;
          })}
        </ul>
      </>}
      <div className="mt-3">
        <p role="status" className="min-h-6 text-sm leading-relaxed text-muted-foreground">{feedback}</p>
        <p role="status" aria-atomic="true" className="sr-only">
          {quoted ? t("estimatedTotalAnnouncement", { amount: total.toLocaleString("ko-KR") }) : ""}
        </p>
        {cart && <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 outline-offset-4 hover:decoration-solid focus-visible:outline-2 disabled:opacity-40">{action?.kind === "refreshing" ? t("refreshing") : t("refresh")}</button>}
      </div>
    </div>
    <div className="min-w-0 space-y-6">
      {items.length > 0 && <section aria-labelledby="cart-summary-heading" className="border-t border-border pt-5 sm:pt-6">
        <h2 id="cart-summary-heading" className="text-xs uppercase tracking-[0.04em]">{t("summary")}</h2>
        {quoted ? <>
          <NumberFlowGroup>
            {/* stripe.press spec §2: one ruled totals block, lines stacked tight, in tracked caps. */}
            <dl className="mt-3 border-y border-foreground/50 py-3 pl-3.5 text-xs uppercase leading-[1.6] tracking-[0.04em]">
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={subtotal} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={offer.shippingFeeKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt>{t("estimatedTotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={total} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
            </dl>
          </NumberFlowGroup>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("estimateDetail")}</p>
        </> : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("priceUnavailable")}</p>}
      </section>}
      <nav aria-label={t("nextSteps")} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
        {checkoutAvailable && onSignIn
          // Signed out: Checkout first asks for sign-in (the page swaps to the account step, then comes back here).
          ? <button type="button" onClick={onSignIn} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{t("continueToCheckout")}</button>
          : <Link href={checkoutAvailable ? "/shop/checkout" : "/shop"} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{checkoutAvailable ? t("continueToCheckout") : items.length ? t("continueToShop") : t("visitShop")}</Link>}
        <Link href="/help/shipping" className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shippingAndReturns")}</Link>
      </nav>
    </div>
  </section>;
}
