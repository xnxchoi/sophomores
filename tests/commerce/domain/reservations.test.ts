import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { reservePurchase, releaseReservation, settleReservation } from "../../../src/lib/commerce/reservations";
import { commerceStorageFake, saleSeed } from "./storage-fake";

test("reservation refuses transactionless execution before touching storage", async () => {
  const req = { payload: { db: {} } } as unknown as PayloadRequest;
  await assert.rejects(reservePurchase({ req, attemptID: "a", customerID: "u", releaseID: "p", productID: "p", eventID: "e", quantity: 1, snapshotHash: "a".repeat(64) }), /transaction/i);
});

test("unknown or READY payment cannot release a reservation", async () => {
  await assert.rejects(releaseReservation({ req: {} as PayloadRequest, attemptID: "a", verifiedReason: "READY" as never, providerEventID: "event" }), /verified|reason/i);
});

test("quantity is bounded by three before any counter is changed", async () => {
  await assert.rejects(reservePurchase({ req: {} as PayloadRequest, attemptID: "a", customerID: "u", releaseID: "p", productID: "p", eventID: "e", quantity: 4, snapshotHash: "a".repeat(64) }), /quantity/i);
});

const purchase = { productID: "p", releaseID: "p", eventID: "e", snapshotHash: "a".repeat(64) };

test("serialized concurrent fake transactions enforce net account allowance", async () => {
  const fake = commerceStorageFake(saleSeed());
  const results = await Promise.allSettled(["a", "b"].map((attemptID) => fake.transaction({}, (req) => reservePurchase({ req, ...purchase, customerID: "u", attemptID, quantity: 2 }))));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(fake.rows["commerce-allowances"][0].reservedQuantity, 2);
  assert.equal(fake.rows.products[0].inventory, 10, "reservations never decrement plugin inventory");
});

test("serialized concurrent fake transactions cannot oversell last stock or admission", async () => {
  for (const [stock, capacity] of [[1, 10], [10, 1]]) {
    const fake = commerceStorageFake(saleSeed(stock, capacity));
    const results = await Promise.allSettled(["a", "b"].map((attemptID) => fake.transaction({}, (req) => reservePurchase({ req, ...purchase, customerID: attemptID, attemptID, quantity: 1 }))));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(fake.rows["commerce-events"][0].reservedQuantity, 1);
  }
});

test("settlement is idempotent and verified cancellation releases net allowance once", async () => {
  const fake = commerceStorageFake(saleSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
    await req.payload.create({ collection: "commerce-admissions" as never, data: { orderUnitKey: "order:1", status: "available" } as never, req });
    await releaseReservation({ req, attemptID: "a", verifiedReason: "confirmed-cancel", providerEventID: "verified-cancel-1" });
    await releaseReservation({ req, attemptID: "a", verifiedReason: "confirmed-cancel", providerEventID: "verified-cancel-1" });
  });
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 0);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 0);
  assert.equal(fake.rows.products[0].inventory, 10);
  assert.equal(fake.rows["commerce-admissions"][0].status, "revoked");
});
