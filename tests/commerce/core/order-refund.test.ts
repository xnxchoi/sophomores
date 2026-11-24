import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { APIError, type CollectionBeforeChangeHook, type PayloadRequest } from "payload";
import { commercePlugin } from "../../../src/lib/commerce/ecommerce";
import { withCommerceWrite } from "../../../src/lib/commerce/access";
import { recordOrderRefund } from "../../../src/lib/commerce/order-refund";

// The financial-field lock on orders has one exception: a verified full cancellation on the same request
// (order-refund.ts) may move a paid commerce-v1 order to refunded, once, with its record.
async function ordersHook(): Promise<CollectionBeforeChangeHook> {
  const config = await commercePlugin({ collections: [], endpoints: [], secret: randomUUID(), db: postgresAdapter({ pool: { connectionString: "postgres://localhost/commerce_test" } }) });
  const orders = config.collections?.find((entry) => entry.slug === "orders");
  assert.ok(orders?.hooks?.beforeChange?.length);
  return orders.hooks.beforeChange.at(-1)!;
}

const paidOrder = (status = "processing") => ({ id: "order-1", commerceVersion: "commerce-v1", status, amount: 30000, currency: "KRW",
  commerceSnapshot: { totalAmount: 30000 }, fulfillment: { status: "pending" }, commerceRefund: { refundedAt: null, source: null, providerEventID: null, transactionID: null } });
const refundData = (order: ReturnType<typeof paidOrder>) => ({ ...order, status: "refunded",
  commerceRefund: { refundedAt: "2026-11-24T12:00:00.000Z", source: "provider", providerEventID: "evt", transactionID: "txn" } });
const forbidden = (error: unknown) => error instanceof APIError && error.status === 403;

/** A request whose Local API update runs the real orders hook over a stand-in transaction (no database). */
function standInRequest(hook: CollectionBeforeChangeHook, stored: ReturnType<typeof paidOrder>, extra: Record<string, unknown> = {}) {
  const writes: Record<string, unknown>[] = [];
  const req = {
    transactionID: "tx",
    payload: {
      db: { name: "postgres", sessions: { tx: { db: { execute: async () => undefined } } } },
      findByID: async () => structuredClone(stored),
      update: async ({ data, req }: { data: Record<string, unknown>; req: PayloadRequest }) => {
        const merged = await hook({ req, operation: "update", data: { ...structuredClone(stored), ...data, ...extra }, originalDoc: structuredClone(stored) } as never);
        writes.push(merged);
        return merged;
      },
    },
  } as unknown as PayloadRequest;
  return { req, writes };
}

test("without a verified cancellation, the order cannot move to refunded or gain a refund record", async () => {
  const hook = await ordersHook();
  const req = {} as PayloadRequest;
  await withCommerceWrite(req, async () => {
    const order = paidOrder();
    await assert.rejects(async () => hook({ req, operation: "update", data: refundData(order), originalDoc: order } as never), forbidden);
    await assert.rejects(async () => hook({ req, operation: "update", data: { ...order, commerceRefund: refundData(order).commerceRefund }, originalDoc: order } as never), forbidden);
    // Fulfillment updates still pass.
    await hook({ req, operation: "update", data: { ...order, fulfillment: { status: "packed" } }, originalDoc: order } as never);
  });
});

test("a verified cancellation refunds a paid order once and changes nothing else", async () => {
  const hook = await ordersHook();
  const order = paidOrder();
  const { req, writes } = standInRequest(hook, order);
  assert.equal(await recordOrderRefund({ req, orderID: order.id, transactionID: "txn", providerEventID: "evt", source: "provider" }), true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].status, "refunded");
  const record = writes[0].commerceRefund as Record<string, unknown>;
  assert.equal(typeof record.refundedAt, "string");
  assert.deepEqual([record.source, record.providerEventID, record.transactionID], ["provider", "evt", "txn"]);
  assert.equal(writes[0].amount, order.amount);
  // The capability does not outlive the call: the same request cannot refund again by hand.
  await withCommerceWrite(req, async () => {
    await assert.rejects(async () => hook({ req, operation: "update", data: refundData(order), originalDoc: order } as never), forbidden);
  });
});

test("an order already refunded, cancelled or legacy is left as it is", async () => {
  const hook = await ordersHook();
  for (const stored of [paidOrder("refunded"), paidOrder("cancelled"), { ...paidOrder(), commerceVersion: "legacy" }]) {
    const { req, writes } = standInRequest(hook, stored);
    assert.equal(await recordOrderRefund({ req, orderID: stored.id, transactionID: "txn", providerEventID: "evt", source: "provider" }), false);
    assert.equal(writes.length, 0);
  }
});

test("the refund exception never lets an amount change ride along", async () => {
  const hook = await ordersHook();
  const order = paidOrder();
  const { req, writes } = standInRequest(hook, order, { amount: 1 });
  await assert.rejects(recordOrderRefund({ req, orderID: order.id, transactionID: "txn", providerEventID: "evt", source: "provider" }), forbidden);
  assert.equal(writes.length, 0);
});

test("refund policy: guest tickets until the cutoff, the book-only edition, never membership editions or the membership product", async () => {
  const { refundPolicy } = await import("../../../src/lib/commerce/refund-policy");
  const edition = (membershipSignet: boolean, freeLaunchTicket: boolean, eventID: string | null) => ({ version: 2, kind: "native-edition-v1", eventID, editionEntitlements: { membershipSignet, freeLaunchTicket } });
  assert.deepEqual(refundPolicy({ version: 3, kind: "guest-ticket-v1", eventID: "event" }), { refundable: true, cutoff: "event" });
  assert.deepEqual(refundPolicy(edition(false, false, null)), { refundable: true, cutoff: "none" });
  for (const bundle of [edition(true, true, "event"), edition(true, false, null), edition(false, true, "event"), edition(false, false, "event")]) {
    assert.deepEqual(refundPolicy(bundle), { refundable: false, reason: "personalised-edition" }, JSON.stringify(bundle));
  }
  for (const other of [{ version: 1, eventID: "event", releaseID: "membership" }, { version: 3, kind: "other", eventID: "event" }, null, "x"]) {
    assert.deepEqual(refundPolicy(other), { refundable: false, reason: "not-refundable-product" }, JSON.stringify(other));
  }
});
