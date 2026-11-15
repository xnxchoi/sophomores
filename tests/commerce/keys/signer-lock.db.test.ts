import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { createLocalReq, type Payload } from "payload";
import type { KeyCancelAdapter, KeyGrantAdapter } from "../../../src/lib/commerce/keys/contracts";

// Disposable loopback container created for this proof only and removed afterwards (tests/support/database-proof.mjs).
const target = { container: "sphmrs-key-grant-signer-20261116", port: 55493, database: "key_grant_signer_proof" };
const GRANTS = 6;
const granter = `eip155:84532:0x${"1".repeat(40)}`;
const manager = `eip155:84532:0x${"2".repeat(40)}`;
const keyTarget = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
const fee = { maxFeePerGas: "6000001", maxPriorityFeePerGas: "1" };
const hashOf = (text: string) => `0x${createHash("sha256").update(text).digest("hex")}`;

/**
 * A chain with no in-process nonce lane and a `pending` count that never moves,
 * so the only thing standing between two dispatchers and a shared nonce is the
 * database: the signer lock and the nonce floor read from in-flight intents.
 * Small awaits between steps let the dispatchers interleave.
 */
function laneFreeChain() {
  const prepared = new Map<string, { intentID: string; nonce: number }>();
  const sent: { intentID: string; nonce: number; txHash: string; by: string }[] = [];
  const dispatcher = (by: string): KeyGrantAdapter => ({
    signer: granter,
    async prepare({ intentID, nonceFloor }) {
      await delay(10);
      const nonce = Math.max(0, nonceFloor ?? 0);
      await delay(10);
      const txHash = hashOf(`${intentID}:${nonce}:${by}`);
      prepared.set(txHash, { intentID, nonce });
      return { kind: "prepared", txHash, nonce, fee };
    },
    async prepareReplacement() { throw new Error("no replacement in this proof"); },
    async broadcast({ txHash }) {
      await delay(10);
      const grant = prepared.get(txHash);
      if (!grant) return { kind: "definitelyNotSent", code: "not_prepared" };
      sent.push({ ...grant, txHash, by });
      return { kind: "submitted" };
    },
    release({ txHash }) { prepared.delete(txHash); },
    async reconcile() { return { kind: "unknown" }; },
  });
  return { sent, dispatcher };
}

