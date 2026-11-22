import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { loadCommerceEditionOffer } from "@/lib/commerce/editions";
import { readNativeEditionQuote } from "@/lib/commerce/native-edition-quote";

const selection = { productID: "p", variantID: "v" };
const now = Date.parse("2026-11-18T00:00:00Z");
const variant = {
  id: "v", product: "p", options: ["o"], _status: "published", publicationApproved: true,
  priceInKRWEnabled: true, priceInKRW: 35000, inventory: 3, updatedAt: "variant-r1",
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
  approvedPublication = publication, verified = true, productTitle = "Book only",
  optionValue = "book-only", productID = "p", secondSKU = false, parentApproved = true,
}: {
  offerTerms?: unknown;
  sku?: typeof variant;
  reread?: typeof variant;
  approvedPublication?: typeof publication;
  verified?: boolean;
  productTitle?: string;
  optionValue?: string;
  productID?: string;
  secondSKU?: boolean;
  parentApproved?: boolean;
} = {}) {
  const nativeSelection = { ...selection, productID };
  const nativeSKU = { ...sku, product: productID };
  const nativeTerms = offerTerms === terms ? { ...terms, productID } : offerTerms;
  const req = {
    user: { collection: "users", id: "buyer", emailVerified: verified },
    payload: {
      collections: { products: {}, variants: {}, variantTypes: {}, variantOptions: {} },
      async findGlobal() { return approvedPublication; },
      async find({ collection, limit }: { collection: string; limit: number }) {
        const rows = {
          products: [{
            id: productID, commerceModel: "native-edition-v2", _status: "published", publicationApproved: parentApproved,
            title: productTitle, description: "Book description", images: [{ image: "img" }],
            variantTypes: ["type"], updatedAt: "parent-r1",
          }],
          variants: limit === 1 ? [{ ...reread, product: productID }] : [
            nativeSKU, ...(secondSKU ? [{ ...nativeSKU, id: "v2", options: ["o2"] }] : []),
          ],
          variantOptions: [
            { id: "o", variantType: "type", label: "Chosen Edition", value: optionValue, updatedAt: "o1" },
            ...(secondSKU ? [{ id: "o2", variantType: "type", label: "Another Edition", value: "premium", updatedAt: "o2" }] : []),
          ],
        };
        return { docs: rows[collection as keyof typeof rows] ?? [] };
      },
      async findByID({ collection }: { collection: string }) {
        return collection === "variantTypes" ? { id: "type", name: "edition" } : undefined;
      },
    },
  } as unknown as PayloadRequest;
  return {
    offer: (id = productID) => loadCommerceEditionOffer(req.payload, id, req),
    quote: (input: unknown = nativeSelection, at = now) =>
      readNativeEditionQuote(req, input, async () => nativeTerms, at),
  };
}

test("quote charges only configured KRW and records the explicitly chosen native edition", async () => {
  const quote = await fixture().quote();
  assert.equal(quote?.customerID, "buyer");
  assert.equal(quote?.releaseID, "p");
  assert.equal(quote?.edition.variantID, "v");
  assert.equal(quote?.edition.label, "Chosen Edition");
  assert.equal(quote?.totalAmount, 35500);
  assert.equal(quote?.publicationVersion, "publication-r1");
  assert.equal(await fixture().quote({ ...selection, unitAmount: 1 }), null);
  assert.equal(await fixture().quote({ ...selection, variantID: "other" }), null);
  assert.equal(await fixture().quote({ ...selection, productID: "other" }), null);
});

for (const [editionKind, productTitle, priceKRW, bundle] of [
  ["book-only", "Book only", 35000, false],
  ["personal", "Édition personnelle", 82000, true],
  ["premium", "Premium", 329000, true],
] as const) {
  test(`server offer and quote agree for ${editionKind}, without granting keys`, async () => {
    const productID = `product-${editionKind}`;
    const { offer, quote } = fixture({
      productID, optionValue: editionKind, productTitle, sku: { ...variant, priceInKRW: priceKRW },
    });
    const published = await offer();
    assert.ok(published);
    assert.equal(published.productID, productID);
    assert.equal(published.title, productTitle);
    assert.equal(published.priceKRW, priceKRW);
    assert.equal(published.maximumQuantity, 1);
    assert.equal(published.editionRuleVersion, 1);
    assert.equal(published.purchaseReady, false);
    assert.deepEqual(published.editionEntitlements, { membershipSignet: bundle, freeLaunchTicket: bundle });
    const quoted = await quote();
    assert.ok(quoted);
    assert.equal(quoted.productID, published.productID);
    assert.equal(quoted.productName, published.title);
    assert.equal(quoted.unitAmount, published.priceKRW);
    assert.equal(quoted.maximumQuantity, published.maximumQuantity);
    assert.equal(quoted.editionRuleVersion, published.editionRuleVersion);
    assert.deepEqual(quoted.editionEntitlements, published.editionEntitlements);
    assert.equal(await quote({ productID, variantID: "v", editionEntitlements: { membershipSignet: true } }), null);
  });
}

test("offer refuses unknown products, unapproved rows, ambiguous SKUs and mismatched rule prices", async () => {
  assert.equal(await fixture().offer("wrong-product"), null);
  for (const scenario of [
    fixture({ optionValue: "not-an-edition" }),
    fixture({ parentApproved: false }),
    fixture({ secondSKU: true }),
    fixture({ optionValue: "personal" }),
  ]) {
    assert.equal(await scenario.offer(), null);
    assert.equal(await scenario.quote(), null);
  }
});

test("missing terms, publication, verified member, SKU price or stock never open a quote", async () => {
  assert.equal(await fixture({ offerTerms: null }).quote(), null);
  assert.equal(await fixture({ offerTerms: { ...terms, variantID: "other" } }).quote(), null);
  assert.equal(await fixture({ verified: false }).quote(), null);
  assert.equal(await fixture({ approvedPublication: { ...publication, publicationApproved: false } }).quote(), null);
  assert.equal(await fixture({ sku: { ...variant, inventory: 0 } }).quote(), null);
  assert.equal(await fixture({ sku: { ...variant, priceInKRWEnabled: false } }).quote(), null);
  assert.equal(await fixture({ reread: { ...variant, updatedAt: "changed" } }).quote(), null);
  assert.equal(await fixture({ reread: { ...variant, publicationApproved: false } }).quote(), null);
  assert.equal(await fixture({ reread: { ...variant, priceInKRW: 82000 } }).quote(), null);
  assert.equal(await fixture().quote(selection, Date.parse(terms.saleEndsAt)), null);
  assert.equal(await fixture({ offerTerms: { ...terms, shippingAmount: Number.MAX_SAFE_INTEGER } }).quote(), null);
});
