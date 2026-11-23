import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CommerceEditionCatalogue, CommerceEditionOffer, CommerceEditionShop } from "@/lib/commerce/editions";
import { Link } from "@/components/core/Link/Link";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Badge } from "@/components/arc/badge/badge";
import { ArcRoles } from "./arc-roles";

type EditionProduct = Extract<CommerceEditionCatalogue, { status: "displayable" }>["product"];

/** Book shop: each edition is its own product (owner), listed separately with no picker. Display facts only. */
export function CommerceShopView({ shop }: { shop: CommerceEditionShop | null }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  if (!shop || shop.status === "unavailable" || shop.products.length === 0) return <BookUnavailable />;
  return <PageInset as="main" className="pt-28 pb-24 text-foreground sm:pt-36 lg:pt-[clamp(7rem,18svh,9rem)]">
    <header className="border-b border-foreground pb-3">
      <h1 className="font-display text-[2.5rem] font-normal leading-[1.05] tracking-[-0.02em]">{t("book")}</h1>
    </header>
    <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {shop.products.map(({ product, offer }) => <ProductCard key={product.productID} product={product} offer={offer} />)}
    </ul>
  </PageInset>;
}

type ShopEntry = Extract<CommerceEditionShop, { status: "displayable" }>["products"][number];

/** One product in the shop list: cover, title and facts, linking to its page. */
function ProductCard({ product, offer }: ShopEntry) {
  return <li className="min-w-0">
    <Link href={"/shop/products/" + encodeURIComponent(product.productID)} className="group block min-w-0 outline-offset-4 focus-visible:outline-2">
      <ProductCover product={product} />
      <h2 className="mt-5 text-2xl leading-snug tracking-tight underline-offset-4 [overflow-wrap:anywhere] group-hover:underline">{product.title}</h2>
      <ProductFacts offer={offer} className="mt-3" />
    </Link>
  </li>;
}

/** Price, what the product includes and the per-account limit, from E1's server offer. Shared by the shop, product and checkout. */
export function ProductFacts({ offer, className }: { offer: CommerceEditionOffer; className?: string }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  return <ArcRoles><div className={className}>
    <p className="text-[15px] leading-[21px] tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(offer.priceKRW)}</p>
    <p className="mt-2 max-w-prose text-xs leading-5 text-muted-foreground">{offer.editionEntitlements.membershipSignet ? t("includesBundle") : t("includesBookOnly")}</p>
    {offer.maximumQuantity === 1 && <div className="mt-3"><Badge size="md">{t("onePerAccount")}</Badge></div>}
  </div></ArcRoles>;
}

/** Checkout for a native product while purchase is not open: the product's facts and the not-open note, with no cart or Pay.
 * The checkout page's own top link already goes back to the product page, so the summary has none. */
export function NativeCheckoutSummary({ title, offer }: { title: string; offer: CommerceEditionOffer }) {
  return <section aria-labelledby="native-checkout-heading" className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem] lg:gap-x-16 xl:gap-x-24">
    <div className="min-w-0">
      <h2 id="native-checkout-heading" className="text-[15px] leading-[21px] [overflow-wrap:anywhere]">{title}</h2>
      <ProductFacts offer={offer} className="mt-4" />
    </div>
    <PurchaseNotOpen priceKRW={offer.priceKRW} />
  </section>;
}

/**
 * Native products are display-only until native settlement exists (purchaseReady: false). stripe.press spec §6, owner
 * ("Yes, but change wording to 'Release pending'"): the buy row itself, faded and aria-disabled, with its price; no box.
 */
export function PurchaseNotOpen({ priceKRW }: { priceKRW: number }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  return <div role="group" aria-disabled="true" aria-labelledby="book-purchase-heading"
    className="flex min-h-10 cursor-default items-center justify-between gap-4 self-start border-y border-dotted border-foreground/45 text-[15px] leading-[21px] opacity-60 pointer-coarse:min-h-11">
    <p id="book-purchase-heading">{t("purchaseNotOpen")}</p>
    <p className="tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(priceKRW)}</p>
  </div>;
}

function ProductCover({ product }: { product: EditionProduct }) {
  const cover = product.images.flatMap(({ image }) => typeof image === "object" && image.url ? [{ src: image.url, alt: image.alt || product.title }] : [])[0];
  return cover
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={cover.src} alt={cover.alt} className="aspect-square w-full rounded-xl border border-border bg-muted object-contain" />
    : <div aria-hidden="true" className="aspect-square w-full rounded-xl border border-border bg-muted" />;
}

/** No published product to show (also the product page's fail-closed state). */
/** `retry`: a failed read (not a closed or missing product) passes its in-place retry (CommerceLoadRetry). */
export function BookUnavailable({ retry }: { retry?: ReactNode }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  return <PageInset as="main" className="min-h-[70svh] pt-36 pb-24 text-foreground sm:pt-44">
    <p className="text-xs uppercase tracking-[0.04em] text-muted-foreground">{t("book")}</p>
    <h1 className="mt-5 max-w-3xl font-display text-[2.5rem] font-normal leading-[1.05] tracking-[-0.02em]">{t("unavailableTitle")}</h1>
    <p className="mt-4 max-w-lg text-base leading-6 text-muted-foreground">{t("unavailableDetail")}</p>
    {retry}
    <nav aria-label={t("information")} className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
      <Link href="/me/orders" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("orders")}</Link>
    </nav>
  </PageInset>;
}
