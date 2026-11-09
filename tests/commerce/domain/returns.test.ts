import assert from "node:assert/strict";
import test from "node:test";
import { acceptUnitReturns, disposeReturnedUnits } from "../../../src/lib/commerce/returns";
import { releaseReservation, reservePurchase } from "../../../src/lib/commerce/reservations";
import { holdOrderBenefits, revokeOrderBenefits } from "../../../src/lib/commerce/benefit-review";
import { redeemGuestBenefit } from "../../../src/lib/commerce/guests";
import { updateOrderFulfillment } from "../../../src/lib/commerce/fulfillment";
import { commerceStorageFake, saleSeed } from "./storage-fake";

const admin = { collection: "admins", _strategy: "staff-better-auth", role: "admin", id: "staff" };

function paidThreeSeed() {
  return { ...saleSeed(),
    "commerce-reservations": [{ id: "reservation", attemptID: "attempt", customer: "buyer", product: "p", event: "e", releaseID: "p", quantity: 3, state: "settled", order: "order", returnedUnits: [] }],
    "commerce-allowances": [{ id: "allowance", customer: "buyer", releaseID: "p", accountReleaseKey: "", reservedQuantity: 0, paidQuantity: 3 }],
    "commerce-admissions": [1, 2, 3].map((unit) => ({ id: `admission-${unit}`, order: "order", orderUnitKey: `order:${unit}`, unit, status: "available", event: "e" })),
    "commerce-events": [{ ...saleSeed()["commerce-events"][0], committedQuantity: 3 }],
  };
}

// Exactly matches the production key, without promoting a feature-private
// identity implementation to a shared public API merely for tests.
async function paidFake() {
  const { createHash } = await import("node:crypto");
  const seed = paidThreeSeed();
  seed["commerce-allowances"][0].accountReleaseKey = createHash("sha256").update(JSON.stringify(["buyer", "p"])).digest("hex");
  return commerceStorageFake(seed);
}

test("three paid units returning one restores exactly one allowance with no duplicate", async () => {
  const fake = await paidFake();
  await fake.transaction(admin, async (req) => {
    assert.deepEqual(await acceptUnitReturns({ req, orderID: "order", units: [2], evidenceID: "physical-return-2" }), { newlyAcceptedUnits: [2] });
    assert.deepEqual(await acceptUnitReturns({ req, orderID: "order", units: [2], evidenceID: "physical-return-2" }), { newlyAcceptedUnits: [] });
  });
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 2);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 2);
  assert.equal(fake.rows.products[0].inventory, 10, "acceptance is not a stock-restock operation");
  assert.equal(fake.rows["commerce-admissions"][1].stockDisposition, "pending-inspection");
  assert.equal(fake.rows["commerce-admissions"][0].status, "available");
  await fake.transaction(admin, async (req) => {
    const input = { req, customerID: "buyer", releaseID: "p", productID: "p", eventID: "e", quantity: 1, snapshotHash: "a".repeat(64) };
    await reservePurchase({ ...input, attemptID: "repurchase-one" });
    await assert.rejects(reservePurchase({ ...input, attemptID: "repurchase-excess" }), /allowance/i);
  });
});

test("full verified cancellation after a partial accepted return does not credit that unit twice", async () => {
  const fake = await paidFake();
  await fake.transaction(admin, async (req) => {
    await acceptUnitReturns({ req, orderID: "order", units: [2], evidenceID: "physical-return-2" });
    await releaseReservation({ req, attemptID: "attempt", verifiedReason: "confirmed-cancel", providerEventID: "verified-provider-full-cancel" });
  });
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 0);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 0);
});

test("used perks require explicit manual review and preserve immutable use audit", async () => {
  const fake = await paidFake();
  const checkedInAt = "2026-01-01T10:00:00.000Z";
  fake.rows["commerce-admissions"][0] = { ...fake.rows["commerce-admissions"][0], checkedInAt, status: "checked-in" };
  await fake.transaction(admin, async (req) => assert.rejects(acceptUnitReturns({ req, orderID: "order", units: [1], evidenceID: "return-used" }), /manual.*review/i));
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 3);
  await fake.transaction(admin, (req) => acceptUnitReturns({ req, orderID: "order", units: [1], evidenceID: "return-used-reviewed", usedBenefitsReviewed: true }));
  assert.equal(fake.rows["commerce-admissions"][0].checkedInAt, checkedInAt);
  assert.equal(fake.rows["commerce-admissions"][0].status, "checked-in");
  assert.equal(fake.rows["commerce-admissions"][0].returnReviewApproved, true);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 3, "used attendance capacity is not automatically resold after a physical return");
});

