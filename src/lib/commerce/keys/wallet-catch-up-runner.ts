import type { Payload, PayloadRequest } from "payload";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import { z } from "zod";
import { MEMBER_WALLET_QUEUE } from "@/payload/tasks/member-wallet-catch-up";
import { WALLET_CATCH_UP_LIMITS } from "./wallet-catch-up";
import { inPaymentTransaction, lockCommerce, paymentTransactionToken } from "../_shared/transaction";

const count = z.int().min(0).max(WALLET_CATCH_UP_LIMITS.rows);
const counts = z.object({ inspected: count, moved: count, held: count, conflicts: count, cycleComplete: z.boolean() })
  .refine(row => row.moved + row.held + row.conflicts <= row.inspected);

async function readHealth(payload: Payload) {
  const { docs } = await payload.find({
    collection: "member-wallet-catch-up", depth: 0, overrideAccess: true, pagination: false, limit: 2,
    select: { updatedAt: true, lastCompletedAt: true },
    where: { workKey: { equals: "wallet-targets:v1" } },
  });
  if (docs.length > 1) throw new Error("Wallet checkpoint ambiguous");
  const { docs: backlog } = await payload.find({
    collection: "commerce-key-grant-intents", depth: 0, overrideAccess: true, pagination: false, limit: 1,
    select: { state: true }, where: { and: [{ state: { equals: "awaiting_wallet" } }, { recipientMode: { equals: "member_safe" } }] },
  });
  return {
    checkpointAt: docs[0]?.updatedAt ?? null,
    lastCompletedSweepAt: docs[0]?.lastCompletedAt ?? null,
    backlog: backlog.length > 0,
  };
}

async function fencePreviousPage(req: PayloadRequest) {
  await inPaymentTransaction(req, async () => {
    const adapter = req.payload.db as unknown as PostgresAdapter;
    const token = paymentTransactionToken(req);
    const session = token && adapter.sessions[token]?.db;
    if (!session) throw new Error("Wallet checkpoint fence unavailable");
    await session.execute(sql`SET LOCAL lock_timeout = '750ms'`);
    await lockCommerce(req, ["wallet-targets:v1"]);
  });
}

/** Only called with exclusive runner custody. Never choose a job ID supplied by a caller. */
export async function runWalletCatchUpTick(payload: Payload) {
  if (payload.config.jobs.autoRun || payload.config.jobs.deleteJobOnComplete !== false) {
    throw new Error("Wallet runner requires a private queue with retained job history");
  }
  const queue = MEMBER_WALLET_QUEUE;
  const { docs } = await payload.find({
    collection: "payload-jobs", depth: 0, overrideAccess: true, pagination: false, limit: 2,
    where: { and: [
      { queue: { equals: queue } }, { completedAt: { exists: false } }, { hasError: { not_equals: true } },
    ] },
  });
  const existing = docs[0];
  if (docs.length > 1 || existing && (existing.taskSlug !== queue || existing.totalTried !== 0 ||
    existing.waitUntil != null || !z.strictObject({}).safeParse(existing.input).success)) {
    throw new Error("Wallet queue state ambiguous");
  }
  if (existing?.processing === true) {
    // Host custody proves the old worker has stopped. Do not replay that job:
    // the checkpoint may already be committed even though the job has no ack.
    const req = { payload, context: {} } as PayloadRequest;
    await fencePreviousPage(req);
    await payload.jobs.cancelByID({ id: existing.id });
    const stored = await payload.findByID({ collection: "payload-jobs", id: existing.id, depth: 0, overrideAccess: true });
    if (stored.queue !== queue || stored.taskSlug !== queue || stored.processing !== false ||
      stored.completedAt != null || stored.hasError !== true || !z.object({ cancelled: z.literal(true) }).safeParse(stored.error).success) {
      throw new Error("Wallet queue cancellation unacknowledged");
    }
    return { outcome: "stale-job-recovery" as const, counts: null, ...await readHealth(payload) };
  }
  if (existing && (existing.processing !== false || existing.log?.length || existing.error != null)) {
    throw new Error("Wallet queue state ambiguous");
  }
  const job = existing ?? await payload.jobs.queue({ task: queue, queue, input: {} });
  if (job.queue !== queue || job.taskSlug !== queue || job.processing !== false ||
      job.completedAt != null || job.hasError === true || job.totalTried !== 0 || job.log?.length || job.error != null) {
    throw new Error("Wallet job enqueue unacknowledged");
  }
  await payload.jobs.runByID({ id: job.id, silent: true });
  const stored = await payload.findByID({ collection: "payload-jobs", id: job.id, depth: 0, overrideAccess: true });
  const receipts = stored.log?.filter(entry => entry.taskSlug === queue && entry.state === "succeeded");
  if (stored.queue !== queue || stored.taskSlug !== queue || stored.processing !== false || stored.hasError === true ||
    !stored.completedAt || stored.totalTried !== 1 || receipts?.length !== 1) throw new Error("Wallet job completion unacknowledged");
  return { outcome: "success" as const, counts: counts.parse(receipts[0].output), ...await readHealth(payload) };
}
