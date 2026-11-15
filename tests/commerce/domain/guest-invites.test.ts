import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import {
  createGuestInvite,
  GUEST_INVITE_HOLD_MS,
  lapseDueGuestInvites,
  markGuestInvitePaid
} from "../../../src/lib/commerce/guest-invites";
import {
  assignGuestName,
  checkInGuest,
  grantOrderAdmissions,
  issueGuestClaim
} from "../../../src/lib/commerce/guests";
import {
  releaseReservation,
  reservePurchase,
  settleReservation
} from "../../../src/lib/commerce/reservations";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import type { CommerceSnapshot } from "../../../src/lib/commerce/contracts";
import { commerceStorageFake, saleSeed } from "./storage-fake";

// Provider-free serialized model; PostgreSQL acceptance lives in guest-invite.db.test.ts.
const member = { collection: "users", id: "member" };
const admin = {
  collection: "admins",
  _strategy: "staff-better-auth",
  role: "admin",
  id: "staff"
};
type Fake = ReturnType<typeof commerceStorageFake>;

function seed(capacity = 10) {
  const sale = saleSeed(10, capacity);
  return {
    ...sale,
    products: [{ ...sale.products[0], id: "g", productKind: "guest_invite" }]
  };
}
const guestOffer = async () =>
  ({ productID: "g", kind: "guest_invite", event: { id: "e" } }) as never;
const deps = { activeMember: async () => true, loadOffer: guestOffer };

async function invite(
  fake: Fake,
  user: Record<string, unknown> = member,
  input: Partial<{ guestName: string; guestEmail: string }> = {},
  dependencies = deps
) {
  return fake.transaction(user, (req) =>
    createGuestInvite(
      {
        req,
        productID: "g",
        guestName: "Guest One",
        guestEmail: " Guest.One@Example.com ",
        ...input
      },
      dependencies
    )
  );
}
const event = (fake: Fake) => fake.rows["commerce-events"][0];
const inviteRow = (fake: Fake, id: string) =>
  fake.rows["commerce-guest-invites"].find((row) => row.id === id)!;

function guestSnapshot(inviteID: string): CommerceSnapshot {
  return {
    version: 1,
    customerID: "member",
    cartID: "cart",
    productID: "g",
    eventID: "e",
    releaseID: "g",
    quantity: 1,
    currency: "KRW",
    unitAmount: 10000,
    shippingAmount: 0,
    totalAmount: 10000,
    orderName: "Guest invite",
    productVersion: "1",
    eventVersion: "1",
    guestInviteID: inviteID
  };
}
const reserve = (
  req: PayloadRequest,
  attemptID: string,
  snapshot: CommerceSnapshot
) =>
  reservePurchase({
    req,
    attemptID,
    customerID: snapshot.customerID,
    releaseID: snapshot.releaseID,
    productID: snapshot.productID,
    eventID: snapshot.eventID,
    quantity: 1,
    snapshotHash: commerceSnapshotHash(snapshot),
    guestInviteID: snapshot.guestInviteID
  });

/** Invite, checkout and settle the way the transaction-success hook does, minus the provider. */
async function paidInvite(fake: Fake) {
  const created = await invite(fake);
  const snapshot = guestSnapshot(created.id);
  fake.rows.orders = [
    {
      id: "order",
      commerceVersion: "commerce-v1",
      commerceSnapshot: snapshot,
      commerceAttemptID: "attempt",
      transactions: ["transaction"]
    }
  ];
  fake.rows.transactions = [
    {
      id: "transaction",
      status: "succeeded",
      order: "order",
      customer: "member",
      amount: 10000,
      currency: "KRW"
    }
  ];
  await fake.transaction(member, (req) => reserve(req, "attempt", snapshot));
  const settle = () =>
    fake.transaction(member, async (req) => {
      await settleReservation({ req, attemptID: "attempt", orderID: "order" });
      const admissions = await grantOrderAdmissions({
        req,
        orderID: "order",
        transactionID: "transaction"
      });
      await markGuestInvitePaid({
        req,
        inviteID: created.id,
        orderID: "order",
        transactionID: "transaction",
        admissions
      });
      return admissions;
    });
  const admissions = await settle();
  return { invite: created, snapshot, admissions, settle };
}

