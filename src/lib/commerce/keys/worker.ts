import { randomUUID } from "node:crypto";
import type { Payload, PayloadRequest } from "payload";
import { withCommerceWrite } from "../access";
import { inCommerceTransaction, lockCommerce, readCommerce, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { parkedGrantCodes, parseKeyGrantTarget, type BroadcastOutcome, type KeyGrantAdapter, type PrepareOutcome, type ReconcileOutcome } from "./contracts";

/*
 * ADR-0004 worker. Explicitly invoked (no scheduler yet) with a chain adapter
 * (none exists yet: ADR-0008 lands with the approved libraries).
 *
 * Dispatch is write-ahead twice over: `submitted` + a fresh attemptID commit
 * before the adapter prepares anything, and the signed transaction's hash
 * commits before it is broadcast. Each write is a short transaction fenced by
 * the attemptID. So a claim without a hash was never broadcast, and a broadcast
 * always leaves a hash for reconciliation. A throw, timeout or unknown answer
 * from broadcast is `ambiguous` and is never resubmitted automatically; only
 * proven non-execution returns work to `pending` through `failed_retryable`,
 * and codes retrying cannot fix (`parkedGrantCodes`) stay parked there.
 *
 * Age limits: a claim still without a hash after CLAIM_STALE_MS was interrupted
 * before broadcast and is retried; a hash still unconfirmed after
 * GRANT_OVERDUE_MS is surfaced as `ambiguous` / `confirmation_overdue` and keeps
 * being reconciled. No fee bump or rebroadcast exists yet.
 */

type Pass = { payload: Payload; adapter: KeyGrantAdapter; limit?: number; now?: () => Date };
const PAGE = 25;
const MAX_ROWS = 500; // bound per pass
const RETRY_BACKOFF_MS = 5 * 60_000;
const HOLD_RECHECK_MS = 15 * 60_000;
const RECONCILE_RECHECK_MS = 2 * 60_000;
const CLAIM_STALE_MS = 10 * 60_000;
const GRANT_OVERDUE_MS = 30 * 60_000;
const later = (now: Date, ms: number): string => new Date(now.getTime() + ms).toISOString();

/**
 * Fair scheduling. Rows never looked at (no `nextAttemptAt`) come first, oldest
 * first; then due rows in the order they were pushed back. Every row a pass
 * looks at either changes state or is pushed to the back of the due order, so
 * successive passes rotate through the whole queue however many rows are held.
 */
async function* due(payload: Payload, state: Record<string, unknown>, now: () => Date): AsyncGenerator<CommerceDocument> {
  const seen = new Set<string>();
  const phases = [
    { where: { and: [state, { nextAttemptAt: { exists: false } }] }, sort: "createdAt" },
    { where: () => ({ and: [state, { nextAttemptAt: { less_than_equal: now().toISOString() } }] }), sort: "nextAttemptAt" },
  ];
  for (const phase of phases) {
    while (seen.size < MAX_ROWS) {
      const where = typeof phase.where === "function" ? phase.where() : phase.where;
      const found = await payload.find({ collection: "commerce-key-grant-intents" as never, where: where as never, sort: phase.sort, limit: PAGE, depth: 0, overrideAccess: true });
      const fresh = (found.docs as unknown as CommerceDocument[]).filter((doc) => !seen.has(doc.id));
      if (!fresh.length) break; // phase exhausted, or only rows this pass could not move
      for (const doc of fresh) { seen.add(doc.id); yield doc; }
    }
  }
}

/** Pushes an unanswered reconcile back; past GRANT_OVERDUE_MS it is surfaced as overdue. */
async function deferOrSurface(payload: Payload, row: CommerceDocument, now: Date): Promise<void> {
  await inIntent(payload, row.id, async (req, intent) => {
    if (intent.state !== row.state || intent.txHash !== row.txHash || intent.attemptID !== row.attemptID) return;
    const overdue = typeof intent.submittedAt === "string" && now.getTime() - Date.parse(intent.submittedAt) > GRANT_OVERDUE_MS;
    const surfaced = overdue ? { state: "ambiguous", lastErrorCode: "confirmation_overdue" } : {};
    await updateCommerce(req, "commerce-key-grant-intents", row.id, { ...surfaced, nextAttemptAt: later(now, RECONCILE_RECHECK_MS) });
  });
}
const SAFE_CODE = /^[a-z0-9_.:-]{1,80}$/i;
const code = (value: string): string => SAFE_CODE.test(value) ? value : "adapter_error";

function requestFor(payload: Payload): PayloadRequest {
  return { payload, context: {} } as unknown as PayloadRequest;
}

async function inIntent<T>(payload: Payload, intentID: string, work: (req: PayloadRequest, intent: CommerceDocument) => Promise<T>): Promise<T> {
  const req = requestFor(payload);
  return inCommerceTransaction(req, async () => {
    const preliminary = await readCommerce(req, "commerce-key-grant-intents", intentID);
    await lockCommerce(req, [`key-grant:${String(preliminary.operationKey)}`]);
    return withCommerceWrite(req, async () => work(req, await readCommerce(req, "commerce-key-grant-intents", intentID)));
  });
}

async function claim(payload: Payload, intentID: string, now: Date): Promise<{ attemptID: string; intent: CommerceDocument } | null> {
  return inIntent(payload, intentID, async (req, intent) => {
    if (intent.state !== "pending" || intent.cancelRequested === true) return null;
    const admission = await readCommerce(req, "commerce-admissions", String(intent.entitlement));
    if (admission.benefitReview === true || admission.status === "revoked" || admission.returnAcceptedAt) {
      await updateCommerce(req, "commerce-key-grant-intents", intentID, { nextAttemptAt: later(now, HOLD_RECHECK_MS) });
      return null;
    }
    const attemptID = randomUUID();
    const updated = await updateCommerce(req, "commerce-key-grant-intents", intentID, {
      state: "submitted", attemptID, attempts: Number(intent.attempts) + 1, dispatchStartedAt: now.toISOString(), lastErrorCode: null, nextAttemptAt: null,
    });
    return { attemptID, intent: updated };
  });
}

const parked = (errorCode: string): boolean => (parkedGrantCodes as readonly string[]).includes(errorCode);

/** Proven non-execution: retryable after a backoff, unless retrying cannot help. */
const notSentData = (errorCode: string, attempts: unknown, now: Date) => ({
  state: "failed_retryable", lastErrorCode: code(errorCode),
  nextAttemptAt: parked(errorCode) ? null : later(now, RETRY_BACKOFF_MS * Math.max(1, Number(attempts))),
});

/** Records the prepared hash on the claimed intent. False if the intent moved on. */
async function writeAhead(payload: Payload, intentID: string, attemptID: string, txHash: string, now: Date): Promise<boolean> {
  return inIntent(payload, intentID, async (req, intent) => {
    if (intent.attemptID !== attemptID || intent.state !== "submitted" || intent.txHash) return false;
    await updateCommerce(req, "commerce-key-grant-intents", intentID, { txHash, submittedAt: now.toISOString() });
    return true;
  });
}

async function record(payload: Payload, intentID: string, attemptID: string, now: Date, outcome: PrepareOutcome | BroadcastOutcome | { kind: "threw" }): Promise<void> {
  if (outcome.kind === "submitted" || outcome.kind === "prepared") return; // the hash is already recorded; reconcile settles it
  await inIntent(payload, intentID, async (req, intent) => {
    if (intent.attemptID !== attemptID || intent.state !== "submitted") return; // fenced: a newer attempt or reconcile owns it
    const data = outcome.kind === "definitelyNotSent" ? notSentData(outcome.code, intent.attempts, now)
      : { state: "ambiguous", lastErrorCode: outcome.kind === "threw" ? "adapter_threw" : "outcome_unknown" };
    await updateCommerce(req, "commerce-key-grant-intents", intentID, data);
  });
}

/**
 * A claim with no hash after CLAIM_STALE_MS was interrupted before broadcast
 * (the hash always commits first), so it is proven unsent and retried.
 */
async function sweepInterruptedClaims(payload: Payload, now: () => Date): Promise<void> {
  const cutoff = new Date(now().getTime() - CLAIM_STALE_MS).toISOString();
  for await (const row of due(payload, { and: [{ state: { equals: "submitted" } }, { txHash: { exists: false } }, { dispatchStartedAt: { less_than_equal: cutoff } }] }, now)) {
    await inIntent(payload, row.id, async (req, intent) => {
      if (intent.state !== "submitted" || intent.txHash || intent.attemptID !== row.attemptID) return;
      await updateCommerce(req, "commerce-key-grant-intents", row.id, notSentData("dispatch_interrupted", intent.attempts, now()));
    });
  }
}

/**
 * Proven non-execution only: after a backoff, a failed_retryable intent returns
 * to pending as a fresh attempt, clearing the previous attempt's hash so the old
 * transaction's result can never be applied to the new one.
 */
async function requeueRetryable(payload: Payload, now: () => Date): Promise<void> {
  const retryable = { and: [{ state: { equals: "failed_retryable" } }, { or: [{ lastErrorCode: { exists: false } }, { lastErrorCode: { not_in: [...parkedGrantCodes] } }] }] };
  for await (const row of due(payload, retryable, now)) {
    await inIntent(payload, row.id, async (req, intent) => {
      if (intent.state !== "failed_retryable" || parked(String(intent.lastErrorCode ?? ""))) return;
      // A refunded key that never went out stays cancelled rather than retrying.
      const data = intent.cancelRequested === true ? { state: "cancelled", cancelledAt: now().toISOString() }
        : { state: "pending", txHash: null, tokenID: null, submittedAt: null, attemptID: null, nextAttemptAt: null };
      await updateCommerce(req, "commerce-key-grant-intents", row.id, data);
    });
  }
}

/** Dispatch up to `limit` pending intents. Returns how many were dispatched. */
export async function dispatchKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  await sweepInterruptedClaims(payload, now);
  await requeueRetryable(payload, now);
  let dispatched = 0;
  for await (const row of due(payload, { state: { equals: "pending" } }, now)) {
    if (dispatched >= limit) break;
    const claimed = await claim(payload, row.id, now());
    if (!claimed) continue;
    dispatched++;
    let prepared: PrepareOutcome;
    // Nothing is sent while preparing, so a throw here is proven non-execution.
    try { prepared = await adapter.prepare({ intentID: row.id, attemptID: claimed.attemptID, target: parseKeyGrantTarget(claimed.intent.target) }); }
    catch { prepared = { kind: "definitelyNotSent", code: "adapter_threw" }; }
    if (prepared.kind !== "prepared") { await record(payload, row.id, claimed.attemptID, now(), prepared); continue; }
    let durable = false;
    try { durable = await writeAhead(payload, row.id, claimed.attemptID, prepared.txHash, now()); }
    finally { if (!durable) adapter.release({ txHash: prepared.txHash }); }
    if (!durable) continue;
    let sent: BroadcastOutcome | { kind: "threw" };
    try { sent = await adapter.broadcast({ intentID: row.id, txHash: prepared.txHash }); }
    catch { sent = { kind: "threw" }; }
    await record(payload, row.id, claimed.attemptID, now(), sent);
  }
  return dispatched;
}

