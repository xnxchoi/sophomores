import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
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

test("cart writes accept quantity 1 only", async () => {
  const config = await commercePlugin({ collections: [], endpoints: [], secret: randomUUID(),
    db: postgresAdapter({ pool: { connectionString: "postgres://localhost/commerce_test" } }) });
  const carts = config.collections!.find((entry) => entry.slug === "carts")!;
  const hook = carts.hooks!.beforeChange![0];
  let reads = 0;
  const req = { user, transactionID: "tx", payload: {
    db: { name: "postgres", sessions: { tx: { db: { execute: async () => undefined } } } },
    find: async () => { reads++; throw new Error("catalogue read"); },
  } } as unknown as PayloadRequest;
  await withCommerceWrite(req, async () => {
    await assert.rejects(hook({ req, operation: "create", data: { customer: "owner", items: [{ product: "product", quantity: 2 }] } } as never), /one unit/i);
  });
  assert.equal(reads, 0);
});

test("stored snapshots with quantity above 1 still parse", () => {
  const snapshot = { version: 1, customerID: "c", cartID: "cart", productID: "p", eventID: "e", releaseID: "p",
    quantity: 2, currency: "KRW", unitAmount: 10000, shippingAmount: 3000, totalAmount: 23000, orderName: "Older order",
    shippingAddress, productVersion: "v1", eventVersion: "v1" };
  assert.equal(commerceSnapshotSchema.parse(snapshot).quantity, 2);
  assert.equal(commerceSnapshotSchema.parse({ ...snapshot, quantity: 3, totalAmount: 33000 }).quantity, 3);
});

test("shop checkout shows no quantity picker", () => {
  const source = readFileSync("src/components/commerce/checkout.tsx", "utf8");
  assert.equal(/incrementItem|decrementItem/.test(source), false);
  assert.equal(/maximumQuantity/.test(source), false);
});