test("Key-grant signer: two dispatchers on one signer never share a nonce and lose no grant", {
  skip: process.env.KEY_GRANT_SIGNER_DATABASE_TESTS !== "1", timeout: 600_000,
}, async (t) => {
  const { isolateTransport, openProofDatabase, seedAttempt, confirmation } = await import("../core/payment-postgres-fixture");
  const { runReconciliation } = await import("../../../src/lib/commerce/portone/admission");
  const { assertPaymentRiskReviewed } = await import("../../../src/lib/commerce/portone/review");
  const { withCommerceWrite } = await import("../../../src/lib/commerce/access");
  const { cancelKeyGrants, dispatchKeyGrants, reconcileKeyGrants } = await import("../../../src/lib/commerce/keys/worker");
  isolateTransport(t, target.port);
  const first = await openProofDatabase(true, new Set(), target);
  t.after(first.close);
  // A second Payload instance with its own pool: a second application instance against the same database.
  const second = await openProofDatabase(false, new Set(), target);
  t.after(second.close);
  t.diagnostic(`PostgreSQL ${first.version}; loopback only; chain and provider evidence synthetic`);

  // Settle real orders through the ledger so each admission records its key-grant intent (ADR-0004).
  const settleOne = async (): Promise<string> => {
    const f = await seedAttempt(first.payload);
    await delay(1100); // provider-GET rate and per-attempt cooldown, as in the settle proofs
    const attempt = await confirmation(first.payload, f);
    const response = await runReconciliation(attempt.req, { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", ""), cartID: f.cartID }, "confirm", async () => {
      await assertPaymentRiskReviewed(attempt.req, attempt.req.data as { transactionID: string; paymentID: string }, undefined, attempt.deps);
      return attempt.run();
    }, attempt.deps);
    assert.equal(response.status, 200);
    const { rows } = await first.control.query("SELECT id::text FROM commerce_key_grant_intents WHERE payment_id=$1::uuid", [f.transactionID]);
    assert.equal(rows.length, 1);
    return rows[0].id;
  };
  const intentIDs: string[] = [];
  for (let index = 0; index < GRANTS; index++) intentIDs.push(await settleOne());
  // The wallet step (ADR-0005) is another slice: give each intent its target through the Local API and hooks.
  const update = async (payload: Payload, id: string, data: Record<string, unknown>) => {
    const req = await createLocalReq({}, payload);
    return withCommerceWrite(req, () => payload.update({ collection: "commerce-key-grant-intents" as never, id, data: data as never, overrideAccess: true, req }));
  };
  for (const id of intentIDs) await update(first.payload, id, { state: "pending", target: keyTarget });
  const readIntents = async () => (await first.control.query(
    "SELECT id::text, state::text, tx_hash AS hash, nonce::int AS nonce, signer, sends, token_i_d AS token, cancel_tx_hash AS cancel FROM commerce_key_grant_intents ORDER BY created_at",
  )).rows as { id: string; state: string; hash: string | null; nonce: number | null; signer: string | null; sends: { txHash: string }[] | null; token: string | null; cancel: string | null }[];

  await t.test("two concurrent dispatchers: distinct nonces, every grant sent once and recorded", async (st) => {
    const chain = laneFreeChain();
    const grants = intentIDs;
    let waiting = 0;
    let watching = true;
    const watcher = (async () => {
      while (watching) {
        const { rows } = await first.control.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype='advisory' AND NOT granted");
        waiting = Math.max(waiting, rows[0].n);
        await delay(2);
      }
    })();
    const [byFirst, bySecond] = await Promise.all([
      dispatchKeyGrants({ payload: first.payload, adapter: chain.dispatcher("first"), limit: GRANTS }),
      dispatchKeyGrants({ payload: second.payload, adapter: chain.dispatcher("second"), limit: GRANTS }),
    ]);
    watching = false;
    await watcher;
    st.diagnostic(`dispatched ${byFirst} + ${bySecond}; nonces ${chain.sent.map((grant) => `${grant.nonce}(${grant.by})`).join(", ")}; most sessions seen waiting on an advisory lock: ${waiting}`);
    assert.ok(waiting >= 1, "the dispatchers overlapped: one waited on a lock the other held");
    assert.equal(byFirst + bySecond, GRANTS, "every pending grant was claimed by exactly one dispatcher");
    const nonces = chain.sent.map((grant) => grant.nonce);
    assert.equal(new Set(nonces).size, nonces.length, `no nonce was shared: ${nonces.join(", ")}`);
    assert.deepEqual([...nonces].sort((x, y) => x - y), Array.from({ length: GRANTS }, (_, index) => index), "contiguous nonces from 0");
    assert.deepEqual(chain.sent.map((grant) => grant.intentID).sort(), [...grants].sort(), "no grant lost or sent twice");
    const recorded = (await readIntents()).filter((row) => grants.includes(row.id));
    for (const row of recorded) {
      const sent = chain.sent.find((grant) => grant.intentID === row.id)!;
      assert.deepEqual([row.state, row.hash, row.nonce, row.signer, row.sends?.map((send) => send.txHash)], ["submitted", sent.txHash, sent.nonce, granter, [sent.txHash]]);
    }
  });

  await t.test("the next dispatch continues past the in-flight nonces even though the chain's pending count lags", async () => {
    const chain = laneFreeChain();
    await update(first.payload, await settleOne(), { state: "pending", target: keyTarget });
    await dispatchKeyGrants({ payload: second.payload, adapter: chain.dispatcher("second") });
    assert.deepEqual(chain.sent.map((grant) => grant.nonce), [GRANTS]);
  });

  await t.test("the collection refuses to rewrite a recorded nonce or send history", async () => {
    const [row] = (await readIntents()).filter((intent) => intent.state === "submitted");
    await assert.rejects(update(first.payload, row.id, { nonce: 99 }), /nonce/);
    await assert.rejects(update(first.payload, row.id, { sends: [] }), /append-only/);
  });

  await t.test("two concurrent cancel passes send one cancel, with the manager, and it is recorded cancelled", async (st) => {
    const [row] = (await readIntents()).filter((intent) => intent.state === "submitted");
    const confirmed = { signer: granter, async reconcile() { return { kind: "confirmed", tokenID: "1" } as const; } } as unknown as KeyGrantAdapter;
    // Reconcile only the chosen row: push the others' recheck time away.
    for (const other of (await readIntents()).filter((intent) => intent.state === "submitted" && intent.id !== row.id)) {
      await update(first.payload, other.id, { nextAttemptAt: new Date(Date.now() + 3_600_000).toISOString() });
    }
    await reconcileKeyGrants({ payload: first.payload, adapter: confirmed });
    await update(first.payload, row.id, { cancelRequested: true }); // as a manual refund does (ADR-0009)
    let prepares = 0;
    const broadcasts: string[] = [];
    const canceller = (): KeyCancelAdapter => ({
      signer: manager,
      async prepareCancel({ nonceFloor }) { prepares++; await delay(20); return { kind: "prepared", txHash: hashOf(`cancel:${randomUUID()}`), nonce: nonceFloor, fee }; },
      async broadcast({ txHash }) { await delay(10); broadcasts.push(txHash); return { kind: "submitted" }; },
      release() {},
      async reconcileCancel() { return { kind: "confirmed" }; },
    });
    await Promise.all([cancelKeyGrants({ payload: first.payload, adapter: canceller() }), cancelKeyGrants({ payload: second.payload, adapter: canceller() })]);
    assert.deepEqual([prepares, broadcasts.length], [1, 1], "exactly one cancel was prepared and sent");
    let after = (await readIntents()).find((intent) => intent.id === row.id)!;
    assert.deepEqual([after.state, after.token, after.cancel], ["granted", "1", broadcasts[0]]);
    await Promise.all([cancelKeyGrants({ payload: first.payload, adapter: canceller() }), cancelKeyGrants({ payload: second.payload, adapter: canceller() })]);
    after = (await readIntents()).find((intent) => intent.id === row.id)!;
    assert.equal(after.state, "cancelled");
    assert.equal(broadcasts.length, 1, "never sent again");
    st.diagnostic(`cancelled with ${after.cancel}`);
  });
});

