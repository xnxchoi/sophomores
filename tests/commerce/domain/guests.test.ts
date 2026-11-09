import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { assignGuestName, checkInGuest, claimGuestAdmission, grantOrderAdmissions, issueGuestClaim, redeemGuestBenefit } from "../../../src/lib/commerce/guests";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import { commerceStorageFake, saleSeed } from "./storage-fake";

const admin = { collection: "admins", _strategy: "staff-better-auth", role: "admin", id: "staff" };
const customer = { collection: "users", id: "guest" };
const snapshot = {
  version: 1 as const, customerID: "buyer", cartID: "cart", productID: "p", eventID: "e", releaseID: "p", quantity: 2, currency: "KRW" as const, unitAmount: 10000, shippingAmount: 3000, totalAmount: 23000,
  orderName: "Physical release", productVersion: "1", eventVersion: "1",
  shippingAddress: { country: "KR" as const, recipientName: "Buyer", phone: "01012345678", postalCode: "12345", addressLine1: "Seoul" },
};

test("one guaranteed admission per paid unit, with exact-once order-unit keys", async () => {
  const fake = commerceStorageFake({ ...saleSeed(),
    orders: [{ id: "order", commerceVersion: "commerce-v1", commerceSnapshot: snapshot, commerceAttemptID: "attempt", transactions: ["transaction"] }],
    transactions: [{ id: "transaction", status: "succeeded", order: "order", customer: "buyer", amount: 23000, currency: "KRW" }],
    "commerce-reservations": [{ id: "reservation", attemptID: "attempt", customer: "buyer", order: "order", quantity: 2, state: "settled", snapshotHash: commerceSnapshotHash(snapshot) }],
  });
  await fake.transaction({}, async (req) => {
    assert.equal((await grantOrderAdmissions({ req, orderID: "order", transactionID: "transaction" })).length, 2);
    await grantOrderAdmissions({ req, orderID: "order", transactionID: "transaction" });
  });
  assert.equal(fake.rows["commerce-admissions"].length, 2);
});

test("legacy orders cannot acquire commerce benefits", async () => {
  const fake = commerceStorageFake({ orders: [{ id: "legacy", commerceVersion: "legacy" }] });
  await fake.transaction({}, async (req) => assert.rejects(grantOrderAdmissions({ req, orderID: "legacy", transactionID: "tx" }), /legacy/i));
});

test("claim tokens are hashed, rotate, and are single use with individual verification", async () => {
  const fake = commerceStorageFake({ ...saleSeed(),
    users: [{ id: "guest", emailVerified: true, phoneNumberVerified: true }],
    "commerce-admissions": [{ id: "admission", order: "order", buyer: "buyer", event: "e", guestName: "Guest Name", status: "available" }],
  });
  const first = await fake.transaction({ collection: "users", id: "buyer" }, (req) => issueGuestClaim({ req, admissionID: "admission" }));
  const second = await fake.transaction({ collection: "users", id: "buyer" }, (req) => issueGuestClaim({ req, admissionID: "admission" }));
  assert.equal(fake.rows["commerce-claims"][0].tokenDigest, createHash("sha256").update(second.token).digest("hex"));
  assert.equal(JSON.stringify(fake.rows).includes(second.token), false);
  await fake.transaction(customer, async (req) => assert.rejects(claimGuestAdmission({ req, token: first.token }, async () => true), /invalid/i));
  await fake.transaction(customer, (req) => claimGuestAdmission({ req, token: second.token }, async () => true));
  await fake.transaction(customer, async (req) => assert.rejects(claimGuestAdmission({ req, token: second.token }, async () => true), /consumed/i));
  await fake.transaction({ collection: "users", id: "buyer" }, async (req) => assert.rejects(assignGuestName({ req, admissionID: "admission", guestName: "Other" }), /lock/i));
});

test("a buyer's verification does not unlock an unverified invited guest", async () => {
  const token = "a".repeat(43);
  const fake = commerceStorageFake({ ...saleSeed(), users: [{ id: "guest", emailVerified: true, phoneNumberVerified: false }],
    "commerce-admissions": [{ id: "admission", order: "order", buyer: "buyer", event: "e", guestName: "Guest", status: "available" }],
    "commerce-claims": [{ id: "claim", admission: "admission", tokenDigest: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60_000).toISOString() }],
  });
  await fake.transaction(customer, async (req) => assert.rejects(claimGuestAdmission({ req, token }, async () => false), /individually/i));
  assert.equal(fake.rows["commerce-admissions"][0].status, "available");
});

test("concurrent fake drink redemptions cap at four and retries do not consume twice", async () => {
  const fake = commerceStorageFake({ ...saleSeed(), "commerce-admissions": [{ id: "admission", order: "order", event: "e", status: "checked-in", claimedAccount: "guest" }] });
  const actions = Array.from({ length: 5 }, (_, index) => `redemption-action-${index}`);
  const results = await Promise.allSettled(actions.map((actionID) => fake.transaction(admin, (req) => redeemGuestBenefit({ req, admissionID: "admission", kind: "part-i-drink", actionID }))));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 4);
  await fake.transaction(admin, (req) => redeemGuestBenefit({ req, admissionID: "admission", kind: "part-i-drink", actionID: actions[0] }));
  assert.equal(fake.rows["commerce-redemptions"].length, 4);
});

test("staff domain email or an ordinary editor cannot perform redemptions", async () => {
  const fake = commerceStorageFake({});
  for (const user of [{ ...admin, role: "editor" }, { collection: "users", id: "u", email: "u@sophomores.club", role: "admin" }]) {
    await fake.transaction(user, async (req) => assert.rejects(redeemGuestBenefit({ req, admissionID: "admission", kind: "shared-transfer", actionID: "operator-action-0001" }), /administrator/i));
  }
});

test("a named paid guest may enter without registration, but receives no perks until own claim", async () => {
  const fake = commerceStorageFake({ ...saleSeed(),
    users: [{ id: "guest", emailVerified: true }],
    "commerce-admissions": [{ id: "admission", order: "order", event: "e", buyer: "buyer", status: "available", guestName: "Named Guest" }],
  });
  await fake.transaction(admin, (req) => checkInGuest({ req, admissionID: "admission" }));
  assert.equal(fake.rows["commerce-admissions"][0].status, "checked-in");
  await fake.transaction(admin, async (req) => assert.rejects(redeemGuestBenefit({ req, admissionID: "admission", kind: "part-i-drink", actionID: "unregistered-drink-1" }), /individually|guest|claimed/i));
  const invitation = await fake.transaction({ collection: "users", id: "buyer" }, (req) => issueGuestClaim({ req, admissionID: "admission" }));
  await fake.transaction(customer, (req) => claimGuestAdmission({ req, token: invitation.token }, async () => true));
  assert.equal(fake.rows["commerce-admissions"][0].status, "checked-in");
  await fake.transaction(admin, (req) => redeemGuestBenefit({ req, admissionID: "admission", kind: "part-i-drink", actionID: "registered-drink-1" }));
  assert.equal(fake.rows["commerce-redemptions"].length, 1);
});
