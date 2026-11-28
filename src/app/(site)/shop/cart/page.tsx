import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { listCommerceEditionProducts, type CommerceEditionShop } from "@/lib/commerce/editions";
import { CommerceShopView } from "@/components/commerce/book-offer";
import { readProductPageContent, type ProductPageContent } from "@/components/commerce/product-page/_shared/content";
import { loadProductPageDocuments } from "../products/[id]/page-documents";
import { CartView } from "./cart-view";
import { loadCartProps } from "./load-cart";
import { ShopCartPanel } from "./shop-cart-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("cart"),
    robots: { index: false, follow: false }
  };
}

/**
 * /shop/cart: the shop in its cart mode, as stripe.press's /cart is its home with the cart column open (their direct
 * load opens it at once). The cart's own steps (CartContents) are unchanged inside that column. When the shop can't
 * be shown, the cart stands alone as before (CartView).
 */
export default async function CartPage() {
  await connection();
  const cart = await loadCartProps();
  let shop: CommerceEditionShop | null = null;
  const contents: Record<string, ProductPageContent> = {};
  try {
    const payload = await getPayload({ config });
    shop = await listCommerceEditionProducts(payload);
    if (shop.status === "displayable") {
      const ids = shop.products.map((entry) => entry.product.productID);
      const documents = await loadProductPageDocuments(payload, ids).catch(() => [] as unknown[]);
      for (const id of ids) contents[id] = readProductPageContent(documents.find((document) => String((document as { id?: unknown }).id) === id));
    }
  } catch { shop = null; console.error("Published book information is unavailable."); }
  if (!shop || shop.status !== "displayable" || shop.products.length === 0) return <CartView {...cart} />;
  return <div className="min-h-dvh bg-background text-foreground"><CommerceShopView shop={shop} contents={contents} cartOpen cartPanel={<ShopCartPanel {...cart} />} /></div>;
}
