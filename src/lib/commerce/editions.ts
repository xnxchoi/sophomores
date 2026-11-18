import { z } from "zod";
import type { CollectionSlug, Payload, PayloadRequest } from "payload";

const relation = z.union([z.string().min(1), z.object({ id: z.string().min(1) })])
  .transform((value) => typeof value === "string" ? value : value.id);

export const commerceEditionProductSchema = z.object({
  id: z.string().min(1), commerceModel: z.literal("native-edition-v2"),
  _status: z.literal("published"), publicationApproved: z.literal(true),
  title: z.string().trim().min(1), description: z.string().trim().min(1),
  images: z.array(z.object({ image: z.union([
    z.string().min(1), z.object({ id: z.string().min(1), url: z.string().optional(), alt: z.string().nullish() }),
  ]) })).min(1),
  variantTypes: z.tuple([relation]), updatedAt: z.string().min(1),
});

export const commerceEditionVariantSchema = z.object({
  id: z.string().min(1), product: relation, options: z.tuple([relation]),
  _status: z.literal("published"), publicationApproved: z.literal(true),
  priceInKRWEnabled: z.boolean().nullish(), priceInKRW: z.int().min(1).nullish(),
  updatedAt: z.string().min(1),
}).refine((variant) => variant.priceInKRWEnabled !== true || variant.priceInKRW != null);

export type CommerceEditionCatalogue = Readonly<{
  status: "unavailable";
  reason: "native-schema-unregistered" | "product-unpublished" | "product-ambiguous" | "invalid-configuration" | "editions-unpublished";
  purchaseReady: false;
}> | Readonly<{
  status: "displayable";
  product: Readonly<{
    productID: string; releaseID: string; title: string; description: string;
    images: z.infer<typeof commerceEditionProductSchema>["images"]; productVersion: string;
  }>;
  editions: readonly Readonly<{
    variantID: string; optionID: string; variantTypeID: string;
    label: string; value: string; priceKRW: number | null; variantVersion: string;
  }>[];
  purchaseReady: false;
}>;

/** Published display facts only. Native variant identity is not a legacy offer or a financial quote. */
export async function loadPublishedCommerceEditions(
  payload: Payload, req?: PayloadRequest, productID?: string,
): Promise<CommerceEditionCatalogue> {
  // Old checkouts have no native collections. Do not query a cast-only fictional schema.
  if (!["products", "variants", "variantTypes", "variantOptions"].every((slug) => Object.hasOwn(payload.collections, slug))) {
    return { status: "unavailable", reason: "native-schema-unregistered", purchaseReady: false };
  }
  const products = await payload.find({ collection: "products" as CollectionSlug,
    draft: false, depth: 1, limit: 2, overrideAccess: true, req,
    where: { and: [
      { commerceModel: { equals: "native-edition-v2" } },
      { _status: { equals: "published" } }, { publicationApproved: { equals: true } },
      ...(productID ? [{ id: { equals: productID } }] : []),
    ] },
  });
  if (products.docs.length === 0) return { status: "unavailable", reason: "product-unpublished", purchaseReady: false };
  if (products.docs.length !== 1) return { status: "unavailable", reason: "product-ambiguous", purchaseReady: false };
  const product = commerceEditionProductSchema.safeParse(products.docs[0]);
  if (!product.success) return { status: "unavailable", reason: "invalid-configuration", purchaseReady: false };
  const variantTypeID = product.data.variantTypes[0];
  const type = z.object({ id: z.literal(variantTypeID), name: z.literal("edition") }).safeParse(
    await payload.findByID({ collection: "variantTypes" as CollectionSlug, id: variantTypeID,
      depth: 0, overrideAccess: true, req }),
  );
  if (!type.success) return { status: "unavailable", reason: "invalid-configuration", purchaseReady: false };
  const variants = await payload.find({ collection: "variants" as CollectionSlug,
    draft: false, depth: 0, limit: 50, sort: "id", overrideAccess: true, req,
    where: { and: [{ product: { equals: product.data.id } },
      { _status: { equals: "published" } }, { publicationApproved: { equals: true } }] },
  });
  if (variants.hasNextPage) return { status: "unavailable", reason: "invalid-configuration", purchaseReady: false };
  if (!variants.docs.length) return { status: "unavailable", reason: "editions-unpublished", purchaseReady: false };
  const parsed = z.array(commerceEditionVariantSchema).safeParse(variants.docs);
  if (!parsed.success || parsed.data.some((variant) => variant.product !== product.data.id)) {
    return { status: "unavailable", reason: "invalid-configuration", purchaseReady: false };
  }
  const optionIDs = parsed.data.map((variant) => variant.options[0]);
  const options = await payload.find({ collection: "variantOptions" as CollectionSlug,
    depth: 0, limit: 50, overrideAccess: true, req,
    where: { and: [{ id: { in: optionIDs } }, { variantType: { equals: variantTypeID } }] },
  });
  const optionFacts = z.array(z.object({ id: z.string().min(1), variantType: relation,
    label: z.string().trim().min(1), value: z.string().trim().min(1), updatedAt: z.string().min(1),
  })).safeParse(options.docs);
  if (!optionFacts.success || options.hasNextPage || new Set(optionIDs).size !== optionIDs.length
    || optionFacts.data.length !== optionIDs.length
    || optionFacts.data.some((option) => option.variantType !== variantTypeID || !optionIDs.includes(option.id))
    || new Set(optionFacts.data.map((option) => option.value)).size !== optionIDs.length) {
    return { status: "unavailable", reason: "invalid-configuration", purchaseReady: false };
  }
  const byID = new Map(optionFacts.data.map((option) => [option.id, option]));
  const editions = parsed.data.map((variant) => {
    const option = byID.get(variant.options[0])!;
    return { variantID: variant.id, optionID: option.id, variantTypeID,
      label: option.label, value: option.value,
      priceKRW: variant.priceInKRWEnabled === true ? variant.priceInKRW! : null,
      variantVersion: variant.updatedAt };
  });
  return { status: "displayable", purchaseReady: false,
    product: { productID: product.data.id, releaseID: product.data.id,
      title: product.data.title, description: product.data.description,
      images: product.data.images, productVersion: product.data.updatedAt }, editions };
}
