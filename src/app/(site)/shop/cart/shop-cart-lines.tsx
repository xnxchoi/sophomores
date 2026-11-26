"use client";

import { useEffect } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { useCommerceCartState } from "@/components/commerce/use-commerce-cart-state";
import { useCartColumn } from "@/components/commerce/shop/cart-column";
import type { CartProduct } from "@/lib/commerce/cart-products";
import { cn } from "@/lib/utils";

/**
 * The cart's lines in the shop's cart column, laid out as stripe.press's cart panel (06w9 page chunk, CartPanelStyles):
 * - each line under a dotted rule, 14 px in from the left and none on the right, so prices end on the totals' edge; the
 *   title and its price on one row, the round × (20 px, a 0.8 px ring, 75 % until hovered) under it, and a multi-copy
 *   total on the right;
 * - the totals between two rules (12 px over and under, 14 px in), small caps rows, the total last;
 * - the checkout pill (radius 40 px, an inset 0.8 px ring, 13 px caps), then the caption;
 * - empty: one line and the way back to the shelf.
 * Their mono becomes our sans. The state is Auth's useCommerceCartState; Checkout is exactly CommerceCart's (signed out,
 * it asks for sign-in first). There is no quantity control: one per account, and the hook has no setter.
 */
export function ShopCartLines({ products, signedIn, onSignIn }: { products: readonly CartProduct[]; signedIn: boolean; onSignIn?: () => void }) {
  const t = useTranslations("Customer.components_commerce_cart");
  const page = useTranslations("Customer.app_site_shop_cart_page");
  const column = useCartColumn();
  const { lines, waiting, busy, feedback, purchased, subtotalKRW, shippingKRW, totalKRW, checkoutAvailable, checkoutHref,
    checkoutReason, removingLineID, refreshing, canRefresh, remove, refresh } = useCommerceCartState({ signedIn, products });
  // The stack shows what's in this cart (their cartQuantitiesByBookId): the member's cart once signed in, not only the browser's.
  const report = column?.report;
  const counts = lines.filter((line) => line.quantity > 0).map((line) => line.productID + ":" + line.quantity).join(",");
  useEffect(() => {
    if (!report || waiting) return;
    report(Object.fromEntries(counts ? counts.split(",").map((entry) => { const [id, count] = entry.split(":"); return [id, Number(count)]; }) : []));
  }, [report, counts, waiting]);
  useEffect(() => () => report?.(null), [report]);

  if (waiting) return <p className="pt-3.5 pl-3.5 text-[11px] uppercase leading-[1.5] text-muted-foreground">{t("loading")}</p>;
  // Feedback and Refresh whenever the member's cart exists (canRefresh), the empty saved cart included (Review-B, 27 Nov).
  const status = <>
    <p role="status" className="mt-3 min-h-[18px] text-[11px] leading-[1.5] text-muted-foreground">{feedback}</p>
    {canRefresh && <button type="button" disabled={busy} onClick={() => void refresh()}
      className="group/focus inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:opacity-40 pointer-coarse:min-h-11">
      <FocusShape className="outline-offset-4">{refreshing ? t("refreshing") : t("refresh")}</FocusShape></button>}
  </>;
  if (lines.length === 0) return <div className="pt-3.5 pl-3.5">
    <p className="text-[13px] leading-[1.5]">{t("empty")}</p>
    {status}
    {column && <button type="button" onClick={column.close}
      className="group/focus mt-6 inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] pointer-coarse:min-h-11">
      <FocusShape className="inline-flex items-center gap-1.5 outline-offset-4"><ArrowLeftIcon aria-hidden="true" className="size-2.5" />{column.back}</FocusShape>
    </button>}
  </div>;

  return <section aria-label={t("contents")} aria-busy={busy}>
    <ul>
      {lines.map((line, index) => {
        const title = line.title ?? t("savedItem", { number: index + 1 });
        return <li key={line.id || index} className="border-t border-dotted border-border pt-3.5 pb-1.5 pl-3.5 first:border-t-0">
          <div className="flex items-baseline justify-between gap-3 text-[13px] leading-[1.5]">
            {line.productHref ? <Link href={line.productHref} className="group/focus min-w-0 [overflow-wrap:anywhere]"><FocusShape className="outline-offset-2">{title}</FocusShape></Link>
              : <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>}
            {line.unitPriceKRW !== null && <span className="shrink-0 tabular-nums">{line.unitPriceKRW.toLocaleString("ko-KR")} KRW</span>}
          </div>
          <div className="mt-2 flex items-start justify-between text-[11px] uppercase leading-[1.5]">
            <button type="button" aria-label={t("removeNamed", { title })} disabled={busy || !line.id || purchased}
              onClick={() => line.id && void remove(line.id)}
              className="group/focus -m-3 inline-flex size-11 items-center justify-center disabled:opacity-40">
              <FocusShape className={cn("flex size-5 items-center justify-center rounded-full border-[0.8px] border-current pb-0.5 text-[19.5px] leading-none opacity-75 transition-opacity duration-200 group-hover/focus:opacity-100",
                removingLineID !== null && removingLineID === line.id && "animate-pulse")}>×</FocusShape>
            </button>
            {line.quantity > 1 && line.unitPriceKRW !== null && <span className="tabular-nums">({line.quantity}) {(line.quantity * line.unitPriceKRW).toLocaleString("ko-KR")} KRW</span>}
          </div>
          {line.unitPriceKRW === null && <p className="mt-1 text-[12px] leading-[1.5] text-muted-foreground">{t("itemDetailsUnavailable")}</p>}
          {line.kind === "edition" && line.productHref && <Link href={line.productHref}
            className="group/focus mt-1 inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-2 hover:decoration-current pointer-coarse:min-h-11">
            <FocusShape className="outline-offset-2">{page("buyOnItsPage")}</FocusShape></Link>}
        </li>;
      })}
    </ul>
    {subtotalKRW !== null && shippingKRW !== null && totalKRW !== null ? <>
      <NumberFlowGroup>
        <dl className="mt-3 border-y border-border py-3 pl-3.5 text-[11px] uppercase leading-[1.6]">
          <div className="flex justify-between gap-3"><dt>{t("subtotal")}</dt><dd className="tabular-nums"><NumberFlow value={subtotalKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
          <div className="flex justify-between gap-3"><dt>{t("shipping")}</dt><dd className="tabular-nums"><NumberFlow value={shippingKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
          <div className="flex justify-between gap-3 font-medium"><dt>{t("estimatedTotal")}</dt><dd className="tabular-nums"><NumberFlow value={totalKRW} locales="ko-KR" suffix=" KRW" respectMotionPreference={false} /></dd></div>
        </dl>
      </NumberFlowGroup>
      <p role="status" aria-atomic="true" className="sr-only">{t("estimatedTotalAnnouncement", { amount: totalKRW.toLocaleString("ko-KR") })}</p>
    </> : checkoutReason === "not-quoted" && <p className="mt-3 border-t border-border pt-3 pl-3.5 text-[12px] leading-[1.5] text-muted-foreground">{t("priceUnavailable")}</p>}
    {checkoutAvailable && (onSignIn
      ? <button type="button" onClick={onSignIn} className="mt-[18px] flex w-full items-center justify-center rounded-[40px] px-3 py-2.5 text-[13px] uppercase leading-[1.4] tracking-[0.04em] shadow-[inset_0_0_0_0.8px_currentColor] outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:min-h-11">{t("continueToCheckout")}</button>
      : checkoutHref && <Link href={checkoutHref} className="mt-[18px] flex w-full items-center justify-center rounded-[40px] px-3 py-2.5 text-[13px] uppercase leading-[1.4] tracking-[0.04em] shadow-[inset_0_0_0_0.8px_currentColor] outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:min-h-11">{t("continueToCheckout")}</Link>)}
    {totalKRW !== null && <p className="mt-3 text-[12px] leading-[1.5] text-muted-foreground">{t("estimateDetail")}</p>}
    {status}
  </section>;
}
