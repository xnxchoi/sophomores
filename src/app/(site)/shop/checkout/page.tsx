import messages from "../../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { CommerceLoadRetry } from "@/components/commerce/load-retry";
import { loadCommerceEditionOffer, loadPublishedCommerceEditions, type CommerceEditionOffer } from "@/lib/commerce/editions";
import { NativeCheckoutSummary } from "@/components/commerce/book-offer";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

export const metadata = {
  title: messages.PageMetadata.checkout,
  robots: { index: false, follow: false }
};

/** `?product=<id>` names a native product (E1, display-only until native settlement); without it, fresh checkout is closed. */
export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<{ product?: string | string[] }> } = {}) {
  await connection();
  const t = await getTranslations("Customer.app_site_shop_checkout_page");
  const offerCopy = await getTranslations("Customer.components_commerce_offer");
  let loadFailed = false;
  const requested = (await searchParams)?.product;
  const nativeID = typeof requested === "string" && requested ? requested : null;
  let native: { title: string; offer: CommerceEditionOffer } | null = null;
  if (nativeID) {
    try {
      const payload = await getPayload({ config });
      // A native product goes only to E1's display projection, never into the legacy cart or settlement.
      const [catalogue, edition] = await Promise.all([loadPublishedCommerceEditions(payload, undefined, nativeID), loadCommerceEditionOffer(payload, nativeID)]);
      if (catalogue.status === "displayable" && edition && catalogue.product.productID === edition.productID) native = { title: catalogue.product.title, offer: edition };
    } catch {
      loadFailed = true;
      console.error("Published checkout information is unavailable.");
    }
  }

  return <PageFrame title={t("title")} titleHidden layout="wide">
    {/* stripe.press spec §7 (owner): the top row is one way back, nothing else; Help and the rest sit in the foot row. */}
    <nav aria-label={t("navigation")} className="mb-8">
      {/* A native product has no cart (display-only): go back to its own page instead. */}
      <Link href={native ? "/shop/products/" + encodeURIComponent(native.offer.productID) : "/shop/cart"} className="group/focus inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="inline-flex items-center gap-[inherit] outline-offset-4"><span aria-hidden="true">←</span>{native ? offerCopy("productDetails") : t("backToCart")}</FocusShape></Link>
    </nav>

    {native ? <NativeCheckoutSummary title={native.title} offer={native.offer} /> : <section aria-labelledby="checkout-unavailable-heading" className="border-t border-border pt-6">
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