/** Re-check submitted/ambiguous intents that have a transaction hash. Never resubmits. */
export async function reconcileKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  let settled = 0;
  for await (const row of due(payload, { and: [{ state: { in: ["submitted", "ambiguous"] } }, { txHash: { exists: true } }] }, now)) {
    if (settled >= limit) break;
    let outcome: ReconcileOutcome;
    try { outcome = await adapter.reconcile({ intentID: row.id, txHash: String(row.txHash), target: parseKeyGrantTarget(row.target) }); }
    catch { outcome = { kind: "unknown" }; }
    if (outcome.kind === "unknown") { await deferOrSurface(payload, row, now()); continue; }
    await inIntent(payload, row.id, async (req, intent) => {
      // Fenced by attempt and hash: a result for an older attempt never lands on a newer one.
      if (!["submitted", "ambiguous"].includes(String(intent.state)) || intent.txHash !== row.txHash || intent.attemptID !== row.attemptID) return;
      const data = outcome.kind === "confirmed" ? { state: "granted", tokenID: outcome.tokenID, grantedAt: now().toISOString(), nextAttemptAt: null }
        : { state: "failed_retryable", lastErrorCode: code(outcome.code), nextAttemptAt: later(now(), RETRY_BACKOFF_MS * Math.max(1, Number(intent.attempts))) };
      await updateCommerce(req, "commerce-key-grant-intents", row.id, data);
      settled++;
    });
  }
  return settled;
}
