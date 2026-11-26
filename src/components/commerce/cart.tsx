"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { CartProduct } from "@/lib/commerce/cart-products";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { XCircleIcon } from "@phosphor-icons/react";
import { useCommerceCartState } from "./use-commerce-cart-state";

/**
 * The cart for everyone. Signed in, its provider (CommerceProvider) loads the member's cart; signed out, the lines are
 * Auth's browser cart (src/lib/commerce/browser-cart.ts), written through to the member's cart after sign-in. Its state
 * is useCommerceCartState; this view only renders it. It never submits payment. With `onSignIn`, Checkout asks for
 * sign-in first instead of linking on.
 */
export function CommerceCart({ products, resolveProducts, wide = false, signedIn = true, onSignIn }: {
  products: readonly CartProduct[]; resolveProducts?: (productIDs: string[]) => Promise<readonly CartProduct[]>;
  wide?: boolean; signedIn?: boolean; onSignIn?: () => void;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { lines, waiting, busy, feedback, purchased, subtotalKRW, shippingKRW, totalKRW, checkoutAvailable,
    removingLineID, refreshing, canRefresh, remove, refresh } = useCommerceCartState({ signedIn, products, resolveProducts });

  return <section aria-label={t("contents")} aria-busy={busy} className={cn("grid min-w-0 gap-8",
    wide && lines.length > 0 && "lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-12")}>
    <div className="min-w-0">
      {waiting ? <div className="py-6">
        <h2 className="text-xs leading-5 text-muted-foreground">{t("loading")}</h2>
      </div> : lines.length === 0 ? <div className="py-6">
        {/* stripe.press spec §6: one short line; the Visit the shop action sits below. */}
        <h2 className="text-xs leading-5">{t("empty")}</h2>
      </div> : <>
        <ul className="divide-y divide-border border-y border-border">
          {lines.map((line, index) => {
            const title = line.title ?? t("savedItem", { number: index + 1 });
            const image = line.image;
            return <li key={line.id || index} className="flex items-start gap-5 py-6 sm:gap-7 sm:py-8">
              {image &&
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={image.alt} className="size-20 shrink-0 rounded-lg border border-border bg-muted object-contain sm:size-28" />}
              <div className="min-w-0 flex-1">
                <h2 className="text-xs uppercase leading-[1.6] tracking-[0.04em] [overflow-wrap:anywhere]">{title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">{Number.isSafeInteger(line.quantity) && line.quantity > 0 ? t("quantity", { count: line.quantity }) : t("quantityUnavailable")}</p>
                {line.unitPriceKRW !== null ? <p className="mt-1 text-xs tabular-nums">{t("unitPrice", { amount: line.unitPriceKRW.toLocaleString("ko-KR") })}</p>
                  : <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("itemDetailsUnavailable")}</p>}
                <button type="button" aria-label={t("removeNamed", { title })} disabled={busy || !line.id || purchased}
                  onClick={() => line.id && void remove(line.id)} className={cn("group/focus -ml-3 mt-1 inline-flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-70 disabled:opacity-40", removingLineID !== null && removingLineID === line.id && "animate-pulse")}>
                  <FocusShape className="flex rounded-full"><XCircleIcon aria-hidden="true" className="size-5" /></FocusShape></button>
              </div>
            </li>;
          })}
        </ul>
      </>}
      <div className="mt-3">
        <p role="status" className="min-h-6 text-sm leading-relaxed text-muted-foreground">{feedback}</p>
        <p role="status" aria-atomic="true" className="sr-only">
          {totalKRW !== null ? t("estimatedTotalAnnouncement", { amount: totalKRW.toLocaleString("ko-KR") }) : ""}
        </p>
        {canRefresh && <button type="button" disabled={busy} onClick={() => void refresh()} className="group/focus inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:opacity-40"><FocusShape className="outline-offset-4">{refreshing ? t("refreshing") : t("refresh")}</FocusShape></button>}
      </div>
    </div>
    <div className="min-w-0 space-y-6">
      {lines.length > 0 && <section aria-labelledby="cart-summary-heading" className="border-t border-border pt-5 sm:pt-6">
        <h2 id="cart-summary-heading" className="text-xs uppercase tracking-[0.04em]">{t("summary")}</h2>
        {subtotalKRW !== null && shippingKRW !== null && totalKRW !== null ? <>
          <NumberFlowGroup>
            {/* stripe.press spec §2: one ruled totals block, lines stacked tight, in tracked caps. */}
            <dl className="mt-3 border-y border-foreground/50 py-3 pl-3.5 text-xs uppercase leading-[1.6] tracking-[0.04em]">
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={subtotalKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={shippingKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt>{t("estimatedTotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right"><NumberFlow value={totalKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
            </dl>
          </NumberFlowGroup>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("estimateDetail")}</p>
        </> : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("priceUnavailable")}</p>}
      </section>}
      <nav aria-label={t("nextSteps")} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
        {checkoutAvailable && onSignIn
          // Signed out: Checkout first asks for sign-in (the page swaps to the account step, then comes back here).
          ? <button type="button" onClick={onSignIn} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{t("continueToCheckout")}</button>
          : <Link href={checkoutAvailable ? "/shop/checkout" : "/shop"} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{checkoutAvailable ? t("continueToCheckout") : lines.length ? t("continueToShop") : t("visitShop")}</Link>}
        <Link href="/help/shipping" className="group/focus inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("shippingAndReturns")}</FocusShape></Link>
      </nav>
    </div>
  </section>;
}
