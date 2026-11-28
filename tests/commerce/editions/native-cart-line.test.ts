import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { resolveNativeCartLine } from "@/lib/commerce/native-cart-line";
import { nativeEditionsPayload as payload } from "../../fixtures/commerce/native-editions-payload";

// Owner, 27 Nov: editions go in the cart. The server fills an edition's one SKU, prices it from the published edition,
// and gives bundle editions their event so they share the one-membership-per-account allowance.
const during = Date.parse("2026-11-27T00:00:00.000Z");
const req = (fake = payload()) => ({ payload: fake }) as unknown as PayloadRequest;

test("a native line is filled and priced server-side; bundle editions carry their event, book-only none", async () => {
  assert.deepEqual(await resolveNativeCartLine(req(), "book", undefined, during),
    { productID: "book", variantID: "v-book", priceKRW: 35_000, accountLimit: null, eventID: null });
  assert.deepEqual(await resolveNativeCartLine(req(), "personal", null, during),
    { productID: "personal", variantID: "v-personal", priceKRW: 82_000, accountLimit: 1, eventID: "event-1" });
  assert.deepEqual(await resolveNativeCartLine(req(), "premium", "v-premium", during),
    { productID: "premium", variantID: "v-premium", priceKRW: 329_000, accountLimit: 1, eventID: "event-1" });
});

test("native cart uses the published product maximum without weakening the bundle allowance", async () => {
  for (const maximum of [null, 1, 6]) {
    const request = req(payload({ productMaximums: { book: maximum, personal: maximum } }));
    const book = await resolveNativeCartLine(request, "book", null, during);
    const bundle = await resolveNativeCartLine(request, "personal", null, during);
    assert.ok(book && book !== "legacy");
    assert.ok(bundle && bundle !== "legacy");
    assert.equal(book.accountLimit, maximum);
    assert.equal(bundle.accountLimit, 1);
  }
  assert.equal(await resolveNativeCartLine(req(payload({ productMaximums: { book: 1.5 } })), "book", null, during), null);
});

test("another product's SKU, a closed sale window or a misconfigured edition is refused", async () => {
  assert.equal(await resolveNativeCartLine(req(), "book", "v-premium", during), null);
  assert.equal(await resolveNativeCartLine(req(), "book", undefined, Date.parse("2025-06-01T00:00:00.000Z")), null);
  assert.equal(await resolveNativeCartLine(req(), "book", undefined, Date.parse("2027-01-01T00:00:00.000Z")), null);
  assert.equal(await resolveNativeCartLine(req(payload({ priceOffset: 1 })), "book", undefined, during), null);
});

test("a product that isn't a native edition goes to the legacy path", async () => {
  const legacy = { async find() { return { docs: [{ id: "m1", commerceModel: "legacy-v1" }], hasNextPage: false }; } };
  assert.equal(await resolveNativeCartLine({ payload: legacy } as unknown as PayloadRequest, "m1", undefined, during), "legacy");
  const none = { async find() { return { docs: [], hasNextPage: false }; } };
  assert.equal(await resolveNativeCartLine({ payload: none } as unknown as PayloadRequest, "gone", undefined, during), "legacy");
});
