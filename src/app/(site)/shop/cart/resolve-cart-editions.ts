"use server";

import { getPayload } from "payload";
import config from "@payload-config";
import { z } from "zod";
import { cartEditionLookupLimit, loadCartEditionProducts, type CartProduct } from "@/lib/commerce/cart-products";

// The same bound as loadCartEditionProducts, checked first so malformed input never starts Payload (Review-A, 28 Nov).
const productIDs = z.array(z.string().min(1).max(64).refine((id) => id.trim() === id)).min(1).max(cartEditionLookupLimit);

/**
 * Names and prices the edition lines a cart holds (useCommerceCartState's `resolveProducts`), for the browser's lines
 * and the account's alike (owner launch gap, 28 Nov: the cart said "Saved item 1" and couldn't quote an edition).
 * The cart's own product IDs come in; published catalogue facts go out (title, image, price, product page), the same
 * ones /shop shows anyone. Nothing about the shopper is read. loadCartEditionProducts validates the input (at most
 * cartEditionLookupLimit IDs, one bounded read each) and returns nothing for anything malformed or unpublished, so an
 * unknown line stays unnamed and unquoted rather than guessed. Display only: never purchase permission. Its request
 * budget (rate limit) is Auth's, with the rest of the public commerce actions (Review-A, 28 Nov).
 */
export async function resolveCartEditions(input: unknown): Promise<readonly CartProduct[]> {
  const parsed = productIDs.safeParse(input);
  if (!parsed.success) return [];
  try { return await loadCartEditionProducts(await getPayload({ config }), parsed.data); }
  catch { console.error("Cart edition pricing is unavailable."); return []; }
}
