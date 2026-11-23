import type { CollectionSlug, Payload } from "payload";

/**
 * The product page's content read (its `page` group, for the product and its shelf), server only.
 *
 * Published, approved products only, stated in the query, as the edition loaders do (lib/commerce/editions.ts). Access
 * is overridden on purpose: anonymous product reads open only once the commerce-publication global is approved, and the
 * page shows before purchasing opens. Only the page group is read. tests/commerce/core/product-page-display.db.test.ts
 * proves that nothing unpublished, unapproved or drafted comes back, with sales closed.
 */
export async function loadProductPageDocuments(payload: Payload, ids: readonly string[]): Promise<unknown[]> {
  const result = await payload.find({ collection: "products" as CollectionSlug, depth: 1, limit: 20, pagination: false,
    draft: false, overrideAccess: true, select: { page: true },
    where: { and: [{ id: { in: [...new Set(ids)] } }, { _status: { equals: "published" } }, { publicationApproved: { equals: true } }] } });
  return result.docs as unknown[];
}
