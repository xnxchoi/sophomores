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

/**
 * What the cart's steps need (CartContents), read as /shop/cart has always read it: the cart's products (Auth's loadCartProducts), whether the
 * request is a signed-in member (it only decides whether Checkout asks for sign-in first) and the sign-in capabilities.
 * Only /shop/cart calls it: it reads the member's state, and /shop/cart is the private page (private, no-store and the
 * back-forward guard, src/lib/member-auth/private-pages.ts). The shop's public routes don't, until Auth makes them
 * session-varying too.
 */
export async function loadCartProps(): Promise<CartProps> {
  const t = await getTranslations("Customer.app_site_shop_cart_page");
  let products: readonly CartProduct[] = [];
  try { products = await loadCartProducts(await getPayload({ config })); }
  catch { console.error("Published cart pricing is unavailable."); }
  const member = await readHeaderMemberState(await headers());
  return { products, signedIn: member.state === "signed-in" && member.member, initialCapabilities: await loadPublicMemberCapabilities(),
    signInOffInReview: isReviewCopyRequest(), copy: { title: t("title"), signInTitle: t("signInTitle"), backToCart: t("backToCart") } };
}
