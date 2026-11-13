import assert from "node:assert/strict";
import test from "node:test";
import { reservePurchase, settleReservation } from "../../../src/lib/commerce/reservations";
import { CommerceEvents } from "../../../src/payload/collections/commerce-events";
import { commerceStorageFake, saleSeed } from "./storage-fake";

test("operational counter settlement cannot replay a stale CMS product version over plugin inventory", async () => {
  const fake = commerceStorageFake(saleSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, attemptID: "attempt", customerID: "buyer", releaseID: "p", productID: "p", eventID: "e", quantity: 1, snapshotHash: "a".repeat(64) });
    await req.payload.db.updateOne({ collection: "products", id: "p", data: { inventory: { $inc: -1 } }, req });
    await settleReservation({ req, attemptID: "attempt", orderID: "order" });
  });
  assert.equal(fake.rows.products[0].inventory, 9);
  assert.equal(fake.rows.products[0].reservedQuantity, 0);
  assert.equal(fake.rows.products[0]._status, "published");
});

test("CMS event save cannot replay pre-lock normalized counters over a fresh reservation", async () => {
  const fake = commerceStorageFake(saleSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, attemptID: "attempt", customerID: "buyer", releaseID: "p", productID: "p", eventID: "e", quantity: 1, snapshotHash: "a".repeat(64) });
    const data = await CommerceEvents.hooks!.beforeValidate![0]({ req, operation: "update", originalDoc: { id: "e", reservedQuantity: 0, committedQuantity: 0 }, data: { publicationApproved: false, reservedQuantity: 0, committedQuantity: 0 } } as never);
    assert.equal((data as { reservedQuantity: number }).reservedQuantity, 1);
    const final = await CommerceEvents.hooks!.beforeChange![0]({ req, operation: "update", originalDoc: { id: "e", reservedQuantity: 0 }, data: { ...data, reservedQuantity: 0, committedQuantity: 0 } } as never);
    assert.equal(final.reservedQuantity, 1);
    assert.equal(final.committedQuantity, 0);
  });
});
