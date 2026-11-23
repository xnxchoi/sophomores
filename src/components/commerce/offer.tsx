
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PageInset } from "@/components/core/PageInset/PageInset";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import { Link } from "@/components/core/Link/Link";
import { CommerceProductGallery } from "./product-gallery";

/** Only approved CMS facts reach this surface. An absent offer is not a sample product. */
export function CommerceOfferView({ offer, children }: { offer: CommerceOffer | null; children?: ReactNode }) {
  const t = useTranslations('Customer.components_commerce_offer');
  if (!offer) return <PageInset as="main" className="min-h-[70svh] pt-36 pb-24 text-foreground sm:pt-44">
    <p className="text-sm text-muted-foreground">{t('shop')}</p>
    <h1 className="mt-6 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-6xl">{t('purchasingIsNotOpen')}</h1>
    <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">{t('productDeliveryAndPurchaseInformationWillAppearHereWhen')}</p>
    <Link href="/help" className="mt-8 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t('help')}</Link>
  </PageInset>;
  const disclosure = offer.publication.disclosure;
  return <PageInset as="main" className="pt-32 pb-24 text-foreground sm:pt-40">
    <header className="mb-10 border-b border-border pb-10 sm:mb-14">
      <p className="text-sm text-muted-foreground">{t('physicalCollectible')}</p>
      <h1 id="commerce-product-heading" className="mt-5 max-w-4xl font-display text-4xl leading-[1.1] tracking-tight text-balance sm:text-6xl xl:text-7xl">{offer.title}</h1>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <p className="text-xl tabular-nums sm:text-2xl">{offer.priceKRW.toLocaleString("ko-KR")} KRW</p>
        <a href="#offer-purchase" className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background outline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline-2">{t('purchaseOptions')}</a>
      </div>
    </header>
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
      <section aria-labelledby="commerce-product-heading" className="min-w-0">
        <CommerceProductGallery key={offer.productID} images={offer.images} title={offer.title} />
        <p className="mt-8 whitespace-pre-line text-base leading-[1.8] text-muted-foreground sm:text-lg">{offer.description}</p>
        <dl className="mt-10 divide-y divide-border border-y border-border text-sm leading-relaxed">
          <div className="flex flex-wrap justify-between gap-3 py-5"><dt className="text-muted-foreground">{t('price')}</dt><dd className="text-xl tabular-nums">{offer.priceKRW.toLocaleString("ko-KR")} KRW</dd></div>
          <div className="flex flex-wrap justify-between gap-3 py-5"><dt className="text-muted-foreground">{t('delivery')}</dt><dd className="tabular-nums">{offer.shippingFeeKRW.toLocaleString("ko-KR")} KRW</dd></div>
          <div className="py-5"><dt className="text-muted-foreground">{t('dispatchSchedule')}</dt><dd className="mt-2 whitespace-pre-line">{offer.dispatchSchedule}</dd></div>
          <div className="py-5"><dt className="text-muted-foreground">{t('admission')}</dt><dd className="mt-2">{t('admissionIncludesEvent', { event: offer.event.title })}</dd></div>
          <div className="py-5"><dt className="text-muted-foreground">{t('event')}</dt><dd className="mt-2"><time dateTime={offer.event.eventStartsAt}>{new Date(offer.event.eventStartsAt).toLocaleString("en-GB", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" })} KST</time></dd></div>
          <div className="py-5"><dt className="text-muted-foreground">{t('accountAllowance')}</dt><dd className="mt-2">{t('onePerAccountIncludingEarlierPurchases')}</dd></div>
        </dl>
        <Link href="/help/shipping" className="mt-4 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t('shippingAndReturns')}</Link>
      </section>
      {/* No card (owner: no black box on white; stripe.press spec §2): a ruled column that follows the page theme. */}
      <section id="offer-purchase" tabIndex={-1} aria-label={t('purchase')} className="min-w-0 scroll-mt-24 border-t border-foreground pt-5 text-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-foreground">
        <div className="mb-7 border-b border-border pb-6">
          <h2 className="text-xs uppercase tracking-[0.04em]">{t('purchase')}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{offer.availableQuantity > 0 ? t('availability', { count: offer.availableQuantity }) : t('unavailable')}</p>
        </div>
        {children}
      </section>
    </div>
    <section aria-label={t('sellerAndPurchasePolicies')} className="mt-16 border-t border-border pt-10 text-sm leading-relaxed sm:mt-24">
      {Object.entries(disclosure.policies).map(([key, policy]) => <details key={key} className="mt-6 border-t border-border">
        <summary className="min-h-12 cursor-pointer py-4 font-medium outline-offset-4 focus-visible:outline-2">{key === "terms" ? t('purchaseTerms') : key === "privacy" ? t('privacyAndDeliveryInformation') : t('cancellationsReturnsAndRefunds')}</summary>
        <div className="max-w-3xl space-y-6 pb-6 text-muted-foreground"><p>{t('policyEffectiveDate', { date: policy.effectiveDate })}</p>{policy.sections.map((section, index) => <section key={index}>
          <h3 className="text-foreground">{section.heading}</h3>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="mt-3 whitespace-pre-line">{paragraph}</p>)}
        </section>)}</div>
      </details>)}
    </section>
  </PageInset>;
}
