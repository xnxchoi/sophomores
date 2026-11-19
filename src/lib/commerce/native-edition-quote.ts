import type { PayloadRequest } from "payload";
import { z } from "zod";
import { commercePublicationSchema } from "./catalogue";
import { commerceEditionVariantSchema, loadPublishedCommerceEditions } from "./editions";

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
  quote.totalAmount === quote.unitAmount + quote.shippingAmount);
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
  const catalogue = await loadPublishedCommerceEditions(req.payload, req, productID);
  if (catalogue.status !== "displayable" || catalogue.product.productID !== productID) return null;
  const matches = catalogue.editions.filter((edition) => edition.variantID === variantID);
  const chosen = matches[0];
  if (matches.length !== 1 || !chosen || chosen.priceKRW === null) return null;
  const sku = stockedVariant.safeParse(await req.payload.findByID({
    collection: "variants", id: variantID, draft: false, depth: 0, overrideAccess: true, req, disableErrors: true,
  }));
  if (!sku.success || sku.data.id !== variantID || sku.data.product !== productID ||
    sku.data.options[0] !== chosen.optionID || sku.data.updatedAt !== chosen.variantVersion ||
    sku.data.priceInKRWEnabled !== true || sku.data.priceInKRW !== chosen.priceKRW) return null;

  const { revision: termsRevision, disclosureRevision, fulfillmentRevision, benefitRevision, shippingAmount } = terms.data;
  const quote = nativeEditionQuoteSchema.safeParse({
    version: 1, customerID: user.id, productID, releaseID: catalogue.product.releaseID,
    productVersion: catalogue.product.productVersion, publicationVersion: approval.data.updatedAt,
    edition: {
      variantID, optionID: chosen.optionID, variantTypeID: chosen.variantTypeID,
      label: chosen.label, variantVersion: chosen.variantVersion,
    },
    termsRevision, disclosureRevision, fulfillmentRevision, benefitRevision,
    quantity: 1, currency: "KRW", shippingCountry: terms.data.shippingCountry,
    unitAmount: chosen.priceKRW, shippingAmount, totalAmount: chosen.priceKRW + shippingAmount,
  });
  return quote.success ? quote.data : null;
}
