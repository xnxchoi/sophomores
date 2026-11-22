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
  const walletEnv = {
    MEMBER_WALLET_CHAIN_ID: "84532",
    MEMBER_WALLET_OWNER_ADDRESS: "0x" + "1".repeat(40),
  };
  for (const [key, fixtureValue] of Object.entries(walletEnv)) {
    const previous = process.env[key];
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
    process.env[key] = fixtureValue;
  }
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
  const wallets = async (f: Attempt) => (await db.control.query(
    `SELECT id, member_id, chain_i_d::int, status, active_slot, wallet_key, safe_address, owner_address, bound_at::text
      FROM member_wallets WHERE member_id=$1 OR active_slot=$2`, [f.customerID, f.customerID],
  )).rows;
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
    assert.deepEqual(await wallets(f), []);
    await settle(st, f);
    const first = await member(db.control, f.customerID);
    assert.equal(first.status, "approved");
    const grants = await keyGrants(f);
    assert.equal(grants.length, 1, "one key-grant intent per admission");
    assert.equal(grants[0].state, "awaiting_wallet");
    assert.equal(grants[0].mode, "member_safe");
    assert.equal(grants[0].beneficiary, f.customerID);
    const bound = await wallets(f);
    assert.equal(bound.length, 1);
    assert.equal(bound[0].member_id, f.customerID);
    assert.equal(bound[0].active_slot, f.customerID);
    assert.equal(bound[0].status, "active");
    assert.equal(bound[0].chain_i_d, 84532);
    assert.equal(bound[0].owner_address, walletEnv.MEMBER_WALLET_OWNER_ADDRESS);
    assert.match(bound[0].safe_address, /^0x[0-9a-f]{40}$/);
    assert.equal(bound[0].wallet_key, `84532:${bound[0].safe_address}`);
    await settle(st, f, true);
    assert.deepEqual(await member(db.control, f.customerID), first, "replay leaves status and row timestamp unchanged");
    assert.deepEqual(await keyGrants(f), grants, "replay records no second key grant");
    assert.deepEqual(await wallets(f), bound, "replay preserves the same wallet binding");
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
    await db.pool.query("CREATE TABLE sunday_commit_parent (id int PRIMARY KEY); CREATE TABLE sunday_commit_child (id int CONSTRAINT sunday_settlement_fk REFERENCES sunday_commit_parent(id) DEFERRABLE INITIALLY DEFERRED)");
    st.after(() => db.pool.query("DROP TABLE sunday_commit_child, sunday_commit_parent").then(() => {}));
    const f = await seed(db.payload, "applicant");
    const before = await member(db.control, f.customerID);
    let settlementTraceStart: number | undefined;
    let nativeFailure: unknown;
    const nativeTransaction = db.adapter.drizzle.transaction;
    st.mock.method(db.adapter.drizzle, "transaction", async function (this: typeof db.adapter.drizzle, ...args: Parameters<typeof nativeTransaction>) {
      const traceStartAtEntry = settlementTraceStart;
      try { return await Reflect.apply(nativeTransaction, this, args); }
      catch (error) {
        if (traceStartAtEntry === undefined && settlementTraceStart !== undefined) nativeFailure = error;
        throw error;
      }
    });
    await assert.rejects(confirm(f, { afterEffect: async (collection, req) => {
      if (collection !== "commerce-key-grant-intents") return;
      const session = await nativeSession(req);
      const { rows } = await session.execute(sql`SELECT
        (SELECT membership_status FROM users WHERE id=${f.customerID}::uuid) AS membership,
        (SELECT count(*)::int FROM member_wallets WHERE member_id=${f.customerID}::uuid) AS wallets,
        (SELECT count(*)::int FROM commerce_key_grant_intents WHERE payment_id=${f.transactionID}::uuid) AS intents`);
      assert.deepEqual(rows, [{ membership: "approved", wallets: 1, intents: 1 }]);
      await session.execute(sql`INSERT INTO sunday_commit_child (id) VALUES (1)`);
      // Start inside the finalizer after the separate provider preflight has committed.
      settlementTraceStart = db.sqlTrace.length;
    } }), /Reconciliation completion unknown/);
    assert.notEqual(settlementTraceStart, undefined, "settlement reached the wallet and intent writes");
    assert.deepEqual(db.sqlTrace.slice(settlementTraceStart), ["commit", "rollback"]);
    const pgFailure = nativeFailure instanceof Error && nativeFailure.cause instanceof Error ? nativeFailure.cause : nativeFailure;
    assert.ok(pgFailure instanceof Error && "code" in pgFailure && "constraint" in pgFailure);
    assert.equal(pgFailure.code, "23503");
    assert.equal(pgFailure.constraint, "sunday_settlement_fk");
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM sunday_commit_child")).rows[0].n, 0);
    assert.deepEqual(await effects(db.control, f), pending);
    assert.deepEqual(await member(db.control, f.customerID), before, "COMMIT failure rolled back the grant with the order");
    assert.deepEqual(await keyGrants(f), [], "COMMIT failure rolled back the key-grant intent too");
    assert.deepEqual(await wallets(f), [], "COMMIT failure rolled back the wallet binding too");
    st.diagnostic("settlement COMMIT rejected by its deferred foreign key; order, membership, wallet and intent all rolled back");
  });
});
