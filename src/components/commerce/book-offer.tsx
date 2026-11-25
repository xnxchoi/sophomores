import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CommerceEditionOffer, CommerceEditionShop } from "@/lib/commerce/editions";
import { Link } from "@/components/core/Link/Link";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Badge } from "@/components/arc/badge/badge";
import { ArcRoles } from "./arc-roles";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { BookStage } from "./book3d/book-stage";
import { FeaturedReleases, ShopShelf } from "./shop/shop-front";
import { bookTextures, firstImage, pageTextures, StageArt } from "./product-page/product-page";
import { readProductPageContent, type ProductPageContent } from "./product-page/_shared/content";

/**
 * Book shop: each edition is its own product (owner), listed separately with no picker. Display facts only. Laid out as
 * stripe.press's home: new and featured books first, each on its own art with the 3D book over it, then every edition on
 * one shelf, spine out (shop/shop-front.tsx). Order follows each product's shelf order, then the shop's own order.
 * `contents`: each product's page fields by product ID (art, book textures, shelf title); a product without them shows
 * its first image and a plain book.
 */
export function CommerceShopView({ shop, contents = {} }: { shop: CommerceEditionShop | null; contents?: Record<string, ProductPageContent> }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  if (!shop || shop.status === "unavailable" || shop.products.length === 0) return <BookUnavailable />;
  const empty = readProductPageContent(null), money = new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
  const entries = shop.products
    .map((entry, index) => ({ entry, index, content: contents[entry.product.productID] ?? empty }))
    .sort((a, b) => (a.content.shelfOrder ?? Number.MAX_SAFE_INTEGER) - (b.content.shelfOrder ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ entry, content }) => ({ product: entry.product, content, title: content.shelfTitle ?? entry.product.title,
      price: money.format(entry.offer.priceKRW), href: "/shop/products/" + encodeURIComponent(entry.product.productID) }));
  return <PageInset as="main" className="pt-[4.5rem] pb-24 text-foreground">
    <h1 className="sr-only">{t("book")}</h1>
    <FeaturedReleases label={t("featured")} viewDetails={t("viewDetails")} items={entries.map(({ product, content, title, price, href }) => ({
      id: product.productID, title, price, href,
      // stripe.press's proportions (Review-B, 25 Nov: its art starts right under the rail, y 162 at 1440×900): the art
      // fills the row from the rail down, and the book stands nearly its height, spilling a little past its lower edge,
      // clear of the rail above and the caption below.
      stage: <BookStage id={product.productID} textures={bookTextures(content)} pageTextures={pageTextures(content)} closedZ={17}
        className="relative aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-auto lg:h-[calc(100svh-12rem)]">
        <div className="absolute inset-x-0 top-0 bottom-[6%] overflow-hidden rounded-[10px] bg-muted">
          <StageArt art={content.stageArt ?? firstImage(product)} />
        </div>
      </BookStage>
    }))} />
    <ShopShelf label={t("allProducts")} viewDetails={t("viewDetails")}
      books={entries.map(({ product, content, title, price, href }) => ({ id: product.productID, title, price, href, textures: bookTextures(content) }))} />
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
    className="flex min-h-10 items-center justify-between gap-4 self-start border-y border-dotted border-foreground/45 text-[15px] leading-[21px] opacity-60 pointer-coarse:min-h-11">
    <p id="book-purchase-heading">{t("purchaseNotOpen")}</p>
    <p className="tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(priceKRW)}</p>
  </div>;
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
      <Link href="/help" className="group/focus inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("help")}</FocusShape></Link>
      <Link href="/me/orders" className="group/focus inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("orders")}</FocusShape></Link>
    </nav>
  </PageInset>;
}
