import type { ReactNode } from "react";
import type { CommerceOffer } from "@/lib/commerce/catalogue";

/** Only approved CMS facts reach this surface. An absent offer is not a sample product. */
export function CommerceOfferView({ offer, children }: { offer: CommerceOffer | null; children?: ReactNode }) {
  if (!offer) return <main className="mx-auto min-h-[70svh] max-w-3xl px-6 pb-20 pt-32 text-neutral-100 sm:px-10">
    <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Shop</p>
    <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Purchasing is not open.</h1>
    <p className="mt-5 max-w-lg text-base leading-7 text-neutral-400">Product, delivery and purchase information will appear here when they are ready.</p>
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
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-neutral-400">Physical collectible</p>
        <h1 id="commerce-product-heading" className="mt-3 text-3xl font-medium tracking-tight">{offer.title}</h1>
        <p className="mt-4 whitespace-pre-line text-base leading-7 text-neutral-300">{offer.description}</p>
        <dl className="mt-6 space-y-3 border-t border-white/15 pt-6 text-sm leading-6">
          <div className="flex justify-between gap-5"><dt>Price per coin</dt><dd>{offer.priceKRW.toLocaleString("ko-KR")} KRW</dd></div>
          <div className="flex justify-between gap-5"><dt>Delivery</dt><dd>{offer.shippingFeeKRW.toLocaleString("ko-KR")} KRW</dd></div>
          <div><dt className="text-neutral-400">Dispatch schedule</dt><dd>{offer.dispatchSchedule}</dd></div>
          <div><dt className="text-neutral-400">Admission</dt><dd>One coin includes one admission to {offer.event.title}.</dd></div>
          <div><dt className="text-neutral-400">Event</dt><dd><time dateTime={offer.event.eventStartsAt}>{new Date(offer.event.eventStartsAt).toLocaleString("en-GB", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" })} KST</time></dd></div>
          <div><dt className="text-neutral-400">Account allowance</dt><dd>Up to three coins per account for this release, including earlier purchases and active reservations.</dd></div>
        </dl>
      </section>
      <section aria-label="Purchase" className="min-w-0 rounded-2xl border border-white/15 bg-white/[0.025] p-5 sm:p-7">{children}</section>
    </div>
    <section aria-label="Seller and purchase policies" className="mt-16 border-t border-white/15 pt-8 text-sm leading-6">
      <h2 className="font-medium">Seller information</h2>
      <dl lang="ko" className="mt-4 grid gap-3 text-neutral-300 sm:grid-cols-2">
        <div><dt className="text-neutral-500">상호명 / 대표자</dt><dd>{disclosure.seller.name} / {disclosure.seller.representative}</dd></div>
        <div><dt className="text-neutral-500">사업자등록번호</dt><dd>{disclosure.seller.registrationNumber}</dd></div>
        <div><dt className="text-neutral-500">주소</dt><dd>{disclosure.seller.address}</dd></div>
        <div><dt className="text-neutral-500">연락처</dt><dd>{disclosure.seller.phone}</dd></div>
        {disclosure.seller.mailOrderRegistrationNumber && <div><dt className="text-neutral-500">통신판매업 신고번호</dt><dd>{disclosure.seller.mailOrderRegistrationNumber}</dd></div>}
      </dl>
      {Object.entries(disclosure.policies).map(([key, policy]) => <details key={key} className="mt-4 border-t border-white/10 pt-3">
        <summary className="min-h-12 cursor-pointer py-3 font-medium">{key === "terms" ? "Purchase terms" : key === "privacy" ? "Privacy and delivery information" : "Cancellations, returns and refunds"}</summary>
        <div className="space-y-4 pb-5 text-neutral-300"><p>Effective {policy.effectiveDate}</p>{policy.sections.map((section, index) => <section key={index}>
          <h3 className="font-medium text-neutral-100">{section.heading}</h3>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="mt-2 whitespace-pre-line">{paragraph}</p>)}
        </section>)}</div>
      </details>)}
    </section>
  </main>;
}