test("Key-grant signer: the additive migration applies on top of the full chain", {
  skip: process.env.KEY_GRANT_SIGNER_DATABASE_TESTS !== "1", timeout: 600_000,
}, async (t) => {
  const { Pool } = await import("pg");
  const admin = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${target.port}/${target.database}`, max: 1 });
  t.after(() => admin.end());
  const database = "key_grant_migration_proof";
  await admin.query(`DROP DATABASE IF EXISTS ${database}`);
  await admin.query(`CREATE DATABASE ${database}`);
  // The real configuration and every committed migration, on a fresh database; no application .env is read.
  const run = spawnSync(process.execPath, ["--import", "tsx", "node_modules/payload/bin.js", "--disable-transpile", "migrate"], {
    encoding: "utf8", maxBuffer: 1 << 22, timeout: 300_000,
    env: {
      PATH: process.env.PATH, NODE_ENV: "production", NODE_OPTIONS: "--no-deprecation", PAYLOAD_CONFIG_PATH: "./src/payload.config.ts", DISABLE_PAYLOAD_HMR: "true",
      DATABASE_URI: `postgres://postgres@127.0.0.1:${target.port}/${database}`, PAYLOAD_SECRET: randomUUID().repeat(2), BETTER_AUTH_SECRET: randomUUID().repeat(2),
    },
  });
  t.diagnostic(`payload migrate exit ${run.status}; last lines: ${`${run.stdout}\n${run.stderr}`.trim().split("\n").slice(-3).join(" | ").slice(0, 400)}`);
  assert.equal(run.status, 0);
  const migrated = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${target.port}/${database}`, max: 1 });
  t.after(() => migrated.end());
  const { rows } = await migrated.query("SELECT column_name FROM information_schema.columns WHERE table_name='commerce_key_grant_intents'");
  const columns = new Set(rows.map((row) => row.column_name as string));
  for (const column of ["signer", "nonce", "sends", "last_sent_at", "settled_tx_hash", "cancel_attempt_i_d", "cancel_started_at", "cancel_signer", "cancel_nonce", "cancel_tx_hash", "cancel_submitted_at"]) {
    assert.equal(columns.has(column), true, column);
  }
  const { rows: applied } = await migrated.query("SELECT name FROM payload_migrations WHERE name LIKE '%key_grant_hardening'");
  assert.equal(applied.length, 1, "the hardening migration is recorded as applied");
});
