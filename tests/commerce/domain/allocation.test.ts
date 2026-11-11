import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { type TestContext } from "node:test";
import { APIError, type PayloadRequest } from "payload";
import { claimGuestAdmission, grantOrderAdmissions, issueGuestClaim, redeemGuestBenefit } from "../../../src/lib/commerce/guests";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import { commerceStorageFake, saleSeed } from "./storage-fake";

type Doc = Record<string, unknown> & { id: string };
const eventKey = (event: string, account: string) => createHash("sha256").update(JSON.stringify([event, account])).digest("hex");
const actor = { collection: "users", id: "buyer" };
const token = "b".repeat(43);

function seed(specs = [{ id: "order", buyer: "buyer", event: "e", quantity: 3 }]) {
  const sale = saleSeed();
  const paid = specs.map((s) => {
    const snapshot = { version: 1 as const, customerID: s.buyer, cartID: "cart-" + s.id, productID: "p", eventID: s.event, releaseID: "p", quantity: s.quantity, currency: "KRW" as const, unitAmount: 10000, shippingAmount: 3000, totalAmount: s.quantity * 10000 + 3000, orderName: "Physical release", productVersion: "1", eventVersion: "1", shippingAddress: { country: "KR" as const, recipientName: "Delivery recipient", phone: "01012345678", postalCode: "12345", addressLine1: "Seoul" } };
    return { order: { id: s.id, commerceVersion: "commerce-v1", commerceAttemptID: "attempt-" + s.id, commerceSnapshot: snapshot, transactions: ["tx-" + s.id] }, transaction: { id: "tx-" + s.id, status: "succeeded", order: s.id, customer: s.buyer, amount: snapshot.totalAmount, currency: "KRW" }, reservation: { id: "reservation-" + s.id, attemptID: "attempt-" + s.id, customer: s.buyer, order: s.id, quantity: s.quantity, state: "settled", snapshotHash: commerceSnapshotHash(snapshot) } };
  });
  return { ...sale, orders: paid.map((p) => p.order), transactions: paid.map((p) => p.transaction), "commerce-reservations": paid.map((p) => p.reservation), "commerce-events": [...new Set(specs.map((s) => s.event))].map((id) => ({ ...sale["commerce-events"][0], id })), users: [{ id: "buyer", emailVerified: true }, { id: "recipient", emailVerified: true }] };
}

function admission(unit: number, extra: Record<string, unknown> = {}): Doc {
  return { id: "admission-" + unit, orderUnitKey: "order:" + unit, order: "order", transaction: "tx-order", event: "e", buyer: "buyer", unit, status: "available", ...extra };
}

function giftSeed(): Record<string, Doc[]> {
  const paid = seed();
  return { ...paid, orders: [...paid.orders, { id: "gift-order", commerceVersion: "commerce-v1", transactions: ["gift-tx"] }], transactions: [...paid.transactions, { id: "gift-tx", status: "succeeded", order: "gift-order" }], "commerce-admissions": [{ id: "gift", orderUnitKey: "gift-order:2", order: "gift-order", transaction: "gift-tx", event: "e", buyer: "sender", unit: 2, status: "available", guestName: "Invitation" }], "commerce-claims": [{ id: "gift-claim", admission: "gift", tokenDigest: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60_000).toISOString() }] };
}

const grant = (req: PayloadRequest, orderID = "order") => grantOrderAdmissions({ req, orderID, transactionID: "tx-" + orderID });

function captureLocks(t: Pick<TestContext, "mock">, req: PayloadRequest, locks: string[], afterLock?: (key: string) => void) {
  const db = req.payload.db as unknown as { sessions: Record<string, { db: { execute: (query: { queryChunks: unknown[] }) => Promise<void> } }> };
  const session = db.sessions[String(req.transactionID)].db;
  const original = session.execute.bind(session);
  t.mock.method(session, "execute", async (query: { queryChunks: unknown[] }) => {
    const keys = query.queryChunks.filter((chunk): chunk is string => typeof chunk === "string" && chunk.startsWith("commerce:"));
    await original(query);
    locks.push(...keys);
    keys.forEach((key) => afterLock?.(key));
  });
}

test("first settled physical order reserves exactly one self and leaves extra units pending gifts without activation", async () => {
  const fake = commerceStorageFake(seed());
  const before = structuredClone(fake.rows);
  const rows = await fake.transaction({ collection: "users", id: "untrusted-session" }, grant);
  assert.deepEqual(rows.map((r) => r.eventAccountKey ?? null), [eventKey("e", "buyer"), null, null]);
  assert.deepEqual(rows.map((r) => r.status), ["available", "available", "available"]);
  assert.equal(rows.every((r) => r.claimedAccount === undefined && r.guestName === undefined), true);
  assert.deepEqual(Object.fromEntries(Object.entries(fake.rows).filter(([name]) => name !== "commerce-admissions")), before, "allocation must not change financial, account or delivery records");
});

