import type { PayloadRequest, Where } from "payload";
import { loadCommerceEditionOffer } from "../../src/lib/commerce/editions";
import { inCommerceTransaction, lockCommerce, relationshipID } from "../../src/lib/commerce/_shared/transaction";
import { serverChosenIDContext } from "../../src/payload/server-chosen-ids";

const seedID = (suffix: string) => `9db9f279-44d3-442a-9d22-008c26d0${suffix}`;
const editions = [
  { kind: "book-only", title: "Book only", price: 35000, bundle: false, suffix: "1" },
  { kind: "personal", title: "\u00e9dition personnelle", price: 82000, bundle: true, suffix: "2" },
  { kind: "premium", title: "Premium", price: 329000, bundle: true, suffix: "3" },
] as const;
const description = "PREVIEW edition offer fixture. Not for sale.";

function requireFixture(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Entry point is the existing seed's admitted, isolated preview lease only. */
export async function seedPreviewEditionOffers(req: PayloadRequest, dependencies: { media: string; editionType: string }) {
  const local = { req, overrideAccess: true, depth: 0 } as const;
  const byID = (id: string): Where => ({ id: { equals: id } });
  await inCommerceTransaction(req, async () => {
    await lockCommerce(req, ["preview-edition-offers"]);
    for (const edition of editions) {
      const id = seedID(`010${edition.suffix}`), option = seedID(`020${edition.suffix}`);
      const found = await req.payload.find({ ...local, collection: "products", draft: true, limit: 2,
        where: { or: [byID(id), { title: { equals: edition.title } }] } });
      const options = await req.payload.find({ ...local, collection: "variantOptions", limit: 2,
        where: { or: [byID(option), { and: [{ variantType: { equals: dependencies.editionType } }, { value: { equals: edition.kind } }] }] } });
      const product = found.docs[0];
      requireFixture(found.totalDocs === 0 || (found.totalDocs === 1 && product?.id === id && product.title === edition.title &&
        product.description === description && product._status === "published" && product.publicationApproved &&
        product.commerceModel === "native-edition-v2" && product.variantTypes?.length === 1 &&
        relationshipID(product.variantTypes[0]) === dependencies.editionType &&
        product.images?.length === 1 && relationshipID(product.images[0].image) === dependencies.media), "Unexpected existing edition product; no replacement attempted.");
      const existingOption = options.docs[0];
      requireFixture(options.totalDocs === 0 || (options.totalDocs === 1 && existingOption?.id === option &&
        existingOption.label === edition.title && existingOption.value === edition.kind &&
        relationshipID(existingOption.variantType) === dependencies.editionType), "Unexpected existing edition option; no replacement attempted.");
      if (!product) await req.payload.create({ ...local, collection: "products", draft: false, context: serverChosenIDContext(id),
        data: { id, title: edition.title, description, _status: "published", publicationApproved: true,
          commerceModel: "native-edition-v2", images: [{ image: dependencies.media }], variantTypes: [dependencies.editionType] } });
      if (!existingOption) await req.payload.create({ ...local, collection: "variantOptions", context: serverChosenIDContext(option),
        data: { id: option, label: edition.title, value: edition.kind, variantType: dependencies.editionType } });
    }
  });

  // Payload's variant hook uses a separate read of its product/options. Those
  // dependencies must commit before the second transaction.
  await inCommerceTransaction(req, async () => {
    await lockCommerce(req, ["preview-edition-offers"]);
    for (const edition of editions) {
      const productID = seedID(`010${edition.suffix}`), optionID = seedID(`020${edition.suffix}`), id = seedID(`030${edition.suffix}`);
      const rows = await req.payload.find({ ...local, collection: "variants", draft: true, limit: 2,
        where: { or: [byID(id), { product: { equals: productID } }] } });
      const sku = rows.docs[0];
      requireFixture(rows.totalDocs === 0 || (rows.totalDocs === 1 && sku?.id === id && sku._status === "published" &&
        sku.publicationApproved && relationshipID(sku.product) === productID && sku.options.length === 1 &&
        relationshipID(sku.options[0]) === optionID && sku.priceInKRWEnabled && sku.priceInKRW === edition.price),
      "Unexpected existing edition SKU; no replacement attempted.");
      if (!sku) await req.payload.create({ ...local, collection: "variants", draft: false, context: serverChosenIDContext(id),
        data: { id, product: productID, options: [optionID], _status: "published", publicationApproved: true,
          priceInKRWEnabled: true, priceInKRW: edition.price, inventory: 3 } });
      const offer = await loadCommerceEditionOffer(req.payload, productID, req);
      requireFixture(offer?.title === edition.title && offer.priceKRW === edition.price &&
        offer.maximumQuantity === 1 && offer.editionEntitlements.membershipSignet === edition.bundle &&
        offer.editionEntitlements.freeLaunchTicket === edition.bundle && offer.purchaseReady === false,
      "Seeded edition does not match the E1 checkout contract.");
    }
  });
  return editions.map(({ suffix, title }) => ({ productID: seedID(`010${suffix}`), title }));
}
