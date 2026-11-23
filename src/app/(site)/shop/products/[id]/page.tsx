import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { listCommerceEditionProducts, loadCommerceEditionOffer, loadPublishedCommerceEditions, type CommerceEditionOffer } from "@/lib/commerce/editions";
import { BookUnavailable } from "@/components/commerce/book-offer";
import { ProductPage, type ShelfEntry } from "@/components/commerce/product-page/product-page";
import { readProductPageContent, type ProductPageContent } from "@/components/commerce/product-page/_shared/content";
import { loadProductPageDocuments } from "./page-documents";
// The shell's FX foot band is off here (owner: "Switch it off on certain page -> e.g. this").
import { FXFrameOff } from "@/components/shell/footer-visibility";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("shop"), robots: { index: false, follow: false } };
}

/** One native product on its own page (each edition is its own product). Display facts from E1; purchase not open yet. */
export default async function ShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  let product: Parameters<typeof ProductPage>[0]["product"] | null = null;
  let offer: CommerceEditionOffer | null = null;
  let content: ProductPageContent = readProductPageContent(null);
  let shelf: ShelfEntry[] = [];
  try {
    const payload = await getPayload({ config });
    const [catalogue, edition] = await Promise.all([loadPublishedCommerceEditions(payload, undefined, id), loadCommerceEditionOffer(payload, id)]);
    // Both server reads must agree on the product, or nothing is shown (fails closed).
    if (catalogue.status === "displayable" && edition && catalogue.product.productID === edition.productID) { product = catalogue.product; offer = edition; }
    if (product) {
      // The page's content fields (spec 23 Nov) and the shelf. Either failing leaves the page with its facts only.
      const shop = await listCommerceEditionProducts(payload).catch(() => null);
      const listed = shop?.status === "displayable" ? shop.products : [];
      const documents = await loadProductPageDocuments(payload, [id, ...listed.map((entry) => entry.product.productID)])
        .catch(() => [] as unknown[]);
      const contentOf = (productID: string) => readProductPageContent(documents.find((document) => String((document as { id?: unknown }).id) === productID));
      content = contentOf(id);
      shelf = listed
        .map((entry, index) => ({ entry, index, own: contentOf(entry.product.productID) }))
        // Shelf order first; products without one keep the shop's price order after them.
        .sort((a, b) => (a.own.shelfOrder ?? Number.MAX_SAFE_INTEGER) - (b.own.shelfOrder ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
        .map(({ entry, own }) => ({ productID: entry.product.productID, title: own.shelfTitle ?? entry.product.title, current: entry.product.productID === id }));
    }
  } catch {
    console.error("Published product information is unavailable.");
  }
  return <div className="min-h-dvh bg-background text-foreground">
    <FXFrameOff />
    {product && offer ? <ProductPage product={product} offer={offer} content={content} shelf={shelf} /> : <BookUnavailable />}
  </div>;
}
