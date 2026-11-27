"use client";

import { Button } from "@/components/core/Button";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { CartProduct } from "@/lib/commerce/cart-products";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { XCircleIcon } from "@phosphor-icons/react";
import { useCommerceCartState, type CartLine } from "./use-commerce-cart-state";

/**
 * The cart for everyone. Signed in, its provider (CommerceProvider) loads the member's cart; signed out, the lines are
 * Auth's browser cart (src/lib/commerce/browser-cart.ts), written through to the member's cart after sign-in. Its state
 * is useCommerceCartState; this view only renders it. It never submits payment. With `onSignIn`, a signed-out shopper can sign in to save selections, not start payment.
 */
export function CommerceCart({ products, wide = false, signedIn = true, onSignIn, localPendingFor, resolveProducts }: {
  products: readonly CartProduct[]; wide?: boolean; signedIn?: boolean; onSignIn?: () => void;
  /** Names and prices the cart's edition lines (the shop's resolveCartEditions); see useCommerceCartState. */
  resolveProducts?: (productIDs: string[]) => Promise<readonly CartProduct[]>;
  /** The browser's lines are being added to the account now (CartView's transfer after sign-in). */
  localPendingFor?: string;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { lines, waiting, busy, feedback, purchased, subtotalKRW, shippingKRW, totalKRW, checkoutAvailable, checkoutHref,
    removingLineID, refreshing, canRefresh, remove, refresh, localLines, removeLocal, memberID } = useCommerceCartState({ signedIn, products, resolveProducts });
  const localPending = memberID !== undefined && memberID === localPendingFor;

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
          {lines.map((line, index) => <CartRow key={line.id || index} line={line} number={index + 1}
            disabled={busy || !line.id || purchased} removing={removingLineID !== null && removingLineID === line.id}
            onRemove={() => line.id && void remove(line.id)} />)}
        </ul>
      </>}
      {localLines.length > 0 && <section aria-labelledby="cart-local-heading" className="mt-8">
        <h2 id="cart-local-heading" className="text-xs uppercase leading-5 tracking-[0.04em]">{t("localTitle")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{localPending ? t("localAdding") : t("localNote")}</p>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {localLines.map((line, index) => <CartRow key={line.productID} line={line} number={lines.length + index + 1}
            disabled={false} removing={false} onRemove={() => void removeLocal(line.productID)} />)}
        </ul>
      </section>}
      <div className="mt-3">
        <p role="status" className="min-h-6 text-sm leading-relaxed text-muted-foreground">{feedback}</p>
        <p role="status" aria-atomic="true" className="sr-only">
          {totalKRW !== null ? t("estimatedTotalAnnouncement", { amount: totalKRW.toLocaleString("ko-KR") }) : ""}
        </p>
        {canRefresh && <Button variant="bare" type="button" disabled={busy} onClick={() => void refresh()} className="group/focus inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:opacity-40"><FocusShape className="outline-offset-4">{refreshing ? t("refreshing") : t("refresh")}</FocusShape></Button>}
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
        </> : subtotalKRW !== null ? <>
          {/* An edition: its price is known, its shipping is set at checkout, so no total is guessed here. */}
          <dl className="mt-3 border-y border-foreground/50 py-3 pl-3.5 text-xs uppercase leading-[1.6] tracking-[0.04em]">
            <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(16ch,max-content)] sm:gap-4"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="min-w-0 tabular-nums sm:text-right">{subtotalKRW.toLocaleString("ko-KR")} KRW</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("shippingAtCheckout")}</p>
        </> : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("priceUnavailable")}</p>}
      </section>}
      <nav aria-label={t("nextSteps")} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
        {!signedIn && lines.length > 0 && onSignIn
          ? <Button variant="bare" type="button" onClick={onSignIn} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{t("signInToSave")}</Button>
          : checkoutAvailable && checkoutHref ? <Link href={checkoutHref} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{t("continueToCheckout")}</Link>
            : <Link href="/shop" className="inline-flex h-10 w-full items-center justify-center rounded-full border border-foreground bg-transparent px-3 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:h-11">{lines.length ? t("continueToShop") : t("visitShop")}</Link>}
        <Link href="/help/shipping" className="group/focus inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("shippingAndReturns")}</FocusShape></Link>
      </nav>
    </div>
  </section>;
}

/** One cart line: its image, name, quantity and price, and its remove control. */
function CartRow({ line, number, disabled, removing, onRemove }: {
  line: CartLine; number: number; disabled: boolean; removing: boolean; onRemove: () => void;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const title = line.title ?? t("savedItem", { number });
  const image = line.image;
  return <li className="flex items-start gap-5 py-6 sm:gap-7 sm:py-8">
    {image &&
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.url} alt={image.alt} className="size-20 shrink-0 rounded-lg border border-border bg-muted object-contain sm:size-28" />}
    <div className="min-w-0 flex-1">
      <h2 className="text-xs uppercase leading-[1.6] tracking-[0.04em] [overflow-wrap:anywhere]">{title}</h2>
      <p className="mt-2 text-xs text-muted-foreground">{Number.isSafeInteger(line.quantity) && line.quantity > 0 ? t("quantity", { count: line.quantity }) : t("quantityUnavailable")}</p>
      {line.unitPriceKRW !== null ? <p className="mt-1 text-xs tabular-nums">{t("unitPrice", { amount: line.unitPriceKRW.toLocaleString("ko-KR") })}</p>
        : <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("itemDetailsUnavailable")}</p>}
      <Button variant="bare" type="button" aria-label={t("removeNamed", { title })} disabled={disabled}
        onClick={onRemove} className={cn("group/focus -ml-3 mt-1 inline-flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-70 disabled:opacity-40", removing && "animate-pulse")}>
        <FocusShape className="flex rounded-full"><XCircleIcon aria-hidden="true" className="size-5" /></FocusShape></Button>
    </div>
  </li>;
}
