import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { listCommerceEditionProducts, type CommerceEditionShop } from "@/lib/commerce/editions";
import { BookUnavailable, CommerceShopView } from "@/components/commerce/book-offer";
import { CommerceLoadRetry } from "@/components/commerce/load-retry";
import { readProductPageContent, type ProductPageContent } from "@/components/commerce/product-page/_shared/content";
import { loadProductPageDocuments } from "./products/[id]/page-documents";
import { PrivateRoute } from "@/components/auth/private-route";
import { loadCartProps } from "./cart/load-cart";
import { ShopCartPanel } from "./cart/shop-cart-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("shop"), robots: { index: false, follow: false } };
}

export default async function ShopPage() {
  await connection();
  let editions: CommerceEditionShop | null = null;
  // Each listed product's page fields (art, book textures, shelf title and order); a failed read leaves the books plain.
  const contents: Record<string, ProductPageContent> = {};
  // A read that threw is a failure to show with a retry, never the closed shop (Review-B).
  let failed = false;
  try {
    const payload = await getPayload({ config });
    // Each edition is its own product: list them all, never pick one (owner).
    editions = await listCommerceEditionProducts(payload);
    if (editions.status === "displayable") {
      const ids = editions.products.map((entry) => entry.product.productID);
      const documents = await loadProductPageDocuments(payload, ids).catch(() => [] as unknown[]);
      for (const id of ids) contents[id] = readProductPageContent(documents.find((document) => String((document as { id?: unknown }).id) === id));
    }
  } catch {
    failed = true;
    console.error("Published book information is unavailable.");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {failed ? <BookUnavailable retry={<CommerceLoadRetry className="mt-4" />} />
        // The cart opens in place here (/shop is session-varying, private no-store); its lines sit behind the private guard.
        : <CommerceShopView shop={editions} contents={contents} cartPanel={<PrivateRoute><ShopCartPanel inPlace {...await loadCartProps()} /></PrivateRoute>} />}
    </div>
  );
}
