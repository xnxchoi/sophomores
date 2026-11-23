import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import messages from "../../../../../messages/en.json";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { CommerceAccountGate, CommerceCheckout, type PurchaseAllowance } from "@/components/commerce/checkout";
import { CommerceLoadRetry } from "@/components/commerce/load-retry";
import { SummaryCard } from "@/components/commerce/summary-card";
import { legacyPurchaseAllowance } from "../../_commerce/purchase-allowance";
import { loadCommerceEditionOffer, loadPublishedCommerceEditions, type CommerceEditionOffer } from "@/lib/commerce/editions";
import { NativeCheckoutSummary } from "@/components/commerce/book-offer";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

export const metadata = {
  title: messages.PageMetadata.checkout,
  robots: { index: false, follow: false }
};

/** `?product=<id>` names a native product (E1, display-only until native settlement); without it, the legacy offer (closed). */
export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<{ product?: string | string[] }> } = {}) {
  await connection();
  const t = await getTranslations("Customer.app_site_shop_checkout_page");
  const offerCopy = await getTranslations("Customer.components_commerce_offer");
  const locale = await getLocale();
  let offer: CommerceOffer | null = null;
  let loadFailed = false;
  let allowance: PurchaseAllowance | null = null;
  const requested = (await searchParams)?.product;
  const nativeID = typeof requested === "string" && requested ? requested : null;
  let native: { title: string; offer: CommerceEditionOffer } | null = null;
  try {
    const payload = await getPayload({ config });
    if (nativeID) {
      // A native product goes only to E1's display projection, never into the legacy cart or settlement.
      const [catalogue, edition] = await Promise.all([loadPublishedCommerceEditions(payload, undefined, nativeID), loadCommerceEditionOffer(payload, nativeID)]);
      if (catalogue.status === "displayable" && edition && catalogue.product.productID === edition.productID) native = { title: catalogue.product.title, offer: edition };
    } else {
      offer = await loadCommerceOffer(payload);
      if (offer) allowance = legacyPurchaseAllowance;
    }
  }
  // A failed allowance read is a failed load: show the unavailable section, never an empty checkout.
  catch { loadFailed = true; offer = null; allowance = null; console.error("Published checkout information is unavailable."); }

  const signInOffInReview = isReviewCopyRequest();
  const krw = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
  // Summary content only; each state places it in its SummaryCard (the checkout adds the live total inside the same card).
  // The price, delivery and dispatch rows. The checkout's summary card names the product itself; the account step adds a heading.
  const orderRows = offer ? <>
    {/* stripe.press spec §2: one ruled totals block in tracked caps, lines stacked tight. */}
    <dl className="border-y border-foreground/50 py-3 pl-3.5 text-xs uppercase leading-[1.6] tracking-[0.04em]">
      <div className="flex min-w-0 flex-wrap justify-between gap-x-3"><dt className="text-muted-foreground">{offerCopy("price")}</dt><dd className="tabular-nums">{krw(offer.priceKRW)}</dd></div>
      <div className="flex min-w-0 flex-wrap justify-between gap-x-3"><dt className="text-muted-foreground">{offerCopy("delivery")}</dt><dd className="tabular-nums">{krw(offer.shippingFeeKRW)}</dd></div>
      <div className="min-w-0 pt-2"><dt className="text-muted-foreground">{offerCopy("dispatchSchedule")}</dt><dd className="whitespace-pre-line normal-case tracking-normal wrap-anywhere">{offer.dispatchSchedule}</dd></div>
    </dl>
  </> : null;
  const orderDetails = offer ? <section aria-label={offer.title} className="min-w-0">
    <h2 className="text-[15px] leading-[21px] wrap-anywhere">{offer.title}</h2>
    <div className="mt-3">{orderRows}</div>
  </section> : null;

  return <PageFrame title={t("title")} titleHidden layout="wide">
    {/* stripe.press spec §7 (owner): the top row is one way back, nothing else; Help and the rest sit in the foot row. */}
    <nav aria-label={t("navigation")} className="mb-8">
      {/* A native product has no cart (display-only): go back to its own page instead. */}
      <Link href={native ? "/shop/products/" + encodeURIComponent(native.offer.productID) : "/shop/cart"} className="group/focus inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="inline-flex items-center gap-[inherit] outline-offset-4"><span aria-hidden="true">←</span>{native ? offerCopy("productDetails") : t("backToCart")}</FocusShape></Link>
    </nav>

    {native ? <NativeCheckoutSummary title={native.title} offer={native.offer} /> : offer ? <>
      {offer.availableQuantity > 0 ? <section aria-label={t("accountAndOrder")} className="min-w-0">
        <CommerceAccountGate progress signInOffInReview={signInOffInReview} initialCapabilities={await loadPublicMemberCapabilities()}
          accountIntroduction={<SummaryCard>{orderDetails}</SummaryCard>} identityCheckDetails={<SummaryCard>{orderDetails}</SummaryCard>}>
          {allowance && <CommerceCheckout progress offer={offer} allowance={allowance} orderDetails={orderRows} />}
        </CommerceAccountGate>
      </section> : <p role="status" className="border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">{offerCopy("unavailable")}</p>}
      {(offer.availableQuantity <= 0 || signInOffInReview) && <SummaryCard className="mt-6">{orderDetails}</SummaryCard>}
    </> : <section aria-labelledby="checkout-unavailable-heading" className="border-t border-border pt-6">
      <h2 id="checkout-unavailable-heading" className="text-2xl">{loadFailed ? t("loadFailedTitle") : offerCopy("purchasingIsNotOpen")}</h2>
      {/* A failed load retries in place (Review-B); a closed offer says what is true. */}
      {loadFailed ? <CommerceLoadRetry className="mt-3" />
        : <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{offerCopy("productDeliveryAndPurchaseInformationWillAppearHereWhen")}</p>}
    </section>}

    {/* One quiet row at the foot (spec §7); terms, privacy and refunds stay in the business footer. */}
    <footer className="mt-16 border-t border-border pt-5">
      <ul className="flex flex-wrap gap-x-6">
        {[{ href: "/help", label: offerCopy("help") }, { href: "/help/shipping", label: offerCopy("shippingAndReturns") }, { href: "/shop/payment", label: t("checkPaymentStatus") }].map((link) =>
          <li key={link.href}><Link href={link.href} prefetch={false} className="group/focus inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] text-muted-foreground underline decoration-current/30 underline-offset-4 hover:text-foreground hover:decoration-current"><FocusShape className="outline-offset-4">{link.label}</FocusShape></Link></li>)}
      </ul>
    </footer>
  </PageFrame>;
}
