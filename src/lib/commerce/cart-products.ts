import type { Payload } from "payload";
import { loadCommerceOffer, type CommerceOffer } from "./catalogue";
import { listCommerceEditionProducts, type CommerceEditionShop } from "./editions";

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

/** Each catalogue is read on its own: a failure in one leaves the other's lines named. */
export async function loadCartProducts(payload: Payload): Promise<readonly CartProduct[]> {
  const [offer, editions] = await Promise.all([
    loadCommerceOffer(payload).catch(() => null),
    listCommerceEditionProducts(payload).catch(() => null),
  ]);
  return cartProductsFrom(offer, editions);
}
