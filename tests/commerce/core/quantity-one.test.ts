import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, type TestContext } from "node:test";
import { postgresAdapter } from "@payloadcms/db-postgres";
import type { PayloadRequest } from "payload";
import { buildCommerceSnapshot } from "@/lib/commerce/catalogue";
import { commerceSnapshotSchema } from "@/lib/commerce/contracts";
import { commercePlugin } from "@/lib/commerce/ecommerce";
import { withCommerceWrite } from "@/lib/commerce/access";

const shippingAddress = { country: "KR" as const, recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" };
const user = { id: "owner", collection: "users" };

test("initiation rejects a quantity-2 cart before reading the catalogue", async () => {
  let reads = 0;
  const req = { user, payload: { find: async () => { reads++; throw new Error("catalogue read"); },
    findGlobal: async () => { reads++; throw new Error("catalogue read"); } } } as unknown as PayloadRequest;
  const cart = { id: "cart", customer: "owner", currency: "KRW", items: [{ product: "product", quantity: 2 }] };
  await assert.rejects(buildCommerceSnapshot({ req, cart, shippingAddress }), /one unit/i);
  assert.equal(reads, 0);
});

test("an unmarked legacy cart line still rejects quantity 2 before loading legacy offer terms", async () => {
  const config = await commercePlugin({ collections: [], endpoints: [], secret: randomUUID(),
    db: postgresAdapter({ pool: { connectionString: "postgres://localhost/commerce_test" } }) });
  const carts = config.collections!.find((entry) => entry.slug === "carts")!;
  const hook = carts.hooks!.beforeChange![0];
  let reads = 0;
  const req = { user, transactionID: "tx", payload: {
    db: { name: "postgres", sessions: { tx: { db: { execute: async () => undefined } } } },
    find: async () => { reads++; return { docs: [{ id: "product", commerceModel: "legacy-v1" }] }; },
    findGlobal: async () => { reads++; throw new Error("legacy offer read"); },
  } } as unknown as PayloadRequest;
  await withCommerceWrite(req, async () => {
    await assert.rejects(hook({ req, operation: "create", data: { customer: "owner", items: [{ product: "product", quantity: 2 }] } } as never), /one unit/i);
  });
  assert.equal(reads, 1);
});

test("a multi-unit marker cannot send a variant or more than two guests to the catalogue", async t => {
  configureSharedGuest(t, true);
  let reads = 0;
  const req = { user, payload: { findGlobal: async () => { reads++; throw new Error("catalogue read"); } } } as unknown as PayloadRequest;
  const cart = { id: "cart", customer: "owner", currency: "KRW" };
  for (const [item, error] of [
    [{ product: "guest", quantity: 2, ticketKind: "guest" }, /one unit/i],
    [{ product: "guest", quantity: 2, ticketKind: "shared-event-guest", variant: "sku" }, /one unit/i],
    [{ product: "guest", quantity: 3, ticketKind: "shared-event-guest" }, /two guest/i],
  ] as const) {
    await assert.rejects(buildCommerceSnapshot({ req, cart: { ...cart, items: [item] }, shippingAddress }), error);
  }
  assert.equal(reads, 0);
});

function configureSharedGuest(t: TestContext, enabled: boolean) {
  const settings = { UNLOCK_SHARED_TICKET_EVENT_ID: enabled ? "event" : undefined, UNLOCK_SHARED_TICKET_GUEST_PRODUCT_ID: "guest" };
  for (const [key, value] of Object.entries(settings)) {
    const previous = process.env[key];
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

for (const enabled of [false, true]) {
  test(`an exact Guest marker cannot read catalogue state for ${enabled ? "a different product" : "a dormant event"}`, async t => {
    configureSharedGuest(t, enabled);
    const config = await commercePlugin({ collections: [], endpoints: [], secret: randomUUID(),
      db: postgresAdapter({ pool: { connectionString: "postgres://localhost/commerce_test" } }) });
    const hook = config.collections!.find(entry => entry.slug === "carts")!.hooks!.beforeChange![0];
    let reads = 0;
    const read = async () => { reads++; throw new Error("catalogue read"); };
    const req = { user, transactionID: "tx", payload: { findGlobal: read, find: read, findByID: read } } as unknown as PayloadRequest;
    const items = [{ product: enabled ? "membership" : "guest", quantity: 2, ticketKind: "shared-event-guest" }];
    await Promise.all([
      assert.rejects(buildCommerceSnapshot({ req, cart: { id: "cart", customer: "owner", currency: "KRW", items }, shippingAddress }), /one unit/i),
      withCommerceWrite(req, () =>
        assert.rejects(hook({ req, operation: "create", data: { customer: "owner", items } } as never), /one unit/i)),
    ]);
    assert.equal(reads, 0);
  });
}

test("a snapshot is checked against the account limit it recorded", () => {
  const snapshot = { version: 1, customerID: "c", cartID: "cart", productID: "p", eventID: "e", releaseID: "membership" as const, accountLimit: 1,
    quantity: 2, currency: "KRW", unitAmount: 10000, shippingAmount: 3000, totalAmount: 23000, orderName: "Order",
    shippingAddress, productVersion: "v1", eventVersion: "v1" };
  assert.throws(() => commerceSnapshotSchema.parse(snapshot), /recorded account limit/);
  // A later rule recorded on its own snapshot stays valid; no global constant applies.
  assert.equal(commerceSnapshotSchema.parse({ ...snapshot, accountLimit: 3 }).quantity, 2);
  assert.equal(commerceSnapshotSchema.parse({ ...snapshot, accountLimit: 3, quantity: 3, totalAmount: 33000 }).quantity, 3);
  assert.throws(() => commerceSnapshotSchema.parse({ ...snapshot, accountLimit: 3, releaseID: "p" }));
  // Storage holds at most three units per order, so the recorded range is 1-3.
  assert.throws(() => commerceSnapshotSchema.parse({ ...snapshot, accountLimit: 4 }));
  assert.throws(() => commerceSnapshotSchema.parse({ ...snapshot, accountLimit: 3, quantity: 4, totalAmount: 43000 }));
});

test("shop checkout shows no quantity picker", () => {
  const source = readFileSync("src/components/commerce/checkout.tsx", "utf8");
  assert.equal(/incrementItem|decrementItem/.test(source), false);
  assert.equal(/maximumQuantity/.test(source), false);
});
