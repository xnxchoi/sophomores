import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test, { type TestContext } from "node:test";
import type { Payload } from "payload";
import type { Pool } from "pg";

// Disposable loopback container created for this proof only and removed afterwards.
const target = { container: "sphmrs-sunday-membership-20261114", port: 55491, database: "sunday_membership_proof" };
const pending = { orders: 0, stock: 10, reserved: 1, allowance: 0, admissions: 0, fulfillment: 0, status: "pending" };
const settled = { orders: 1, stock: 9, reserved: 0, allowance: 1, admissions: 1, fulfillment: 1, status: "succeeded" };

test("Sunday launch: membership is granted in the settle transaction", {
  skip: process.env.SUNDAY_MEMBERSHIP_DATABASE_TESTS !== "1", timeout: 240_000,
}, async (t) => {
  const { isolateTransport, openProofDatabase, seedAttempt, initiateAttempt, confirmation, effects, nativeSession } = await import("./payment-postgres-fixture");
  const { createLocalReq } = await import("payload");
  const { sql } = await import("@payloadcms/db-postgres");
  const { runReconciliation } = await import("../../../src/lib/commerce/portone/admission");
  const { assertPaymentRiskReviewed } = await import("../../../src/lib/commerce/portone/review");
  isolateTransport(t, target.port);
  const continuations = new Set<Promise<unknown>>();
  const db = await openProofDatabase(true, continuations, target);
  t.after(db.close);
  t.diagnostic(`PostgreSQL ${db.version}; loopback only; provider evidence synthetic`);
  const member = async (pool: Pick<Pool, "query">, id: string) => (await pool.query(
    "SELECT membership_status AS status, updated_at::text AS updated FROM users WHERE id=$1::uuid", [id])).rows[0] as { status: string; updated: string };
  // Fixture preparation only (as the shared fixture seeds rows); settlement uses Local API/hooks.
  const seed = async (payload: Payload, status: string) => {
    const f = await seedAttempt(payload);
    await payload.db.updateOne({ collection: "users", id: f.customerID, data: { membershipStatus: status } });
    assert.equal((await member(db.control, f.customerID)).status, status);
    return f;
  };
  type Attempt = Awaited<ReturnType<typeof seedAttempt>>;
  // ADR-0004: settlement also records the key each admission is owed, in the same transaction.
  const keyGrants = async (f: Attempt) => (await db.control.query(
    "SELECT state::text, recipient_mode::text AS mode, beneficiary_user_id::text AS beneficiary, operation_key AS key FROM commerce_key_grant_intents WHERE payment_id=$1::uuid",
    [f.transactionID])).rows as { state: string; mode: string; beneficiary: string; key: string }[];
  // Same ownership path as the reconciliation proof: ledger-owned official confirmation.
  const confirm = async (f: Attempt, options?: Parameters<typeof confirmation>[2]) => {
    await delay(1100); // Global provider-GET rate (5/s) and per-attempt cooldown, as in the reconciliation proof.
    const attempt = await confirmation(db.payload, f, options);
    return runReconciliation(attempt.req, { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", ""), cartID: f.cartID }, "confirm", async () => {
      await assertPaymentRiskReviewed(attempt.req, attempt.req.data as { transactionID: string; paymentID: string }, undefined, attempt.deps);
      return attempt.run();
    }, attempt.deps);
  };
  const settle = async (st: TestContext, f: Attempt, replay = false) => {
    const response = await confirm(f);
    assert.equal(replay ? [200, 202].includes(response.status) : response.status === 200, true, `status ${response.status}`);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic(replay ? `replay answered ${response.status}; effects unchanged` : "order settled once");
  };

  await t.test("first settle approves an applicant; replay changes nothing", async (st) => {
    const f = await seed(db.payload, "applicant");
    await settle(st, f);
    const first = await member(db.control, f.customerID);
    assert.equal(first.status, "approved");
    const grants = await keyGrants(f);
    assert.equal(grants.length, 1, "one key-grant intent per admission");
    assert.equal(grants[0].state, "awaiting_wallet");
    assert.equal(grants[0].mode, "member_safe");
    assert.equal(grants[0].beneficiary, f.customerID);
    await settle(st, f, true);
    assert.deepEqual(await member(db.control, f.customerID), first, "replay leaves status and row timestamp unchanged");
    assert.deepEqual(await keyGrants(f), grants, "replay records no second key grant");
  });

  await t.test("today's checkout initiates through the real adapter and settles end to end", async (st) => {
    // initiatePayment keys the transaction by the id it chose; Payload honours it only with allowIDOnCreate.
    const f = await initiateAttempt(db.payload);
    assert.equal((await member(db.control, f.customerID)).status, "applicant");
    const created = (await db.control.query("SELECT status::text FROM transactions WHERE id=$1::uuid", [f.transactionID])).rows;
    assert.deepEqual(created, [{ status: "pending" }], "the transaction exists under the adapter's id");
    const reserved = (await db.control.query("SELECT state::text FROM commerce_reservations WHERE attempt_i_d=$1", [f.transactionID])).rows;
    assert.deepEqual(reserved, [{ state: "reserved" }]);
    assert.deepEqual(await effects(db.control, f), pending);
    await settle(st, f);
    assert.equal((await member(db.control, f.customerID)).status, "approved");
    const grants = await keyGrants(f);
    assert.equal(grants.length, 1);
    assert.equal(grants[0].mode, "member_safe");
    st.diagnostic("real initiatePayment -> reserve -> confirm -> settle; membership approved; one key-grant intent");
  });

  await t.test("only an explicit server opt-in keeps a supplied id; a REST-style create gets a server-chosen id", async () => {
    const { serverChosenIDContext } = await import("../../../src/payload/server-chosen-ids");
    const chosen = "00000000-0000-4000-8000-0000000000aa";
    const rest = await createLocalReq({}, db.payload);
    rest.payloadAPI = "REST";
    const fromClient = await db.payload.create({ collection: "users", req: rest, overrideAccess: true, data: { id: chosen, email: "rest@fixture.invalid" } as never });
    assert.notEqual(String(fromClient.id), chosen, "a client-supplied id is ignored");
    const local = await db.payload.create({ collection: "users", overrideAccess: true, data: { id: chosen, email: "local@fixture.invalid" } as never });
    assert.notEqual(String(local.id), chosen, "a Local API id without the explicit opt-in is ignored too");
    const optedIn = await db.payload.create({ collection: "users", req: rest, overrideAccess: true, context: serverChosenIDContext(chosen),
      data: { id: chosen, email: "opted-in@fixture.invalid" } as never });
    assert.equal(String(optedIn.id), chosen, "server code keeps an id it opted in for, even on a REST request");
  });

  await t.test("invited and waitlist accounts are approved", async (st) => {
    for (const status of ["invited", "waitlist"]) {
      const f = await seed(db.payload, status);
      await settle(st, f);
      assert.equal((await member(db.control, f.customerID)).status, "approved", status);
    }
  });

  await t.test("staff and suspended accounts are untouched", async (st) => {
    for (const status of ["staff", "suspended"]) {
      const f = await seed(db.payload, status);
      const before = await member(db.control, f.customerID);
      await settle(st, f);
      assert.deepEqual(await member(db.control, f.customerID), before, status);
    }
  });

  await t.test("a rolled-back settle leaves the status unchanged", async (st) => {
    await db.pool.query("CREATE TABLE sunday_commit_parent (id int PRIMARY KEY); CREATE TABLE sunday_commit_child (id int REFERENCES sunday_commit_parent(id) DEFERRABLE INITIALLY DEFERRED)");
    st.after(() => db.pool.query("DROP TABLE sunday_commit_child, sunday_commit_parent").then(() => {}));
    const f = await seed(db.payload, "applicant");
    const before = await member(db.control, f.customerID);
    const start = db.sqlTrace.length;
    let reached = false;
    const outcome = await confirm(f, { beforeConfirm: async (req) => {
      reached = true;
      await (await nativeSession(req)).execute(sql`INSERT INTO sunday_commit_child (id) VALUES (1)`);
    } }).then((response) => response.status, (error: unknown) => error instanceof Error ? error.message : "rejected");
    assert.equal(reached, true, "the settle transaction ran to COMMIT");
    assert.notEqual(outcome, 200);
    assert.equal(db.sqlTrace.slice(start).includes("rollback"), true);
    assert.deepEqual(await effects(db.control, f), pending);
    assert.deepEqual(await member(db.control, f.customerID), before, "COMMIT failure rolled back the grant with the order");
    assert.deepEqual(await keyGrants(f), [], "COMMIT failure rolled back the key-grant intent too");
    st.diagnostic(`deferred-constraint COMMIT failure (${String(outcome)}); order and membership both rolled back`);
  });
});
