import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { releaseInvalidatedSeats } from "../../../src/lib/commerce/seat-release";
import { commerceStorageFake, saleSeed } from "./storage-fake";

// Unlock events (owner: "yes, cancel. release seat."; Review-A, 24 Nov): a refunded seat is released only once every key
// owed for it is authoritatively invalid, before Part I, after a verified full cancellation, never for a used admission.
const admin = { collection: "admins", _strategy: "staff-better-auth", role: "admin", id: "staff" };
const future = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();

function refundedUnlockOrder({ startsAt = future, releaseReason = "confirmed-cancel", intents = ["cancelled", "cancelled", "cancelled"] as (string | null)[] } = {}) {
  const seed = saleSeed();
  return commerceStorageFake({ ...seed,
    orders: [{ ...seed.orders[0], commerceSnapshot: {
      version: 1, customerID: "buyer", cartID: "cart", productID: "p", eventID: "e", releaseID: "membership",
      quantity: 3, accountLimit: 3, currency: "KRW", unitAmount: 1000, shippingAmount: 0, totalAmount: 3000,
      orderName: "Fixture", productVersion: "p1", eventVersion: "e1",
      shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" },
    } }],
    "commerce-reservations": [{ id: "reservation", attemptID: "attempt", customer: "buyer", product: "p", event: "e", releaseID: "membership", quantity: 3,
      state: "released", releaseReason, order: "order", returnedUnits: [] }],
    "commerce-allowances": [{ id: "allowance", customer: "buyer", releaseID: "membership",
      accountReleaseKey: createHash("sha256").update(JSON.stringify(["buyer", "membership"])).digest("hex"), reservedQuantity: 0, paidQuantity: 0 }],
    "commerce-admissions": [1, 2, 3].map((unit) => ({ id: `admission-${unit}`, order: "order", orderUnitKey: `order:${unit}`, unit, status: "revoked", event: "e", benefitReview: true })),
    "commerce-key-grant-intents": intents.flatMap((state, index) => state ? [{ id: `intent-${index + 1}`, entitlement: `admission-${index + 1}`, order: "order", state }] : []),
    "commerce-events": [{ ...seed["commerce-events"][0], committedQuantity: 3, checkInAuthority: "unlock-events", partIStartsAt: startsAt }],
  });
}

const release = (fake: ReturnType<typeof refundedUnlockOrder>) => fake.transaction(admin, (req) => releaseInvalidatedSeats({ req, orderID: "order" }));

test("every key invalid, before Part I: the seats are released once", async () => {
  const fake = refundedUnlockOrder();
  assert.equal(await release(fake), 3);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 0);
  assert.ok(fake.rows["commerce-admissions"].every((row) => typeof row.seatReleasedAt === "string"));
  assert.equal(await release(fake), 0, "idempotent");
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 0);
});

test("a key still granted or submitted keeps its seat; an admission never owed a key releases", async () => {
  const fake = refundedUnlockOrder({ intents: ["granted", "submitted", null] });
  assert.equal(await release(fake), 1);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 2);
  assert.deepEqual(fake.rows["commerce-admissions"].map((row) => Boolean(row.seatReleasedAt)), [false, false, true]);
  // The key worker later reconciles both cancels: the remaining seats follow.
  for (const intent of fake.rows["commerce-key-grant-intents"]) intent.state = "cancelled";
  assert.equal(await release(fake), 2);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 0);
});

test("after Part I starts or after a return nothing is released; used admissions keep their seat", async () => {
  for (const fake of [refundedUnlockOrder({ startsAt: new Date(Date.now() - 1000).toISOString() }), refundedUnlockOrder({ releaseReason: "accepted-return" })]) {
    assert.equal(await release(fake), 0);
    assert.equal(fake.rows["commerce-events"][0].committedQuantity, 3);
  }
  const used = refundedUnlockOrder();
  used.rows["commerce-admissions"][0] = { ...used.rows["commerce-admissions"][0], status: "checked-in", checkedInAt: "2026-01-01T00:00:00.000Z" };
  used.rows["commerce-redemptions"] = [{ id: "redemption", admission: "admission-2" }];
  assert.equal(await release(used), 1);
  assert.equal(used.rows["commerce-events"][0].committedQuantity, 2);
});

test("events outside Unlock are left to releaseReservation", async () => {
  const fake = refundedUnlockOrder();
  fake.rows["commerce-events"][0] = { ...fake.rows["commerce-events"][0], checkInAuthority: null, unlockTicketConfiguration: null };
  assert.equal(await release(fake), 0);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 3);
});
