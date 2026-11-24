import { randomUUID } from "node:crypto";
import type { Payload, PayloadRequest, Where } from "payload";
import { withCommerceWrite } from "../access";
import { sameTicketTarget, sharedEventTicketsEnabled, sharedTicketTarget } from "../event-tickets";
import { findCommerce, inCommerceTransaction, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import {
  cancelReplacementStopCodes, grantBroadcastPending, grantBroadcastStops, grantBroadcastSuppressed, grantRecoveryHeld, parkedCancelCodes, parkedGrantCodes, parseKeyGrantTarget, replacementStopCodes, ticketTokenConflict, ticketTokenIdentity, MEMBER_EVENT_GRANT,
  type BroadcastOutcome, type CancelReconcileOutcome, type KeyCancelAdapter, type KeyGrantAdapter, type RebroadcastOutcome, type ReconcileOutcome, type RecordedSend,
  type ReplaceOutcome, type TransactionFee,
} from "./contracts";

/*
 * ADR-0004 worker. Explicitly invoked (no scheduler yet) with a chain adapter.
 *
 * Dispatch is write-ahead twice over: `submitted` + a fresh attemptID commit
 * before the adapter prepares anything, and the signed transaction's hash,
 * signer, nonce and fee commit before it is broadcast. Grant raw bytes stay
 * in memory until broadcast is attempted; a durable unresolved fence parks
 * the signer if broadcast is suppressed or the outcome write is interrupted.
 * Each write is a short
 * transaction fenced by the attemptID. So a claim without a hash was never
 * broadcast, and a broadcast always leaves a hash for reconciliation. A throw,
 * timeout or unknown answer from broadcast is `ambiguous` and is never
 * resubmitted at a new nonce; only proven non-execution returns work to
 * `pending` through `failed_retryable`, and codes retrying cannot fix
 * (`parkedGrantCodes`) stay parked there.
 *
 * Signer serialisation across processes: nonce choice, the write-ahead record
 * and the broadcast run while this process holds a PostgreSQL advisory lock
 * for the signer's account (`key-signer:<CAIP-10>`), taken in its own
 * transaction through `lockCommerce`. The nonce floor handed to the adapter is
 * one past the highest nonce this signer has in flight in the database (grants
 * `submitted`/`ambiguous`, cancels sent and unsettled), so a lagging `pending`
 * count or a second process never reuses one. The write-ahead transaction
 * re-checks, under a short second lock (`key-signer-nonce:`), that no other
 * in-flight intent holds that nonce, so even a lost outer lock cannot record
 * one nonce twice.
 *
 * Stuck grants (`replaceStuckKeyGrants`): a grant unconfirmed REPLACE_AFTER_MS
 * after its last send is re-signed at the SAME nonce with a higher fee (within
 * the adapter's ceiling); each replacement hash is recorded beside the earlier
 * ones before it is broadcast, and reconcile checks every recorded hash. Only
 * one transaction per nonce can mine, so whichever does settles the intent.
 * After MAX_REPLACEMENTS the intent goes to `ambiguous` / `replacement_exhausted`
 * for a person, and keeps being reconciled. A replacement that fails never
 * makes the intent retryable: the original may still mine.
 *
 * Cancel (`cancelKeyGrants`, ADR-0009): a granted intent with `cancelRequested`
 * is cancelled on chain by the separate lock-manager adapter, never the grant
 * signer; claimed, written ahead and reconciled the same way, ending `cancelled`.
 *
 * Age limits: a claim still without a hash after CLAIM_STALE_MS was interrupted
 * before broadcast and is retried; a hash still unconfirmed after
 * GRANT_OVERDUE_MS is surfaced as `ambiguous` / `confirmation_overdue` and keeps
 * being reconciled (and replaced).
 */

type Pass = { payload: Payload; adapter: KeyGrantAdapter; limit?: number; now?: () => Date };
type CancelPass = { payload: Payload; adapter: KeyCancelAdapter; limit?: number; now?: () => Date };
const INTENTS = "commerce-key-grant-intents";
const PAGE = 25;
const MAX_ROWS = 500; // bound per pass
const RETRY_BACKOFF_MS = 5 * 60_000;
const HOLD_RECHECK_MS = 15 * 60_000;
const RECONCILE_RECHECK_MS = 2 * 60_000;
const CLAIM_STALE_MS = 10 * 60_000;
const GRANT_OVERDUE_MS = 30 * 60_000;
/** A grant still unconfirmed this long after its last send is replaced at its nonce. */
export const REPLACE_AFTER_MS = 10 * 60_000;
/** Replacements the node accepted, allowed per attempt; after the last, a person looks. */
export const MAX_REPLACEMENTS = 3;
/** A send the node never confirmed receiving is re-sent, unchanged, this long after the last try. */
export const REBROADCAST_AFTER_MS = 60_000;
/** Unanswered re-sends of one transaction before a person looks. */
export const MAX_REBROADCASTS = 3;
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
    // A stopped replacement keeps its own code for the person who looks.
    const stopped = (replacementStopCodes as readonly string[]).includes(String(intent.lastErrorCode ?? ""));
    const overdue = !stopped && typeof intent.submittedAt === "string" && now.getTime() - Date.parse(intent.submittedAt) > GRANT_OVERDUE_MS;
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

/** The benefit writers take order/admission locks before the intent; match that order. */
async function inGrant<T>(payload: Payload, intentID: string,
  work: (req: PayloadRequest, intent: CommerceDocument, held: boolean) => Promise<T>): Promise<T> {
  const req = requestFor(payload);
  return inCommerceTransaction(req, async () => {
    const preliminary = await readCommerce(req, INTENTS, intentID);
    const orderID = relationshipID(preliminary.order);
    const admissionID = relationshipID(preliminary.entitlement);
    await lockCommerce(req, [`order-benefits:${orderID}`]);
    await lockCommerce(req, [`admission:${admissionID}`]);
    await lockCommerce(req, [`key-grant:${String(preliminary.operationKey)}`]);
    const intent = await readCommerce(req, INTENTS, intentID);
    const admission = await readCommerce(req, "commerce-admissions", admissionID);
    const payment = await readCommerce(req, "transactions", relationshipID(intent.payment));
    const ticketTarget = typeof intent.target === "object" && intent.target ? intent.target as { chainID?: unknown; lock?: unknown; ticketTier?: unknown; ticketMode?: unknown } : null;
    const shared = sharedTicketTarget.safeParse(admission.ticketTarget);
    const memberEvent = intent.purpose === MEMBER_EVENT_GRANT;
    const sharedSignet = shared.success && admission.ticketTier === "member" && !memberEvent;
    const pinnedTicket = !sharedSignet && (admission.ticketTier != null || admission.ticketTarget != null || ticketTarget?.ticketTier != null);
    const sharedMismatch = shared.success && !sharedSignet && (ticketTarget?.ticketMode !== "shared" ||
      ticketTarget?.ticketTier !== admission.ticketTier || !sharedEventTicketsEnabled(relationshipID(admission.event), shared.data));
    const modeMismatch = (!shared.success && ticketTarget?.ticketMode != null) || (memberEvent && (!shared.success || admission.ticketTier !== "member"));
    const signetMismatch = sharedSignet && (!ticketTarget || ticketTarget.ticketTier != null || ticketTarget.ticketMode != null ||
      typeof ticketTarget.lock !== "string" || ticketTarget.lock.toLowerCase() === shared.data.lock);
    const ticketMismatch = pinnedTicket && (!ticketTarget || typeof ticketTarget.chainID !== "number" || typeof ticketTarget.lock !== "string"
      || (admission.ticketTier !== "guest" && admission.ticketTier !== "member")
      || (ticketTarget.ticketTier === "guest") !== (admission.ticketTier === "guest")
      || !sameTicketTarget(admission.ticketTarget, { chainID: ticketTarget.chainID, lock: ticketTarget.lock, ...(ticketTarget.ticketMode === "shared" ? { mode: "shared" as const } : {}) }));
    const held = sharedMismatch || modeMismatch || signetMismatch || ticketMismatch || relationshipID(intent.order) !== orderID || relationshipID(intent.entitlement) !== admissionID
      || relationshipID(admission.order) !== orderID || relationshipID(admission.transaction) !== payment.id
      || relationshipID(payment.order) !== orderID || payment.status !== "succeeded"
      || payment.commerceReviewHold === true || payment.commerceResolutionConflict === true || intent.cancelRequested === true
      || admission.benefitReview === true || admission.status === "revoked" || Boolean(admission.returnAcceptedAt);
    return withCommerceWrite(req, () => work(req, intent, held));
  });
}

async function claim(payload: Payload, intentID: string, now: Date): Promise<{ attemptID: string; intent: CommerceDocument } | null> {
  return inGrant(payload, intentID, async (req, intent, held) => {
    if (intent.state !== "pending" || intent.cancelRequested === true) return null;
    if (held) {
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

const signerLockKey = (signer: string) => `key-signer:${signer}`;
const nonceLockKey = (signer: string) => `key-signer-nonce:${signer}`;

/** Every row matching `where`, a page at a time, bounded by MAX_ROWS. With `req`, read inside its transaction. */
async function findAll(payload: Payload, where: Where, req?: PayloadRequest, sort?: string): Promise<CommerceDocument[]> {
  const docs: CommerceDocument[] = [];
  for (let page = 1; docs.length < MAX_ROWS; page++) {
    const found = await payload.find({ collection: INTENTS as never, where, sort, limit: 100, page, depth: 0, overrideAccess: true, req });
    docs.push(...(found.docs as unknown as CommerceDocument[]));
    if (!found.hasNextPage) break;
  }
  return docs;
}

/** Nonces `signer` has in flight: grants not yet settled, and cancels sent and not yet settled. */
async function inFlightNonces(payload: Payload, signer: string, req?: PayloadRequest): Promise<{ id: string; nonce: number; cancel: boolean }[]> {
  const grants = await findAll(payload, { and: [{ signer: { equals: signer } }, { state: { in: ["submitted", "ambiguous"] } }, { nonce: { exists: true } }] }, req);
  const cancels = await findAll(payload, { and: [{ cancelSigner: { equals: signer } }, { state: { equals: "granted" } }, { cancelTxHash: { exists: true } }] }, req);
  return [
    ...grants.map((row) => ({ id: row.id, nonce: Number(row.nonce), cancel: false })),
    ...cancels.map((row) => ({ id: row.id, nonce: Number(row.cancelNonce), cancel: true })),
  ];
}

/** One past this signer's highest in-flight nonce (compared as numbers), or 0. */
async function nonceFloor(payload: Payload, signer: string): Promise<number> {
  return Math.max(-1, ...(await inFlightNonces(payload, signer)).map((entry) => entry.nonce)) + 1;
}

/** Inside a write-ahead transaction: whether another in-flight grant or cancel of `signer` already holds `nonce`. */
async function nonceTaken(req: PayloadRequest, signer: string, nonce: number, intentID: string, cancel: boolean): Promise<boolean> {
  await lockCommerce(req, [nonceLockKey(signer)]);
  return (await inFlightNonces(req.payload, signer, req)).some((entry) => entry.nonce === nonce && !(entry.id === intentID && entry.cancel === cancel));
}

const recordedSends = (intent: CommerceDocument, field = "sends"): RecordedSend[] => Array.isArray(intent[field]) ? intent[field] as RecordedSend[] : [];
/** A send a node confirmed receiving. Entries recorded without their bytes count as accepted. */
const acceptedSend = (send: RecordedSend): boolean => send.accepted === true || (send.accepted === undefined && !send.raw);
const sendEntry = (prepared: Prepared, sentAt: string, keepRaw: boolean): RecordedSend =>
  ({ txHash: prepared.txHash, ...prepared.fee, sentAt, ...(keepRaw ? { raw: prepared.raw } : {}), accepted: false });

type Prepared = { txHash: string; raw: string; nonce?: number; fee: TransactionFee };
type Recorded = "recorded" | "moved" | "conflict" | "held";
type Answer = BroadcastOutcome | { kind: "threw" };
/** How one locked send ended. Only `sent` may have reached the chain. */
type Sent<Skip> =
  | { kind: "notSent"; code: string }
  | { kind: "moved" }
  | { kind: "suppressed" }
  | { kind: "skipped"; reason: Skip }
  | { kind: "sent"; txHash: string; answer: Answer };

/**
 * One write-ahead send under the signer's database lock: prepare (sign, nothing
 * sent), record the hash in its own committed transaction, then broadcast, all
 * while the lock is held. Anything that fails before the broadcast starts is
 * proven not sent (the prepared transaction is released); a failed broadcast is
 * `threw`, for reconciliation.
 */
async function lockedSend<P extends Prepared, Skip>(
  payload: Payload, signer: string,
  prepare: () => Promise<{ kind: "prepared"; prepared: P } | { kind: "notSent"; code: string } | { kind: "skipped"; reason: Skip }>,
  writeAhead: (prepared: P) => Promise<Recorded>,
  chain: { broadcast(input: { intentID: string; txHash: string }): Promise<BroadcastOutcome>; release(input: { txHash: string }): void },
  intentID: string,
  finishGrant?: (prepared: P) => Promise<Sent<Skip>>,
): Promise<Sent<Skip>> {
  const progress: { stage: "lock" | "prepare" | "record" | "broadcast"; result?: Sent<Skip> } = { stage: "lock" };
  try {
    await withSignerLock(payload, signer, async () => {
      progress.stage = "prepare";
      let step: Awaited<ReturnType<typeof prepare>>;
      try { step = await prepare(); } catch { step = { kind: "notSent", code: "adapter_threw" }; }
      if (step.kind !== "prepared") { progress.result = step; return; }
      const { txHash } = step.prepared;
      progress.stage = "record";
      let recorded: Recorded = "moved";
      try { recorded = await writeAhead(step.prepared); }
      finally { if (recorded !== "recorded") chain.release({ txHash }); }
      if (recorded !== "recorded") { progress.result = recorded === "moved" ? { kind: "moved" } : { kind: "notSent", code: recorded === "held" ? "grant_held" : "nonce_conflict" }; return; }
      progress.stage = "broadcast";
      if (finishGrant) {
        try { progress.result = await finishGrant(step.prepared); }
        catch { progress.result = { kind: "sent", txHash, answer: { kind: "threw" } }; }
        finally { chain.release({ txHash }); }
      } else {
        let answer: Answer;
        try { answer = await chain.broadcast({ intentID, txHash }); } catch { answer = { kind: "threw" }; }
        progress.result = { kind: "sent", txHash, answer };
      }
    });
  } catch {
    // The lock was not taken, or a write-ahead write failed: nothing was broadcast.
    // (Once the broadcast ran its result is kept, even if releasing the lock then failed.)
    progress.result ??= { kind: "notSent", code: progress.stage === "lock" ? "signer_lock_unavailable" : "write_ahead_failed" };
  }
  return progress.result ?? { kind: "notSent", code: "write_ahead_failed" };
}

/** Holds the signer's advisory lock in its own transaction while `work` runs; `work`'s writes commit in their own transactions. */
async function withSignerLock<T>(payload: Payload, signer: string, work: () => Promise<T>): Promise<T> {
  const req = requestFor(payload);
  return inCommerceTransaction(req, async () => {
    await lockCommerce(req, [signerLockKey(signer)]);
    return work();
  });
}

/** Records the prepared grant's hash, signer, nonce and fee on the claimed intent. */
async function writeAhead(payload: Payload, intentID: string, attemptID: string, signer: string, prepared: Prepared & { nonce: number }, now: Date): Promise<Recorded> {
  return inGrant(payload, intentID, async (req, intent, held) => {
    if (intent.attemptID !== attemptID || intent.state !== "submitted" || intent.txHash) return "moved";
    if (held) return "held";
    if (await nonceTaken(req, signer, prepared.nonce, intentID, false)) return "conflict";
    const sentAt = now.toISOString();
    await updateCommerce(req, INTENTS, intentID, {
      txHash: prepared.txHash, signer, nonce: prepared.nonce, sends: [sendEntry(prepared, sentAt, false)], submittedAt: sentAt, lastSentAt: sentAt, lastErrorCode: grantBroadcastPending,
    });
    return "recorded";
  });
}

/** Marks the first recorded send accepted once the node answered with its hash. */
async function acceptFirstSend(payload: Payload, intentID: string, fence: (intent: CommerceDocument) => boolean, field: string, txHash: string): Promise<void> {
  await inIntent(payload, intentID, async (req, intent) => {
    const sends = recordedSends(intent, field);
    if (!fence(intent) || sends.length !== 1 || sends[0].txHash !== txHash) return;
    await updateCommerce(req, INTENTS, intentID, { [field]: [{ ...sends[0], accepted: true }] });
  });
}

/** The durable fence is cleared only when this exact send's outcome is recorded. */
async function finishGrantBroadcast<Skip>(payload: Payload, intentID: string, prepared: Prepared,
  fence: (intent: CommerceDocument) => boolean, broadcast: KeyGrantAdapter["broadcast"], first: boolean): Promise<Sent<Skip>> {
  const { txHash } = prepared;
  return inGrant(payload, intentID, async (req, intent, held) => {
    if (!fence(intent) || intent.lastErrorCode !== grantBroadcastPending) return { kind: "moved" };
    let answer: Answer | undefined;
    if (!held) {
      try { answer = await broadcast({ intentID, txHash }); } catch { answer = { kind: "threw" }; }
    }
    if (!answer || answer.kind === "definitelyNotSent") {
      // No raw bytes ever left worker memory in this branch. The nonce stays
      // reserved for an operator; it is not allocated to another transaction.
      await updateCommerce(req, INTENTS, intentID, { lastErrorCode: grantBroadcastSuppressed });
      return { kind: "suppressed" };
    }
    const sends = recordedSends(intent);
    const succeeded = answer.kind === "submitted";
    await updateCommerce(req, INTENTS, intentID, {
      sends: sends.map((send, index) => index === sends.length - 1 ? { ...send, raw: prepared.raw, accepted: succeeded } : send),
      lastErrorCode: succeeded ? null : first ? (answer.kind === "threw" ? "adapter_threw" : "outcome_unknown") : "replacement_outcome_unknown",
      ...(first && !succeeded ? { state: "ambiguous" } : {}),
    });
    return { kind: "sent", txHash, answer };
  });
}

async function recordUnsentGrant(payload: Payload, intentID: string, attemptID: string, now: Date, outcome: Sent<never>): Promise<void> {
  if (outcome.kind !== "notSent") return;
  await inIntent(payload, intentID, async (req, intent) => {
    if (intent.attemptID !== attemptID || intent.state !== "submitted" || intent.txHash) return;
    await updateCommerce(req, INTENTS, intentID, notSentData(outcome.code, intent.attempts, now));
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
        : { state: "pending", txHash: null, tokenID: null, submittedAt: null, attemptID: null, nextAttemptAt: null, signer: null, nonce: null, sends: null, lastSentAt: null, settledTxHash: null };
      await updateCommerce(req, "commerce-key-grant-intents", row.id, data);
    });
  }
}

/** Dispatch up to `limit` pending intents. Returns how many were dispatched. */
export async function dispatchKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  await sweepInterruptedClaims(payload, now);
  await requeueRetryable(payload, now);
  // Behind a nonce stopped for a person, later nonces could never mine: hold new grants in pending.
  if (await signerHeld(payload, adapter.signer)) return 0;
  let dispatched = 0;
  for await (const row of due(payload, { state: { equals: "pending" } }, now)) {
    if (dispatched >= limit || await signerHeld(payload, adapter.signer)) break;
    const claimed = await claim(payload, row.id, now());
    if (!claimed) continue;
    dispatched++;
    const outcome = await lockedSend<Prepared & { nonce: number }, never>(payload, adapter.signer, async () => {
      if (await signerHeld(payload, adapter.signer)) return { kind: "notSent", code: "signer_held" };
      // Nothing is sent while preparing, so a throw here is proven non-execution.
      const prepared = await adapter.prepare({ intentID: row.id, attemptID: claimed.attemptID, target: parseKeyGrantTarget(claimed.intent.target), nonceFloor: await nonceFloor(payload, adapter.signer) });
      return prepared.kind === "prepared" ? { kind: "prepared", prepared } : { kind: "notSent", code: prepared.code };
    }, (prepared) => writeAhead(payload, row.id, claimed.attemptID, adapter.signer, prepared, now()), adapter, row.id,
    (prepared) => finishGrantBroadcast(payload, row.id, prepared,
      intent => intent.attemptID === claimed.attemptID && intent.state === "submitted" && intent.txHash === prepared.txHash
        && sameLatestSend(intent, "sends", 1, prepared.txHash), input => adapter.broadcast(input), true));
    await recordUnsentGrant(payload, row.id, claimed.attemptID, now(), outcome);
  }
  return dispatched;
}

/**
 * Re-check submitted/ambiguous intents against every hash they recorded. Never
 * sends. Only one transaction per nonce can mine: a confirmed hash grants the
 * key, and a reverted one proves the nonce consumed without a key.
 */
export async function reconcileKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  let settled = 0;
  for await (const row of due(payload, { and: [{ state: { in: ["submitted", "ambiguous"] } }, { txHash: { exists: true } }] }, now)) {
    if (settled >= limit) break;
    const hashes = [...new Set([String(row.txHash), ...recordedSends(row).map((send) => send.txHash)])];
    // A confirmed suppression applies only to the last send, not older hashes.
    if (row.lastErrorCode === grantBroadcastSuppressed) {
      const suppressed = recordedSends(row).at(-1)?.txHash;
      const index = suppressed ? hashes.indexOf(suppressed) : -1;
      if (index >= 0) hashes.splice(index, 1);
      if (!hashes.length) {
        await deferOrSurface(payload, row, now());
        continue;
      }
    }
    const outcomes: { txHash: string; outcome: ReconcileOutcome }[] = [];
    for (const txHash of hashes) {
      let outcome: ReconcileOutcome;
      try { outcome = await adapter.reconcile({ intentID: row.id, txHash, target: parseKeyGrantTarget(row.target) }); }
      catch { outcome = { kind: "unknown" }; }
      outcomes.push({ txHash, outcome });
    }
    const result = outcomes.find((entry) => entry.outcome.kind === "confirmed") ?? outcomes.find((entry) => entry.outcome.kind === "definitelyReverted");
    if (!result) { await deferOrSurface(payload, row, now()); continue; }
    await inIntent(payload, row.id, async (req, intent) => {
      // Fenced by attempt and hash: a result for an older attempt never lands on a newer one.
      if (!["submitted", "ambiguous"].includes(String(intent.state)) || intent.txHash !== row.txHash || intent.attemptID !== row.attemptID) return;
      const { outcome, txHash } = result;
      if (intent.lastErrorCode === ticketTokenConflict && outcome.kind !== "confirmed") return;
      let ticketTokenKey: string | undefined;
      if (outcome.kind === "confirmed") {
        const target = parseKeyGrantTarget(intent.target);
        if (target.ticketMode === "shared") {
          const key = ticketTokenIdentity(target.chainID, target.lock, outcome.tokenID);
          if (key) await lockCommerce(req, [`event-token:${key}`]);
          const previous = key && await findCommerce(req, INTENTS, "ticketTokenKey", key);
          if (!key || (previous && previous.id !== intent.id)) {
            await updateCommerce(req, INTENTS, row.id, { state: "ambiguous", lastErrorCode: ticketTokenConflict, nextAttemptAt: later(now(), HOLD_RECHECK_MS) });
            return;
          }
          ticketTokenKey = key;
        }
      }
      const data = outcome.kind === "confirmed" ? { state: "granted", tokenID: outcome.tokenID, ...(ticketTokenKey ? { ticketTokenKey } : {}), grantedAt: now().toISOString(), nextAttemptAt: null, settledTxHash: txHash }
        : { state: "failed_retryable", lastErrorCode: code(outcome.kind === "definitelyReverted" ? outcome.code : "tx_reverted"), settledTxHash: txHash, nextAttemptAt: later(now(), RETRY_BACKOFF_MS * Math.max(1, Number(intent.attempts))) };
      await updateCommerce(req, INTENTS, row.id, data);
      settled++;
    });
  }
  return settled;
}

/**
 * Where an intent keeps one kind of chain operation (the grant, or its
 * cancel), so stuck grants and stuck cancels share one re-send/replace path.
 */
type Operation = {
  fields: { txHash: string; signer: string; nonce: string; sends: string; lastSentAt: string };
  /** Prefix of this operation's replacement codes. */
  prefix: string;
  /** Codes that stop replacement for a person (and hold the signer's new sends). */
  stopCodes: readonly string[];
  /** Codes of a settled send that is no longer in flight. */
  settledCodes: readonly string[];
  /** This signer's rows with this operation in flight. */
  inFlight(signer: string): Where;
  /** Still the same unsettled attempt as `row`. */
  same(intent: CommerceDocument, row: CommerceDocument): boolean;
  /** The update that stops replacement with `code`. */
  stop(code: string): Record<string, unknown>;
};

const grantOperation: Operation = {
  fields: { txHash: "txHash", signer: "signer", nonce: "nonce", sends: "sends", lastSentAt: "lastSentAt" },
  prefix: "replacement_", stopCodes: replacementStopCodes, settledCodes: [],
  inFlight: (signer): Where => ({ and: [{ signer: { equals: signer } }, { state: { in: ["submitted", "ambiguous"] } }, { txHash: { exists: true } }] as Where[] }),
  same: (intent, row) => ["submitted", "ambiguous"].includes(String(intent.state)) && intent.attemptID === row.attemptID && intent.txHash === row.txHash,
  stop: (stopCode) => ({ state: "ambiguous", lastErrorCode: stopCode }),
};

const cancelOperation: Operation = {
  fields: { txHash: "cancelTxHash", signer: "cancelSigner", nonce: "cancelNonce", sends: "cancelSends", lastSentAt: "cancelLastSentAt" },
  prefix: "cancel_replacement_", stopCodes: cancelReplacementStopCodes, settledCodes: ["cancel_reverted"],
  inFlight: (signer): Where => ({ and: [{ cancelSigner: { equals: signer } }, { state: { equals: "granted" } }, { cancelTxHash: { exists: true } }] as Where[] }),
  same: (intent, row) => intent.state === "granted" && intent.cancelAttemptID === row.cancelAttemptID && intent.cancelTxHash === row.cancelTxHash,
  stop: (stopCode) => ({ lastErrorCode: stopCode, nextAttemptAt: null }),
};

/** Whether `signer` has a nonce stopped for a person, grant or cancel: its later nonces could never mine. */
async function signerHeld(payload: Payload, signer: string): Promise<boolean> {
  for (const operation of [grantOperation, cancelOperation]) {
    const found = await payload.find({ collection: INTENTS as never, where: { and: [operation.inFlight(signer), { lastErrorCode: { in: [...operation.stopCodes] } }] } as never, limit: 1, depth: 0, overrideAccess: true });
    if (found.docs.length) return true;
    // Unacknowledged sends can be absent from the node. Never allocate above
    // them before same-nonce recovery or settlement. A reverted cancel is settled.
    const unresolved = await findAll(payload, { and: [operation.inFlight(signer),
      ...(operation.settledCodes.length ? [{ or: [{ lastErrorCode: { exists: false } }, { lastErrorCode: { not_in: operation.settledCodes } }] }] : []),
    ] });
    if (unresolved.length >= MAX_ROWS || unresolved.some(intent => {
      const last = recordedSends(intent, operation.fields.sends).at(-1);
      return last != null && !acceptedSend(last);
    })) return true;
  }
  return false;
}

/** Updates an attempt that is still this one; never touches its hashes or nonce. */
async function markAttempt(payload: Payload, operation: Operation, row: CommerceDocument, data: Record<string, unknown>): Promise<void> {
  await inIntent(payload, row.id, async (req, intent) => {
    if (!operation.same(intent, row) || (operation === grantOperation && isFencedGrantBroadcast(intent))) return;
    await updateCommerce(req, INTENTS, row.id, data);
  });
}

/** Changes recorded send `index` (acceptance or re-send count only) on an attempt that is still this one. */
async function markSend(payload: Payload, operation: Operation, row: CommerceDocument, index: number, change: Pick<RecordedSend, "accepted" | "rebroadcasts">, data: Record<string, unknown>): Promise<void> {
  await inIntent(payload, row.id, async (req, intent) => {
    const sends = recordedSends(intent, operation.fields.sends);
    if (!operation.same(intent, row) || (operation === grantOperation && isFencedGrantBroadcast(intent)) || sends[index]?.txHash !== recordedSends(row, operation.fields.sends)[index]?.txHash) return;
    const cleared = String(intent.lastErrorCode ?? "").startsWith(operation.prefix) && change.accepted ? { lastErrorCode: null } : {};
    await updateCommerce(req, INTENTS, row.id, { [operation.fields.sends]: sends.map((send, at) => at === index ? { ...send, ...change } : send), ...cleared, ...data });
  });
}

function isFencedGrantBroadcast(intent: CommerceDocument): boolean {
  return (grantBroadcastStops as readonly string[]).includes(String(intent.lastErrorCode));
}

function sameLatestSend(intent: CommerceDocument, field: string, count: number, hash: string): boolean {
  const sends = recordedSends(intent, field);
  return sends.length === count && sends.at(-1)?.txHash === hash;
}

/** Called in the order/admission/intent transaction, inside the signer lock. */
async function grantRecoveryAllowed(req: PayloadRequest, intent: CommerceDocument, held: boolean,
  row: CommerceDocument, sendCount: number, txHash: string): Promise<boolean> {
  if (!grantOperation.same(intent, row) || !sameLatestSend(intent, "sends", sendCount, txHash)
    || grantOperation.stopCodes.includes(String(intent.lastErrorCode))) return false;
  if (!held) return true;
  await updateCommerce(req, INTENTS, intent.id, { lastErrorCode: grantRecoveryHeld });
  return false;
}

type Replacer = {
  signer: string;
  replace(row: CommerceDocument, nonce: number, previous: TransactionFee): Promise<ReplaceOutcome>;
  rebroadcast(input: { raw: string }): Promise<RebroadcastOutcome>;
  broadcast(input: { intentID: string; txHash: string }): Promise<BroadcastOutcome>;
  release(input: { txHash: string }): void;
};

/**
 * Moves this signer's stuck sends of one operation forward, at their own nonce:
 * 1. a last send the node never confirmed receiving is re-sent unchanged from its
 *    recorded bytes (REBROADCAST_AFTER_MS apart; after MAX_REBROADCASTS a person looks);
 * 2. an accepted last send still unconfirmed REPLACE_AFTER_MS later is re-signed
 *    with a fee raised from it (never from an unsent one), written ahead, then sent.
 * Only accepted sends count toward MAX_REPLACEMENTS. Nothing here ever moves the
 * operation to a new nonce: an earlier transaction may still mine.
 */
async function replaceStuck(payload: Payload, operation: Operation, chain: Replacer, now: () => Date, limit: number): Promise<number> {
  const { fields, prefix } = operation;
  const recheck = new Date(now().getTime() - REBROADCAST_AFTER_MS).toISOString();
  const rows = await findAll(payload, { and: [
    operation.inFlight(chain.signer), { [fields.lastSentAt]: { less_than_equal: recheck } },
    { or: [{ lastErrorCode: { exists: false } }, { lastErrorCode: { not_in: [...operation.stopCodes, ...operation.settledCodes] } }] },
  ] }, undefined, fields.lastSentAt);
  let replaced = 0;
  for (const row of rows) {
    if (replaced >= limit) break;
    const sends = recordedSends(row, fields.sends);
    const last = sends.at(-1);
    if (!last || row[fields.nonce] == null) continue; // recorded before nonces were persisted: left to a person
    const nonce = Number(row[fields.nonce]);
    if (!acceptedSend(last)) {
      if (!last.raw) continue; // No durable signed bytes to re-send.
      // 1. Re-send the same bytes: the node may simply never have received them.
      const tries = last.rebroadcasts ?? 0;
      if (tries >= MAX_REBROADCASTS) { await markAttempt(payload, operation, row, operation.stop(`${prefix}rebroadcast_failed`)); continue; }
      const send = async (): Promise<RebroadcastOutcome> => {
        try { return await chain.rebroadcast({ raw: String(last.raw) }); } catch { return { kind: "unknown" }; }
      };
      const answer = operation === grantOperation
        ? await withSignerLock(payload, chain.signer, () => inGrant(payload, row.id, async (req, intent, held) =>
          await grantRecoveryAllowed(req, intent, held, row, sends.length, last.txHash) ? send() : null))
        : await send();
      if (!answer) continue;
      const sentAt = now().toISOString();
      if (answer.kind === "accepted") await markSend(payload, operation, row, sends.length - 1, { accepted: true }, { [fields.lastSentAt]: sentAt });
      else if (answer.kind === "unknown") await markSend(payload, operation, row, sends.length - 1, { rebroadcasts: tries + 1 }, { [fields.lastSentAt]: sentAt, lastErrorCode: `${prefix}rebroadcast_unknown` });
      continue; // nonce consumed: reconcile settles it
    }
    // 2. Raise the fee once the accepted last send has waited out its deadline.
    if (Date.parse(String(row[fields.lastSentAt])) > now().getTime() - REPLACE_AFTER_MS) continue;
    if (sends.filter(acceptedSend).length - 1 >= MAX_REPLACEMENTS) { await markAttempt(payload, operation, row, operation.stop(`${prefix}exhausted`)); continue; }
    const outcome = await lockedSend<Prepared, "moved" | "nonceConsumed">(payload, chain.signer, async () => {
      const canPrepare = operation === grantOperation
        ? await inGrant(payload, row.id, (req, intent, held) => grantRecoveryAllowed(req, intent, held, row, sends.length, last.txHash))
        : await readCommerce(requestFor(payload), INTENTS, row.id).then(intent =>
          operation.same(intent, row) && sameLatestSend(intent, fields.sends, sends.length, last.txHash));
      if (!canPrepare) return { kind: "skipped", reason: "moved" };
      const prepared = await chain.replace(row, nonce, { maxFeePerGas: last.maxFeePerGas, maxPriorityFeePerGas: last.maxPriorityFeePerGas });
      if (prepared.kind === "prepared") return { kind: "prepared", prepared };
      return prepared.kind === "nonceConsumed" ? { kind: "skipped", reason: "nonceConsumed" } : { kind: "notSent", code: prepared.code };
    }, (prepared) => {
      const record = async (req: PayloadRequest, intent: CommerceDocument, held = false): Promise<Recorded> => {
        const grant = operation === grantOperation;
        if (grant) {
          if (!await grantRecoveryAllowed(req, intent, held, row, sends.length, last.txHash)) return "moved";
        } else if (!operation.same(intent, row) || !sameLatestSend(intent, fields.sends, sends.length, last.txHash)
          || operation.stopCodes.includes(String(intent.lastErrorCode))) return "moved";
        if (await nonceTaken(req, chain.signer, nonce, row.id, operation === cancelOperation)) return "conflict";
        const sentAt = now().toISOString();
        await updateCommerce(req, INTENTS, row.id, {
          [fields.sends]: [...recordedSends(intent, fields.sends), sendEntry(prepared, sentAt, !grant)],
          [fields.lastSentAt]: sentAt, ...(grant ? { lastErrorCode: grantBroadcastPending } : {}),
        });
        return "recorded";
      };
      return operation === grantOperation ? inGrant(payload, row.id, record) : inIntent(payload, row.id, record);
    }, chain, row.id, operation === grantOperation
      ? (prepared) => finishGrantBroadcast(payload, row.id, prepared,
        intent => operation.same(intent, row) && sameLatestSend(intent, fields.sends, sends.length + 1, prepared.txHash),
        input => chain.broadcast(input), false)
      : undefined);
    if (outcome.kind === "skipped" || outcome.kind === "moved" || outcome.kind === "suppressed") continue;
    if (operation === grantOperation && outcome.kind === "sent") {
      if (outcome.answer.kind === "submitted") replaced++;
      continue; // The fenced outcome was recorded (or the durable park fence remains).
    }
    if (outcome.kind === "notSent") {
      // A ceiling or an unrecordable replacement waits for a person; anything else is tried again later.
      const stopped = { fee_ceiling_reached: "fee_ceiling", write_ahead_failed: "write_ahead_failed" }[outcome.code];
      await markAttempt(payload, operation, row, stopped ? operation.stop(`${prefix}${stopped}`) : { lastErrorCode: code(`${prefix}${outcome.code}`) });
      continue;
    }
    const { answer } = outcome;
    if (answer.kind === "submitted") {
      replaced++;
      await markSend(payload, operation, { ...row, [fields.sends]: [...sends, { txHash: outcome.txHash }] }, sends.length, { accepted: true }, {});
    } else {
      // Recorded but unconfirmed: the next pass re-sends these bytes before any higher fee.
      await markAttempt(payload, operation, row, { lastErrorCode: code(answer.kind === "definitelyNotSent" ? `${prefix}${answer.code}` : `${prefix}outcome_unknown`) });
    }
  }
  return replaced;
}

/**
 * Replace this signer's stuck grants at their own nonce: re-send a send the
 * node never confirmed, or re-sign with a higher fee after REPLACE_AFTER_MS.
 * Selected by `lastSentAt`, not by reconcile's `nextAttemptAt`. Returns how many
 * fee-raised replacements the node accepted.
 */
export async function replaceStuckKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: Pass): Promise<number> {
  return replaceStuck(payload, grantOperation, {
    signer: adapter.signer,
    replace: (row, nonce, previous) => adapter.prepareReplacement({ intentID: row.id, target: parseKeyGrantTarget(row.target), nonce, previous }),
    rebroadcast: (input) => adapter.rebroadcast(input),
    broadcast: (input) => adapter.broadcast(input),
    release: (input) => adapter.release(input),
  }, now, limit);
}

/* ADR-0009: cancel a granted key on chain with the lock-manager authority. */

const parkedCancel = (errorCode: string): boolean => (parkedCancelCodes as readonly string[]).includes(errorCode);

async function claimCancel(payload: Payload, intentID: string, signer: string, now: Date): Promise<{ cancelAttemptID: string; intent: CommerceDocument } | null> {
  return inIntent(payload, intentID, async (req, intent) => {
    if (intent.state !== "granted" || intent.cancelRequested !== true || intent.cancelAttemptID || intent.cancelTxHash || parkedCancel(String(intent.lastErrorCode ?? ""))) return null;
    if (intent.signer && intent.signer === signer) {
      // The grant signer never cancels (ADR-0008): park for a person.
      await updateCommerce(req, INTENTS, intentID, { lastErrorCode: "cancel_signer_is_granter", nextAttemptAt: null });
      return null;
    }
    const cancelAttemptID = randomUUID();
    const updated = await updateCommerce(req, INTENTS, intentID, { cancelAttemptID, cancelStartedAt: now.toISOString(), lastErrorCode: null, nextAttemptAt: null });
    return { cancelAttemptID, intent: updated };
  });
}

/** Clears an unsent cancel claim so it can be retried, or parked when retrying cannot help. */
const cancelNotSentData = (errorCode: string, now: Date) => ({
  cancelAttemptID: null, cancelStartedAt: null, lastErrorCode: code(errorCode), nextAttemptAt: parkedCancel(errorCode) ? null : later(now, RETRY_BACKOFF_MS),
});
const sameCancelClaim = (cancelAttemptID: string) => (intent: CommerceDocument) => intent.cancelAttemptID === cancelAttemptID && intent.state === "granted";

async function recordCancel(payload: Payload, intentID: string, cancelAttemptID: string, now: Date, outcome: Sent<"confirmedKeyInvalid">): Promise<void> {
  if (outcome.kind === "moved" || outcome.kind === "suppressed") return;
  if (outcome.kind === "sent" && outcome.answer.kind === "submitted") return acceptFirstSend(payload, intentID, sameCancelClaim(cancelAttemptID), "cancelSends", outcome.txHash);
  await inIntent(payload, intentID, async (req, intent) => {
    if (intent.cancelAttemptID !== cancelAttemptID || intent.state !== "granted") return;
    let data: Record<string, unknown>;
    if (outcome.kind === "skipped") data = { state: "cancelled", cancelledAt: now.toISOString(), lastErrorCode: "key_not_valid", nextAttemptAt: null };
    else if (outcome.kind === "notSent") data = cancelNotSentData(outcome.code, now);
    else if (outcome.answer.kind === "definitelyNotSent") {
      // Recorded, then proven unsent: the whole attempt is cleared together.
      data = { ...cancelNotSentData(outcome.answer.code, now), cancelTxHash: null, cancelNonce: null, cancelSigner: null, cancelSubmittedAt: null, cancelSends: null, cancelLastSentAt: null };
    } else data = { lastErrorCode: "cancel_outcome_unknown" };
    await updateCommerce(req, INTENTS, intentID, data);
  });
}

async function reconcileCancels(payload: Payload, adapter: KeyCancelAdapter, now: () => Date): Promise<void> {
  const inFlight = { and: [{ state: { equals: "granted" } }, { cancelSigner: { equals: adapter.signer } }, { cancelTxHash: { exists: true } }, { or: [{ lastErrorCode: { exists: false } }, { lastErrorCode: { not_in: ["cancel_reverted"] } }] }] };
  for await (const row of due(payload, inFlight, now)) {
    // Every recorded cancel hash: only one per nonce can mine.
    const outcomes: CancelReconcileOutcome[] = [];
    for (const txHash of new Set([String(row.cancelTxHash), ...recordedSends(row, "cancelSends").map((send) => send.txHash)])) {
      try { outcomes.push(await adapter.reconcileCancel({ txHash, target: parseKeyGrantTarget(row.target), tokenID: String(row.tokenID) })); }
      catch { outcomes.push({ kind: "unknown" }); }
    }
    const outcome = outcomes.find((entry) => entry.kind === "confirmed") ?? outcomes.find((entry) => entry.kind === "definitelyReverted") ?? { kind: "unknown" };
    await inIntent(payload, row.id, async (req, intent) => {
      if (intent.state !== "granted" || intent.cancelTxHash !== row.cancelTxHash) return;
      // A stopped replacement keeps its own code for the person who looks.
      const stopped = (cancelReplacementStopCodes as readonly string[]).includes(String(intent.lastErrorCode ?? ""));
      const overdue = !stopped && typeof intent.cancelSubmittedAt === "string" && now().getTime() - Date.parse(intent.cancelSubmittedAt) > GRANT_OVERDUE_MS;
      const data = outcome.kind === "confirmed" ? { state: "cancelled", cancelledAt: now().toISOString(), lastErrorCode: null, nextAttemptAt: null }
        : outcome.kind === "definitelyReverted" ? { lastErrorCode: "cancel_reverted", nextAttemptAt: null }
          : { nextAttemptAt: later(now(), RECONCILE_RECHECK_MS), ...(overdue ? { lastErrorCode: "cancel_overdue" } : {}) };
      await updateCommerce(req, INTENTS, row.id, data);
    });
  }
}

/** A cancel claim with no hash after CLAIM_STALE_MS was interrupted before broadcast; it is cleared and retried. */
async function sweepInterruptedCancels(payload: Payload, now: () => Date): Promise<void> {
  const cutoff = new Date(now().getTime() - CLAIM_STALE_MS).toISOString();
  for await (const row of due(payload, { and: [{ state: { equals: "granted" } }, { cancelAttemptID: { exists: true } }, { cancelTxHash: { exists: false } }, { cancelStartedAt: { less_than_equal: cutoff } }] }, now)) {
    await inIntent(payload, row.id, async (req, intent) => {
      if (intent.state !== "granted" || intent.cancelTxHash || intent.cancelAttemptID !== row.cancelAttemptID) return;
      await updateCommerce(req, INTENTS, row.id, cancelNotSentData("cancel_interrupted", now()));
    });
  }
}

/**
 * ADR-0009: cancel on chain every granted key whose cancellation was requested
 * (a manual refund), with the lock-manager adapter. Explicitly invoked and
 * idempotent: each pass settles sent cancels from their receipts, then claims
 * and sends at most `limit` new ones, each written ahead and sent at most once.
 * Returns how many cancels were dispatched.
 */
export async function cancelKeyGrants({ payload, adapter, limit = 10, now = () => new Date() }: CancelPass): Promise<number> {
  await sweepInterruptedCancels(payload, now);
  await reconcileCancels(payload, adapter, now);
  await replaceStuck(payload, cancelOperation, {
    signer: adapter.signer,
    replace: (row, nonce, previous) => adapter.prepareCancelReplacement({ intentID: row.id, target: parseKeyGrantTarget(row.target), tokenID: String(row.tokenID), nonce, previous }),
    rebroadcast: (input) => adapter.rebroadcast(input),
    broadcast: (input) => adapter.broadcast(input),
    release: (input) => adapter.release(input),
  }, now, limit);
  // Behind a stopped cancel nonce, the manager's later cancels could never mine: hold them.
  if (await signerHeld(payload, adapter.signer)) return 0;
  const wanted = { and: [
    { state: { equals: "granted" } }, { cancelRequested: { equals: true } }, { cancelAttemptID: { exists: false } }, { cancelTxHash: { exists: false } },
    { or: [{ lastErrorCode: { exists: false } }, { lastErrorCode: { not_in: [...parkedCancelCodes] } }] },
  ] };
  let dispatched = 0;
  for await (const row of due(payload, wanted, now)) {
    if (dispatched >= limit || await signerHeld(payload, adapter.signer)) break;
    const claimed = await claimCancel(payload, row.id, adapter.signer, now());
    if (!claimed) continue;
    dispatched++;
    const outcome = await lockedSend<Prepared & { nonce: number }, "confirmedKeyInvalid">(payload, adapter.signer, async () => {
      if (await signerHeld(payload, adapter.signer)) return { kind: "notSent", code: "signer_held" };
      const prepared = await adapter.prepareCancel({ intentID: row.id, target: parseKeyGrantTarget(claimed.intent.target), tokenID: String(claimed.intent.tokenID), nonceFloor: await nonceFloor(payload, adapter.signer) });
      if (prepared.kind === "prepared") return { kind: "prepared", prepared };
      return prepared.kind === "confirmedKeyInvalid" ? { kind: "skipped", reason: "confirmedKeyInvalid" } : { kind: "notSent", code: prepared.code };
    }, (prepared) => inIntent(payload, row.id, async (req, intent) => {
      if (intent.cancelAttemptID !== claimed.cancelAttemptID || intent.state !== "granted" || intent.cancelTxHash) return "moved";
      if (await nonceTaken(req, adapter.signer, prepared.nonce, row.id, true)) return "conflict";
      const sentAt = now().toISOString();
      await updateCommerce(req, INTENTS, row.id, {
        cancelTxHash: prepared.txHash, cancelSigner: adapter.signer, cancelNonce: prepared.nonce, cancelSubmittedAt: sentAt, cancelSends: [sendEntry(prepared, sentAt, true)], cancelLastSentAt: sentAt,
      });
      return "recorded";
    }), adapter, row.id);
    await recordCancel(payload, row.id, claimed.cancelAttemptID, now(), outcome);
  }
  return dispatched;
}
