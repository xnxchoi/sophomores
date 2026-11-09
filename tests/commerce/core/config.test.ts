import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { postgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionConfig, Config, Field, PayloadRequest } from "payload";
import { commercePlugin } from "../../../src/lib/commerce/ecommerce";
import { withCommerceWrite } from "../../../src/lib/commerce/access";

async function config() { return commercePlugin({ collections: [], endpoints: [], secret: randomUUID(), db: postgresAdapter({ pool: { connectionString: "postgres://localhost/commerce_test" } }) }); }
const collection = (config: Config, slug: string): CollectionConfig => {
  const found = config.collections?.find((entry) => entry.slug === slug);
  assert.ok(found);
  return found;
};
function named(fields: Field[], name: string): Field | undefined {
  for (const field of fields) {
    if ("name" in field && field.name === name) return field;
    if ("fields" in field) { const result = named(field.fields, name); if (result) return result; }
    if (field.type === "tabs") for (const tab of field.tabs) { const result = named(tab.fields, name); if (result) return result; }
  }
}

test("official plugin owns exactly one catalogue/cart/order/transaction; variants and address book disabled", async () => {
  const result = await config();
  for (const slug of ["products", "carts", "orders", "transactions"]) assert.equal(result.collections?.filter((entry) => entry.slug === slug).length, 1);
  assert.equal(result.collections?.some((entry) => ["variants", "variantTypes", "variantOptions"].includes(entry.slug)), false);
  const addresses = collection(result, "addresses");
  for (const action of ["create", "read", "update", "delete"] as const) assert.equal(await addresses.access![action]!({ req: {} } as never), false);
  const cartEndpoints = collection(result, "carts").endpoints;
  assert.equal(cartEndpoints && cartEndpoints.some((endpoint) => endpoint.path.includes("merge")), false);
  for (const slug of ["orders", "transactions"]) {
    assert.equal(await collection(result, slug).access!.create!({ req: { user: { collection: "users", role: "admin" } } } as never), false);
    assert.equal(await collection(result, slug).access!.delete!({ req: { user: { collection: "admins", role: "admin", _strategy: "staff-better-auth" } } } as never), false);
  }
});

test("orders retain legacy evidence without making legacy fields required on plugin orders", async () => {
  const orders = collection(await config(), "orders");
  for (const name of ["user", "ticketQuantity", "totalAmount", "paymentProvider", "paymentReference", "prepareKey", "prepareFingerprint"]) {
    const field = named(orders.fields, name);
    assert.ok(field && "required" in field && field.required === false, name);
  }
  const discriminator = named(orders.fields, "commerceVersion");
  assert.ok(discriminator && "defaultValue" in discriminator && discriminator.defaultValue === "legacy");
  const currency = named(orders.fields, "currency");
  assert.ok(currency?.type === "select" && currency.options.some((option) => typeof option === "string" ? option === "USD" : option.value === "USD"));
  const hook = orders.hooks!.beforeChange!.at(-1)!;
  const req = {} as PayloadRequest;
  await assert.rejects(async () => hook({ req, operation: "create", data: { commerceVersion: "commerce-v1" } } as never));
  await withCommerceWrite(req, async () => {
    await assert.rejects(async () => hook({ req, operation: "update", data: { status: "paid" }, originalDoc: { commerceVersion: "legacy" } } as never));
  });
});

test("generated payment requests cannot use forged body/context to bypass browser security", async () => {
  const result = await config();
  const initiate = result.endpoints?.find((endpoint) => endpoint.path === "/payments/portone/initiate");
  assert.ok(initiate);
  const request = new Request("https://attacker.example/api/payments/portone/initiate", { method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: JSON.stringify({ commerceWrite: true }) });
  const response = await initiate.handler(Object.assign(request, { context: { commerceWrite: true }, user: { collection: "users", id: "fake", role: "admin" } }) as unknown as PayloadRequest);
  assert.ok(response instanceof Response);
  assert.ok([403, 503].includes(response.status));
  assert.equal((await response.json()).success, false);
});

test("terminal transactions accept durable risk hold but never clear it or regress settlement", async () => {
  const transactions = collection(await config(), "transactions");
  const hook = transactions.hooks!.beforeChange!.at(-1)!;
  const req = {} as PayloadRequest;
  await withCommerceWrite(req, async () => {
    const data = { commerceReviewHold: true };
    assert.deepEqual(await hook({ req, operation: "update", originalDoc: { status: "succeeded" }, data } as never), data);
    for (const changed of [{ status: "pending" }, { commerceReviewHold: false }]) {
      await assert.rejects(async () => hook({ req, operation: "update", originalDoc: { status: "succeeded", commerceReviewHold: true }, data: changed } as never));
    }
  });
});

test("own reserved sold-out cart can be purchased without repricing or a fresh stock check", async () => {
  const carts = collection(await config(), "carts");
  const hook = carts.hooks!.beforeChange![0];
  let queries = 0;
  const req = { user: { id: "owner", collection: "users" }, transactionID: "tx", payload: {
    db: { name: "postgres", sessions: { tx: { db: { execute: async () => undefined } } } },
    findByID: async () => originalDoc,
    find: async () => { queries++; throw new Error("Settlement must not reprice"); },
  } } as unknown as PayloadRequest;
  const originalDoc = { id: "cart", customer: "owner", subtotal: 3000, items: [{ product: "sold-out", quantity: 3 }] };
  const purchasedAt = "2026-11-09T00:00:00Z";
  await withCommerceWrite(req, async () => {
    const result = await hook({ req, operation: "update", originalDoc, data: { purchasedAt } } as never);
    assert.equal(result.purchasedAt, purchasedAt);
    assert.equal(result.subtotal, originalDoc.subtotal);
    assert.deepEqual(result.items, originalDoc.items);
  });
  assert.equal(queries, 0);
});

test("admin inventory cannot fall below fresh reservations after waiting for the product lock", async () => {
  const products = collection(await config(), "products");
  const hook = products.hooks!.beforeChange!.at(-1)!;
  const capture = products.hooks!.beforeOperation![0];
  const operations: string[] = [];
  const current = { id: "product", event: "event", _status: "draft", inventory: 4, reservedQuantity: 2 };
  const req = { transactionID: "tx", payload: {
    db: { name: "postgres", sessions: { tx: { db: { execute: async () => { operations.push("lock"); } } } },
      findOne: async () => { operations.push("fresh-read"); return current; } },
  } } as unknown as PayloadRequest;
  const stale = { ...current, reservedQuantity: 0 };
  await capture({ operation: "update", args: { req, data: { inventory: 1 } } } as never);
  await assert.rejects(async () => hook({ req, operation: "update", originalDoc: stale, data: { inventory: 1 } } as never), /Inventory cannot fall below active reservations/);
  assert.deepEqual(operations, ["lock", "fresh-read"]);
  const data = { inventory: 3 };
  await capture({ operation: "update", args: { req, data } } as never);
  assert.deepEqual(await hook({ req, operation: "update", originalDoc: stale, data } as never), { ...data, reservedQuantity: 2 });
  await capture({ operation: "update", args: { req, data: { title: "Draft title" } } } as never);
  const normalizedDraft = { title: "Draft title", inventory: 9, reservedQuantity: 0 };
  assert.deepEqual(await hook({ req, operation: "update", originalDoc: { ...stale, inventory: 9 }, data: normalizedDraft } as never),
    { ...normalizedDraft, inventory: 4, reservedQuantity: 2 });
});
