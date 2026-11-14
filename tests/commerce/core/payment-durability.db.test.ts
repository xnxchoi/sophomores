import assert from "node:assert/strict";
import { fork } from "node:child_process";
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
  const { isolateTransport, openProofDatabase, seedAttempt, confirmation, effects, nativeSession, nativeProgress } = await import("./payment-postgres-fixture");
  const { sql } = await import("@payloadcms/db-postgres");
  const { createLocalReq } = await import("payload");
  const { assertPaymentRiskReviewed, PaymentReviewRequired } = await import("../../../src/lib/commerce/portone/review");
  isolateTransport(t);
  const continuations = new Set<Promise<unknown>>();
  const db = await openProofDatabase(true, continuations);
  t.after(db.close);
  t.diagnostic(`PostgreSQL ${db.version}; loopback only; provider evidence synthetic`);
  const step = async (name: string, action: (st: TestContext) => Promise<void>) => {
    let passed = false;
    await t.test(name, async (st) => {
      const continuation = action(st);
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
    assert.equal((await attempt.run()).status, 200);
    assert.deepEqual(db.sqlTrace.slice(start), ["begin", "commit"]);
    assert.deepEqual(await effects(db.control, f), settled);
    const retry = await confirmation(db.payload, f);
    assert.equal((await retry.run()).status, 200);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic(`database effects ${JSON.stringify(settled)}`);
  })) return;

  if (!await step("PostgreSQL deferred constraint rejects actual COMMIT", async (st) => {
    await db.pool.query("CREATE TABLE i0_commit_parent (id int PRIMARY KEY); CREATE TABLE i0_commit_child (id int REFERENCES i0_commit_parent(id) DEFERRABLE INITIALLY DEFERRED)");
    st.after(() => db.pool.query("DROP TABLE i0_commit_child, i0_commit_parent").then(() => {}));
    const f = await seedAttempt(db.payload);
    const start = db.sqlTrace.length;
    const attempt = await confirmation(db.payload, f, { beforeConfirm: async (req) => {
      await (await nativeSession(req)).execute(sql`INSERT INTO i0_commit_child (id) VALUES (1)`);
    } });
    await assert.rejects(attempt.run(), /outcome unknown/);
    assert.deepEqual(db.sqlTrace.slice(start), ["begin", "commit", "rollback"]);
    assert.deepEqual(await effects(db.control, f), pending);
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM i0_commit_child")).rows[0].n, 0);
    const retry = await confirmation(db.payload, f);
    assert.equal((await retry.run()).status, 200);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic("native COMMIT attempted and rejected; all effects pending before clean retry; retry settled once");
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
      await assert.rejects(attempt.run(), /outcome unknown/);
      assert.equal(killed, true);
      assert.equal(db.sqlTrace.slice(start).includes("rollback"), true, "Native rollback attempted on terminated connection");
      assert.deepEqual(await effects(db.control, f), pending);
      const retry = await confirmation(db.payload, f);
      assert.equal((await retry.run()).status, 200);
      assert.deepEqual(await effects(db.control, f), settled);
      st.diagnostic("backend terminated after uncommitted order; no success or partial committed effects; fresh retry settled once");
    })) return;
  }

  if (!await step("observed risk stays unknown after failed rollback and can be quarantined on recovery", async (st) => {
    const f = await seedAttempt(db.payload);
    let killed = false;
    const attempt = await confirmation(db.payload, f, { risk: true, beforeEvidence: async (req) => {
      const { pid } = await nativeProgress(req, f);
      assert.equal((await db.control.query("SELECT pg_terminate_backend($1) AS killed", [pid])).rows[0].killed, true);
      killed = true;
    } });
    await assert.rejects(attempt.run(), /rollback acknowledgement unavailable|outcome unknown/);
    assert.equal(killed, true);
    assert.deepEqual(await effects(db.control, f), pending);
    const input = { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", "") };
    await assert.rejects(assertPaymentRiskReviewed(attempt.req, input, undefined, attempt.deps), /risk remains unresolved/);
    const recovery = await confirmation(db.payload, f, { risk: true });
    const fresh = await createLocalReq({ user: f.user }, db.payload);
    await assert.rejects(assertPaymentRiskReviewed(fresh, input, undefined, recovery.deps), PaymentReviewRequired);
    assert.equal((await db.control.query("SELECT commerce_review_hold FROM transactions WHERE id=$1", [f.transactionID])).rows[0].commerce_review_hold, true);
    assert.deepEqual(await effects(db.control, f), pending);
    st.diagnostic("unacknowledged rollback remains unknown; same request blocked; fresh revalidated synthetic risk commits durable hold, with zero settlement effects");
  })) return;

  if (!await step("concurrent confirmations use separate backend connections and settle once", async (st) => {
    const f = await seedAttempt(db.payload);
    const pids = new Set<number>();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const beforeConfirm = async (req: Parameters<typeof nativeProgress>[0]) => {
      pids.add((await nativeProgress(req, f)).pid);
      if (pids.size === 2) release();
      await barrier;
    };
    const first = await confirmation(db.payload, f, { beforeConfirm });
    const second = await confirmation(db.payload, f, { beforeConfirm });
    const responses = await Promise.all([first.run(), second.run()]);
    assert.equal(pids.size, 2);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    const receipts = await Promise.all(responses.map((response) => response.json()));
    assert.equal(receipts[0].orderID, receipts[1].orderID);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic(`separate backend count ${pids.size}; identical canonical order; effects ${JSON.stringify(settled)}`);
  })) return;

  if (!await step("SIGKILL between settlement effects and application restart recover once", async (st) => {
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
    assert.deepEqual(recovered.effects, settled);
    assert.deepEqual(await restarted.exited, [0, null]);
    assert.deepEqual(await effects(db.control, f), settled);
    st.diagnostic(`crash after order and before stock/allowance/admissions; fresh process confirmed and replayed once; ${JSON.stringify(settled)}`);
  })) return;
});