test("later distinct orders before activation are all gifts for the same buyer/event", async () => {
  const fake = commerceStorageFake(seed([{ id: "order", buyer: "buyer", event: "e", quantity: 2 }, { id: "later", buyer: "buyer", event: "e", quantity: 1 }]));
  await fake.transaction(actor, grant);
  const later = await fake.transaction(actor, (req) => grant(req, "later"));
  assert.equal(later.every((r) => r.eventAccountKey == null && r.claimedAccount == null), true);
  assert.equal(fake.rows["commerce-admissions"].filter((r) => r.eventAccountKey === eventKey("e", "buyer")).length, 1);
});

test("a prior gift claimed by this buyer makes every purchased unit a gift", async () => {
  const incoming = giftSeed();
  const fake = commerceStorageFake({ ...incoming, "commerce-admissions": [{ ...incoming["commerce-admissions"][0], claimedAccount: "buyer", status: "claimed", eventAccountKey: eventKey("e", "buyer") }] });
  const rows = await fake.transaction(actor, grant);
  assert.equal(rows.every((r) => r.eventAccountKey == null), true);
});

test("self occupancy is event-specific and based on immutable snapshot buyer, not the caller", async () => {
  const fake = commerceStorageFake(seed([{ id: "order", buyer: "buyer", event: "e", quantity: 1 }, { id: "other", buyer: "buyer", event: "e2", quantity: 1 }]));
  const first = await fake.transaction({ collection: "users", id: "recipient" }, grant);
  const other = await fake.transaction(actor, (req) => grant(req, "other"));
  assert.equal(first[0].eventAccountKey, eventKey("e", "buyer"));
  assert.equal(other[0].eventAccountKey, eventKey("e2", "buyer"));
});

for (const order of ["settlement-first", "claim-first"] as const) {
  test("serialized fake logical " + order + " interleaving shares one event/account authority", async () => {
    const fake = commerceStorageFake(giftSeed());
    const claim = () => fake.transaction(actor, (req) => claimGuestAdmission({ req, token }, async () => true));
    if (order === "claim-first") {
      await claim();
      const rows = await fake.transaction(actor, grant);
      assert.equal(rows.every((r) => r.eventAccountKey == null), true);
      assert.equal(typeof fake.rows["commerce-claims"][0].consumedAt, "string");
    } else {
      await fake.transaction(actor, grant);
      const before = structuredClone(fake.rows);
      await assert.rejects(claim(), (error: unknown) => error instanceof APIError && error.data?.code === "EVENT_ALREADY_BOUND");
      assert.deepEqual(fake.rows, before, "losing invitation remains unconsumed; fake has no rollback");
    }
    assert.equal(fake.rows["commerce-admissions"].filter((r) => r.eventAccountKey === eventKey("e", "buyer")).length, 1);
  });
}

test("fresh allocation takes order-admissions then the same late event-account lock as gift claims", async (t) => {
  const fake = commerceStorageFake(seed()); const locks: string[] = [];
  await fake.transaction(actor, async (req) => { captureLocks(t, req, locks); await grant(req); });
  assert.deepEqual(locks, ["commerce:order-admissions:order", "commerce:event-account:" + eventKey("e", "buyer")]);
});

test("complete replay validates every immutable identity and returns existing rows unchanged without occupancy relocking", async (t) => {
  const fake = commerceStorageFake(seed());
  const original = await fake.transaction(actor, grant); const before = structuredClone(fake.rows); const locks: string[] = [];
  const replay = await fake.transaction(actor, async (req) => { captureLocks(t, req, locks); return grant(req); });
  assert.deepEqual(replay, original);
  assert.deepEqual(fake.rows, before);
  assert.deepEqual(locks, ["commerce:order-admissions:order"]);
});

test("cleared/revoked rows in a still-settled complete grant never resurrect self occupancy on replay", async () => {
  const rows = [admission(1, { eventAccountKey: null, status: "revoked", returnAcceptedAt: "2026-11-01T00:00:00Z" }), admission(2), admission(3)];
  const fake = commerceStorageFake({ ...seed(), "commerce-admissions": rows }); const before = structuredClone(fake.rows);
  assert.deepEqual(await fake.transaction(actor, grant), rows);
  assert.deepEqual(fake.rows, before);
});

test("released reservations remain rejected even when historical complete allocation rows exist", async () => {
  const initial = seed();
  const fake = commerceStorageFake({ ...initial, "commerce-reservations": [{ ...initial["commerce-reservations"][0], state: "released", releaseReason: "accepted-return" }], "commerce-admissions": [admission(1, { eventAccountKey: null, status: "revoked" }), admission(2), admission(3)] });
  const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(actor, grant));
  assert.deepEqual(fake.rows, before);
});