test("an invite holds one place for 48 hours, and its own checkout does not count it twice", async () => {
  const fake = commerceStorageFake(seed(1));
  const before = Date.now();
  const created = await invite(fake);
  const row = inviteRow(fake, created.id);
  assert.equal(row.state, "pending_payment");
  assert.equal(row.payer, "member");
  assert.equal(row.inviter, "member");
  assert.equal(row.event, "e");
  assert.equal(row.guestName, "Guest One");
  assert.equal(row.guestEmail, "guest.one@example.com");
  const expires = Date.parse(String(row.holdExpiresAt));
  assert.equal(
    expires >= before + GUEST_INVITE_HOLD_MS &&
      expires <= Date.now() + GUEST_INVITE_HOLD_MS,
    true
  );
  assert.equal(GUEST_INVITE_HOLD_MS, 48 * 60 * 60 * 1000);
  assert.equal(
    event(fake).reservedQuantity,
    1,
    "the invite holds the event's last place"
  );
  // The invite's own hold is what fills this event; checkout must still go through.
  await fake.transaction(member, (req) =>
    reserve(req, "attempt", guestSnapshot(created.id))
  );
  assert.equal(
    event(fake).reservedQuantity,
    1,
    "checkout does not reserve the place a second time"
  );
  assert.equal(fake.rows.products[0].reservedQuantity, 1);
  assert.equal(fake.rows["commerce-reservations"][0].guestInvite, created.id);
});

test("settlement admits the named guest once, against the invite's place, never as the buyer's own seat", async () => {
  const fake = commerceStorageFake(seed(1));
  const { invite: created, admissions, settle } = await paidInvite(fake);
  assert.equal(event(fake).reservedQuantity, 0);
  assert.equal(
    event(fake).committedQuantity,
    1,
    "the held place became the guest's admission"
  );
  assert.equal(admissions.length, 1);
  const admission = fake.rows["commerce-admissions"][0];
  assert.equal(admission.guestName, "Guest One");
  assert.equal(admission.guestInvite, created.id);
  assert.equal(admission.buyer, "member");
  assert.equal(
    admission.eventAccountKey === undefined ||
      admission.eventAccountKey === null,
    true,
    "a guest never occupies the member's own seat"
  );
  const row = inviteRow(fake, created.id);
  assert.equal(row.state, "paid");
  assert.equal(row.order, "order");
  assert.equal(row.transaction, "transaction");
  assert.equal(row.admission, admission.id);
  const settled = structuredClone(fake.rows);
  await settle();
  assert.deepEqual(fake.rows, settled, "replaying the settle changes nothing");
});

test("a lapse releases an unpaid hold once and marks the member to be told; a second run changes nothing", async () => {
  const fake = commerceStorageFake(seed());
  const created = await invite(fake);
  const expires = Date.parse(String(inviteRow(fake, created.id).holdExpiresAt));
  const untouched = structuredClone(fake.rows);
  assert.deepEqual(
    await fake.transaction(admin, (req) =>
      lapseDueGuestInvites({ req, now: expires - 1 })
    ),
    { lapsed: [], deferred: [] }
  );
  assert.deepEqual(fake.rows, untouched, "nothing lapses before 48 hours");
  assert.deepEqual(
    await fake.transaction(admin, (req) =>
      lapseDueGuestInvites({ req, now: expires })
    ),
    { lapsed: [created.id], deferred: [] }
  );
  const row = inviteRow(fake, created.id);
  assert.equal(row.state, "lapsed");
  assert.equal(row.memberNotice, "lapsed");
  assert.equal(row.activeKey, null);
  assert.equal(typeof row.holdReleasedAt, "string");
  assert.equal(event(fake).reservedQuantity, 0, "the place is released");
  const lapsed = structuredClone(fake.rows);
  assert.deepEqual(
    await fake.transaction(admin, (req) =>
      lapseDueGuestInvites({ req, now: expires + 1000 })
    ),
    { lapsed: [], deferred: [] }
  );
  assert.deepEqual(fake.rows, lapsed, "a second run changes nothing");
  const again = await invite(fake);
  assert.notEqual(again.id, created.id);
  assert.equal(
    event(fake).reservedQuantity,
    1,
    "the member can send a new invite after a lapse"
  );
});

