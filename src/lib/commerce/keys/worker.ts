import { randomUUID } from "node:crypto";
import type { Payload, PayloadRequest } from "payload";
import { withCommerceWrite } from "../access";
import { inCommerceTransaction, lockCommerce, readCommerce, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { parseKeyGrantTarget, type KeyGrantAdapter, type ReconcileOutcome, type SubmitOutcome } from "./contracts";

/*
 * ADR-0004 worker. Explicitly invoked (no scheduler yet) with a chain adapter
 * (none exists yet: ADR-0008 lands with the approved libraries).
 *
 * Dispatch is write-ahead: `submitted` + a fresh attemptID commit BEFORE the
 * adapter runs, outside any transaction. Outcomes are recorded in a second short
 * transaction fenced by that attemptID. A throw, timeout or unknown answer is
 * `ambiguous` and is never resubmitted automatically; only proven non-execution
 * returns work to `pending` through `failed_retryable`.
 */

type Pass = { payload: Payload; adapter: KeyGrantAdapter; limit?: number; now?: () => Date };
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
    if (admission.benefitReview === true || admission.status === "revoked" || admission.returnAcceptedAt) return null;
    const attemptID = randomUUID();
    const updated = await updateCommerce(req, "commerce-key-grant-intents", intentID, {
      state: "submitted", attemptID, attempts: Number(intent.attempts) + 1, dispatchStartedAt: now.toISOString(), lastErrorCode: null,
    });
    return { attemptID, intent: updated };
  });
}

async function record(payload: Payload, intentID: string, attemptID: string, now: Date, outcome: SubmitOutcome | { kind: "threw" }): Promise<void> {
  await inIntent(payload, intentID, async (req, intent) => {
    if (intent.attemptID !== attemptID || intent.state !== "submitted") return; // fenced: a newer attempt or reconcile owns it
    const at = now.toISOString();
    const data = outcome.kind === "confirmed" ? { state: "granted", txHash: outcome.txHash, tokenID: outcome.tokenID, submittedAt: at, grantedAt: at }
      : outcome.kind === "submitted" ? { state: "submitted", txHash: outcome.txHash, submittedAt: at }
      : outcome.kind === "definitelyNotSent" ? { state: "failed_retryable", lastErrorCode: code(outcome.code) }
      : { state: "ambiguous", ...(outcome.kind === "unknown" && outcome.txHash ? { txHash: outcome.txHash, submittedAt: at } : {}), lastErrorCode: outcome.kind === "threw" ? "adapter_threw" : "outcome_unknown" };
    await updateCommerce(req, "commerce-key-grant-intents", intentID, data);
  });
}

/** Dispatch up to `limit` pending intents. Returns how many were dispatched. */
export async function dispatchKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  const found = await payload.find({ collection: "commerce-key-grant-intents" as never, where: { state: { equals: "pending" } }, sort: "createdAt", limit, depth: 0, overrideAccess: true });
  let dispatched = 0;
  for (const row of found.docs as unknown as CommerceDocument[]) {
    const claimed = await claim(payload, row.id, now());
    if (!claimed) continue;
    dispatched++;
    let outcome: SubmitOutcome | { kind: "threw" };
    try { outcome = await adapter.submit({ intentID: row.id, attemptID: claimed.attemptID, target: parseKeyGrantTarget(claimed.intent.target) }); }
    catch { outcome = { kind: "threw" }; }
    await record(payload, row.id, claimed.attemptID, now(), outcome);
  }
  return dispatched;
}

/** Re-check submitted/ambiguous intents that have a transaction hash. Never resubmits. */
export async function reconcileKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  const found = await payload.find({ collection: "commerce-key-grant-intents" as never, where: { and: [{ state: { in: ["submitted", "ambiguous"] } }, { txHash: { exists: true } }] }, sort: "updatedAt", limit, depth: 0, overrideAccess: true });
  let settled = 0;
  for (const row of found.docs as unknown as CommerceDocument[]) {
    let outcome: ReconcileOutcome;
    try { outcome = await adapter.reconcile({ intentID: row.id, txHash: String(row.txHash), target: parseKeyGrantTarget(row.target) }); }
    catch { continue; }
    if (outcome.kind === "unknown") continue;
    await inIntent(payload, row.id, async (req, intent) => {
      if (!["submitted", "ambiguous"].includes(String(intent.state)) || intent.txHash !== row.txHash) return;
      const data = outcome.kind === "confirmed" ? { state: "granted", tokenID: outcome.tokenID, grantedAt: now().toISOString() }
        : { state: "failed_retryable", lastErrorCode: code(outcome.code) };
      await updateCommerce(req, "commerce-key-grant-intents", row.id, data);
      settled++;
    });
  }
  return settled;
}
