import { getPayload } from "payload";
import config from "@payload-config";
import { loadCartProducts, type CartProduct } from "@/lib/commerce/cart-products";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { AccountCartSheet } from "./cart-sheet";

export async function AccountCartEntry() {
  let products: readonly CartProduct[] = [];
  try {
    products = await loadCartProducts(await getPayload({ config }));
  } catch {
    console.error("Published cart pricing is unavailable.");
  }

  return <AccountCartSheet products={products} initialCapabilities={await loadPublicMemberCapabilities()} />;
}
