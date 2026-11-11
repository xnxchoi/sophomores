import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createHash } from "node:crypto";
import { APIError, type PayloadRequest } from "payload";
import { claimGuestAdmission } from "../../../src/lib/commerce/guests";
import { commerceStorageFake, saleSeed } from "./storage-fake";

const token = "a".repeat(43);
const digest = createHash("sha256").update(token).digest("hex");
const customer = { collection: "users", id: "guest" };
const eventAccountKey = createHash("sha256").update(JSON.stringify(["e", "guest"])).digest("hex");
type Seed = Record<string, (Record<string, unknown> & { id: string })[]>;

function fixture(status = "claimed"): Seed {
  return { ...saleSeed(), users: [{ id: "guest", emailVerified: true, banned: false }],
    "commerce-admissions": [{ id: "admission", order: "order", buyer: "buyer", event: "e", unit: 2,
      guestName: "Guest", status, claimedAccount: "guest", eventAccountKey,
      checkedInAt: status === "checked-in" ? new Date(Date.now() - 2000).toISOString() : null }],
    "commerce-claims": [{ id: "claim", admission: "admission", tokenDigest: digest,
      expiresAt: new Date(Date.now() + 60_000).toISOString(), consumedAt: new Date(Date.now() - 5000).toISOString(), revokedAt: null }],
    "commerce-redemptions": [{ id: "drink", admission: "admission", kind: "part-i-drink", ordinal: 1 },
      { id: "transfer", admission: "admission", kind: "shared-transfer", ordinal: 1 }] };
}

function changed(seed: Seed, collection: string, data: Record<string, unknown>): Seed {
  return { ...seed, [collection]: [{ ...seed[collection][0], ...data }] };
}

function forbidWrites(req: PayloadRequest, t: TestContext) {
  const fail = async () => { assert.fail("Recovery attempted a write"); };
  const create = t.mock.method(req.payload, "create", fail);
  const update = t.mock.method(req.payload, "update", fail);
  const counter = t.mock.method(req.payload.db, "updateOne", fail);
  return () => {
    assert.equal(create.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 0);
    assert.equal(counter.mock.callCount(), 0);
  };
}

async function rejectsWithoutWrites(t: TestContext, seed: Seed, code?: string, active = true, user = customer) {
  const fake = commerceStorageFake(seed);
  const before = structuredClone(fake.rows);
  await fake.transaction(user, async (req) => {
    const assertNoWrites = forbidWrites(req, t);
    await assert.rejects(claimGuestAdmission({ req, token }, async () => active), (error: unknown) => {
      assert.ok(error instanceof Error);
      if (code) {
        assert.ok(error instanceof APIError);
        assert.deepEqual(error.data, { code });
        assert.equal(error.isPublic, true);
      } else assert.equal(error instanceof APIError, false);
      assert.equal(error.message.includes(token), false);
      assert.equal(error.message.includes("private-other-account"), false);
      return true;
    });
    assertNoWrites();
  });
  assert.deepEqual(fake.rows, before);
}

for (const status of ["claimed", "checked-in"]) {
  test("lost successful receipt recovers the same " + status + " admission with zero attempted writes", async (t) => {
    const fake = commerceStorageFake(fixture(status));
    const before = structuredClone(fake.rows);
    for (let replay = 0; replay < 2; replay++) {
      await fake.transaction(customer, async (req) => {
        forbidWrites(req, t);
        assert.deepEqual(await claimGuestAdmission({ req, token }, async (id) => {
          assert.equal(id, "guest"); return true;
        }), { admissionID: "admission" });
      });
    }
    assert.deepEqual(fake.rows, before);
  });
}

test("initial claim followed by lost-response replay binds once without resetting benefits", async (t) => {
  const seed = changed(changed(fixture(), "commerce-claims", { consumedAt: null }), "commerce-admissions", {
    status: "available", claimedAccount: null, eventAccountKey: null,
  });
  const fake = commerceStorageFake(seed);
  await fake.transaction(customer, async (req) => {
    assert.deepEqual(await claimGuestAdmission({ req, token }, async () => true), { admissionID: "admission" });
  });
  const afterInitial = structuredClone(fake.rows);
  await fake.transaction(customer, async (req) => {
    forbidWrites(req, t);
    assert.deepEqual(await claimGuestAdmission({ req, token }, async () => true), { admissionID: "admission" });
  });
  assert.deepEqual(fake.rows, afterInitial);
});

test("serialized-model concurrent replays return one original admission with zero writes", async (t) => {
  const fake = commerceStorageFake(fixture());
  const before = structuredClone(fake.rows);
  const results = await Promise.all(Array.from({ length: 3 }, () => fake.transaction(customer, async (req) => {
    forbidWrites(req, t);
    return claimGuestAdmission({ req, token }, async () => true);
  })));
  assert.deepEqual(results, Array.from({ length: 3 }, () => ({ admissionID: "admission" })));
  assert.deepEqual(fake.rows, before);
});

test("serialized-model competing initial same-account claims bind only once", async (t) => {
  const seed = changed(changed(fixture(), "commerce-claims", { consumedAt: null }), "commerce-admissions", {
    status: "available", claimedAccount: null, eventAccountKey: null,
  });
  const fake = commerceStorageFake(seed);
  let writes = 0;
  const results = await Promise.all(Array.from({ length: 3 }, () => fake.transaction(customer, async (req) => {
    const update = req.payload.update.bind(req.payload);
    t.mock.method(req.payload, "update", async (...args: Parameters<typeof update>) => { writes++; return update(...args); });
    t.mock.method(req.payload, "create", async () => assert.fail("No new allocation"));
    t.mock.method(req.payload.db, "updateOne", async () => assert.fail("No counter changes"));
    return claimGuestAdmission({ req, token }, async () => true);
  })));
  assert.deepEqual(results, Array.from({ length: 3 }, () => ({ admissionID: "admission" })));
  assert.equal(writes, 2, "Only the first request binds admission and consumes bearer");
  assert.equal(fake.rows["commerce-admissions"].length, 1);
});