test("a paid invite never lapses", async () => {
  const fake = commerceStorageFake(seed());
  const { invite: created } = await paidInvite(fake);
  const paid = structuredClone(fake.rows);
  const later =
    Date.parse(String(inviteRow(fake, created.id).holdExpiresAt)) +
    GUEST_INVITE_HOLD_MS;
  assert.deepEqual(
    await fake.transaction(admin, (req) =>
      lapseDueGuestInvites({ req, now: later })
    ),
    { lapsed: [], deferred: [] }
  );
  assert.deepEqual(fake.rows, paid);
});

test("an invite with a live payment attempt is not lapsed, and no new attempt starts after its hold expires", async () => {
  const fake = commerceStorageFake(seed());
  const created = await invite(fake);
  const snapshot = guestSnapshot(created.id);
  await fake.transaction(member, (req) => reserve(req, "attempt", snapshot));
  const expires = Date.parse(String(inviteRow(fake, created.id).holdExpiresAt));
  const live = structuredClone(fake.rows);
  assert.deepEqual(
    await fake.transaction(admin, (req) =>
      lapseDueGuestInvites({ req, now: expires + 1 })
    ),
    { lapsed: [], deferred: [created.id] }
  );
  assert.deepEqual(fake.rows, live, "a pending card payment keeps its place");
  // A card charged before the deadline still confirms after it (the confirm path replays its reservation).
  inviteRow(fake, created.id).holdExpiresAt = new Date(
    Date.now() - 1000
  ).toISOString();
  await fake.transaction(member, (req) => reserve(req, "attempt", snapshot));

  const other = commerceStorageFake(seed());
  const stale = await invite(other);
  inviteRow(other, stale.id).holdExpiresAt = new Date(
    Date.now() - 1000
  ).toISOString();
  const before = structuredClone(other.rows);
  await other.transaction(member, (req) =>
    assert.rejects(reserve(req, "late", guestSnapshot(stale.id)), /hold/i)
  );
  assert.deepEqual(other.rows, before, "no new attempt after the hold expired");
});

test("a verified failed attempt keeps the invite's hold until the lapse releases it", async () => {
  const fake = commerceStorageFake(seed());
  const created = await invite(fake);
  await fake.transaction(member, (req) =>
    reserve(req, "attempt", guestSnapshot(created.id))
  );
  await fake.transaction(admin, (req) =>
    releaseReservation({
      req,
      attemptID: "attempt",
      verifiedReason: "verified-failure",
      providerEventID: "verified-failure-1"
    })
  );
  assert.equal(
    event(fake).reservedQuantity,
    1,
    "the failed attempt does not take the invite's place with it"
  );
  assert.equal(fake.rows.products[0].reservedQuantity, 0);
  assert.equal(fake.rows["commerce-allowances"][0].reservedQuantity, 0);
  assert.equal(inviteRow(fake, created.id).state, "pending_payment");
  const expires = Date.parse(String(inviteRow(fake, created.id).holdExpiresAt));
  assert.deepEqual(
    await fake.transaction(admin, (req) =>
      lapseDueGuestInvites({ req, now: expires })
    ),
    { lapsed: [created.id], deferred: [] }
  );
  assert.equal(event(fake).reservedQuantity, 0);
});

test("one open invite per member; full events, non-members and bad recipients hold nothing", async () => {
  const fake = commerceStorageFake(seed(2));
  await invite(fake);
  await assert.rejects(invite(fake), /already/i);
  await assert.rejects(
    invite(
      fake,
      { collection: "users", id: "applicant" },
      {},
      { ...deps, activeMember: async () => false }
    ),
    /member/i
  );
  await assert.rejects(
    invite(
      fake,
      { collection: "users", id: "other" },
      { guestEmail: "not-an-email" }
    ),
    /email/i
  );
  await assert.rejects(
    invite(fake, { collection: "users", id: "other" }, { guestName: " " }),
    /name/i
  );
  await assert.rejects(invite(fake, admin), /account/i);
  await assert.rejects(
    invite(
      fake,
      { collection: "users", id: "other" },
      {},
      {
        ...deps,
        loadOffer: async () =>
          ({ productID: "g", kind: "membership", event: { id: "e" } }) as never
      }
    ),
    /invite/i
  );
  assert.equal(
    event(fake).reservedQuantity,
    1,
    "rejected invites hold no place"
  );
  await invite(fake, { collection: "users", id: "second" });
  await assert.rejects(
    invite(fake, { collection: "users", id: "third" }),
    /capacity/i
  );
  assert.equal(event(fake).reservedQuantity, 2);
});

