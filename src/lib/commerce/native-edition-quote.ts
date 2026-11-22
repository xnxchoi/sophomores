import type { PayloadRequest } from "payload";
import { z } from "zod";
import { commercePublicationSchema } from "./catalogue";
import { commerceEditionVariantSchema, loadCommerceEditionOffer } from "./editions";
import { editionRuleFacts, matchesRecordedEditionRule } from "./edition-rules";

const id = z.string().trim().min(1).max(128);
const revision = z.string().trim().min(1).max(128);
const selectionSchema = z.strictObject({ productID: id, variantID: id });
type NativeSelection = Readonly<z.infer<typeof selectionSchema>>;

const operationalTerms = z.strictObject({
  productID: id, variantID: id, revision,
  disclosureRevision: revision, fulfillmentRevision: revision, benefitRevision: revision,
  saleStartsAt: z.iso.datetime({ offset: true }), saleEndsAt: z.iso.datetime({ offset: true }),
  shippingCountry: z.literal("KR"), shippingAmount: z.int().min(0),
});
const publication = commercePublicationSchema.extend({ updatedAt: revision });
const stockedVariant = commerceEditionVariantSchema.safeExtend({ inventory: z.int().min(1) });

export const nativeEditionQuoteSchema = z.strictObject({
  version: z.literal(1), customerID: id, productID: id, releaseID: id,
  productName: z.string().trim().min(1).max(200), ...editionRuleFacts,
  productVersion: revision, publicationVersion: revision,
  edition: z.strictObject({
    variantID: id, optionID: id, variantTypeID: id,
    label: z.string().trim().min(1).max(200), variantVersion: revision,
  }),
  termsRevision: revision, disclosureRevision: revision, fulfillmentRevision: revision, benefitRevision: revision,
  quantity: z.literal(1), currency: z.literal("KRW"), shippingCountry: z.literal("KR"),
  unitAmount: z.int().min(1), shippingAmount: z.int().min(0), totalAmount: z.int().min(1),
}).refine((quote) => quote.releaseID === quote.productID &&
  Number.isSafeInteger(quote.unitAmount + quote.shippingAmount) &&
  quote.totalAmount === quote.unitAmount + quote.shippingAmount && matchesRecordedEditionRule(quote));
export type NativeEditionQuote = Readonly<z.infer<typeof nativeEditionQuoteSchema>>;

/** Internal authority only. Return terms from the revisioned SKU record only if the authenticated buyer is eligible. */
type ReadApprovedTerms = (req: PayloadRequest, selection: NativeSelection) => Promise<unknown>;

/** Computes a preliminary quote, never purchase permission or stock reservation. No route calls this yet. */
export async function readNativeEditionQuote(
  req: PayloadRequest, input: unknown, readApprovedTerms: ReadApprovedTerms, now = Date.now(),
): Promise<NativeEditionQuote | null> {
  const selection = selectionSchema.safeParse(input);
  const user = req.user;
  if (!selection.success || !Number.isFinite(now) || user?.collection !== "users" ||
    user.emailVerified !== true || user.membershipStatus === "suspended") return null;
  const { productID, variantID } = selection.data;
  const terms = operationalTerms.safeParse(await readApprovedTerms(req, selection.data));
  if (!terms.success || terms.data.productID !== productID || terms.data.variantID !== variantID ||
    now < Date.parse(terms.data.saleStartsAt) || now >= Date.parse(terms.data.saleEndsAt)) return null;

  const approval = publication.safeParse(await req.payload.findGlobal({
    slug: "commerce-publication", draft: false, depth: 0, overrideAccess: true, req,
  }));
  if (!approval.success || !approval.data.shippingCountries.includes(terms.data.shippingCountry)) return null;
  const offer = await loadCommerceEditionOffer(req.payload, productID, req);
  if (!offer || offer.edition.variantID !== variantID) return null;
  const { edition, title, editionRuleVersion, editionKind, maximumQuantity, editionEntitlements } = offer;
  const variants = await req.payload.find({
    collection: "variants", draft: false, depth: 0, limit: 1, overrideAccess: true, req,
    where: { and: [
      { id: { equals: variantID } }, { product: { equals: productID } },
      { _status: { equals: "published" } }, { publicationApproved: { equals: true } },
    ] },
  });
  if (variants.docs.length !== 1 || variants.hasNextPage) return null;
  const sku = stockedVariant.safeParse(variants.docs[0]);
  if (!sku.success || sku.data.id !== variantID || sku.data.product !== productID ||
    sku.data.options[0] !== edition.optionID || sku.data.updatedAt !== edition.variantVersion ||
    sku.data.priceInKRWEnabled !== true || sku.data.priceInKRW !== offer.priceKRW) return null;

  const { revision: termsRevision, disclosureRevision, fulfillmentRevision, benefitRevision, shippingAmount } = terms.data;
  const quote = nativeEditionQuoteSchema.safeParse({
    version: 1, customerID: user.id, productID, releaseID: offer.releaseID, productName: title,
    productVersion: offer.productVersion, publicationVersion: approval.data.updatedAt,
    edition, editionRuleVersion, editionKind, maximumQuantity, editionEntitlements,
    termsRevision, disclosureRevision, fulfillmentRevision, benefitRevision,
    quantity: 1, currency: "KRW", shippingCountry: terms.data.shippingCountry,
    unitAmount: offer.priceKRW, shippingAmount, totalAmount: offer.priceKRW + shippingAmount,
  });
  return quote.success ? quote.data : null;
}
