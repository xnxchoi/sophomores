import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { sql } from "@payloadcms/db-postgres";
import { createLocalReq, type PayloadRequest } from "payload";
import { inPaymentTransaction, lockCommerce } from "@/lib/commerce/_shared/transaction";
import { withCommerceWrite } from "@/lib/commerce/access";
import { attachBoundMemberWalletGrant } from "@/lib/commerce/keys/wallet-attachment";
import { recordMemberWallet } from "@/lib/commerce/keys/member-wallet";
import { dispatchKeyGrants } from "@/lib/commerce/keys/worker";
import { assertPaymentRiskReviewed } from "@/lib/commerce/portone/review";
import { runReconciliation } from "@/lib/commerce/portone/admission";
import type { KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { loadWalletConfig, predictMemberSafe } from "@/lib/member-auth/wallet/safe";
import { confirmation, isolateTransport, nativeSession, openProofDatabase, seedAttempt } from "../core/payment-postgres-fixture";

const target = { container: "sphmrs-w1-proof-ac40165f", port: 55521, database: "sphmrs_wallet_w1_proof" };
const env = {
  MEMBER_WALLET_CHAIN_ID: "84532",
  MEMBER_WALLET_OWNER_ADDRESS: "0x1111111111111111111111111111111111111111",
  MEMBER_WALLET_LOCK_ADDRESS: "0x2222222222222222222222222222222222222222",
} as const;
const postgres = process.env.W1_WALLET_DATABASE_TESTS === "1";

async function backend(req: PayloadRequest) {
  const { rows } = await (await nativeSession(req)).execute(sql`SELECT pg_backend_pid() AS pid`);
  return Number(rows[0]?.pid);
}

function configureSettlement(t: TestContext) {
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, env);
}

