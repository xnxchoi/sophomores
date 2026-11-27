"use client";

import { useEffect, useRef } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { useCommerceCartState, type CartLine } from "@/components/commerce/use-commerce-cart-state";
import { useCartColumn } from "@/components/commerce/shop/cart-column";
import type { CartProduct } from "@/lib/commerce/cart-products";
import { cn } from "@/lib/utils";
import { Button } from "@/components/core/Button";

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
export function ShopCartLines({ products, signedIn, onSignIn, localPendingFor }: {
  products: readonly CartProduct[]; signedIn: boolean; onSignIn?: () => void;
  /** The browser's lines are being added to the account now (CartContents' transfer after sign-in). */
  localPendingFor?: string;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const column = useCartColumn();
  const { lines, waiting, busy, feedback, purchased, subtotalKRW, shippingKRW, totalKRW, checkoutAvailable, checkoutHref,
    checkoutReason, removingLineID, refreshing, canRefresh, remove, refresh, localLines, removeLocal, memberID } = useCommerceCartState({ signedIn, products });
  // The stack shows what's in this cart (their cartQuantitiesByBookId): the member's cart once signed in, not only the browser's.
  const report = column?.report, conceal = column?.conceal;
  const counts = lines.filter((line) => line.quantity > 0).map((line) => line.productID + ":" + line.quantity).join(",");
  const quantities = () => Object.fromEntries(counts ? counts.split(",").map((entry) => { const [id, count] = entry.split(":"); return [id, Number(count)]; }) : []);
  // Those books are this member's, drawn outside the private page (the scene, or the flat stack), so they follow its guard
  // (Review-B HOLD on 38f56878): when the guard conceals the page (left, tab hidden, rechecking who is signed in), the
  // stack is hidden in the same task and the counts are withdrawn; they come back only when the guard shows the page again,
  // which it does for the same member only (otherwise it reloads). Read from the guard's own mark, never a second check.
  const root = useRef<HTMLElement | null>(null);
  const concealed = useRef(false);
  const latest = useRef({ waiting, quantities });
  latest.current = { waiting, quantities };
  useEffect(() => {
    const guard = root.current?.closest("[data-private-page]");
    if (!guard || !report || !conceal) return;
    const apply = () => {
      const hidden = guard.hasAttribute("data-concealed");
      if (hidden === concealed.current) return;
      concealed.current = hidden;
      conceal(hidden);
      if (hidden) report(null);
      else if (!latest.current.waiting) report(latest.current.quantities());
    };
    concealed.current = false;
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(guard, { attributes: true, attributeFilter: ["data-concealed"] });
    return () => { watch.disconnect(); concealed.current = false; conceal(false); };
  }, [report, conceal]);
  useEffect(() => {
    if (!report || waiting || concealed.current) return;
    report(quantities());
  }, [report, counts, waiting]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => report?.(null), [report]);

  // Signed in, lines the account refused or hasn't taken yet stay on this browser: their own heading and × (Auth-editions,
  // 28 Nov), as CommerceCart shows them,
  // while the account's cart is still loading too (Auth-editions HOLD, 28 Nov). The transfer itself and its same-member retry stay in CartContents.
  const local = localLines.length > 0 && <section aria-labelledby="shop-cart-local-heading" className="mt-6">
    <h2 id="shop-cart-local-heading" className="pl-3.5 text-[11px] uppercase leading-[1.5]">{t("localTitle")}</h2>
    <p className="mt-1 pl-3.5 text-[12px] leading-[1.5] text-muted-foreground">
      {memberID !== undefined && memberID === localPendingFor ? t("localAdding") : t("localNote")}</p>
    <ul className="mt-1.5">
      {localLines.map((line, index) => <ShopCartRow key={line.productID} line={line} number={lines.length + index + 1}
        disabled={false} removing={false} onRemove={() => void removeLocal(line.productID)} />)}
    </ul>
  </section>;
  if (waiting) return <div ref={(node) => { root.current = node; }}>
    <p className="pt-3.5 pl-3.5 text-[11px] uppercase leading-[1.5] text-muted-foreground">{t("loading")}</p>
    {local}
  </div>;
  // Feedback and Refresh whenever the member's cart exists (canRefresh), the empty saved cart included (Review-B, 27 Nov).
  const status = <>
    <p role="status" className="mt-3 min-h-[18px] text-[11px] leading-[1.5] text-muted-foreground">{feedback}</p>
    {canRefresh && <Button variant="bare" type="button" disabled={busy} onClick={() => void refresh()}
      className="group/focus inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:opacity-40 pointer-coarse:min-h-11">
      <FocusShape className="outline-offset-4">{refreshing ? t("refreshing") : t("refresh")}</FocusShape></Button>}
  </>;
  if (lines.length === 0) return <div ref={(node) => { root.current = node; }} className="pt-3.5 pl-3.5">
    <p className="text-[13px] leading-[1.5]">{t("empty")}</p>
    {local && <div className="-ml-3.5">{local}</div>}
    {status}
    {column && <Button variant="bare" type="button" onClick={column.close}
      className="group/focus mt-6 inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] pointer-coarse:min-h-11">
      <FocusShape className="inline-flex items-center gap-1.5 outline-offset-4"><ArrowLeftIcon aria-hidden="true" className="size-2.5" />{column.back}</FocusShape>
    </Button>}
  </div>;

  return <section ref={(node) => { root.current = node; }} aria-label={t("contents")} aria-busy={busy}>
    <ul>
      {lines.map((line, index) => <ShopCartRow key={line.id || index} line={line} number={index + 1}
        disabled={busy || !line.id || purchased} removing={removingLineID !== null && removingLineID === line.id}
        onRemove={() => line.id && void remove(line.id)} />)}
    </ul>
    {local}
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
    {/* As CommerceCart: signed out with lines, the one action is signing in to save them; it never starts checkout
        (Auth-editions HOLD, 28 Nov). Checkout shows only when the cart state allows it. */}
    {!signedIn && onSignIn
      ? <Button variant="bare" type="button" onClick={onSignIn} className="mt-[18px] flex w-full items-center justify-center rounded-[40px] px-3 py-2.5 text-[13px] uppercase leading-[1.4] tracking-[0.04em] shadow-[inset_0_0_0_0.8px_currentColor] outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:min-h-11">{t("signInToSave")}</Button>
      : checkoutAvailable && checkoutHref && <Link href={checkoutHref} className="mt-[18px] flex w-full items-center justify-center rounded-[40px] px-3 py-2.5 text-[13px] uppercase leading-[1.4] tracking-[0.04em] shadow-[inset_0_0_0_0.8px_currentColor] outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 pointer-coarse:min-h-11">{t("continueToCheckout")}</Link>}
    {totalKRW !== null && <p className="mt-3 text-[12px] leading-[1.5] text-muted-foreground">{t("estimateDetail")}</p>}
    {status}
  </section>;
}

/** One cart line in the column: the account's lines and the ones only on this browser look the same. */
function ShopCartRow({ line, number, disabled, removing, onRemove }: {
  line: CartLine; number: number; disabled: boolean; removing: boolean; onRemove: () => void;
}) {
  const t = useTranslations("Customer.components_commerce_cart");
  const page = useTranslations("Customer.app_site_shop_cart_page");
  const title = line.title ?? t("savedItem", { number });
  return <li className="border-t border-dotted border-border pt-3.5 pb-1.5 pl-3.5 first:border-t-0">
          <div className="flex items-baseline justify-between gap-3 text-[13px] leading-[1.5]">
            {line.productHref ? <Link href={line.productHref} className="group/focus min-w-0 [overflow-wrap:anywhere]"><FocusShape className="outline-offset-2">{title}</FocusShape></Link>
              : <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>}
            {line.unitPriceKRW !== null && <span className="shrink-0 tabular-nums">{line.unitPriceKRW.toLocaleString("ko-KR")} KRW</span>}
          </div>
          <div className="mt-2 flex items-start justify-between text-[11px] uppercase leading-[1.5]">
            <Button variant="bare" type="button" aria-label={t("removeNamed", { title })} disabled={disabled}
              onClick={onRemove}
              className="group/focus -m-3 inline-flex size-11 items-center justify-center disabled:opacity-40">
              <FocusShape className={cn("flex size-5 items-center justify-center rounded-full border-[0.8px] border-current pb-0.5 text-[19.5px] leading-none opacity-75 transition-opacity duration-200 group-hover/focus:opacity-100",
                removing && "animate-pulse")}>×</FocusShape>
            </Button>
            {line.quantity > 1 && line.unitPriceKRW !== null && <span className="tabular-nums">({line.quantity}) {(line.quantity * line.unitPriceKRW).toLocaleString("ko-KR")} KRW</span>}
          </div>
          {line.unitPriceKRW === null && <p className="mt-1 text-[12px] leading-[1.5] text-muted-foreground">{t("itemDetailsUnavailable")}</p>}
          {line.kind === "edition" && line.productHref && <Link href={line.productHref}
            className="group/focus mt-1 inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-2 hover:decoration-current pointer-coarse:min-h-11">
            <FocusShape className="outline-offset-2">{page("buyOnItsPage")}</FocusShape></Link>}
        </li>;
}