for (const units of [[1], [2], [3], [1, 3]]) {
  test("partial existing grants fail before creating any missing unit: " + units.join(","), async () => {
    const fake = commerceStorageFake({ ...seed(), "commerce-admissions": units.map((unit) => admission(unit)) });
    const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(actor, grant));
    assert.deepEqual(fake.rows, before, "storage fake deliberately does not roll back writes");
  });
}

for (const mismatch of [{ transaction: "foreign" }, { event: "foreign" }, { buyer: "foreign" }, { order: "foreign" }, { unit: 2 }]) {
  test("a late mismatched grant fails before filling early gaps: " + Object.keys(mismatch)[0], async () => {
    const fake = commerceStorageFake({ ...seed(), "commerce-admissions": [admission(3, mismatch)] }); const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(actor, grant));
    assert.deepEqual(fake.rows, before);
  });
}

for (const corrupt of [{ buyer: "other" }, { event: "other" }, { claimedAccount: "other" }, { event: null }, { unit: 2 }]) {
  test("corrupted discovered self occupancy is unknown and cannot allocate: " + Object.keys(corrupt)[0], async () => {
    const fake = commerceStorageFake({ ...seed(), "commerce-admissions": [admission(1, { id: "occupied", orderUnitKey: "earlier:1", order: "earlier", eventAccountKey: eventKey("e", "buyer"), ...corrupt })] });
    const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(actor, grant), (error: unknown) => error instanceof Error && !(error instanceof APIError));
    assert.deepEqual(fake.rows, before);
  });
}

test("reserved self cannot issue a gift link or have its key overwritten by a preexisting bearer", async () => {
  const initial = giftSeed();
  const self = { ...initial["commerce-admissions"][0], buyer: "buyer", unit: 1, orderUnitKey: "gift-order:1", eventAccountKey: eventKey("e", "buyer") };
  const fake = commerceStorageFake({ ...initial, "commerce-admissions": [self] }); const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(actor, (req) => issueGuestClaim({ req, admissionID: "gift" })));
  for (const id of ["buyer", "recipient"]) await assert.rejects(fake.transaction({ collection: "users", id }, (req) => claimGuestAdmission({ req, token }, async () => true)), (error: unknown) => error instanceof APIError && error.data?.code === "CLAIM_UNAVAILABLE");
  assert.deepEqual(fake.rows, before);
});

for (const key of ["malformed", eventKey("e2", "buyer"), eventKey("e", "recipient"), "", 1]) {
  test("malformed/mismatched occupied admission key fails closed before issuance or gift mutation: " + String(key).slice(0, 12), async () => {
    const initial = giftSeed(); const fake = commerceStorageFake({ ...initial, "commerce-admissions": [{ ...initial["commerce-admissions"][0], buyer: "buyer", unit: 1, eventAccountKey: key }] }); const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(actor, (req) => issueGuestClaim({ req, admissionID: "gift" })));
    await assert.rejects(fake.transaction({ collection: "users", id: "recipient" }, (req) => claimGuestAdmission({ req, token }, async () => true)), (error: unknown) => error instanceof Error && !(error instanceof APIError));
    assert.deepEqual(fake.rows, before);
  });
}

test("an unoccupied gift still issues and claims without changing immutable financial/delivery ownership", async () => {
  const initial = giftSeed(); const fake = commerceStorageFake(initial);
  const link = await fake.transaction({ collection: "users", id: "sender" }, (req) => issueGuestClaim({ req, admissionID: "gift" }));
  const financial = structuredClone({ orders: fake.rows.orders, transactions: fake.rows.transactions, reservations: fake.rows["commerce-reservations"] });
  await fake.transaction({ collection: "users", id: "recipient" }, (req) => claimGuestAdmission({ req, token: link.token }, async () => true));
  assert.equal(fake.rows["commerce-admissions"][0].eventAccountKey, eventKey("e", "recipient"));
  assert.deepEqual({ orders: fake.rows.orders, transactions: fake.rows.transactions, reservations: fake.rows["commerce-reservations"] }, financial);
});


