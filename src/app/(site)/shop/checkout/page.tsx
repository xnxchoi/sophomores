import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import messages from "../../../../../messages/en.json";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { CommerceAccountGate, CommerceCheckout } from "@/components/commerce/checkout";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { loadFooterSellerFacts } from "@/app/(site)/_commerce/business-footer";

export const metadata = {
  title: messages.PageMetadata.checkout,
  robots: { index: false, follow: false }
};

export default async function CheckoutPage() {
  await connection();
  // Same cached read as the footer: link to its seller details only when the footer draws them.
  const sellerInFooter = (await loadFooterSellerFacts()) !== null;
  const t = await getTranslations("Customer.app_site_shop_checkout_page");
  const offerCopy = await getTranslations("Customer.components_commerce_offer");
  const locale = await getLocale();
  let offer: CommerceOffer | null = null;
  let loadFailed = false;
  try { offer = await loadCommerceOffer(await getPayload({ config })); }
  catch { loadFailed = true; console.error("Published checkout information is unavailable."); }

  const signInOffInReview = isReviewCopyRequest();
  const orderDetails = offer ? <section aria-label={offer.title} className="rounded-xl border border-border bg-card p-5 text-card-foreground">
    <h2 className="font-heading text-2xl leading-tight sm:text-3xl">{offer.title}</h2>
    <dl className="mt-5 grid gap-x-6 text-sm leading-relaxed sm:grid-cols-2">
      <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 border-t border-border py-3"><dt className="text-muted-foreground">{offerCopy("pricePerCoin")}</dt><dd className="tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(offer.priceKRW)}</dd></div>
      <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 border-t border-border py-3"><dt className="text-muted-foreground">{offerCopy("delivery")}</dt><dd className="tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(offer.shippingFeeKRW)}</dd></div>
      <div className="min-w-0 border-t border-border py-3 sm:col-span-2"><dt className="text-muted-foreground">{offerCopy("dispatchSchedule")}</dt><dd className="mt-1 whitespace-pre-line wrap-anywhere">{offer.dispatchSchedule}</dd></div>
    </dl>
    <Link href="/help/shipping" className="mt-2 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{offerCopy("shippingAndReturns")}</Link>
    <nav aria-label={offerCopy("sellerAndPurchasePolicies")} className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4">
      {sellerInFooter && <a href="#seller-information" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("sellerInformation")}</a>}
      <Link href="/terms" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{offerCopy("purchaseTerms")}</Link>
      <Link href="/privacy" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{offerCopy("privacyAndDeliveryInformation")}</Link>
      <Link href="/refund" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{offerCopy("cancellationsReturnsAndRefunds")}</Link>
    </nav>
  </section> : null;

  return <PageFrame title={t("title")} introduction={t("introduction")} layout="wide">
    <nav aria-label={t("navigation")} className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <Link href="/shop/cart" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("backToCart")}</Link>
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{offerCopy("help")}</Link>
    </nav>

    {offer ? <>
      {offer.availableQuantity > 0 ? <section aria-label={t("accountAndOrder")} className="min-w-0">
        <CommerceAccountGate signInOffInReview={signInOffInReview} initialCapabilities={loadPublicMemberCapabilities()}
          accountIntroduction={<div className="mb-6">{orderDetails}</div>} identityCheckDetails={orderDetails}>
          <div className="dark min-w-0 rounded-2xl border border-border bg-background p-5 text-foreground sm:p-8">
            <CommerceCheckout offer={offer} orderDetails={orderDetails} />
          </div>
        </CommerceAccountGate>
      </section> : <p role="status" className="rounded-xl border border-border p-5 text-sm leading-relaxed text-muted-foreground">{offerCopy("unavailable")}</p>}
      {(offer.availableQuantity <= 0 || signInOffInReview) && orderDetails}
    </> : <section aria-labelledby="checkout-unavailable-heading" className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-8">
      <h2 id="checkout-unavailable-heading" className="font-heading text-2xl">{loadFailed ? t("loadFailedTitle") : offerCopy("purchasingIsNotOpen")}</h2>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{loadFailed ? t("loadFailedDescription") : offerCopy("productDeliveryAndPurchaseInformationWillAppearHereWhen")}</p>
    </section>}

    <aside aria-labelledby="checkout-payment-recovery" className="mt-10 border-t border-border pt-8">
      <h2 id="checkout-payment-recovery" className="text-base font-medium">{t("paymentRecoveryTitle")}</h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("paymentRecoveryDescription")}</p>
      <Link href="/shop/payment" prefetch={false} className="mt-2 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("checkPaymentStatus")}</Link>
    </aside>
    <Link href="/shop" className="mt-6 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("backToShop")}</Link>
  </PageFrame>;
}
