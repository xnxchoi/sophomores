"use server";

import { getPayload } from "payload";
import config from "@payload-config";
import { loadCartEditionProducts, type CartProduct } from "@/lib/commerce/cart-products";

/**
 * Names and prices the edition lines a cart holds (useCommerceCartState's `resolveProducts`), for the browser's lines
 * and the account's alike (owner launch gap, 28 Nov: the cart said "Saved item 1" and couldn't quote an edition).
 * The cart's own product IDs come in; published catalogue facts go out (title, image, price, product page), the same
 * ones /shop shows anyone. Nothing about the shopper is read. loadCartEditionProducts validates the input (at most
 * cartEditionLookupLimit IDs, one bounded read each) and returns nothing for anything malformed or unpublished, so an
 * unknown line stays unnamed and unquoted rather than guessed. Display only: never purchase permission.
 */
export async function resolveCartEditions(productIDs: unknown): Promise<readonly CartProduct[]> {
  try { return await loadCartEditionProducts(await getPayload({ config }), productIDs); }
  catch { console.error("Cart edition pricing is unavailable."); return []; }
}
