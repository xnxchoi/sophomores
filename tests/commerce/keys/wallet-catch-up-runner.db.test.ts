import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { runWalletCatchUpTick } from "@/lib/commerce/keys/wallet-catch-up-runner";
import { MEMBER_WALLET_QUEUE as queue } from "@/payload/tasks/member-wallet-catch-up";
import { isolateTransport, openProofDatabase } from "../core/payment-postgres-fixture";
import { walletEnv } from "./support/wallet-catch-up-postgres";
import { proofTargets } from "../../support/proof-ports.mjs";

test("W2 runner reconciles only its own persisted jobs through Payload Local API", {
  skip: process.env.W2_RUNNER_DATABASE_TESTS !== "1", timeout: 90_000,
}, async (t) => {
  const container = process.env.W2_RUNNER_PROOF_CONTAINER ?? "";
  const runLabel = process.env.W2_RUNNER_PROOF_RUN ?? "";
  assert.match(container, /^sphmrs-wallet-runner-[a-f0-9-]{36}$/);
  assert.match(runLabel, /^[a-f0-9-]{36}$/);
  const target = { ...proofTargets.walletRunner, container, runLabel };
  isolateTransport(t, target.port);
  const before = Object.fromEntries(Object.keys(walletEnv).map((key) => [key, process.env[key]]));
  Object.assign(process.env, walletEnv);
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const db = await openProofDatabase(true, new Set(), target);
  t.after(db.close);
  const { payload } = db;
  const jobRequest = { task: queue, queue, input: {} } as const;
  const read = (id: string) => payload.findByID({ collection: "payload-jobs", id, depth: 0, overrideAccess: true });
  const checkpoint = async () => (await payload.find({
    collection: "member-wallet-catch-up", depth: 0, limit: 1, overrideAccess: true,
  })).docs[0];
  const other = await payload.jobs.queue({ ...jobRequest, queue: "unrelated-" + randomUUID() });
  const enqueue = payload.jobs.queue.bind(payload.jobs);
  let persistedID: string | undefined;
  const interrupted = t.mock.method(payload.jobs, "queue", async () => {
    const pending = await enqueue(jobRequest);
    persistedID = pending.id;
    throw new Error("fixture lost enqueue acknowledgement");
  });
  await assert.rejects(runWalletCatchUpTick(payload), /lost enqueue acknowledgement/);
  interrupted.mock.restore();
  assert.ok(persistedID);
  assert.equal((await read(persistedID)).processing, false);
  assert.equal(await checkpoint(), undefined);

  const resumed = await runWalletCatchUpTick(payload);
  assert.equal(resumed.outcome, "success");
  assert.deepEqual(resumed.counts, { inspected: 0, moved: 0, held: 0, conflicts: 0, cycleComplete: true });
  assert.ok((await read(persistedID)).completedAt);
  const saved = await checkpoint();
  assert.ok(saved?.lastCompletedAt);

  // Model a terminated worker's persisted processing flag; never start a second
  // page while classifying it. The production path uses Local API cancelByID.
  const stale = await enqueue(jobRequest);
  await payload.update({ collection: "payload-jobs", id: stale.id, data: { processing: true }, overrideAccess: true });
  assert.equal((await runWalletCatchUpTick(payload)).outcome, "stale-job-recovery");
  const cancelled = await read(stale.id);
  assert.equal(cancelled.processing, false);
  assert.equal(cancelled.hasError, true);
  assert.deepEqual(cancelled.error, { cancelled: true });
  assert.equal(cancelled.completedAt ?? null, null);
  assert.deepEqual(await checkpoint(), saved);
  assert.equal((await read(other.id)).totalTried, 0);
  assert.equal((await runWalletCatchUpTick(payload)).outcome, "success");
  assert.equal((await read(other.id)).totalTried, 0);
});
