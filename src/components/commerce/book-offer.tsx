import { useLocale, useTranslations } from "next-intl";
import type { CommerceEditionCatalogue } from "@/lib/commerce/editions";
import { Link } from "@/components/core/Link/Link";
import { CommerceProductGallery } from "./product-gallery";

export function CommerceBookView({ catalogue }: { catalogue: CommerceEditionCatalogue | null }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  if (!catalogue || catalogue.status === "unavailable") return <main className="mx-auto min-h-[70svh] max-w-5xl px-6 pt-36 pb-24 text-foreground sm:px-10 sm:pt-44">
    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("book")}</p>
    <h1 className="mt-6 max-w-3xl font-heading text-4xl leading-tight tracking-tight sm:text-6xl">{t("unavailableTitle")}</h1>
    <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">{t("unavailableDetail")}</p>
    <nav aria-label={t("information")} className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
      <Link href="/me/orders" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("orders")}</Link>
    </nav>
  </main>;

  return <main className="mx-auto max-w-[92rem] px-6 pt-28 pb-24 text-foreground sm:px-10 sm:pt-36 lg:pt-[clamp(7rem,18svh,9rem)] xl:px-16">
    <div className="grid items-start gap-8 border-b border-border pb-10 lg:min-h-[calc(100svh-9rem)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14 lg:pb-16">
      <header className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("book")}</p>
        <h1 className="mt-5 font-heading text-[clamp(2.6rem,7vw,7rem)] leading-[0.95] tracking-tight text-balance [overflow-wrap:anywhere]">{catalogue.product.title}</h1>
        <a href="#book-editions" className="mt-5 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2 sm:mt-8">{t("exploreEditions")}</a>
      </header>
      <div className="min-w-0 lg:w-full lg:max-w-[max(14rem,calc(100svh-21rem))] lg:justify-self-end lg:[&_[role=tablist]]:flex-nowrap lg:[&_[role=tablist]]:overflow-x-auto lg:[&_[role=tablist]]:p-1.5">
        <CommerceProductGallery key={catalogue.product.productID} images={catalogue.product.images} title={catalogue.product.title} />
      </div>
    </div>
    <div className="mt-10 grid items-start gap-x-16 gap-y-10 sm:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-muted-foreground [overflow-wrap:anywhere] lg:row-span-2 lg:text-xl">{catalogue.product.description}</p>
      <section id="book-editions" aria-labelledby="book-editions-heading" className="min-w-0 scroll-mt-28 border-t border-border pt-8 lg:border-t-0 lg:pt-0">
        <h2 id="book-editions-heading" className="font-heading text-3xl tracking-tight">{t("editions")}</h2>
        <ol className="mt-6 divide-y divide-border border-y border-border">
          {catalogue.editions.map((edition, index) => <li key={edition.variantID} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 py-6">
            <span aria-hidden="true" className="pt-1 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="text-xl leading-snug [overflow-wrap:anywhere]">{edition.label}</h3>
              <p className="mt-3 text-sm tabular-nums text-muted-foreground">{edition.priceKRW === null ? t("priceUnpublished") : t("listedPrice", {
                amount: new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(edition.priceKRW),
              })}</p>
            </div>
          </li>)}
        </ol>
      </section>
      <section aria-labelledby="book-purchase-heading" className="rounded-xl border border-border p-6 sm:p-8 lg:col-start-2">
        <h2 id="book-purchase-heading" className="font-heading text-xl">{t("purchaseNotOpen")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("purchaseDetail")}</p>
        <nav aria-label={t("information")} className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
          <Link href="/help/shipping" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shippingAndReturns")}</Link>
          <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
        </nav>
      </section>
    </div>
  </main>;
}
