import english from "../../../messages/en.json";
import { createVariantsCollection, createVariantTypesCollection, createVariantOptionsCollection, variantsFields } from "@payloadcms/plugin-ecommerce";
import { APIError, type CollectionConfig, type Field } from "payload";
import { commerceAdmin } from "../../lib/commerce/access";
import { commerceEditionVariantSchema } from "../../lib/commerce/editions";

const nativeAccess = { isAdmin: commerceAdmin, adminOrPublishedStatus: commerceAdmin, publicAccess: commerceAdmin };
const variants = createVariantsCollection({ access: nativeAccess, inventory: true,
  currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [
    { code: "KRW", decimals: 0, label: english.Staff.schema.koreanWon, symbol: "\u20a9" },
  ] },
});

/** Native schema registration only: plugin and client purchase variants remain disabled. */
export const CommerceEditionCollections: CollectionConfig[] = [
  { ...variants,
    access: { admin: commerceAdmin, create: commerceAdmin, read: commerceAdmin, update: commerceAdmin, delete: () => false },
    fields: [...variants.fields, { name: "publicationApproved", type: "checkbox", defaultValue: false,
      label: english.Staff.schema.editionDisplayApproved }],
    hooks: { ...variants.hooks, beforeChange: [async ({ data, originalDoc, req }) => {
      const productID = typeof data.product === "string" ? data.product : data.product?.id ?? originalDoc?.product;
      const previousProductID = typeof originalDoc?.product === "string" ? originalDoc.product : originalDoc?.product?.id;
      if (originalDoc?.id && productID !== previousProductID) throw new APIError("Variant parent identity is immutable", 409);
      const product = await req.payload.findByID({ collection: "products", id: productID,
        depth: 0, overrideAccess: true, req });
      if (Reflect.get(product, "commerceModel") !== "native-edition-v2") throw new APIError("Native edition parent required", 400);
      if (data._status === "published" && data.publicationApproved === true) {
        commerceEditionVariantSchema.parse({ ...originalDoc, ...data,
          id: originalDoc?.id ?? data.id ?? "new", updatedAt: new Date().toISOString() });
      }
      return { ...data, product: productID };
    }, ...(variants.hooks?.beforeChange ?? [])] },
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
