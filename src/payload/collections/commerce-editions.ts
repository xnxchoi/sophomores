import english from "../../../messages/en.json";
import { createVariantsCollection, createVariantTypesCollection, createVariantOptionsCollection, variantsFields } from "@payloadcms/plugin-ecommerce";
import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type Field, type PayloadRequest } from "payload";
import { z } from "zod";
import { commerceAdmin } from "../../lib/commerce/access";
import { isCmsSuperAdmin } from "../../lib/auth/access";
import { counter, lockCommerce, relationshipID } from "../../lib/commerce/_shared/transaction";
import { commerceEditionVariantSchema } from "../../lib/commerce/editions";
import type { Product, Variant } from "../../payload-types";

const nativeAccess = { isAdmin: commerceAdmin, adminOrPublishedStatus: commerceAdmin, publicAccess: commerceAdmin };
const variants = createVariantsCollection({ access: nativeAccess, inventory: true,
  currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [
    { code: "KRW", decimals: 0, label: english.Staff.schema.koreanWon, symbol: "\u20a9" },
  ] },
});

const stockAdjustment = z.strictObject({
  variantID: z.uuid(), expectedInventory: z.int().min(0), inventory: z.int().min(0),
});
const stockAdjustments = new WeakMap<PayloadRequest, z.infer<typeof stockAdjustment>>();

/** Trusted staff Local API only. Normal saves may include stale form inventory. */
export async function adjustEditionStock(req: PayloadRequest, input: z.input<typeof stockAdjustment>) {
  if (!isCmsSuperAdmin(req.user)) throw new APIError("Commerce administrator access required", 403);
  const adjustment = stockAdjustment.parse(input);
  if (stockAdjustments.has(req)) throw new Error("Edition stock adjustment already active");
  stockAdjustments.set(req, adjustment);
  try {
    return await req.payload.update({
      collection: "variants", id: adjustment.variantID, data: { inventory: adjustment.inventory },
      depth: 0, draft: false, overrideAccess: false, req,
    });
  } finally {
    stockAdjustments.delete(req);
  }
}

const protectVariantStock: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const previousProductID = originalDoc?.product == null ? undefined : relationshipID(originalDoc.product);
  const productID = data.product == null ? previousProductID : relationshipID(data.product);
  if (originalDoc?.id && productID !== previousProductID) throw new APIError("Variant parent identity is immutable", 409);
  if (!productID) throw new APIError("Native edition parent required", 400);
  await lockCommerce(req, [`product:${productID}`]);
  const product = await req.payload.db.findOne<Product>({ collection: "products", where: { id: { equals: productID } }, draftsEnabled: false, req });
  if (product?.commerceModel !== "native-edition-v2") throw new APIError("Native edition parent required", 400);
  let next: Record<string, unknown> = { ...data, product: productID };
  if (originalDoc?.id) {
    const current = await req.payload.db.findOne<Variant>({ collection: "variants", where: { id: { equals: originalDoc.id } }, draftsEnabled: false, req });
    if (!current || relationshipID(current.product) !== productID) throw new APIError("Canonical variant unavailable", 409);
    const adjustment = stockAdjustments.get(req);
    if (adjustment && (adjustment.variantID !== current.id || adjustment.expectedInventory !== current.inventory)) {
      throw new APIError("Inventory changed; reload before adjusting stock", 409);
    }
    if (adjustment && adjustment.inventory < counter(product.reservedQuantity)) {
      throw new APIError("Inventory cannot fall below active reservations", 409);
    }
    next = { ...next, inventory: adjustment?.inventory ?? current.inventory };
  }
  if (data._status === "published" && data.publicationApproved === true) {
    commerceEditionVariantSchema.parse({ ...originalDoc, ...next,
      id: originalDoc?.id ?? data.id ?? "new", updatedAt: new Date().toISOString() });
  }
  return next;
};

/** Standalone edition SKUs; the plugin's public variant routes remain disabled. */
export const CommerceEditionCollections: CollectionConfig[] = [
  { ...variants,
    access: { admin: commerceAdmin, create: commerceAdmin, read: commerceAdmin, update: commerceAdmin, delete: () => false },
    fields: [...variants.fields.map((field): Field => field.type === "number" && field.name === "inventory"
      ? { ...field, access: { ...field.access, update: ({ req }) => stockAdjustments.has(req) } }
      : field), { name: "publicationApproved", type: "checkbox", defaultValue: false,
      label: english.Staff.schema.editionDisplayApproved }],
    hooks: { ...variants.hooks,
      beforeChange: [protectVariantStock, ...(variants.hooks?.beforeChange ?? [])] },
  },
  createVariantTypesCollection({ access: nativeAccess }),
  createVariantOptionsCollection({ access: nativeAccess }),
];

export const CommerceEditionProductFields: Field[] = [
  { name: "commerceModel", type: "select", required: true, defaultValue: "legacy-v1",
    label: english.Staff.schema.commerceProductModel,
    options: [{ label: english.Staff.schema.commerceV1, value: "legacy-v1" },
      { label: english.Staff.schema.nativeEditionDisplayOnly, value: "native-edition-v2" }],
  },
  ...variantsFields({}).map((field): Field => {
    if ("name" in field && field.name === "enableVariants" && field.type === "checkbox") return {
      ...field, defaultValue: false, access: { create: () => false, update: () => false },
      admin: { ...field.admin, readOnly: true },
      validate: (value: unknown) => value !== true || "Edition purchasing is not enabled",
    };
    // Staff can prepare native identity while the purchase enableVariants flag stays false.
    return { ...field, admin: { ...field.admin, condition: (data) => data.commerceModel === "native-edition-v2" } } as Field;
  }),
];
