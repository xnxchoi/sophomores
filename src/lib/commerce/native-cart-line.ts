import type { CollectionSlug, PayloadRequest } from "payload";
import { z } from "zod";
import { commerceEditionOfferFrom, loadPublishedCommerceEditions } from "./editions";
import { relationshipID } from "./_shared/transaction";
import { MEMBERSHIP_ACCOUNT_LIMIT } from "./contracts";

/**
 * A native edition as a server cart line (owner, 27 Nov: "editions go in the cart"). Each edition is its own product with
 * exactly one published SKU, so a line may name the product alone and the server fills the variant; a named variant
 * must be that SKU. Price, account limit and allowance event come from the published edition and its rule, never from
 * the browser. Advisory for the cart, like accountAllowanceAdmits: reservePurchase and the purchase snapshot stay
 * authoritative at checkout.
 */
export type NativeCartLine = Readonly<{
  productID: string; variantID: string; priceKRW: number; accountLimit: number | null;
  // The allowance namespace input reservations use: a bundle edition (membership and launch ticket) is counted against
  // its event, so it shares the one-membership-per-account allowance; book-only is null (its own per-product allowance).
  eventID: string | null;
}>;

const productTerms = z.object({
  id: z.string().min(1), commerceModel: z.string().nullish(),
  saleStartsAt: z.iso.datetime({ offset: true }).nullish(), saleEndsAt: z.iso.datetime({ offset: true }).nullish(),
  event: z.unknown().optional(),
});

/** "legacy" when the product isn't a native edition; null when it is one but can't be sold now; else the line. */
export async function resolveNativeCartLine(req: PayloadRequest, productID: string, variant: unknown, now = Date.now()):
  Promise<NativeCartLine | "legacy" | null> {
  const found = await req.payload.find({ collection: "products" as CollectionSlug, draft: false, depth: 0, limit: 1,
    pagination: false, overrideAccess: true, req, where: { and: [{ id: { equals: productID } }] } });
  const product = productTerms.safeParse(found.docs[0]);
  if (!product.success || product.data.id !== productID) return found.docs.length ? null : "legacy";
  if (product.data.commerceModel !== "native-edition-v2") return "legacy";
  const { saleStartsAt, saleEndsAt } = product.data;
  if (!saleStartsAt || !saleEndsAt || now < Date.parse(saleStartsAt) || now >= Date.parse(saleEndsAt)) return null;
  const offer = commerceEditionOfferFrom(await loadPublishedCommerceEditions(req.payload, req, productID), productID);
  if (!offer) return null;
  if (variant != null && relationshipIDOrNull(variant) !== offer.edition.variantID) return null;
  let eventID: string | null = null;
  if (offer.editionEntitlements.freeLaunchTicket) {
    eventID = relationshipIDOrNull(product.data.event);
    if (!eventID) return null;
  }
  return { productID, variantID: offer.edition.variantID, priceKRW: offer.priceKRW,
    accountLimit: eventID === null ? offer.maximumPerPerson : MEMBERSHIP_ACCOUNT_LIMIT, eventID };
}

function relationshipIDOrNull(value: unknown): string | null {
  try { return value == null ? null : relationshipID(value); } catch { return null; }
}
