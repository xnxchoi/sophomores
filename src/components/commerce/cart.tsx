"use client";

import { useRef, useState } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useCart } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import type { Cart } from "@/payload-types";
import { cn } from "@/lib/utils";

type CartAction =
  | { kind: "removing" | "removed-or-unconfirmed" | "remove-error"; itemID: string; cartID: string }
  | { kind: "refreshing" | "refreshed" | "refresh-error" }
  | null;

/** The existing account gate owns identity and the provider. This view never submits payment. */
export function CommerceCart({ offer, wide = false }: { offer: CommerceOffer | null; wide?: boolean }) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { cart, isLoading, removeItem, refreshCart } = useCart();
  const [action, setAction] = useState<CartAction>(null);
  const changing = useRef(false);
  const items: NonNullable<Cart["items"]> = cart?.items ?? [];
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
      {!cart ? <div className="py-6">
        <h2 className="text-2xl">{isLoading ? t("loading") : t("unavailable")}</h2>
        {!isLoading && <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{t("unavailableDetail")}</p>}
      </div> : items.length === 0 ? <div className="py-6">
        <h2 className="text-2xl">{t("empty")}</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("emptyDetail")}</p>
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
                <h2 className="text-xl [overflow-wrap:anywhere] sm:text-2xl">{title}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{Number.isSafeInteger(item.quantity) && item.quantity > 0 ? t("quantity", { count: item.quantity }) : t("quantityUnavailable")}</p>
                {matching ? <p className="mt-2 text-sm tabular-nums">{t("unitPrice", { amount: offer.priceKRW.toLocaleString("ko-KR") })}</p>
                  : <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("itemDetailsUnavailable")}</p>}
                <button type="button" aria-label={t("removeNamed", { title })} disabled={busy || !item.id || !!cart.purchasedAt || cart.status === "purchased"}
                  onClick={() => item.id && void remove(item.id)} className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{action?.kind === "removing" && action.itemID === item.id ? t("removing") : t("remove")}</button>
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
        {cart && <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{action?.kind === "refreshing" ? t("refreshing") : t("refresh")}</button>}
      </div>
    </div>
    <div className="min-w-0 space-y-6">
      {items.length > 0 && <section aria-labelledby="cart-summary-heading" className="rounded-xl bg-muted p-5 sm:p-6">
        <h2 id="cart-summary-heading" className="text-xl">{t("summary")}</h2>
        {quoted ? <>
          <NumberFlowGroup>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={subtotal} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={offer.shippingFeeKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
              <div className="grid gap-1 border-t border-border pt-5 text-base sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4 sm:text-lg"><dt>{t("estimatedTotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={total} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
            </dl>
          </NumberFlowGroup>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{t("estimateDetail")}</p>
        </> : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("priceUnavailable")}</p>}
      </section>}
      <nav aria-label={t("nextSteps")} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
        <Link href={checkoutAvailable ? "/shop/checkout" : "/shop"} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background outline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline-2">{checkoutAvailable ? t("continueToCheckout") : items.length ? t("continueToShop") : t("visitShop")}</Link>
        <Link href="/help/shipping" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shippingAndReturns")}</Link>
      </nav>
    </div>
  </section>;
}
