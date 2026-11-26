import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCartProducts, type CartProduct } from "@/lib/commerce/cart-products";
import { resolveCartEditionProducts } from "@/lib/commerce/cart-product-actions";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { CartView } from "./cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("cart"),
    robots: { index: false, follow: false }
  };
}

export default async function CartPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_shop_cart_page");
  let products: readonly CartProduct[] = [];
  try { products = await loadCartProducts(await getPayload({ config })); }
  catch { console.error("Published cart pricing is unavailable."); }
  // The same request-scoped state the header reads; it only decides whether Checkout asks for sign-in first.
  const member = await readHeaderMemberState(await headers());
  // Membership up front; edition lines in a browser cart are named on demand (resolveProducts), never the whole catalogue.
  return <CartView products={products} resolveProducts={resolveCartEditionProducts} signedIn={member.state === "signed-in" && member.member}
    initialCapabilities={await loadPublicMemberCapabilities()} signInOffInReview={isReviewCopyRequest()}
    copy={{ title: t("title"), signInTitle: t("signInTitle"), backToCart: t("backToCart") }} />;
}
