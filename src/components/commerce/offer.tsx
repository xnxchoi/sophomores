
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { CommerceOffer } from "@/lib/commerce/catalogue";

/** Only approved CMS facts reach this surface. An absent offer is not a sample product. */
export function CommerceOfferView({ offer, children }: { offer: CommerceOffer | null; children?: ReactNode }) {
  const t = useTranslations('Customer.components_commerce_offer');
  if (!offer) return <main className="mx-auto min-h-[70svh] max-w-3xl px-6 pb-20 pt-32 text-neutral-100 sm:px-10">
    <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">{t('shop')}</p>
    <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">{t('purchasingIsNotOpen')}</h1>
    <p className="mt-5 max-w-lg text-base leading-7 text-neutral-400">{t('productDeliveryAndPurchaseInformationWillAppearHereWhen')}</p>
  </main>;
  const disclosure = offer.publication.disclosure;
  return <main className="mx-auto max-w-6xl px-6 pb-20 pt-28 text-neutral-100 sm:px-10">
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <section aria-labelledby="commerce-product-heading" className="min-w-0">
        <div className="grid gap-3">
          {offer.images.map(({ image }, index) => typeof image === "object" && image.url ?
            // CMS-authored images can use the configured media host without a parallel image service.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.id} src={image.url} alt={image.alt || offer.title} loading={index ? "lazy" : "eager"}
              className="aspect-square w-full rounded-2xl object-cover" /> : null)}
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-neutral-400">{t('physicalCollectible')}</p>
        <h1 id="commerce-product-heading" className="mt-3 text-3xl font-medium tracking-tight">{offer.title}</h1>
        <p className="mt-4 whitespace-pre-line text-base leading-7 text-neutral-300">{offer.description}</p>
        <dl className="mt-6 space-y-3 border-t border-white/15 pt-6 text-sm leading-6">
          <div className="flex justify-between gap-5"><dt>{t('pricePerCoin')}</dt><dd>{offer.priceKRW.toLocaleString("ko-KR")} KRW</dd></div>
          <div className="flex justify-between gap-5"><dt>{t('delivery')}</dt><dd>{offer.shippingFeeKRW.toLocaleString("ko-KR")} KRW</dd></div>
          <div><dt className="text-neutral-400">{t('dispatchSchedule')}</dt><dd>{offer.dispatchSchedule}</dd></div>
          <div><dt className="text-neutral-400">{t('admission')}</dt><dd>{t('admissionIncludesEvent', { event: offer.event.title })}</dd></div>
          <div><dt className="text-neutral-400">{t('event')}</dt><dd><time dateTime={offer.event.eventStartsAt}>{new Date(offer.event.eventStartsAt).toLocaleString("en-GB", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" })} KST</time></dd></div>
          <div><dt className="text-neutral-400">{t('accountAllowance')}</dt><dd>{t('upToThreeCoinsPerAccountForThisRelease')}</dd></div>
        </dl>
      </section>
      <section aria-label={t('purchase')} className="min-w-0 rounded-2xl border border-white/15 bg-white/[0.025] p-5 sm:p-7">{children}</section>
    </div>
    <section aria-label={t('sellerAndPurchasePolicies')} className="mt-16 border-t border-white/15 pt-8 text-sm leading-6">
      <h2 className="font-medium">{t('sellerInformation')}</h2>
      <dl className="mt-4 grid gap-3 text-neutral-300 sm:grid-cols-2">
        <div><dt className="text-neutral-500">{t('businessNameRepresentative')}</dt><dd>{disclosure.seller.name} / {disclosure.seller.representative}</dd></div>
        <div><dt className="text-neutral-500">{t('businessRegistrationNumber')}</dt><dd>{disclosure.seller.registrationNumber}</dd></div>
        <div><dt className="text-neutral-500">{t('address')}</dt><dd>{disclosure.seller.address}</dd></div>
        <div><dt className="text-neutral-500">{t('contact')}</dt><dd>{disclosure.seller.phone}</dd></div>
        {disclosure.seller.mailOrderRegistrationNumber && <div><dt className="text-neutral-500">{t('mailOrderBusinessRegistrationNumber')}</dt><dd>{disclosure.seller.mailOrderRegistrationNumber}</dd></div>}
      </dl>
      {Object.entries(disclosure.policies).map(([key, policy]) => <details key={key} className="mt-4 border-t border-white/10 pt-3">
        <summary className="min-h-12 cursor-pointer py-3 font-medium">{key === "terms" ? t('purchaseTerms') : key === "privacy" ? t('privacyAndDeliveryInformation') : t('cancellationsReturnsAndRefunds')}</summary>
        <div className="space-y-4 pb-5 text-neutral-300"><p>{t('policyEffectiveDate', { date: policy.effectiveDate })}</p>{policy.sections.map((section, index) => <section key={index}>
          <h3 className="font-medium text-neutral-100">{section.heading}</h3>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="mt-2 whitespace-pre-line">{paragraph}</p>)}
        </section>)}</div>
      </details>)}
    </section>
  </main>;
}