test("fresh allocation reads event occupancy after acquiring the late account lock", async (t) => {
  const fake = commerceStorageFake(seed()); const locks: string[] = [];
  const key = "commerce:event-account:" + eventKey("e", "buyer");
  const granted = await fake.transaction(actor, async (req) => {
    captureLocks(t, req, locks, (acquired) => {
      if (acquired === key) fake.rows["commerce-admissions"] = [admission(1, { id: "settled-while-waiting", orderUnitKey: "earlier:1", order: "earlier", eventAccountKey: eventKey("e", "buyer") })];
    });
    const original = req.payload.find.bind(req.payload);
    t.mock.method(req.payload, "find", async (args: Parameters<typeof original>[0]) => {
      if (args.where && "eventAccountKey" in args.where) assert.equal(locks.includes(key), true, "occupancy lookup must follow account lock acquisition");
      if (args.where && "order" in args.where) {
        assert.equal(args.limit, 4);
        assert.equal(args.depth, 0);
        assert.equal(args.overrideAccess, true);
        assert.equal(args.req === req, true);
      }
      return original(args);
    });
    return grant(req);
  });
  assert.equal(granted.every((row) => row.eventAccountKey == null), true);
  assert.equal(fake.rows["commerce-admissions"].filter((row) => row.eventAccountKey === eventKey("e", "buyer")).length, 1);
});

test("concurrently submitted distinct orders in the globally serialized fake still reserve only one self", async () => {
  const fake = commerceStorageFake(seed([{ id: "order", buyer: "buyer", event: "e", quantity: 1 }, { id: "later", buyer: "buyer", event: "e", quantity: 1 }]));
  await Promise.all([fake.transaction(actor, grant), fake.transaction(actor, (req) => grant(req, "later"))]);
  assert.equal(fake.rows["commerce-admissions"].length, 2);
  assert.equal(fake.rows["commerce-admissions"].filter((row) => row.eventAccountKey === eventKey("e", "buyer")).length, 1);
});

for (const mismatch of [{ transaction: "foreign" }, { event: "foreign" }, { buyer: "foreign" }, { order: "foreign" }, { unit: 2 }, { eventAccountKey: "broken" }]) {
  test("complete replay rejects immutable/corrupt last-unit mismatch without modifying historical rows: " + Object.keys(mismatch)[0], async () => {
    const fake = commerceStorageFake({ ...seed(), "commerce-admissions": [admission(1, { eventAccountKey: eventKey("e", "buyer") }), admission(2), admission(3, mismatch)] }); const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(actor, grant));
    assert.deepEqual(fake.rows, before);
  });
}

test("a corrupt discovered event occupancy remains unknown during an otherwise valid gift claim", async () => {
  const initial = giftSeed();
  const fake = commerceStorageFake({ ...initial, "commerce-admissions": [...initial["commerce-admissions"], admission(1, { id: "corrupt-occupancy", orderUnitKey: "earlier:1", order: "earlier", eventAccountKey: eventKey("e", "buyer"), claimedAccount: "another-account" })] });
  const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(actor, (req) => claimGuestAdmission({ req, token }, async () => true)), (error: unknown) => error instanceof Error && !(error instanceof APIError));
  assert.deepEqual(fake.rows, before);
});

test("claim locks remain order-benefits then admission then event-account; reserved self has no perks", async (t) => {
  const fake = commerceStorageFake(giftSeed()); const locks: string[] = [];
  await fake.transaction(actor, async (req) => { captureLocks(t, req, locks); await claimGuestAdmission({ req, token }, async () => true); });
  assert.deepEqual(locks, ["commerce:order-benefits:gift-order", "commerce:admission:gift", "commerce:event-account:" + eventKey("e", "buyer")]);
  const self = commerceStorageFake(seed());
  const rows = await self.transaction(actor, grant); const before = structuredClone(self.rows);
  const admin = { collection: "admins", _strategy: "staff-better-auth", role: "admin", id: "staff" };
  await assert.rejects(self.transaction(admin, (req) => redeemGuestBenefit({ req, admissionID: rows[0].id, kind: "part-i-drink", actionID: "pending-self-perk-01" })));
  assert.deepEqual(self.rows, before);
});


test("complete replay preserves a claimed gift's own account key rather than reverting it to buyer occupancy", async () => {
  const rows = [admission(1, { eventAccountKey: eventKey("e", "buyer") }), admission(2, { status: "claimed", claimedAccount: "recipient", eventAccountKey: eventKey("e", "recipient") }), admission(3)];
  const fake = commerceStorageFake({ ...seed(), "commerce-admissions": rows }); const before = structuredClone(fake.rows);
  assert.deepEqual(await fake.transaction(actor, grant), rows);
  assert.deepEqual(fake.rows, before);
});


for (const rows of [
  [admission(1, { orderUnitKey: "wrong-key" })],
  [admission(4)],
  [admission(1), admission(2), admission(3), admission(4)],
]) {
  test("order-scoped orphan/extra unit rows must fail before new writes: " + rows.map((row) => row.orderUnitKey).join(","), async () => {
    const fake = commerceStorageFake({ ...seed(), "commerce-admissions": rows }); const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(actor, grant));
    assert.deepEqual(fake.rows, before, "malformed keys cannot hide existing order allocations from replay validation");
  });
}
