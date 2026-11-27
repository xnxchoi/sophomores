import type { Payload } from "payload";
import { loadCommerceOffer, type CommerceOffer } from "./catalogue";
import { z } from "zod";
import { commerceEditionOfferFrom, loadPublishedCommerceEditions, type CommerceEditionShop } from "./editions";
import { sharedGuestSalePin } from "./event-tickets";

/**
 * What the cart needs to name and price each of its lines (Cordy/Hamlet, 26 Nov: the cart resolves "per product line,
 * not one offer"). Published display facts only, never purchase permission:
 * - membership: the legacy offer, the one product the server cart accepts and checks out (ecommerce.ts, one line, no
 *   variants, legacy catalogue only).
 * - edition: each displayable native edition. Its line is named and priced, but it is bought on its own product page
 *   ("A native product has no cart", shop/checkout/page.tsx), so shipping and stock stay null here.
 */
export type CartProduct = Readonly<{
  productID: string;
  kind: "membership" | "edition";
  title: string;
  image: Readonly<{ url: string; alt: string }> | null;
  unitPriceKRW: number;
  shippingKRW: number | null;
  maxQuantity: number;
  availableQuantity: number | null;
  productHref: string | null;
}>;

type ProductImages = readonly Readonly<{ image: string | Readonly<{ url?: string; alt?: string | null }> }>[];
function firstImage(images: ProductImages, title: string): CartProduct["image"] {
  const found = images.map(({ image }) => image).find((image) => typeof image === "object" && image.url);
  return typeof found === "object" && found.url ? { url: found.url, alt: found.alt || title } : null;
}

export function membershipCartProduct(offer: CommerceOffer): CartProduct {
  return { productID: offer.productID, kind: "membership", title: offer.title, image: firstImage(offer.images, offer.title),
    unitPriceKRW: offer.priceKRW, shippingKRW: offer.shippingFeeKRW, maxQuantity: offer.maximumQuantity,
    availableQuantity: offer.availableQuantity, productHref: null };
}

/** The cart's products from the two published catalogues; an unavailable catalogue contributes nothing. */
export function cartProductsFrom(offer: CommerceOffer | null, editions: CommerceEditionShop | null): readonly CartProduct[] {
  const products: CartProduct[] = offer ? [membershipCartProduct(offer)] : [];
  if (editions?.status === "displayable") for (const { product, offer: edition } of editions.products) {
    if (products.some((known) => known.productID === product.productID)) continue;
    products.push({ productID: product.productID, kind: "edition", title: product.title, image: firstImage(product.images, product.title),
      unitPriceKRW: edition.priceKRW, shippingKRW: null, maxQuantity: 1, availableQuantity: null,
      productHref: "/shop/products/" + encodeURIComponent(product.productID) });
  }
  return products;
}

/** A legacy standalone offer is no longer a shop cart product. Keep the Guest projection. */
export async function loadCartProducts(payload: Payload): Promise<readonly CartProduct[]> {
  try {
    const sale = sharedGuestSalePin();
    const offer = sale ? await loadCommerceOffer(payload, undefined, sale.productID) : null;
    return cartProductsFrom(offer?.ticketTarget ? offer : null, null);
  }
  catch { console.error("Cart Guest ticket pricing is unavailable."); return []; }
}

/** At most as many IDs as a cart can hold lines (browser cart: one; server cart: one), with headroom. */
export const cartEditionLookupLimit = 4;
const editionIDs = z.array(z.string().min(1).max(64).refine((id) => id.trim() === id)).max(cartEditionLookupLimit);

/**
 * Names and prices the edition lines actually in a cart: one validated catalogue read per distinct ID, never the whole
 * catalogue. Server-side only: not exposed to the browser until editions in the cart are decided and an admitted route
 * exists (Review-B, 27 Nov). Input is treated as untrusted anyway: anything malformed or over the limit reads nothing. One edition failing leaves the others named; each failure logs one fixed diagnostic.
 */
export async function loadCartEditionProducts(payload: Payload, ids: unknown): Promise<readonly CartProduct[]> {
  const parsed = editionIDs.safeParse(ids);
  if (!parsed.success) return [];
  const loaded = await Promise.all([...new Set(parsed.data)].map(async (id) => {
    try {
      const catalogue = await loadPublishedCommerceEditions(payload, undefined, id);
      const offer = commerceEditionOfferFrom(catalogue, id);
      return catalogue.status === "displayable" && offer ? [{ product: catalogue.product, offer }] : [];
    } catch { console.error("Cart edition pricing is unavailable."); return []; }
  }));
  return cartProductsFrom(null, { status: "displayable", purchaseReady: false, products: loaded.flat() });
}
