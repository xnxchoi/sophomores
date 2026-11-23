import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { checkInGuest, claimGuestAdmission, grantOrderAdmissions, issueGuestClaim } from "@/lib/commerce/guests";
import { recordKeyGrantIntents } from "@/lib/commerce/keys/intents";
import { guestPurchaseSnapshotSchema } from "@/lib/commerce/purchase-snapshot";
import { commerceSnapshotHash } from "@/lib/commerce/snapshot-hash";
import { commerceStorageFake, saleSeed } from "./storage-fake";

const staff = { collection: "admins", _strategy: "staff-better-auth", role: "admin", id: "staff" };
const buyer = { collection: "users", id: "buyer" };
const guest = { collection: "users", id: "guest" };
const token = "x".repeat(43);
const memberLock = "0x" + "a".repeat(40);
const guestLock = "0x" + "b".repeat(40);
const target = { chainID: 137, lock: guestLock };

function fixture(ticketTier: "member" | "guest") {
  const seed = saleSeed();
  return commerceStorageFake({
    ...seed,
    "commerce-events": [{ ...seed["commerce-events"][0], checkInAuthority: "unlock-events" }],
    "commerce-admissions": [{
      id: "admission", order: "order", transaction: "transaction", buyer: buyer.id, event: "e",
      guestName: "Guest", status: "available", ticketTier,
    }],
    users: [{ ...guest, emailVerified: true }],
    "commerce-claims": [{
      id: "claim", admission: "admission", tokenDigest: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }],
  });
}

for (const tier of ["member", "guest"] as const) {
  test(`staff cannot mark ${tier} attendance for an Unlock EVENTS event`, async () => {
    const fake = fixture(tier);
    const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(staff, (req) => checkInGuest({ req, admissionID: "admission" })), /Unlock EVENTS/);
    assert.deepEqual(fake.rows, before);
  });
}

test("a typed Guest Ticket cannot issue a claimant link", async () => {
  const fake = fixture("guest");
  const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(buyer, (req) => issueGuestClaim({ req, admissionID: "admission" })));
  assert.deepEqual(fake.rows, before, "buyer ownership and existing token must remain unchanged");
});

test("a typed Guest Ticket cannot consume a historical claimant link", async () => {
  const fake = fixture("guest");
  const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(guest, (req) => claimGuestAdmission({ req, token }, async () => true)));
  assert.deepEqual(fake.rows, before, "buyer ownership, legacy token and attendance must remain unchanged");
});

function paidGuestTicket(configuration: unknown) {
  const seed = saleSeed();
  const snapshot = guestPurchaseSnapshotSchema.parse({
    version: 3, kind: "guest-ticket-v1", customerID: buyer.id, cartID: "cart", productID: "g", eventID: "e", releaseID: "g",
    quantity: 2, accountLimit: 2, currency: "KRW", unitAmount: 100, shippingAmount: 0, totalAmount: 200,
    orderName: "Fixture ticket", productVersion: "1", eventVersion: "1", ticketTarget: target,
    shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" },
  });
  return commerceStorageFake({
    ...seed,
    "commerce-events": [{ ...seed["commerce-events"][0], checkInAuthority: "unlock-events", unlockTicketConfiguration: configuration }],
    orders: [{ ...seed.orders[0], commerceSnapshot: snapshot }],
    transactions: [{ ...seed.transactions[0], customer: buyer.id, amount: 200, currency: "KRW" }],
    "commerce-reservations": [{ id: "reservation", attemptID: "attempt", state: "settled", order: "order",
      product: "g", event: "e", releaseID: "g", customer: buyer.id, quantity: 2, ticketTarget: target, snapshotHash: commerceSnapshotHash(snapshot) }],
  });
}

const config = { chainID: 137, memberLock, guestLock, guestProductID: "g" };

test("two paid Guest Ticket units create exactly two buyer Safe intents and never occupy the member ticket", async () => {
  const fake = paidGuestTicket(config);
  for (let attempt = 0; attempt < 2; attempt++) {
    await fake.transaction(buyer, async (req) => {
      const orderID = "order", transactionID = "transaction";
      const admissions = await grantOrderAdmissions({ req, orderID, transactionID });
      assert.equal(admissions.length, 2);
      assert.ok(admissions.every((row) => row.ticketTier === "guest" && row.buyer === buyer.id &&
        row.claimedAccount == null && row.eventAccountKey == null));
      for (const admission of admissions) assert.deepEqual(admission.ticketTarget, target);
      const intents = await recordKeyGrantIntents({ req, orderID, transactionID, beneficiaryID: buyer.id, admissions });
      assert.deepEqual(intents.map((row) => row.entitlement), admissions.map((row) => row.id));
    });
  }
  assert.equal(fake.rows["commerce-key-grant-intents"].length, 2);
  assert.ok(fake.rows["commerce-key-grant-intents"].every((row) => row.recipientMode === "member_safe" && row.beneficiaryUser === buyer.id));
});

test("absent Guest offer, wrong product, same lock, and changed lock fail before creating admissions", async () => {
  for (const configuration of [null, { ...config, guestProductID: "other" }, { ...config, guestLock: memberLock },
    { ...config, guestLock: "0x" + "c".repeat(40) }]) {
    const fake = paidGuestTicket(configuration);
    const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(buyer, (req) => grantOrderAdmissions({ req, orderID: "order", transactionID: "transaction" })), /ticket.*(configuration|mismatch)/i);
    assert.deepEqual(fake.rows, before);
  }
});
