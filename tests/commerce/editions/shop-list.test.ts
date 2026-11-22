import assert from "node:assert/strict";
import { test } from "node:test";
import { listCommerceEditionProducts } from "@/lib/commerce/editions";
import { nativeEditionsPayload as payload } from "../../fixtures/commerce/native-editions-payload";

// Owner: each edition is its own product (no picker). The shop lists every published native product through the real
// per-product loaders; one misconfigured product drops out on its own.
test("the shop lists the three products separately, by price, with E1's facts", async () => {
  const shop = await listCommerceEditionProducts(payload());
  assert.equal(shop.status, "displayable");
  if (shop.status !== "displayable") return;
  assert.deepEqual(shop.products.map(({ product, offer }) => [product.title, offer.priceKRW, offer.maximumQuantity,
    offer.editionEntitlements.membershipSignet, offer.editionEntitlements.freeLaunchTicket, offer.purchaseReady]), [
    ["Book only", 35_000, 1, false, false, false],
    ["Édition personnelle", 82_000, 1, true, true, false],
    ["Premium edition", 329_000, 1, true, true, false],
  ]);
});

test("a product whose variant type is missing drops out on its own; a database fault is not swallowed", async () => {
  const shop = await listCommerceEditionProducts(payload({ missingTypeFor: "personal" }));
  assert.equal(shop.status, "displayable");
  assert.deepEqual(shop.status === "displayable" && shop.products.map(({ product }) => product.title), ["Book only", "Premium edition"]);
  await assert.rejects(listCommerceEditionProducts(payload({ dbFault: true })), /database connection lost/);
});

test("a mispriced product drops out on its own; overflow and a missing schema fail closed", async () => {
  const shop = await listCommerceEditionProducts(payload({ extra: [{ id: "wrong", title: "Wrong", value: "premium", price: 1 }] }));
  assert.equal(shop.status === "displayable" && shop.products.length, 3);
  assert.equal((await listCommerceEditionProducts(payload({ hasNextPage: true }))).status, "unavailable");
  // Every product misconfigured: an unavailable shop, not an empty one.
  const broken = await listCommerceEditionProducts(payload({ priceOffset: 1 }));
  assert.equal(broken.status === "unavailable" && broken.reason, "invalid-configuration");
  const none = await listCommerceEditionProducts(payload({ schema: false }));
  assert.equal(none.status === "unavailable" && none.reason, "native-schema-unregistered");
});