test("unknown/replayed invalid unit indexes and ordinary customers have no return effects", async () => {
  const fake = await paidFake();
  for (const units of [[0], [4], [1, 1]]) await fake.transaction(admin, async (req) => assert.rejects(acceptUnitReturns({ req, orderID: "order", units, evidenceID: "invalid-return" }), /unit/i));
  await fake.transaction({ collection: "users", id: "buyer" }, async (req) => assert.rejects(acceptUnitReturns({ req, orderID: "order", units: [1], evidenceID: "invalid-return" }), /administrator/i));
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 3);
});

test("verified review quarantines all benefits without changing used attendance history", async () => {
  const fake = await paidFake();
  fake.rows["commerce-admissions"][0] = { ...fake.rows["commerce-admissions"][0], status: "checked-in", claimedAccount: "guest", checkedInAt: "2026-01-01T00:00:00.000Z" };
  await fake.transaction(admin, (req) => holdOrderBenefits({ req, orderID: "order", providerEventID: "verified-dispute", reason: "disputed" }));
  assert.equal(fake.rows.transactions[0].commerceReviewHold, true);
  await fake.transaction(admin, async (req) => assert.rejects(redeemGuestBenefit({ req, admissionID: "admission-1", kind: "part-i-drink", actionID: "held-redeem-action-1" }), /held.*review/i));
  await fake.transaction(admin, (req) => revokeOrderBenefits({ req, orderID: "order", providerEventID: "verified-cancel", reason: "cancelled" }));
  assert.equal(fake.rows["commerce-admissions"][0].status, "checked-in");
  assert.equal(fake.rows["commerce-admissions"][1].status, "revoked");
});

test("staff disposition cannot restock an unaccepted return", async () => {
  const fake = await paidFake();
  await fake.transaction(admin, async (req) => assert.rejects(disposeReturnedUnits({ req, orderID: "order", units: [1], disposition: "restock" }), /accepted physical-return/i));
  assert.equal(fake.rows.products[0].inventory, 10);
});

test("explicit per-unit stock disposition restocks once, separately from allowance", async () => {
  const fake = await paidFake();
  await fake.transaction(admin, async (req) => {
    await acceptUnitReturns({ req, orderID: "order", units: [2], evidenceID: "physical-return-2" });
    await disposeReturnedUnits({ req, orderID: "order", units: [2], disposition: "restock" });
    await disposeReturnedUnits({ req, orderID: "order", units: [2], disposition: "restock" });
  });
  assert.equal(fake.rows.products[0].inventory, 11);
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 2);
  assert.equal(fake.rows["commerce-admissions"][1].stockDisposition, "restock");
});

for (const paymentStatus of ["succeeded", "cancelled"]) {
  test(`reverse logistics remains available for held ${paymentStatus} payments without reopening outbound fulfillment`, async () => {
    const fake = await paidFake();
    fake.rows.transactions[0] = { ...fake.rows.transactions[0], status: paymentStatus, commerceReviewHold: true };
    fake.rows.orders[0] = { ...fake.rows.orders[0], fulfillment: { status: "shipped", trackingNumber: "original-tracking" } };
    await fake.transaction(admin, async (req) => {
      const action = { req, orderID: "order", actionID: "return-logistics-action-1" };
      if (paymentStatus === "cancelled") await releaseReservation({ req, attemptID: "attempt", verifiedReason: "confirmed-cancel", providerEventID: "confirmed-cancellation-before-return" });
      await assert.rejects(updateOrderFulfillment({ ...action, status: "delivered" }), /held.*review/i);
      await updateOrderFulfillment({ ...action, status: "return-requested" });
      await assert.rejects(updateOrderFulfillment({ ...action, status: "returned" }), /Accept each physically returned unit/);
      await acceptUnitReturns({ req, orderID: "order", units: [1, 2, 3], evidenceID: "all-units-physically-received" });
      await updateOrderFulfillment({ ...action, status: "returned" });
    });
    assert.equal((fake.rows.orders[0].fulfillment as Record<string, unknown>).status, "returned");
    assert.equal((fake.rows.orders[0].fulfillment as Record<string, unknown>).trackingNumber, "original-tracking");
    assert.equal(fake.rows.transactions[0].commerceReviewHold, true);
    assert.equal(fake.rows.transactions[0].status, paymentStatus);
    assert.equal(fake.rows.products[0].inventory, 10);
    assert.equal(fake.rows["commerce-admissions"].every((row) => !!row.returnAcceptedAt), true);
  });
}
