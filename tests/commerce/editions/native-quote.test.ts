import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { readNativeEditionQuote } from "@/lib/commerce/native-edition-quote";

const selection = { productID: "p", variantID: "v" };
const now = Date.parse("2026-11-18T00:00:00Z");
const variant = {
  id: "v", product: "p", options: ["o"], _status: "published", publicationApproved: true,
  priceInKRWEnabled: true, priceInKRW: 1000, inventory: 3, updatedAt: "variant-r1",
};
const terms = {
  productID: "p", variantID: "v", revision: "terms-r1",
  disclosureRevision: "disclosure-r1", fulfillmentRevision: "fulfillment-r1", benefitRevision: "benefits-r1",
  saleStartsAt: "2026-11-17T00:00:00Z", saleEndsAt: "2026-11-19T00:00:00Z", shippingCountry: "KR", shippingAmount: 500,
};
const policy = {
  effectiveDate: "2000-01-01", sections: [{ heading: "Fixture", paragraphs: ["Synthetic."] }],
};
const publication = {
  _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true,
  addressRetentionApproved: true, shippingCountries: ["KR"], updatedAt: "publication-r1",
  disclosure: {
    seller: {
      name: "Fixture", representative: "Fixture", address: "Fixture address", phone: "02-1234-5678",
      registrationNumber: "123-45-67890",
    },
    policies: { terms: policy, privacy: policy, refund: policy },
  },
};
function fixture({
  offerTerms = terms as unknown, sku = variant, reread = sku,
  approvedPublication = publication, verified = true,
}: {
  offerTerms?: unknown;
  sku?: typeof variant;
  reread?: typeof variant;
  approvedPublication?: typeof publication;
  verified?: boolean;
} = {}) {
  const req = {
    user: { collection: "users", id: "buyer", emailVerified: verified },
    payload: {
      collections: { products: {}, variants: {}, variantTypes: {}, variantOptions: {} },
      async findGlobal() { return approvedPublication; },
      async find({ collection }: { collection: string }) {
        const rows = {
          products: [{
            id: "p", commerceModel: "native-edition-v2", _status: "published", publicationApproved: true,
            title: "Book", description: "Book description", images: [{ image: "img" }],
            variantTypes: ["type"], updatedAt: "parent-r1",
          }],
          variants: [sku],
          variantOptions: [{ id: "o", variantType: "type", label: "Chosen Edition", value: "edition", updatedAt: "o1" }],
        };
        return { docs: rows[collection as keyof typeof rows] ?? [] };
      },
      async findByID({ collection }: { collection: string }) {
        return collection === "variantTypes" ? { id: "type", name: "edition" } : reread;
      },
    },
  } as unknown as PayloadRequest;
  return {
    quote: (input: unknown = selection, at = now) =>
      readNativeEditionQuote(req, input, async () => offerTerms, at),
  };
}

test("quote charges only configured KRW and records the explicitly chosen native edition", async () => {
  const quote = await fixture().quote();
  assert.equal(quote?.customerID, "buyer");
  assert.equal(quote?.releaseID, "p");
  assert.equal(quote?.edition.variantID, "v");
  assert.equal(quote?.edition.label, "Chosen Edition");
  assert.equal(quote?.totalAmount, 1500);
  assert.equal(quote?.publicationVersion, "publication-r1");
  assert.equal(await fixture().quote({ ...selection, unitAmount: 1 }), null);
  assert.equal(await fixture().quote({ ...selection, variantID: "other" }), null);
  assert.equal(await fixture().quote({ ...selection, productID: "other" }), null);
});

test("missing terms, publication, verified member, SKU price or stock never open a quote", async () => {
  assert.equal(await fixture({ offerTerms: null }).quote(), null);
  assert.equal(await fixture({ offerTerms: { ...terms, variantID: "other" } }).quote(), null);
  assert.equal(await fixture({ verified: false }).quote(), null);
  assert.equal(await fixture({ approvedPublication: { ...publication, publicationApproved: false } }).quote(), null);
  assert.equal(await fixture({ sku: { ...variant, inventory: 0 } }).quote(), null);
  assert.equal(await fixture({ sku: { ...variant, priceInKRWEnabled: false } }).quote(), null);
  assert.equal(await fixture({ reread: { ...variant, updatedAt: "changed" } }).quote(), null);
  assert.equal(await fixture().quote(selection, Date.parse(terms.saleEndsAt)), null);
  assert.equal(await fixture({ offerTerms: { ...terms, shippingAmount: Number.MAX_SAFE_INTEGER } }).quote(), null);
});
