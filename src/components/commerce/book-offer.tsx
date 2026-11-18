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

  return <main className="mx-auto max-w-7xl px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40 xl:px-16">
    <header className="border-b border-border pb-10 sm:pb-14">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("book")}</p>
      <h1 className="mt-7 max-w-5xl font-heading text-[clamp(3.5rem,11vw,9rem)] leading-[0.95] tracking-tight text-balance [overflow-wrap:anywhere]">{catalogue.product.title}</h1>
      <a href="#book-editions" className="mt-8 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("exploreEditions")}</a>
    </header>
    <div className="mt-10 grid items-start gap-12 sm:mt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-28">
        <CommerceProductGallery key={catalogue.product.productID} images={catalogue.product.images} title={catalogue.product.title} />
      </div>
      <div className="min-w-0">
        <p className="whitespace-pre-line text-lg leading-[1.8] text-muted-foreground">{catalogue.product.description}</p>
        <section id="book-editions" aria-labelledby="book-editions-heading" className="mt-12 scroll-mt-28 border-t border-border pt-8">
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
        <section aria-labelledby="book-purchase-heading" className="mt-8 rounded-xl border border-border p-6 sm:p-8">
          <h2 id="book-purchase-heading" className="font-heading text-xl">{t("purchaseNotOpen")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("purchaseDetail")}</p>
          <nav aria-label={t("information")} className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            <Link href="/help/shipping" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shippingAndReturns")}</Link>
            <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
          </nav>
        </section>
      </div>
    </div>
  </main>;
}
