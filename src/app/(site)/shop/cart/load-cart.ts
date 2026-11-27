import "server-only";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { loadCartProducts, type CartProduct } from "@/lib/commerce/cart-products";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import type { CartProps } from "./cart-view";
import { resolveCartEditions } from "./resolve-cart-editions";

/**
 * What the cart's steps need (CartContents), read as /shop/cart has always read it: the cart's products (Auth's loadCartProducts), whether the
 * request is a signed-in member (it only decides whether Checkout asks for sign-in first) and the sign-in capabilities.
 * It reads the member's state, so only pages sent private, no-store call it: /shop/cart (a private page with the guard),
 * and /shop and /shop/products/* (session-varying since Auth fbad4635), where the panel it feeds sits inside PrivateRoute.
 */
export async function loadCartProps(): Promise<CartProps> {
  const t = await getTranslations("Customer.app_site_shop_cart_page");
  let products: readonly CartProduct[] = [];
  try { products = await loadCartProducts(await getPayload({ config })); }
  catch { console.error("Published cart pricing is unavailable."); }
  const member = await readHeaderMemberState(await headers());
  return { products, signedIn: member.state === "signed-in" && member.member, initialCapabilities: await loadPublicMemberCapabilities(),
    signInOffInReview: isReviewCopyRequest(), copy: { title: t("title"), signInTitle: t("signInTitle"), backToCart: t("backToCart") },
    // Edition lines are named and priced on demand from the published catalogue (owner launch gap, 28 Nov).
    resolveProducts: resolveCartEditions };
}
