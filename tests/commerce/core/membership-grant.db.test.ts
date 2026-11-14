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
  const { isolateTransport, openProofDatabase, seedAttempt, confirmation, effects, nativeSession } = await import("./payment-postgres-fixture");
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
    await settle(st, f, true);
    assert.deepEqual(await member(db.control, f.customerID), first, "replay leaves status and row timestamp unchanged");
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
    st.diagnostic(`deferred-constraint COMMIT failure (${String(outcome)}); order and membership both rolled back`);
  });
});
