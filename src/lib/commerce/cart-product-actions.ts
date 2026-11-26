"use server";

import { getPayload } from "payload";
import config from "@payload-config";
import { loadCartEditionProducts, type CartProduct } from "./cart-products";

/**
 * Server action for the cart hook's `resolveProducts` (Review-B, 26 Nov): names the edition IDs a browser cart holds.
 * Public, published display facts only (no member, no personal data), so it needs no session; the IDs are validated and
 * capped in loadCartEditionProducts. A failure returns no products and logs one fixed line, never error detail.
 */
export async function resolveCartEditionProducts(ids: unknown): Promise<readonly CartProduct[]> {
  try { return await loadCartEditionProducts(await getPayload({ config }), ids); }
  catch { console.error("Cart edition pricing is unavailable."); return []; }
}
