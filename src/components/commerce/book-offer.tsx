import { useLocale, useTranslations } from "next-intl";
import type { CommerceEditionCatalogue, CommerceEditionOffer, CommerceEditionShop } from "@/lib/commerce/editions";
import { Link } from "@/components/core/Link/Link";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Badge } from "@/components/arc/badge/badge";
import { CommerceProductGallery } from "./product-gallery";
import { ArcRoles } from "./arc-roles";

type EditionProduct = Extract<CommerceEditionCatalogue, { status: "displayable" }>["product"];

/** Book shop: each edition is its own product (owner), listed separately with no picker. Display facts only. */
export function CommerceShopView({ shop }: { shop: CommerceEditionShop | null }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  if (!shop || shop.status === "unavailable" || shop.products.length === 0) return <BookUnavailable />;
  return <PageInset as="main" className="pt-28 pb-24 text-foreground sm:pt-36 lg:pt-[clamp(7rem,18svh,9rem)]">
    <header className="border-b border-border pb-10">
      <h1 className="font-display text-[clamp(2.6rem,7vw,7rem)] font-normal leading-[0.95] tracking-tight">{t("book")}</h1>
    </header>
    <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {shop.products.map(({ product, offer }) => <li key={product.productID} className="min-w-0">
        <Link href={"/shop/products/" + encodeURIComponent(product.productID)} className="group block min-w-0 outline-offset-4 focus-visible:outline-2">
          <ProductCover product={product} />
          <h2 className="mt-5 text-2xl leading-snug tracking-tight underline-offset-4 [overflow-wrap:anywhere] group-hover:underline">{product.title}</h2>
          <ProductFacts offer={offer} className="mt-3" />
        </Link>
      </li>)}
    </ul>
  </PageInset>;
}

/** One product's page: the existing book layout for a single product, with its own name, price and what it includes. */
export function CommerceProductView({ product, offer }: { product: EditionProduct | null; offer: CommerceEditionOffer | null }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  if (!product || !offer) return <BookUnavailable />;
  return <PageInset as="main" className="pt-28 pb-24 text-foreground sm:pt-36 lg:pt-[clamp(7rem,18svh,9rem)]">
    <div className="grid items-start gap-8 border-b border-border pb-10 lg:min-h-[calc(100svh-9rem)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14 lg:pb-16">
      <header className="min-w-0">
        <Link href="/shop" className="inline-flex min-h-12 items-center text-sm text-muted-foreground underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("allProducts")}</Link>
        <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,7rem)] font-normal leading-[0.95] tracking-tight text-balance [overflow-wrap:anywhere]">{product.title}</h1>
        <ProductFacts offer={offer} className="mt-6" />
      </header>
      <div className="min-w-0 lg:w-full lg:max-w-[max(14rem,calc(100svh-21rem))] lg:justify-self-end lg:[&_[role=tablist]]:flex-nowrap lg:[&_[role=tablist]]:overflow-x-auto lg:[&_[role=tablist]]:p-1.5">
        <CommerceProductGallery key={product.productID} images={product.images} title={product.title} />
      </div>
    </div>
    <div className="mt-10 grid items-start gap-x-16 gap-y-10 sm:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-muted-foreground [overflow-wrap:anywhere] lg:text-xl">{product.description}</p>
      <PurchaseNotOpen />
    </div>
  </PageInset>;
}

/** Price, what the product includes and the per-account limit, from E1's server offer. Shared by the shop, product and checkout. */
export function ProductFacts({ offer, className }: { offer: CommerceEditionOffer; className?: string }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  return <ArcRoles><div className={className}>
    <p className="text-lg tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(offer.priceKRW)}</p>
    <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">{offer.editionEntitlements.membershipSignet ? t("includesBundle") : t("includesBookOnly")}</p>
    {offer.maximumQuantity === 1 && <div className="mt-3"><Badge size="md">{t("onePerAccount")}</Badge></div>}
  </div></ArcRoles>;
}

/** Checkout for a native product while purchase is not open: the product's facts and the not-open note, with no cart or Pay.
 * The checkout page's own top link already goes back to the product page, so the summary has none. */
export function NativeCheckoutSummary({ title, offer }: { title: string; offer: CommerceEditionOffer }) {
  return <section aria-labelledby="native-checkout-heading" className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem] lg:gap-x-16 xl:gap-x-24">
    <div className="min-w-0">
      <h2 id="native-checkout-heading" className="text-2xl leading-tight tracking-tight [overflow-wrap:anywhere]">{title}</h2>
      <ProductFacts offer={offer} className="mt-4" />
    </div>
    <PurchaseNotOpen help={false} />
  </section>;
}

/** Native products are display-only until native settlement exists (purchaseReady: false). help: false where the page
 * already links Help (checkout's top bar). */
export function PurchaseNotOpen({ help = true }: { help?: boolean }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  return <section aria-labelledby="book-purchase-heading" className="rounded-xl border border-border p-6 sm:p-8">
    <h2 id="book-purchase-heading" className="text-xl">{t("purchaseNotOpen")}</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("purchaseDetail")}</p>
    <nav aria-label={t("information")} className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
      <Link href="/help/shipping" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shippingAndReturns")}</Link>
      {help && <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>}
    </nav>
  </section>;
}

function ProductCover({ product }: { product: EditionProduct }) {
  const cover = product.images.flatMap(({ image }) => typeof image === "object" && image.url ? [{ src: image.url, alt: image.alt || product.title }] : [])[0];
  return cover
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={cover.src} alt={cover.alt} className="aspect-square w-full rounded-xl border border-border bg-muted object-contain" />
    : <div aria-hidden="true" className="aspect-square w-full rounded-xl border border-border bg-muted" />;
}

function BookUnavailable() {
  const t = useTranslations("Customer.components_commerce_book_offer");
  return <PageInset as="main" className="min-h-[70svh] pt-36 pb-24 text-foreground sm:pt-44">
    <p className="text-sm text-muted-foreground">{t("book")}</p>
    <h1 className="mt-6 max-w-3xl font-display text-4xl font-normal leading-tight tracking-tight sm:text-6xl">{t("unavailableTitle")}</h1>
    <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">{t("unavailableDetail")}</p>
    <nav aria-label={t("information")} className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
      <Link href="/me/orders" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("orders")}</Link>
    </nav>
  </PageInset>;
}
