import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import test, { type TestContext } from "node:test";
import type { Attempt } from "./payment-postgres-fixture";

const pending = { orders: 0, stock: 10, reserved: 1, allowance: 0, admissions: 0, fulfillment: 0, status: "pending" };
const settled = { orders: 1, stock: 9, reserved: 0, allowance: 1, admissions: 1, fulfillment: 1, status: "succeeded" };

function applicationWorker(t: TestContext, f: Attempt, mode: "crash" | "recover") {
  const child = fork(new URL("./payment-process-fixture.ts", import.meta.url), [], {
    execArgv: ["--import", "tsx"], stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: { ...process.env, I0_PROOF_WORKER: mode, I0_PROOF_ATTEMPT: JSON.stringify(f) },
  });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  let tail = "";
  for (const stream of [child.stdout, child.stderr]) stream?.on("data", (chunk) => { tail = (tail + String(chunk)).slice(-2048); });
  const exited = once(child, "exit");
  const message = Promise.race([
    once(child, "message").then(([value]) => value as { type: string; progress?: { pid: number }; effects?: unknown }),
    exited.then(([code, signal]) => { throw new Error(`Worker ended before proof: ${code}/${signal}; ${tail}`); }),
  ]);
  return { child, message, exited };
}

test("I0 isolated PostgreSQL payment durability", {
  skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== "1", timeout: 240_000,
}, async (t) => {
  const { isolateTransport, openProofDatabase, seedAttempt, confirmation, effects, nativeSession, nativeProgress, providerConfig } = await import("./payment-postgres-fixture");
  const { sql } = await import("@payloadcms/db-postgres");
  const { createLocalReq } = await import("payload");
  const { projectLocalResult } = await import("../../../src/lib/commerce/portone/result");
  const { readPortOneTransaction } = await import("../../../src/lib/commerce/portone/adapter");
  const { attemptAccountingSchema, settlementObservationSchema } = await import("../../../src/lib/commerce/portone/accounting");
  const { commerceSnapshotHash } = await import("../../../src/lib/commerce/snapshot-hash");
  isolateTransport(t);
  const continuations = new Set<Promise<unknown>>();
  const db = await openProofDatabase(true, continuations);
  t.after(db.close);
  t.diagnostic(`PostgreSQL ${db.version}; loopback only; provider evidence synthetic`);
  const step = async (name: string, action: (st: TestContext) => Promise<void>) => {
    let passed = false;
    await t.test(name, async (st) => {
      // Keep the preceding scenario's dispatches out of the shared 1s GET window.
      const continuation = setTimeout(1100).then(() => action(st));
      continuations.add(continuation);
      try { await continuation; passed = true; }
      finally { continuations.delete(continuation); }
    });
    return passed; // Stop the matrix at its first RED, including fixture errors.
  };
  if (!await step("native COMMIT plus repeat confirmation settles once", async (st) => {
    const f = await seedAttempt(db.payload);
    assert.deepEqual(await effects(db.control, f), pending);
    const start = db.sqlTrace.length;
    const attempt = await confirmation(db.payload, f);
    assert.equal((await attempt.runAdmitted()).status, 200);
    assert.equal(attempt.reads(), 2);
    assert.deepEqual(db.sqlTrace.slice(start), ["begin", "commit"]);
    assert.deepEqual(await effects(db.control, f), settled);
    const retry = await confirmation(db.payload, f);
    assert.equal((await retry.runAdmitted()).status, 200);
    assert.equal(retry.reads(), 0);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic(`database effects ${JSON.stringify(settled)}`);
  })) return;

  const assertUnknownOnRetry = async (f: Attempt) => {
    const retry = await confirmation(db.payload, f);
    const result = await retry.runAdmitted();
    assert.equal((await result.json()).outcome, "ownership-unknown");
    assert.equal(retry.reads(), 0);
    assert.deepEqual(await effects(db.control, f), pending);
  };
  // Capture the main adapter's financial transaction rejection before response
  // mapping; the separate ledger pool does not use this Drizzle instance.
  const captureFinancialRejection = (st: TestContext) => {
    const nativeTransaction = db.adapter.drizzle.transaction;
    const failures: unknown[] = [];
    st.mock.method(db.adapter.drizzle, "transaction", async function (this: typeof db.adapter.drizzle, ...args: Parameters<typeof nativeTransaction>) {
      try { return await Reflect.apply(nativeTransaction, this, args); }
      catch (error) {
        failures.push(error);
        throw error;
      }
    });
    return (statement: "commit" | "rollback") => {
      assert.equal(failures.length, 1, "only the financial transaction rejected");
      const [failure] = failures;
      assert.ok(failure instanceof Error && "query" in failure && typeof failure.query === "string");
      assert.equal(failure.query.trim().toLowerCase(), statement);
      assert.ok(failure.cause instanceof Error, "expected the underlying driver rejection");
      return failure.cause;
    };
  };
  if (!await step("PostgreSQL deferred constraint rejects actual COMMIT", async (st) => {
    await db.pool.query("CREATE TABLE i0_commit_parent (id int PRIMARY KEY); CREATE TABLE i0_commit_child (id int CONSTRAINT i0_deferred_settlement_fk REFERENCES i0_commit_parent(id) DEFERRABLE INITIALLY DEFERRED)");
    st.after(() => db.pool.query("DROP TABLE i0_commit_child, i0_commit_parent").then(() => {}));
    const f = await seedAttempt(db.payload);
    const start = db.sqlTrace.length;
    const rejection = captureFinancialRejection(st);
    const attempt = await confirmation(db.payload, f, { beforeConfirm: async (req) => {
      await (await nativeSession(req)).execute(sql`INSERT INTO i0_commit_child (id) VALUES (1)`);
    } });
    await assert.rejects(attempt.runAdmitted(), /Reconciliation completion unknown/);
    assert.equal(attempt.reads(), 2);
    assert.deepEqual(db.sqlTrace.slice(start), ["begin", "commit", "rollback"]);
    const driver = rejection("commit");
    assert.ok("code" in driver && "constraint" in driver);
    assert.equal(driver.code, "23503");
    assert.equal(driver.constraint, "i0_deferred_settlement_fk");
    assert.deepEqual(await effects(db.control, f), pending);
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM i0_commit_child")).rows[0].n, 0);
    await assertUnknownOnRetry(f);
    st.diagnostic("native COMMIT rejected; no effects; fresh request remains fenced without a provider GET");
  })) return;

  for (const fault of ["connection-kill", "rollback-rejection"] as const) {
    if (!await step(fault, async (st) => {
      const f = await seedAttempt(db.payload);
      const start = db.sqlTrace.length;
      let killed = false;
      const attempt = await confirmation(db.payload, f, { afterEffect: async (collection, req) => {
        if (collection !== "orders") return;
        const progress = await nativeProgress(req, f);
        assert.equal(progress.orders, 1);
        assert.equal(progress.stock, 10, "Kill occurs after order but before stock deduction");
        const result = await db.control.query("SELECT pg_terminate_backend($1) AS killed", [progress.pid]);
        assert.equal(result.rows[0].killed, true);
        killed = true;
        if (fault === "rollback-rejection") throw new Error("Injected callback rejection after connection termination");
      } });
      await assert.rejects(attempt.runAdmitted(), /Reconciliation completion unknown/);
      assert.equal(killed, true);
      assert.equal(attempt.reads(), 2);
      assert.equal(db.sqlTrace.slice(start).includes("rollback"), true, "Native rollback attempted on terminated connection");
      assert.deepEqual(await effects(db.control, f), pending);
      await assertUnknownOnRetry(f);
      st.diagnostic("backend terminated after uncommitted order; no effects; fresh request remains fenced");
    })) return;
  }

  if (!await step("second-read dispute remains discoverable after failed rollback", async (st) => {
    const f = await seedAttempt(db.payload);
    const start = db.sqlTrace.length;
    const rejection = captureFinancialRejection(st);
    let killed = false;
    const attempt = await confirmation(db.payload, f, { disputeOnSecondRead: true, beforeEvidence: async (req, read) => {
      if (read !== 2) return;
      const { pid } = await nativeProgress(req, f);
      assert.equal((await db.control.query("SELECT pg_terminate_backend($1) AS killed", [pid])).rows[0].killed, true);
      killed = true;
    } });
    await assert.rejects(attempt.runAdmitted(), /Reconciliation completion unknown/);
    assert.equal(killed, true);
    assert.equal(attempt.reads(), 2);
    assert.deepEqual(db.sqlTrace.slice(start), ["begin", "rollback"]);
    const driver = rejection("rollback");
    assert.ok(("code" in driver && driver.code === "57P01") ||
      /connection terminated|not queryable/i.test(driver.message), "rollback must reject on the terminated connection");
    assert.deepEqual(await effects(db.control, f), pending);
    const paymentID = f.transactionID.replaceAll("-", "");
    const committed = await db.control.query(
      "SELECT commerce_review_hold, commerce_resolution_conflict FROM transactions WHERE id=$1", [f.transactionID],
    );
    assert.deepEqual(committed.rows, [{ commerce_review_hold: false, commerce_resolution_conflict: false }]);
    const ledger = await db.control.query("SELECT state FROM commerce_reconciliations WHERE scope=$1", [`reconciliation-attempt:${f.transactionID}`]);
    assert.equal(ledger.rows.length, 1);
    const state = attemptAccountingSchema.parse(ledger.rows[0].state);
    const { startedAt: _startedAt, ...identity } = state.identity;
    assert.deepEqual(identity, { transactionID: f.transactionID, paymentID, customerID: f.customerID,
      cartID: f.cartID, snapshotHash: commerceSnapshotHash(f.snapshot) });
    const proof = { id: paymentID, storeId: providerConfig.storeId, status: "PAID",
      channel: { key: providerConfig.channelKey, type: "TEST" }, customer: { id: f.customerID }, currency: "KRW",
      amount: { total: f.snapshot.totalAmount, paid: f.snapshot.totalAmount, cancelled: 0 }, disputes: [true] };
    const hash = createHash("sha256").update(JSON.stringify([proof, "hold-only"])).digest("hex");
    assert.deepEqual(state.riskProofs, [{ hash, proof, holdOnly: true }]);
    assert.equal(state.ordinaryUsed, 2);
    const active = state.active;
    assert.ok(active);
    assert.equal(active.state, "unknown");
    assert.equal(active.dispatched, 2);
    const observations = await db.control.query("SELECT state FROM commerce_reconciliations WHERE scope IN ($1, $2)", [1, 2].map(
      sequence => `reconciliation-observation:${f.transactionID}:${active.token}:${sequence}`,
    ));
    const receipts = observations.rows.map(({ state }) => settlementObservationSchema.parse(state)).sort((a, b) => a.sequence - b.sequence);
    assert.deepEqual(receipts.map(({ sequence, observation }) => [sequence, observation]), [[1, "provider-paid"], [2, "review-required"]]);
    for (const receipt of receipts) {
      assert.deepEqual(receipt.identity, state.identity);
      assert.equal(receipt.token, active.token);
      assert.equal(receipt.generation, state.generation);
    }
    const fresh = await createLocalReq({ user: f.user }, db.payload);
    const row = await readPortOneTransaction(fresh, paymentID);
    assert.equal((await projectLocalResult(fresh, row)).outcome, "review-required");
    await assertUnknownOnRetry(f);
    st.diagnostic("retained second-read dispute remains visible without another GET or a financial write");
  })) return;

  if (!await step("a concurrent confirmer joins the admitted owner and replay returns one receipt", async (st) => {
    const f = await seedAttempt(db.payload);
    let release!: () => void;
    let entered!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const parked = new Promise<void>((resolve) => { entered = resolve; });
    const beforeConfirm = async (req: Parameters<typeof nativeProgress>[0]) => {
      assert.ok((await nativeProgress(req, f)).pid);
      entered();
      await barrier;
    };
    const first = await confirmation(db.payload, f, { beforeConfirm });
    const running = first.runAdmitted();
    try {
      await Promise.race([parked, running.then(() => { throw new Error("Settlement did not reach its native session"); })]);
      const second = await confirmation(db.payload, f);
      const joined = await second.runAdmitted();
      assert.equal(joined.status, 202);
      assert.equal((await joined.json()).outcome, "join");
      assert.equal(second.reads(), 0);
      assert.deepEqual(await effects(db.control, f), pending);
    } finally {
      release();
      await running;
    }
    const result = await running;
    assert.equal(result.status, 200);
    const replay = await confirmation(db.payload, f);
    const repeated = await replay.runAdmitted();
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).orderID, (await result.json()).orderID);
    assert.equal(first.reads(), 2);
    assert.equal(replay.reads(), 0);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic("one financial owner; a concurrent request joins without transport; replay returns the same order");
  })) return;

  if (!await step("SIGKILL during settlement leaves pending effects and a fenced restart", async (st) => {
    const f = await seedAttempt(db.payload);
    const crashed = applicationWorker(st, f, "crash");
    const parked = await crashed.message;
    assert.equal(parked.type, "parked");
    assert.ok(parked.progress?.pid);
    assert.deepEqual(await effects(db.control, f), pending, "Separate connection cannot observe uncommitted child effects");
    assert.equal(crashed.child.kill("SIGKILL"), true);
    const [, signal] = await crashed.exited;
    assert.equal(signal, "SIGKILL");
    for (let n = 0; n < 200; n++) {
      const active = await db.control.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid=$1", [parked.progress.pid]);
      if (active.rows[0].n === 0) break;
      await setTimeout(25);
    }
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid=$1", [parked.progress.pid])).rows[0].n, 0);
    assert.deepEqual(await effects(db.control, f), pending);
    const restarted = applicationWorker(st, f, "recover");
    assert.notEqual(restarted.child.pid, crashed.child.pid);
    const recovered = await restarted.message;
    assert.equal(recovered.type, "recovered");
    assert.deepEqual(recovered.effects, pending);
    assert.deepEqual(await restarted.exited, [0, null]);
    assert.deepEqual(await effects(db.control, f), pending);
    st.diagnostic("crash after order and before stock/allowance/admissions; fresh process joins the extant lease without another GET");
  })) return;
});
