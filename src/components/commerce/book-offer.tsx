import { useLocale, useTranslations } from "next-intl";
import type { CommerceEditionCatalogue, CommerceEditionOffer, CommerceEditionShop } from "@/lib/commerce/editions";
import { Link } from "@/components/core/Link/Link";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Badge } from "@/components/arc/badge/badge";
import { CommerceProductGallery } from "./product-gallery";
import { BookStage } from "./book3d/book-stage";
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

/** One product in a list (the shop, and Other editions on a product page): cover, title and facts, linking to its page. */
function ProductCard({ product, offer }: ShopEntry) {
  return <li className="min-w-0">
    <Link href={"/shop/products/" + encodeURIComponent(product.productID)} className="group block min-w-0 outline-offset-4 focus-visible:outline-2">
      <ProductCover product={product} />
      <h2 className="mt-5 text-2xl leading-snug tracking-tight underline-offset-4 [overflow-wrap:anywhere] group-hover:underline">{product.title}</h2>
      <ProductFacts offer={offer} className="mt-3" />
    </Link>
  </li>;
}

/**
 * One product's page, laid out like stripe.press's (map 23 Nov, owner: "a full-enough port of the Product page layout"):
 * the stage (the art and the 3D book) holds the left 60% and stays pinned under the header while the purchase column on
 * the right 40% scrolls. On a phone the stage sits at the top and stays pinned while the column scrolls up over it, as
 * stripe.press's art does. Full-width sections after the column (Other editions) scroll over the pinned stage, as
 * stripe.press's praise and production sections do (owner: "As stripe.press does!").
 */
export function CommerceProductView({ product, offer, others = [] }: { product: EditionProduct | null; offer: CommerceEditionOffer | null; others?: readonly ShopEntry[] }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  if (!product || !offer) return <BookUnavailable />;
  return <PageInset as="main" className="pt-[4.5rem] pb-24 text-foreground lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-x-6 lg:pt-[5.5rem]">
    <BookStage id={product.productID} className="sticky top-[4.5rem] min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:top-[5.5rem] lg:h-[calc(100svh-7rem)]">
      <CommerceProductGallery key={product.productID} images={product.images} title={product.title} fill emptyNote={false} />
    </BookStage>
    <div className="relative z-1 min-w-0 bg-background pt-8 lg:col-start-2 lg:row-start-1 lg:min-h-[calc(100svh-7rem)] lg:bg-transparent lg:pt-0">
      <Link href="/shop" className="inline-flex min-h-12 items-center text-sm text-muted-foreground underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2 lg:-mt-3">{t("allProducts")}</Link>
      <header className="mt-6">
        <p className="text-xs uppercase tracking-[0.04em] text-muted-foreground">{t("book")}</p>
        <h1 className="mt-3 font-display text-[2.5rem] font-normal leading-[1.08] tracking-[-0.02em] text-balance [overflow-wrap:anywhere]">{product.title}</h1>
      </header>
      <section aria-labelledby="product-description-heading" className="mt-10">
        <h2 id="product-description-heading" className="text-xs uppercase tracking-[0.04em] text-muted-foreground">{t("description")}</h2>
        <p className="mt-3 max-w-prose whitespace-pre-line text-base leading-6 [overflow-wrap:anywhere]">{product.description}</p>
      </section>
      <div className="mt-10">
        <PurchaseNotOpen priceKRW={offer.priceKRW} />
        <p className="mt-3 max-w-prose text-xs leading-5 text-muted-foreground">
          {offer.editionEntitlements.membershipSignet ? t("includesBundle") : t("includesBookOnly")}
          {offer.maximumQuantity === 1 && <> {t("onePerAccount")}.</>}
        </p>
      </div>
    </div>
    {others.length > 0 && <section data-covers-stage aria-labelledby="other-editions-heading"
      className="relative z-1 mt-24 bg-background pt-3 lg:col-span-full lg:row-start-2 lg:mt-16 lg:pb-24">
      <h2 id="other-editions-heading" className="border-b border-foreground pb-3 text-xs uppercase tracking-[0.04em]">{t("otherEditions")}</h2>
      <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((entry) => <ProductCard key={entry.product.productID} {...entry} />)}
      </ul>
    </section>}
  </PageInset>;
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

function BookUnavailable() {
  const t = useTranslations("Customer.components_commerce_book_offer");
  return <PageInset as="main" className="min-h-[70svh] pt-36 pb-24 text-foreground sm:pt-44">
    <p className="text-xs uppercase tracking-[0.04em] text-muted-foreground">{t("book")}</p>
    <h1 className="mt-5 max-w-3xl font-display text-[2.5rem] font-normal leading-[1.05] tracking-[-0.02em]">{t("unavailableTitle")}</h1>
    <p className="mt-4 max-w-lg text-base leading-6 text-muted-foreground">{t("unavailableDetail")}</p>
    <nav aria-label={t("information")} className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
      <Link href="/me/orders" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("orders")}</Link>
    </nav>
  </PageInset>;
}