test("foreign consumed claimant retains private precedence even when expired or ineligible", async (t) => {
  const seed = changed(fixture(), "commerce-claims", { expiresAt: new Date(Date.now() - 1000).toISOString() });
  await rejectsWithoutWrites(t, seed, "CLAIM_CONSUMED", false, { ...customer, id: "private-other-account" });
});

for (const [name, collection, data, code] of [
  ["expired", "commerce-claims", { expiresAt: new Date(0).toISOString() }, "CLAIM_EXPIRED"],
  ["cutoff", "commerce-events", { claimCutoffAt: new Date(0).toISOString() }, "CLAIM_EXPIRED"],
  ["revoked", "commerce-claims", { revokedAt: new Date().toISOString() }, "CLAIM_UNAVAILABLE"],
  ["invalid expiry", "commerce-claims", { expiresAt: "invalid" }, undefined],
  ["invalid cutoff", "commerce-events", { claimCutoffAt: "invalid" }, undefined],
  ["invalid consumed timestamp", "commerce-claims", { consumedAt: "invalid" }, undefined],
  ["future consumed timestamp", "commerce-claims", { consumedAt: new Date(Date.now() + 60_000).toISOString() }, undefined],
  ["missing key", "commerce-admissions", { eventAccountKey: null }, undefined],
  ["wrong key", "commerce-admissions", { eventAccountKey: "wrong" }, undefined],
  ["wrong event", "commerce-admissions", { event: "another-event" }, undefined],
  ["unverified", "users", { emailVerified: false }, "ACCOUNT_NOT_ELIGIBLE"],
  ["banned", "users", { banned: true }, "ACCOUNT_NOT_ELIGIBLE"],
  ["payment hold", "transactions", { commerceReviewHold: true }, undefined],
  ["payment pending", "transactions", { status: "pending" }, undefined],
  ["admission hold", "commerce-admissions", { benefitReview: true }, undefined],
  ["accepted return", "commerce-admissions", { returnAcceptedAt: new Date().toISOString() }, undefined],
  ["revoked admission", "commerce-admissions", { status: "revoked" }, "CLAIM_CONSUMED"],
  ["unactivated admission", "commerce-admissions", { status: "available" }, "CLAIM_CONSUMED"],
  ["unconsumed own occupancy", "commerce-claims", { consumedAt: null }, "CLAIM_UNAVAILABLE"],
  ["unattributed consumption", "commerce-admissions", { claimedAccount: null, eventAccountKey: null }, "CLAIM_CONSUMED"],
] as const) {
  test("recovery remains fail closed: " + name, async (t) => {
    await rejectsWithoutWrites(t, changed(fixture(), collection, data), code);
  });
}

test("inactive same claimant cannot recover", async (t) => {
  await rejectsWithoutWrites(t, fixture(), "ACCOUNT_NOT_ELIGIBLE", false);
});

for (const fault of ["claim-link", "admission-id", "occupied-missing", "occupied-id", "occupied-account", "occupied-event", "read", "lock", "eligibility"] as const) {
  test("under-lock recovery integrity/storage failure: " + fault, async (t) => {
    const fake = commerceStorageFake(fixture());
    const before = structuredClone(fake.rows);
    await fake.transaction(customer, async (req) => {
      const assertNoWrites = forbidWrites(req, t);
      const read = req.payload.findByID.bind(req.payload);
      t.mock.method(req.payload, "findByID", async (args: Parameters<typeof read>[0]) => {
        const row = await read(args);
        if (fault === "read") throw new Error("storage unavailable");
        if (fault === "claim-link" && String(args.collection) === "commerce-claims") return { ...row, admission: "another-admission" };
        if (fault === "admission-id" && String(args.collection) === "commerce-admissions") return { ...row, id: "another-admission" };
        return row;
      });
      const find = req.payload.find.bind(req.payload);
      t.mock.method(req.payload, "find", async (args: Parameters<typeof find>[0]) => {
        const result = await find(args);
        if (String(args.collection) !== "commerce-admissions") return result;
        if (fault === "occupied-missing") return { ...result, docs: [], totalDocs: 0 };
        const data = fault === "occupied-id" ? { id: "another-admission" }
          : fault === "occupied-account" ? { claimedAccount: "private-other-account" }
          : fault === "occupied-event" ? { event: "another-event" } : {};
        return { ...result, docs: result.docs.map((doc) => ({ ...doc, ...data })) };
      });
      if (fault === "lock") {
        const session = (req.payload.db as unknown as { sessions: Record<string, { db: { execute: () => Promise<void> } }> }).sessions[String(req.transactionID)];
        t.mock.method(session.db, "execute", async () => { throw new Error("lock failed"); });
      }
      await assert.rejects(claimGuestAdmission({ req, token }, async () => {
        if (fault === "eligibility") throw new Error("readiness storage unavailable");
        return true;
      }), (error: unknown) => error instanceof Error && !(error instanceof APIError));
      assertNoWrites();
    });
    assert.deepEqual(fake.rows, before);
  });
}