test("W1 binds only the canonical Safe in real PostgreSQL", { skip: !postgres, timeout: 100_000 }, async (t) => {
  isolateTransport(t, target.port);
  const db = await openProofDatabase(true, new Set(), target);
  t.after(db.close);
  t.diagnostic(`PostgreSQL ${db.version}, isolated loopback, no chain transport`);
  const config = loadWalletConfig(env);
  assert.ok(config);
  const grantTarget = async (buyer: string) => ({
    chainID: config.chainID, lock: env.MEMBER_WALLET_LOCK_ADDRESS, recipient: (await predictMemberSafe(config, buyer)).safeAddress,
  });
  // A committed synthetic order/admission makes the same-order worker able to
  // select the row while the real transaction afterChange hook is still running.
  async function seed(state: "succeeded" | "pending", alreadyAttached = false) {
    const f = await seedAttempt(db.payload);
    const order = randomUUID(), admission = randomUUID(), intent = randomUUID();
    const operationKey = `unlock-grant:v1:${order}:1`;
    const req = await createLocalReq({ user: f.user }, db.payload);
    const binding = await grantTarget(f.customerID);
    await db.payload.db.create({ collection: "orders", customID: order, data: {
      customer: f.customerID, commerceVersion: "commerce-v1", commerceAttemptID: f.transactionID, commerceSnapshot: f.snapshot,
      currency: "KRW", amount: f.snapshot.totalAmount, status: "processing", transactions: [f.transactionID],
    } });
    await db.payload.db.create({ collection: "commerce-admissions", customID: admission, data: {
      orderUnitKey: `${order}:1`, unit: 1, order, transaction: f.transactionID, event: f.eventID,
      buyer: f.customerID, status: "available",
    } });
    await db.payload.db.create({ collection: "commerce-key-grant-intents", customID: intent, data: {
      operationKey, order, payment: f.transactionID, entitlement: admission, beneficiaryUser: f.customerID,
      recipientMode: "member_safe", state: alreadyAttached ? "pending" : "awaiting_wallet", attempts: 0,
      ...(alreadyAttached ? { target: binding } : {}),
    } });
    if (state === "succeeded") {
      await db.payload.db.updateOne({ collection: "transactions", id: f.transactionID, data: { order, status: state } });
    }
    return { ...f, order, admission, intent, operationKey, binding, req };
  }
  type Fixture = Awaited<ReturnType<typeof seed>>;
  const read = async (f: Pick<Fixture, "transactionID">) => (await db.control.query(
    "SELECT id::text, state::text, target, beneficiary_user_id::text AS buyer, attempts::int, updated_at::text AS updated FROM commerce_key_grant_intents WHERE payment_id=$1",
    [f.transactionID],
  )).rows;
  const attach = async (f: Fixture, environment: Readonly<Record<string, string | undefined>> = env) => {
    const req = await createLocalReq({ user: f.user }, db.payload);
    return inPaymentTransaction(req, () => attachBoundMemberWalletGrant(req, f.intent, environment));
  };
  const bind = (f: Fixture) => inPaymentTransaction(f.req, () => recordMemberWallet(f.req, f.customerID, env));
  async function waitForOrderBenefits(pid: number, orderID: string) {
    for (let i = 0; i < 120; i++) {
      const result = await db.control.query(`WITH target AS (SELECT hashtextextended($2, 0) AS key)
        SELECT locks.pid FROM pg_locks AS locks CROSS JOIN target
        WHERE locks.locktype='advisory' AND NOT locks.granted AND locks.objsubid=1
        AND locks.classid::bigint=((target.key >> 32) & 4294967295)
        AND locks.objid::bigint=(target.key & 4294967295)
        AND $1=ANY(pg_blocking_pids(locks.pid))`, [pid, `commerce:order-benefits:${orderID}`]);
      if (result.rows.length) return;
      await delay(25);
    }
    throw new Error("Competing backend never waited on this order-benefits lock");
  }

  await t.test("05: two connections serialize and exact replay returns the same persisted attachment", async () => {
    const f = await seed("succeeded");
    assert.equal(await attach(f), "wallet-missing");
    assert.equal(await bind(f), "recorded");
    let ready!: (pid: number) => void;
    let release!: () => void;
    const parked = new Promise<number>((resolve) => { ready = resolve; });
    const unblock = new Promise<void>((resolve) => { release = resolve; });
    const first = inPaymentTransaction(f.req, async () => {
      assert.equal(await attachBoundMemberWalletGrant(f.req, f.intent, env), "attached");
      ready(await backend(f.req));
      await unblock;
    });
    first.catch(() => release());
    let second: Promise<unknown> | undefined;
    try {
      const pid = await Promise.race([parked, first.then(() => { throw new Error("Settlement barrier exited early"); })]);
      second = attach(f);
      second.catch(() => {});
      await waitForOrderBenefits(pid, f.order);
      assert.equal((await read(f))[0].state, "awaiting_wallet", "uncommitted attachment is not visible");
    } finally {
      release();
      await first;
    }
    assert.equal(await second, "already-attached");
    const rows = await read(f);
    assert.equal(rows.length, 1);
    assert.deepEqual({ ...rows[0], updated: undefined }, {
      id: f.intent, state: "pending", target: f.binding, buyer: f.customerID, attempts: 0, updated: undefined,
    });
    assert.equal(await attach(f), "already-attached");
    assert.deepEqual(await read(f), rows, "exact replay does not touch the row");
    assert.equal(await attach(f, { ...env, MEMBER_WALLET_CHAIN_ID: "137" }), "conflict");
    assert.equal(await attach(f, { ...env, MEMBER_WALLET_LOCK_ADDRESS: env.MEMBER_WALLET_OWNER_ADDRESS }), "conflict");
    assert.deepEqual(await read(f), rows, "wrong chain and conflicting target do not retarget");

    const unrelated = await seed("succeeded");
    assert.equal(await attach(unrelated), "wallet-missing", "cannot pick another member's wallet");
    assert.equal(await bind(unrelated), "recorded");
    await db.payload.db.updateOne({ collection: "transactions", id: unrelated.transactionID, data: { commerceReviewHold: true } });
    assert.equal(await attach(unrelated), "held");
    assert.equal((await read(unrelated))[0].target, null);
    // Remove this fixture from worker selection in the next subtest without invoking a chain.
    await db.payload.db.updateOne({ collection: "commerce-key-grant-intents", id: f.intent, data: { state: "cancelled" } });
  });

  await t.test("04 settlement half: same-request attachment and wallet roll back or commit with settlement", async (st) => {
    configureSettlement(st);
    const f = await seed("pending");
    const settle = async (abort: boolean) => inPaymentTransaction(f.req, async () => {
      await withCommerceWrite(f.req, () => f.req.payload.update({
        collection: "transactions", id: f.transactionID, req: f.req, overrideAccess: true,
        data: { status: "succeeded", order: f.order },
      }));
      const { rows } = await (await nativeSession(f.req)).execute(sql`SELECT state::text, target FROM commerce_key_grant_intents WHERE id=${f.intent}::uuid`);
      assert.deepEqual(rows, [{ state: "pending", target: f.binding }]);
      if (abort) throw new Error("fixture abort after settlement hook");
    });
    await assert.rejects(settle(true), /fixture abort after settlement hook/);
    assert.equal((await read(f))[0].state, "awaiting_wallet");
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM member_wallets WHERE member_id=$1", [f.customerID])).rows[0].n, 0);
    assert.equal((await db.control.query("SELECT status::text FROM transactions WHERE id=$1", [f.transactionID])).rows[0].status, "pending");
    await settle(false);
    const rows = await read(f);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].target, f.binding);
    assert.equal(rows[0].state, "pending");
    assert.equal((await db.control.query("SELECT count(*)::int AS n FROM member_wallets WHERE member_id=$1", [f.customerID])).rows[0].n, 1);
    await db.payload.db.updateOne({ collection: "commerce-key-grant-intents", id: f.intent, data: { state: "cancelled" } });
  });

  await t.test("real settlement and grant worker contend on one order without deadlock", async (st) => {
    configureSettlement(st);
    const f = await seed("pending", true);
    let ready!: (pid: number) => void;
    let release!: () => void;
    const locked = new Promise<number>((resolve) => { ready = resolve; });
    const unblock = new Promise<void>((resolve) => { release = resolve; });
    const settling = inPaymentTransaction(f.req, async () => {
      await withCommerceWrite(f.req, () => f.req.payload.update({
        collection: "transactions", id: f.transactionID, req: f.req, overrideAccess: true,
        data: { status: "succeeded", order: f.order },
      }));
      ready(await backend(f.req));
      await unblock;
    });
    settling.catch(() => release());
    let calls = 0;
    const unexpected = () => { throw new Error("Proof never signs, broadcasts or calls a provider"); };
    const adapter: KeyGrantAdapter = {
      signer: `eip155:84532:${env.MEMBER_WALLET_OWNER_ADDRESS}`,
      async prepare({ target: actual }) {
        calls++;
        assert.deepEqual(actual, f.binding);
        return { kind: "definitelyNotSent", code: "fixture_unsent" };
      },
      prepareReplacement: unexpected, broadcast: unexpected, release: unexpected, rebroadcast: unexpected, reconcile: unexpected,
    };
    let worker: Promise<number> | undefined;
    try {
      const pid = await Promise.race([locked, settling.then(() => { throw new Error("Settlement barrier exited early"); })]);
      worker = dispatchKeyGrants({ payload: db.payload, adapter, limit: 1 });
      worker.catch(() => {});
      await waitForOrderBenefits(pid, f.order);
      assert.equal(calls, 0, "worker cannot prepare while settlement holds order-benefits");
    } finally {
      release();
      await settling;
    }
    assert.equal(await worker, 1);
    assert.equal(calls, 1);
    const rows = await read(f);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].state, "failed_retryable");
    assert.deepEqual(rows[0].target, f.binding);
  });

  await t.test("ordinary confirmation creates and attaches a new intent in its settlement transaction", async (st) => {
    configureSettlement(st);
    const f = await seedAttempt(db.payload);
    const binding = await grantTarget(f.customerID);
    let attachedBeforeCommit = false;
    const attempt = await confirmation(db.payload, f, {
      async afterEffect(collection, req) {
        if (collection !== "transactions") return;
        const { rows } = await (await nativeSession(req)).execute(sql`SELECT state::text, target
          FROM commerce_key_grant_intents WHERE payment_id=${f.transactionID}::uuid`);
        assert.deepEqual(rows, [{ state: "pending", target: binding }]);
        assert.deepEqual(await read(f), [], "new attachment is invisible outside settlement until commit");
        attachedBeforeCommit = true;
      },
    });
    const input = { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", ""), cartID: f.cartID };
    const response = await runReconciliation(attempt.req, input, "confirm", async () => {
      await assertPaymentRiskReviewed(attempt.req, input, undefined, attempt.deps);
      return attempt.run();
    }, attempt.deps);
    assert.equal(response.status, 200);
    assert.equal(attachedBeforeCommit, true);
    const rows = await read(f);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].state, "pending");
    assert.deepEqual(rows[0].target, binding);
  });
});
