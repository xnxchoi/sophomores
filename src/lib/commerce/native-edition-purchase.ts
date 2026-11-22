import type { PayloadRequest } from "payload";
import { z } from "zod";
import { type ShippingAddress } from "./contracts";
import { readNativeEditionQuote } from "./native-edition-quote";
import { nativePurchaseSnapshotSchema } from "./native-edition-receipt";
import { relationshipID } from "./_shared/transaction";

const productTerms = z.object({
  id: z.uuid(), commerceModel: z.literal("native-edition-v2"),
  _status: z.literal("published"), publicationApproved: z.literal(true),
  updatedAt: z.string().min(1),
  saleStartsAt: z.iso.datetime({ offset: true }), saleEndsAt: z.iso.datetime({ offset: true }),
  shippingFeeKRW: z.int().min(0), dispatchSchedule: z.string().trim().min(1),
  event: z.unknown(),
});

export async function buildNativePurchaseSnapshot(req: PayloadRequest, input: {
  cartID: string; productID: string; variantID: string; shippingAddress: ShippingAddress;
}) {
  const { cartID, productID, variantID, shippingAddress } = input;
  const { docs } = await req.payload.find({
    collection: "products", draft: false, depth: 0, limit: 1, pagination: false, overrideAccess: true, req,
    where: { and: [{ id: { equals: productID } }, { _status: { equals: "published" } },
      { publicationApproved: { equals: true } }, { commerceModel: { equals: "native-edition-v2" } }] },
  });
  const product = productTerms.parse(docs[0]);
  if (product.id !== productID) throw new Error("Native product identity mismatch");
  const quote = await readNativeEditionQuote(req, { productID, variantID }, async () => ({
    productID, variantID, revision: product.updatedAt,
    saleStartsAt: product.saleStartsAt, saleEndsAt: product.saleEndsAt,
    shippingCountry: "KR", shippingAmount: product.shippingFeeKRW,
    disclosureRevision: product.updatedAt, fulfillmentRevision: product.updatedAt, benefitRevision: "edition-rule-v1",
  }));
  if (!quote || quote.productVersion !== product.updatedAt) throw new Error("Native edition is not available");
  const eventID = quote.editionEntitlements.freeLaunchTicket ? z.uuid().parse(relationshipID(product.event)) : null;
  return nativePurchaseSnapshotSchema.parse({
    version: 2, kind: "native-edition-v1", customerID: quote.customerID, cartID, productID, releaseID: quote.releaseID,
    eventID, productVersion: quote.productVersion, variantID, variantVersion: quote.edition.variantVersion,
    optionID: quote.edition.optionID, variantTypeID: quote.edition.variantTypeID, editionLabel: quote.edition.label,
    editionKind: quote.editionKind, editionRuleVersion: quote.editionRuleVersion, editionEntitlements: quote.editionEntitlements,
    maximumQuantity: quote.maximumQuantity, termsRevision: quote.termsRevision, disclosureRevision: quote.publicationVersion,
    fulfillmentRevision: quote.fulfillmentRevision, benefitRevision: quote.benefitRevision,
    quantity: quote.quantity, currency: quote.currency, unitAmount: quote.unitAmount,
    shippingAmount: quote.shippingAmount, totalAmount: quote.totalAmount, orderName: quote.productName, shippingAddress,
  });
}
