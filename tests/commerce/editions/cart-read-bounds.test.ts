import assert from "node:assert/strict";
import { test } from "node:test";
import { listCommerceEditionProducts } from "@/lib/commerce/editions";
import { cartEditionLookupLimit, loadCartEditionProducts, loadCartProducts } from "@/lib/commerce/cart-products";
import { nativeEditionsPayload as payload, readsOf } from "../../fixtures/commerce/native-editions-payload";

// Review-B, 26 Nov: one validated catalogue read per edition (4 Local API reads: product, variant type, variants,
// options), no catalogue enumeration to render a cart, and only the edition IDs actually in the cart.
test("the shop list reads each product's catalogue once: 1 + 4 reads per product", async () => {
  const fake = payload();
  const shop = await listCommerceEditionProducts(fake);
  assert.equal(shop.status === "displayable" && shop.products.length, 3);
  assert.equal(readsOf(fake).total(), 1 + 4 * 3);
});

test("the cart's up-front products make no native reads", async () => {
  const fake = payload();
  await loadCartProducts(fake);
  assert.equal(readsOf(fake).total(), 0);
});

test("an edition in the cart costs one catalogue read; repeats are deduped; bad or oversized input reads nothing", async () => {
  const one = payload();
  const products = await loadCartEditionProducts(one, ["book"]);
  assert.deepEqual(products.map((p) => [p.productID, p.kind, p.title, p.unitPriceKRW, p.maxQuantity, p.productHref]),
    [["book", "edition", "Book only", 35_000, 1, "/shop/products/book"]]);
  assert.equal(readsOf(one).total(), 4);

  const twice = payload();
  assert.equal((await loadCartEditionProducts(twice, ["book", "book"])).length, 1);
  assert.equal(readsOf(twice).total(), 4);

  for (const input of [Array.from({ length: cartEditionLookupLimit + 1 }, (_, i) => "id" + i), "book", [""], [" book"], ["x".repeat(65)], [1], null]) {
    const fake = payload();
    assert.deepEqual(await loadCartEditionProducts(fake, input), [], JSON.stringify(input));
    assert.equal(readsOf(fake).total(), 0, JSON.stringify(input));
  }
});

test("a failing edition read names nothing for it, keeps the other editions, and logs one fixed line", async (t) => {
  const logged: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args); });
  assert.deepEqual(await loadCartEditionProducts(payload({ dbFault: true }), ["book"]), []);
  assert.deepEqual(logged, [["Cart edition pricing is unavailable."]]);
  // One misconfigured product (missing variant type) drops out; the other ID in the same lookup is still named.
  const mixed = await loadCartEditionProducts(payload({ missingTypeFor: "personal" }), ["personal", "premium"]);
  assert.deepEqual(mixed.map((p) => p.productID), ["premium"]);
  // A non-native ID (the legacy membership product) is simply not an edition.
  assert.deepEqual(await loadCartEditionProducts(payload(), ["legacy-membership"]), []);
});

test("the membership loader logs one fixed line on a read failure instead of swallowing it", async (t) => {
  const logged: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args); });
  const failing = { async findGlobal() { throw new Error("database connection lost"); } } as unknown as Parameters<typeof loadCartProducts>[0];
  assert.deepEqual(await loadCartProducts(failing), []);
  assert.deepEqual(logged, [["Cart membership pricing is unavailable."]]);
});
