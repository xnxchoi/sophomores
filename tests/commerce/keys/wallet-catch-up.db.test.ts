import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { sql } from "@payloadcms/db-postgres";
import { createLocalReq, type PayloadRequest } from "payload";
import { withCommerceWrite } from "@/lib/commerce/access";
import { commerceSnapshotHash } from "@/lib/commerce/snapshot-hash";
import { inPaymentTransaction } from "@/lib/commerce/_shared/transaction";
import { recordMemberWallet } from "@/lib/commerce/keys/member-wallet";
import { loadWalletConfig, predictMemberSafe } from "@/lib/member-auth/wallet/safe";
import { WALLET_CATCH_UP_LIMITS, walletCatchUpPageQuery } from "@/lib/commerce/keys/wallet-catch-up";
import { down } from "@/payload/migrations/20261122_065037_wallet_catch_up";
import { isolateTransport, nativeSession, openProofDatabase, providerConfig, seedAttempt } from "../core/payment-postgres-fixture";
import { database, runRegisteredBatch, walletEnv } from "./support/wallet-catch-up-postgres";

const child = fileURLToPath(new URL("./support/wallet-catch-up-process.ts", import.meta.url));
const ready = process.env.W2_WALLET_DATABASE_TESTS === "1";
const pid = async (req: PayloadRequest) => Number((await (await nativeSession(req)).execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0].pid);

