import assert from "node:assert/strict";
import test from "node:test";
import type { Payload } from "payload";
import { runWalletCatchUpTick } from "@/lib/commerce/keys/wallet-catch-up-runner";
import { nativeTransactionFixture } from "../core/native-transaction-fixture";

const queue = "member-wallet-catch-up";
const pending = { id: "job", queue, taskSlug: queue, processing: false, totalTried: 0, input: {} };
const output = { inspected: 20, moved: 1, held: 18, conflicts: 1, cycleComplete: false };

function fixture(jobs: unknown[], terminal = { ...pending, completedAt: "2026-11-22T10:00:00Z",
  totalTried: 1, log: [{ taskSlug: queue, state: "succeeded", output }] }) {
  const calls: string[] = [];
  const payload = {
    config: { jobs: { deleteJobOnComplete: false } },
    find: async ({ collection }: { collection: string }) => {
      if (collection === "payload-jobs") return { docs: jobs };
      if (collection === "member-wallet-catch-up") return { docs: [] };
      return { docs: [{ id: "not-public" }] };
    },
    findByID: async () => terminal,
    jobs: {
      queue: async () => { calls.push("queue"); return pending; },
      runByID: async ({ id }: { id: string }) => { assert.equal(id, "job"); calls.push("run"); },
      cancelByID: async ({ id }: { id: string }) => { assert.equal(id, "job"); calls.push("cancel"); },
    },
  } as unknown as Payload;
  return { payload, calls };
}

test("reuses the persisted unstarted job rather than enqueueing", async () => {
  const f = fixture([pending]);
  assert.deepEqual((await runWalletCatchUpTick(f.payload)).counts, output);
  assert.deepEqual(f.calls, ["run"]);
});

test("a stale processing job is excluded without another page in the same tick", async () => {
  const native = await nativeTransactionFixture();
  const f = fixture([{ ...pending, processing: true }], { ...pending, hasError: true,
    error: { cancelled: true } } as never);
  Object.assign(f.payload, { db: native.adapter });
  assert.equal((await runWalletCatchUpTick(f.payload)).outcome, "stale-job-recovery");
  assert.ok(native.queries.some(({ text, values }) => text.includes("pg_advisory_xact_lock") && values.includes("commerce:wallet-targets:v1")));
  assert.deepEqual(f.calls, ["cancel"]);
});

test("an unacknowledged stale-page fence stops without mutating the queue", async () => {
  const native = await nativeTransactionFixture({ onQuery: (kind) => {
    if (kind === "select") throw new Error("fixture lock timeout");
  } });
  const f = fixture([{ ...pending, processing: true }]);
  Object.assign(f.payload, { db: native.adapter });
  await assert.rejects(runWalletCatchUpTick(f.payload), (error: unknown) =>
    error instanceof Error && error.cause instanceof Error && error.cause.message === "fixture lock timeout");
  assert.deepEqual(f.calls, []);
});

test("multiple unresolved jobs stop before enqueue or execution", async () => {
  const f = fixture([pending, { ...pending, id: "second" }]);
  await assert.rejects(runWalletCatchUpTick(f.payload), /ambiguous/);
  assert.deepEqual(f.calls, []);
});

test("a nonprocessing job with execution evidence is not a never-started job", async () => {
  const f = fixture([{ ...pending, log: [{ taskSlug: queue, state: "succeeded", output }] }]);
  await assert.rejects(runWalletCatchUpTick(f.payload), /ambiguous/);
  assert.deepEqual(f.calls, []);
});

test("an unacknowledged execution is not reported as successful or immediately retried", async () => {
  const f = fixture([], pending as never);
  await assert.rejects(runWalletCatchUpTick(f.payload), /unacknowledged/);
  assert.deepEqual(f.calls, ["queue", "run"]);
});