test("guest-invite products and invites cannot be bought through the wrong path", async () => {
  const fake = commerceStorageFake(seed());
  const created = await invite(fake);
  const snapshot = guestSnapshot(created.id);
  await fake.transaction(member, async (req) =>
    assert.rejects(
      reservePurchase({
        req,
        attemptID: "bare",
        customerID: "member",
        releaseID: "g",
        productID: "g",
        eventID: "e",
        quantity: 1,
        snapshotHash: "a".repeat(64)
      }),
      /invite/i
    )
  );
  await fake.transaction({ collection: "users", id: "stranger" }, async (req) =>
    assert.rejects(
      reserve(req, "foreign", { ...snapshot, customerID: "stranger" }),
      /invite/i
    )
  );
  const physical = commerceStorageFake({
    ...saleSeed(),
    "commerce-guest-invites": [{ ...inviteRow(fake, created.id), product: "p" }]
  });
  await physical.transaction(member, async (req) =>
    assert.rejects(
      reservePurchase({
        req,
        attemptID: "mixed",
        customerID: "member",
        releaseID: "p",
        productID: "p",
        eventID: "e",
        quantity: 1,
        snapshotHash: "a".repeat(64),
        guestInviteID: created.id
      }),
      /invite/i
    )
  );
  assert.equal((fake.rows["commerce-reservations"] ?? []).length, 0);
  assert.equal((physical.rows["commerce-reservations"] ?? []).length, 0);
});

test("a refunded paid invite gives its place back and frees the member to invite again", async () => {
  const fake = commerceStorageFake(seed(1));
  const { invite: created } = await paidInvite(fake);
  await fake.transaction(admin, (req) =>
    releaseReservation({
      req,
      attemptID: "attempt",
      verifiedReason: "confirmed-cancel",
      providerEventID: "verified-cancel-1"
    })
  );
  assert.equal(event(fake).committedQuantity, 0);
  assert.equal(fake.rows["commerce-admissions"][0].status, "revoked");
  const row = inviteRow(fake, created.id);
  assert.equal(row.state, "refunded");
  assert.equal(row.activeKey, null);
  await invite(fake);
  assert.equal(event(fake).reservedQuantity, 1);
});

test("account-bound claims and renaming refuse a guest invite's admission; the door check-in marks it used", async () => {
  const fake = commerceStorageFake(seed());
  const { invite: created } = await paidInvite(fake);
  const admissionID = fake.rows["commerce-admissions"][0].id;
  await fake.transaction(member, async (req) =>
    assert.rejects(issueGuestClaim({ req, admissionID }), /invite/i)
  );
  await fake.transaction(member, async (req) =>
    assert.rejects(
      assignGuestName({ req, admissionID, guestName: "Someone Else" }),
      /invite/i
    )
  );
  await fake.transaction(admin, (req) => checkInGuest({ req, admissionID }));
  assert.equal(fake.rows["commerce-admissions"][0].status, "checked-in");
  const row = inviteRow(fake, created.id);
  assert.equal(row.state, "used");
  assert.equal(typeof row.usedAt, "string");
  const used = structuredClone(fake.rows);
  await fake.transaction(admin, (req) => checkInGuest({ req, admissionID }));
  assert.deepEqual(fake.rows, used, "a second scan changes nothing");
});

test("a sold-out guest-invite offer holds no place", async () => {
  const fake = commerceStorageFake(seed());
  const soldOut = { ...deps, loadOffer: async () => ({ productID: "g", kind: "guest_invite", event: { id: "e" }, availableQuantity: 0 }) as never };
  await assert.rejects(invite(fake, member, {}, soldOut), /sold out/i);
  assert.equal(event(fake).reservedQuantity, 0);
  assert.equal((fake.rows["commerce-guest-invites"] ?? []).length, 0);
});