test("registered wallet catch-up uses durable, bounded PostgreSQL batches", { skip: !ready, timeout: 120_000 }, async (t) => {
  isolateTransport(t, database.port);
  const envBefore = Object.fromEntries(Object.keys(walletEnv).map((key) => [key, process.env[key]]));
  Object.assign(process.env, walletEnv);
  t.after(() => {
    for (const [key, value] of Object.entries(envBefore)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  let checkpointWritten: ((req: PayloadRequest) => Promise<void>) | undefined;
  const queries: { text: string; params: unknown[] }[] = [];
  const db = await openProofDatabase(true, new Set(), database, {
    checkpointWritten: async (req) => checkpointWritten?.(req),
    query: (text, params) => queries.push({ text, params }),
  });
  t.after(db.close);
  t.diagnostic(`PostgreSQL ${db.version}; Payload Local API queue and runByID; synthetic fixture addresses`);
  const config = loadWalletConfig(walletEnv);
  assert.ok(config);
  const seed = () => seedAttempt(db.payload);
  type Attempt = Awaited<ReturnType<typeof seed>>;
  const bind = async (f: Attempt) => {
    const req = await createLocalReq({ user: f.user }, db.payload);
    await inPaymentTransaction(req, () => recordMemberWallet(req, f.customerID, walletEnv));
  };
  const readCursor = async () => (await db.control.query(
    "SELECT cursor_i_d AS cursor, cycle_complete AS complete, last_inspected::int AS inspected, last_moved::int AS moved FROM member_wallet_catch_up",
  )).rows[0];
  const rowsFor = async (order: string) => (await db.control.query(
    "SELECT id, state::text, target, updated_at::text FROM commerce_key_grant_intents WHERE order_id=$1 ORDER BY id",
    [order],
  )).rows;
  const boundedBatch = async (mutations: number) => {
    queries.length = 0;
    const result = await runRegisteredBatch(db.payload);
    const limits = WALLET_CATCH_UP_LIMITS;
    const pages = queries.filter(({ text, params }) =>
      text.startsWith("SELECT id, created_at") && text.includes("ORDER BY created_at, id") && params.at(-1) === limits.selectedRows);
    assert.equal(pages.length, limits.pages);
    assert.equal(pages[0].params.at(-1), limits.selectedRows);
    // Payload has its own job queue/acknowledgement transactions. The owned
    // attachment transaction is the only one with the catch-up SQL settings.
    assert.equal(queries.filter(({ text }) => text.startsWith("SET LOCAL statement_timeout")).length, limits.transactions);
    assert.ok(queries.filter(({ text }) => text.includes("pg_advisory_xact_lock")).length <= limits.locks);
    assert.equal(queries.filter(({ text }) => text.startsWith('update "commerce_key_grant_intents"')).length, mutations);
    return result;
  };

  async function backlog(f: Attempt, held: number, eligible: number) {
    const order = randomUUID(), payment = randomUUID(), prefix = randomUUID().slice(0, 24);
    const tie = "2020-01-01T00:00:00.000Z";
    await db.payload.db.create({ collection: "orders", customID: order, data: {
      customer: f.customerID, commerceVersion: "commerce-v1", commerceAttemptID: payment, commerceSnapshot: f.snapshot,
      currency: "KRW", amount: f.snapshot.totalAmount, status: "processing",
    } });
    await db.payload.db.create({ collection: "transactions", customID: payment, data: {
      customer: f.customerID, cart: f.cartID, order, currency: "KRW", amount: f.snapshot.totalAmount,
      status: "succeeded", paymentMethod: "portone", portone: {
        paymentID: payment.replaceAll("-", ""), prepareKey: commerceSnapshotHash({ ...f.snapshot, cartID: payment }),
        snapshot: f.snapshot, snapshotHash: commerceSnapshotHash(f.snapshot),
        storeID: providerConfig.storeId, channelKey: providerConfig.channelKey,
      },
    } });
    // Synthetic backlog only: use set-based fixture writes so a 500-row proof
    // does not measure test setup round trips. Mutations under test use Payload.
    await db.control.query(`WITH admissions AS (
      INSERT INTO commerce_admissions (id, order_unit_key, unit, order_id, transaction_id, event_id, buyer_id, status, benefit_review)
      SELECT gen_random_uuid(), $1::text || ':' || n, n, $1::uuid, $2::uuid, $3::uuid, $4::uuid, 'available', n <= $5
      FROM generate_series(1, $5::int + $6::int) n RETURNING id, unit
    ) INSERT INTO commerce_key_grant_intents (id, operation_key, order_id, payment_id, entitlement_id, beneficiary_user_id, recipient_mode, state, attempts, created_at)
      SELECT ($7::text || lpad(unit::int::text, 12, '0'))::uuid, 'unlock-grant:v1:' || $1::text || ':' || unit::text,
      $1::uuid, $2::uuid, id, $4::uuid, 'member_safe', 'awaiting_wallet', 0, $8::timestamptz FROM admissions`,
    [order, payment, f.eventID, f.customerID, held, eligible, prefix, tie]);
    return { order, payment };
  }

  const reset = async () => {
    // Deactivate only disposable fixtures and finish the cursor cycle.
    await db.control.query("UPDATE commerce_key_grant_intents SET state='cancelled' WHERE state IN ('awaiting_wallet', 'pending')");
    await runRegisteredBatch(db.payload);
  };
  async function runChild(mode: string, expected: string, kill: boolean) {
    const worker = fork(child, [], { execArgv: ["--import", "tsx", "--import", "./tests/support/css-modules.mjs"],
      env: { ...process.env, W2_CHILD_MODE: mode },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const end = once(worker, "exit");
    try {
      const data = await Promise.race([
        once(worker, "message", { signal: AbortSignal.timeout(10_000) }).then(([message]) => message),
        end.then(() => { throw new Error(`Fresh worker exited before ${expected} barrier`); }),
      ]);
      assert.equal(data.type, expected);
      if (kill) {
        // Parent reads persisted facts while the child remains at the barrier.
        return { data, stop: async () => { worker.kill("SIGKILL"); await end; } };
      }
      assert.deepEqual(await end, [0, null]);
      return { data, stop: async () => {} };
    } catch (error) {
      worker.kill("SIGKILL");
      await end;
      throw error;
    }
  }

  await t.test("01 and 02: 500 same-member held rows cannot starve a tied eligible row; every pass is bounded", async () => {
    const f = await seed();
    await bind(f);
    const { order } = await backlog(f, 500, 1);
    const original = await rowsFor(order);
    let total = 0;
    let previous = "";
    for (let pass = 0; pass < 26; pass++) {
      const count = pass < 25 ? 20 : 1;
      const result = await boundedBatch(pass === 25 ? 1 : 0);
      total += result.inspected;
      assert.equal(result.inspected, count);
      assert.equal(result.held, pass < 25 ? count : 0);
      assert.equal(result.moved, pass < 25 ? 0 : 1);
      assert.equal(result.cycleComplete, pass === 25);
      const checkpoint = await readCursor();
      assert.equal(checkpoint.inspected, count);
      if (pass < 25) {
        assert.ok(checkpoint.cursor > previous);
        previous = checkpoint.cursor;
      }
    }
    assert.equal(total, 501);
    const records = await rowsFor(order);
    assert.deepEqual(records.slice(0, 500), original.slice(0, 500));
    assert.deepEqual(records[500].target, { chainID: 84532, lock: walletEnv.MEMBER_WALLET_LOCK_ADDRESS,
      recipient: (await predictMemberSafe(config, f.customerID)).safeAddress });
    assert.equal(records[500].state, "pending");
    await reset();
    const mixed = await backlog(f, 12, 30);
    const result = await boundedBatch(8);
    assert.deepEqual(result, { inspected: 20, held: 12, moved: 8, conflicts: 0, cycleComplete: false });
    assert.equal((await rowsFor(mixed.order)).filter((row) => row.state === "pending").length, 8);
    assert.equal(result.inspected, WALLET_CATCH_UP_LIMITS.rows);
    await reset();
  });

  await t.test("100,000 equal timestamps use the complete cursor as an index condition", async (st) => {
    const f = await seed();
    const { order } = await backlog(f, 100_000, 0);
    const tie = "2020-01-01T00:00:00.000Z";
    const { rows: [cursor] } = await db.control.query(
      "SELECT id FROM commerce_key_grant_intents WHERE order_id = $1 ORDER BY id OFFSET 99000 LIMIT 1", [order],
    );
    assert.ok(cursor);
    await db.control.query("ANALYZE commerce_key_grant_intents");
    const raw = await db.adapter.drizzle.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      ${walletCatchUpPageQuery(tie, { createdAt: tie, id: cursor.id })}`);
    const plan = (raw.rows[0]["QUERY PLAN"] as [{ Plan: Record<string, unknown> }])[0].Plan;
    const scan = (plan.Plans as Record<string, unknown>[])[0];
    assert.equal(plan["Actual Rows"], 21);
    assert.equal(scan["Index Name"], "wallet_catch_up_cursor_idx");
    assert.match(String(scan["Index Cond"]), /ROW\(created_at, id\) > ROW\(/);
    assert.equal(scan["Actual Rows"], 21);
    assert.equal(scan["Rows Removed by Filter"] ?? 0, 0);
    assert.ok(Number(scan["Shared Hit Blocks"]) + Number(scan["Shared Read Blocks"]) < 30);
    st.diagnostic(JSON.stringify({ cursor: cursor.id, scan }));
    await reset();
  });

  await t.test("03: kill fresh processes before commit and after commit before acknowledgement", async () => {
    await reset();
    for (const mode of ["before", "ack"]) {
      const f = await seed();
      await bind(f);
      const { order } = await backlog(f, 0, 21);
      const rows = await rowsFor(order);
      const cursor = await readCursor();
      const parked = await runChild(mode, mode, true);
      let committed: Awaited<ReturnType<typeof rowsFor>>;
      try {
        committed = await rowsFor(order);
        if (mode === "before") {
          assert.equal(parked.data.attached, 20);
          assert.equal(parked.data.moved, 20);
          assert.deepEqual(committed, rows);
          assert.deepEqual(await readCursor(), cursor);
        } else {
          assert.equal(committed.filter((row) => row.state === "pending").length, 20);
          assert.equal((await readCursor()).cursor, rows[19].id);
          const jobs = await db.control.query("SELECT count(*)::int AS n FROM payload_jobs WHERE processing AND completed_at IS NULL");
          assert.ok(jobs.rows[0].n > 0, "job not acknowledged yet");
        }
      } finally { await parked.stop(); }
      const recovery = await runChild("recover", "recovered", false);
      assert.equal(recovery.data.result.moved, mode === "before" ? 20 : 1);
      if (mode === "before") assert.equal((await runRegisteredBatch(db.payload)).moved, 1);
      const recovered = await rowsFor(order);
      assert.equal(recovered.length, 21);
      assert.ok(recovered.every((row) => row.state === "pending" && row.target?.recipient === recovered[0].target?.recipient));
      if (mode === "ack") assert.deepEqual(recovered.slice(0, 20), committed.slice(0, 20));
      assert.equal((await readCursor()).complete, true);
      await reset();
    }
  });

  await t.test("04: catch-up and same-member settlement contend without borrowing requests; both commit orders and rollback", async () => {
    await reset();
    for (const order of ["catch-up-first", "settlement-first", "settlement-rollback"] as const) {
      const f = await seed();
      await bind(f);
      const old = await backlog(f, 0, 1);
      const unrelated = await backlog(await seed(), 0, 1);
      const otherChain = await seed();
      const otherChainReq = await createLocalReq({ user: otherChain.user }, db.payload);
      await inPaymentTransaction(otherChainReq, () => recordMemberWallet(otherChainReq, otherChain.customerID, {
        ...walletEnv, MEMBER_WALLET_CHAIN_ID: "137",
      }));
      const wrongChain = await backlog(otherChain, 0, 1);
      const wrongChainBefore = await rowsFor(wrongChain.order);
      const currentOrder = randomUUID();
      await db.payload.db.create({ collection: "orders", customID: currentOrder, data: {
        customer: f.customerID, commerceVersion: "commerce-v1", commerceAttemptID: f.transactionID, commerceSnapshot: f.snapshot,
        currency: "KRW", amount: f.snapshot.totalAmount, status: "processing", transactions: [f.transactionID],
      } });
      let park!: (backend: number) => void;
      let release!: () => void;
      const parked = new Promise<number>((resolve) => { park = resolve; });
      const unblock = new Promise<void>((resolve) => { release = resolve; });
      const settle = async (hold: boolean, rollback: boolean) => {
        const req = await createLocalReq({ user: f.user }, db.payload);
        return inPaymentTransaction(req, async () => {
          await withCommerceWrite(req, () => req.payload.update({ collection: "transactions", id: f.transactionID, req,
            overrideAccess: true, data: { order: currentOrder, status: "succeeded" } }));
          const local = await (await nativeSession(req)).execute(sql`SELECT state::text FROM commerce_key_grant_intents WHERE payment_id=${f.transactionID}::uuid`);
          assert.deepEqual(local.rows, [{ state: "pending" }]);
          if (hold) { park(await pid(req)); await unblock; }
          if (rollback) throw new Error("fixture settlement rollback");
        });
      };
      if (order === "catch-up-first") checkpointWritten = async (req) => { park(await pid(req)); await unblock; };
      const first = order === "catch-up-first" ? runRegisteredBatch(db.payload) : settle(true, order === "settlement-rollback");
      first.catch(() => {});
      let second: Promise<unknown> | undefined;
      try {
        const blocker = await Promise.race([parked, first.then(() => { throw new Error("Transaction exited before contention barrier"); })]);
        second = order === "catch-up-first" ? settle(false, false) : runRegisteredBatch(db.payload);
        second.catch(() => {});
        const key = `commerce:member-wallet:${f.customerID}`;
        let waiting = false;
        for (let i = 0; i < 26; i++) {
          const report = await db.control.query(`WITH target AS (SELECT hashtextextended($2, 0) AS key)
            SELECT locks.pid FROM pg_locks AS locks CROSS JOIN target WHERE locks.locktype='advisory' AND NOT locks.granted
            AND locks.objsubid=1 AND locks.classid::bigint=((target.key >> 32) & 4294967295)
            AND locks.objid::bigint=(target.key & 4294967295) AND $1=ANY(pg_blocking_pids(locks.pid))`, [blocker, key]);
          if (report.rows.length) { waiting = true; break; }
          await delay(18);
        }
        assert.equal(waiting, true, `loser is blocked on this member wallet lock (${order})`);
        assert.deepEqual(await rowsFor(currentOrder), [], "no current outbox effect escapes early");
      } finally {
        release();
        checkpointWritten = undefined;
        if (order === "settlement-rollback") await assert.rejects(first, /fixture settlement rollback/);
        else await first;
        await second;
      }
      if (order === "settlement-rollback") {
        assert.deepEqual(await rowsFor(currentOrder), []);
        await settle(false, false);
      }
      await settle(false, false); // same succeeded payment, no second admission or intent
      const current = await rowsFor(currentOrder);
      const historical = await rowsFor(old.order);
      assert.equal(current.length, 1);
      assert.equal(historical.length, 1);
      assert.equal(historical[0].state, "pending");
      assert.deepEqual(current[0].target, historical[0].target);
      assert.equal((await rowsFor(unrelated.order))[0].target, null);
      assert.deepEqual(await rowsFor(wrongChain.order), wrongChainBefore);
      const counts = await db.control.query(`SELECT
        (SELECT count(*)::int FROM commerce_admissions WHERE order_id=$1) AS admissions,
        (SELECT count(*)::int FROM member_wallets WHERE member_id=$2) AS wallets`, [currentOrder, f.customerID]);
      assert.deepEqual(counts.rows[0], { admissions: 1, wallets: 1 });
      await reset();
    }
  });

  await t.test("rollback refuses to delete persisted progress or jobs", async () => {
    const checkpoint = await readCursor();
    assert.ok(checkpoint);
    const before = (await db.control.query("SELECT count(*)::int AS n FROM payload_jobs")).rows[0].n;
    assert.ok(before > 0);
    const req = await createLocalReq({}, db.payload);
    await assert.rejects(inPaymentTransaction(req, async () => {
      await down({ db: await nativeSession(req), req, payload: req.payload });
    }), (error: unknown) => {
      const cause = error instanceof Error ? error.cause : null;
      return cause instanceof Error && /rollback refused/.test(cause.message);
    });
    assert.deepEqual(await readCursor(), checkpoint);
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM payload_jobs")).rows[0].n, before);
  });
});
