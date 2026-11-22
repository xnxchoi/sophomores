import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import messages from "../../../../../messages/en.json";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { CommerceAccountGate, CommerceCheckout, type PurchaseAllowance } from "@/components/commerce/checkout";
import { SummaryCard } from "@/components/commerce/summary-card";
import { legacyPurchaseAllowance } from "../../_commerce/purchase-allowance";
import { loadCommerceEditionOffer, loadPublishedCommerceEditions, type CommerceEditionOffer } from "@/lib/commerce/editions";
import { NativeCheckoutSummary } from "@/components/commerce/book-offer";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

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
    <dl className="text-sm leading-relaxed">
      <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 border-t border-border py-3"><dt className="text-muted-foreground">{offerCopy("price")}</dt><dd className="tabular-nums">{krw(offer.priceKRW)}</dd></div>
      <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 border-t border-border py-3"><dt className="text-muted-foreground">{offerCopy("delivery")}</dt><dd className="tabular-nums">{krw(offer.shippingFeeKRW)}</dd></div>
      <div className="min-w-0 border-t border-border py-3"><dt className="text-muted-foreground">{offerCopy("dispatchSchedule")}</dt><dd className="mt-1 whitespace-pre-line wrap-anywhere">{offer.dispatchSchedule}</dd></div>
    </dl>
  </> : null;
  const orderDetails = offer ? <section aria-label={offer.title} className="min-w-0">
    <h2 className="text-xl leading-tight wrap-anywhere">{offer.title}</h2>
    <div className="mt-4">{orderRows}</div>
  </section> : null;
  const policies: { href: string; label: string }[] = [
    { href: "/help/shipping", label: offerCopy("shippingAndReturns") },
    { href: "/terms", label: offerCopy("purchaseTerms") },
    { href: "/privacy", label: offerCopy("privacyAndDeliveryInformation") },
    { href: "/refund", label: offerCopy("cancellationsReturnsAndRefunds") }
  ];

  return <PageFrame title={t("title")} layout="wide">
    <nav aria-label={t("navigation")} className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      {/* A native product has no cart (display-only): go back to its own page instead. */}
      <Link href={native ? "/shop/products/" + encodeURIComponent(native.offer.productID) : "/shop/cart"} className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{native ? offerCopy("productDetails") : t("backToCart")}</Link>
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{offerCopy("help")}</Link>
    </nav>

    {native ? <NativeCheckoutSummary title={native.title} offer={native.offer} /> : offer ? <>
      {offer.availableQuantity > 0 ? <section aria-label={t("accountAndOrder")} className="min-w-0">
        <CommerceAccountGate progress signInOffInReview={signInOffInReview} initialCapabilities={await loadPublicMemberCapabilities()}
          accountIntroduction={<SummaryCard>{orderDetails}</SummaryCard>} identityCheckDetails={<SummaryCard>{orderDetails}</SummaryCard>}>
          {allowance && <CommerceCheckout progress offer={offer} allowance={allowance} orderDetails={orderRows} />}
        </CommerceAccountGate>
      </section> : <p role="status" className="rounded-xl border border-border p-5 text-sm leading-relaxed text-muted-foreground">{offerCopy("unavailable")}</p>}
      {(offer.availableQuantity <= 0 || signInOffInReview) && <SummaryCard className="mt-6">{orderDetails}</SummaryCard>}
    </> : <section aria-labelledby="checkout-unavailable-heading" className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-8">
      <h2 id="checkout-unavailable-heading" className="text-2xl">{loadFailed ? t("loadFailedTitle") : offerCopy("purchasingIsNotOpen")}</h2>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{loadFailed ? t("loadFailedDescription") : offerCopy("productDeliveryAndPurchaseInformationWillAppearHereWhen")}</p>
    </section>}

    <footer className="mt-16 grid gap-10 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem] lg:gap-x-16 xl:gap-x-24">
      <aside aria-labelledby="checkout-payment-recovery" className="min-w-0">
        <h2 id="checkout-payment-recovery" className="text-base">{t("paymentRecoveryTitle")}</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{t("paymentRecoveryDescription")}</p>
        <Link href="/shop/payment" prefetch={false} className="mt-2 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("checkPaymentStatus")}</Link>
      </aside>
      <nav aria-label={offerCopy("sellerAndPurchasePolicies")} className="min-w-0">
        <ul className="flex flex-col">
          {[...policies, { href: "/shop", label: t("backToShop") }].map((policy) => <li key={policy.label}><Link href={policy.href} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline decoration-current/30 underline-offset-4 outline-offset-4 hover:text-foreground hover:decoration-current focus-visible:outline-2">{policy.label}</Link></li>)}
        </ul>
      </nav>
    </footer>
  </PageFrame>;
}
