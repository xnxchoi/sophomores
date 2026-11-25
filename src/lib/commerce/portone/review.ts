import { createHash } from 'node:crypto'
import { APIError, type CollectionSlug, type PayloadRequest } from 'payload'
import { z } from 'zod'
import { withCommerceWrite } from '../access'
import { purchaseAllowance, type PurchaseSnapshot } from '../purchase-snapshot'
import { lockReservationContext, releaseReservation } from '../reservations'
import { holdOrderBenefits, revokeOrderBenefits } from '../benefit-review'
import { recordOrderRefund } from '../order-refund'
import { releaseInvalidatedSeats } from '../seat-release'
import { hasRefundRequest } from './refund'
import { assertPaymentRollback, inPaymentTransaction, lockCommerce, paymentTransactionToken, relationshipID } from '../_shared/transaction'
import { adapterConfig, parsePortOneTransaction, providerPayment, readPortOneTransaction, type AdapterDependencies } from './adapter'
import { channelType, classifyPaymentRisk, minimalPaymentRiskProof, validatePaidPayment } from './proof'
import { providerPaymentId } from '../../tickets/portone/payment-id'
import { assertReconciliationFence, retainReconciliationRisk, assertOrdinaryReconciliation, readUnresolvedSettlementProof, assertResultIdentity, listPaidReviewCases, listContradictedAttempts, paidReviewCustomerLock, recordVerifiedCancellation, recordPaymentContradiction, isClosedByVerifiedCancellation } from './accounting'
import { projectLocalResult } from './result'

const inputSchema = z.strictObject({ transactionID: z.uuid(), paymentID: providerPaymentId })
const failedEvidence = z.object({ id: providerPaymentId, status: z.literal('FAILED'), storeId: z.string(),
  channel: z.object({ key: z.string(), type: z.enum(['TEST', 'LIVE']) }), customer: z.object({ id: z.string() }),
  currency: z.literal('KRW'), amount: z.object({ total: z.int().positive(), paid: z.literal(0), cancelled: z.literal(0) }),
  disputes: z.array(z.unknown()).length(0).optional() })
type ReviewInput = z.infer<typeof inputSchema>
const verifiedCancellations = new WeakMap<PayloadRequest, string>()
export const isVerifiedPaymentCancellation = (req: PayloadRequest, transactionID: string): boolean => verifiedCancellations.get(req) === transactionID
// Only a minimal validated provider projection survives the generated handler's
// rollback. Neither serializable request data nor context can forge this queue.
const deferredRisk = new WeakMap<PayloadRequest, { input: ReviewInput;
  evidence: ReturnType<typeof minimalPaymentRiskProof>; deps: AdapterDependencies; settlementToken?: string; holdOnly?: boolean }>()

/** This error is raised only after the independent quarantine transaction commits. */
export class PaymentReviewRequired extends APIError {
  constructor() { super('Payment requires review', 409) }
}

/**
 * SYSTEM: the purchase fence, under the customer lock. It must see every case row's attempt,
 * so member access never filters it; the ledger lookup stays internal.
 * Batch owned case rows; validate the immutable tuple (including snapshot hash) before use.
 */
export async function loadPaidReviewAttempts(req: PayloadRequest, customerID: string, transactionsSlug = 'transactions') {
  return loadIdentifiedAttempts(req, customerID, await listPaidReviewCases(req, customerID), transactionsSlug)
}

/**
 * MEMBER: discovery for the signed-in account (/pending). The attempts are read with the
 * member's own transaction access; a case whose attempt that access cannot return is an
 * integrity stop, never an empty list.
 */
export async function loadOwnPaidReviewAttempts(req: PayloadRequest, customerID: string) {
  // The caller passes the customer it verified; the signed-in member must still be that
  // customer before the reads and again before the rows are returned.
  const assertPrincipal = () => {
    if (req.user?.collection !== 'users' || String(req.user.id) !== customerID) throw new APIError('Verified membership required', 403)
  }
  assertPrincipal()
  const rows = await loadIdentifiedAttempts(req, customerID, await listPaidReviewCases(req, customerID), 'transactions', 'member')
  assertPrincipal()
  return rows
}

async function loadIdentifiedAttempts(req: PayloadRequest, customerID: string,
  identities: Awaited<ReturnType<typeof listContradictedAttempts>>, transactionsSlug = 'transactions',
  access: 'system' | 'member' = 'system') {
  if (!identities.length) return []
  const byID = new Map(identities.map(identity => [identity.transactionID, identity]))
  if (byID.size !== identities.length) throw new Error('Duplicate Paid review case')
  const found = await req.payload.find({ collection: transactionsSlug as CollectionSlug, req, overrideAccess: access === 'system', depth: 0,
    limit: byID.size, where: { and: [{ customer: { equals: customerID } }, { id: { in: [...byID.keys()] } }] } })
  if (found.docs.length !== byID.size || found.totalDocs !== byID.size) throw new Error('Paid review attempt missing')
  return found.docs.map(doc => {
    const identity = byID.get(String(doc.id))
    if (!identity) throw new Error('Unexpected Paid review attempt')
    byID.delete(String(doc.id))
    const row = parsePortOneTransaction(doc, identity.paymentID)
    const snapshot = row.portone.snapshot
    assertResultIdentity(identity, { transactionID: row.id, paymentID: row.portone.paymentID,
      customerID: snapshot.customerID, cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash })
    return row
  })
}

export async function hasUnresolvedPaidReview(req: PayloadRequest, row: Awaited<ReturnType<typeof readPortOneTransaction>>) {
  // A verified full cancellation of this exact payment closes the case, whatever
  // the local status (settled, retired or released), unless a contradiction followed.
  const snapshot = row.portone.snapshot
  if (await isClosedByVerifiedCancellation(req, { transactionID: row.id, paymentID: row.portone.paymentID,
    customerID: snapshot.customerID, cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash },
  row.commerceResolutionConflict === true)) return false
  // Otherwise only this attempt's exact, consistent settlement satisfies the case.
  // An order for a replacement, or a bare succeeded or cancelled status, is not a disposition.
  return row.status !== 'succeeded' || (await projectLocalResult(req, row)).outcome !== 'confirmed'
}

/** Call under the customer lock through the final decision/commit. */
export async function assertPurchaseWithoutPaidReview(req: PayloadRequest,
  snapshot: Pick<PurchaseSnapshot, 'customerID' | 'productID' | 'cartID' | 'eventID' | 'version'>, transactionsSlug?: string) {
  const allowance = purchaseAllowance(snapshot)
  const related = (prior: PurchaseSnapshot) =>
    prior.cartID === snapshot.cartID || purchaseAllowance(prior) === allowance
  const attempts = await loadPaidReviewAttempts(req, snapshot.customerID, transactionsSlug)
  for (const row of attempts) {
    // All Signet-bearing releases share one account allowance.
    if (related(row.portone.snapshot) && await hasUnresolvedPaidReview(req, row)) throw new PaymentReviewRequired()
  }
  // The same account hold as /pending and /result: a recorded contradiction holds the
  // account even with no Paid case, until a later verified full cancellation accounts for it.
  const withCase = new Set(attempts.map(row => row.id))
  const contradicted = (await listContradictedAttempts(req, snapshot.customerID)).filter(identity => !withCase.has(identity.transactionID))
  for (const row of await loadIdentifiedAttempts(req, snapshot.customerID, contradicted, transactionsSlug)) {
    const prior = row.portone.snapshot
    if (related(prior) && !await isClosedByVerifiedCancellation(req, { transactionID: row.id, paymentID: row.portone.paymentID,
      customerID: prior.customerID, cartID: prior.cartID, snapshotHash: row.portone.snapshotHash },
    row.commerceResolutionConflict === true)) throw new PaymentReviewRequired()
  }
}

/** Explicit retirement only: uncertainty and an open/missing gateway never release capacity. */
export async function retireFailedPayment(req: PayloadRequest, input: ReviewInput, deps: AdapterDependencies): Promise<void> {
  if (await req.transactionID) throw new Error('Retirement cannot commit caller-owned transaction')
  const config = adapterConfig(deps)
  const row = await readPortOneTransaction(req, input.paymentID)
  if (row.id !== input.transactionID || req.user?.collection !== 'users' || String(req.user.id) !== row.portone.snapshot.customerID
    || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey) throw new Error('Attempt mismatch')
  if (['failed', 'cancelled', 'refunded'].includes(row.status)) return
  // Fetch/debit before opening the financial transaction; current state is still
  // rechecked under the common attempt -> reservation lock order below.
  const evidence = failedEvidence.parse(await providerPayment(deps, input.paymentID, req))
  await inPaymentTransaction(req, async () => {
    await withCommerceWrite(req, async () => {
      await lockCommerce(req, [paidReviewCustomerLock(row.portone.snapshot.customerID)])
      await assertPurchaseWithoutPaidReview(req, row.portone.snapshot)
      await assertReconciliationFence(req)
      await lockReservationContext(req, row.id)
      const current = await readPortOneTransaction(req, input.paymentID)
      if (current.portone.snapshotHash !== row.portone.snapshotHash) throw new Error('Attempt changed')
      if (current.commerceResolutionConflict) throw new Error('Payment resolution conflict requires review')
      if (['failed', 'cancelled', 'refunded'].includes(current.status)) return
      if (!['pending', 'processing'].includes(current.status) || current.order != null || current.commerceReviewHold) throw new Error('Attempt cannot retire')
      if (evidence.id !== input.paymentID || evidence.storeId !== config.storeId || evidence.channel.key !== config.channelKey
        || evidence.channel.type !== channelType(config.mode)
        || evidence.customer.id !== current.portone.snapshot.customerID || evidence.amount.total !== current.amount) throw new Error('Provider mismatch')
      await assertReconciliationFence(req)
      const evidenceID = `provider-failure:${createHash('sha256').update(JSON.stringify(evidence)).digest('hex')}`
      await releaseReservation({ req, attemptID: row.id, verifiedReason: 'verified-failure', providerEventID: evidenceID })
      await req.payload.update({ collection: 'transactions' as CollectionSlug, id: row.id, req,
        overrideAccess: true, data: { status: 'failed' } as never })
    })
  })
}

/**
 * Preflight before the generated confirm handler opens its settlement transaction.
 * A later confirmation rollback must not erase known cancellation/dispute evidence.
 * The generated adapter still independently fetches and verifies PAID before finalizing.
 */
export async function assertPaymentRiskReviewed(req: PayloadRequest, input: { transactionID: string; paymentID: string },
  providerEventID?: string, deps: AdapterDependencies = {}, holdOnly = false): Promise<void> {
  if (await req.transactionID) throw new Error('Risk preflight cannot commit a caller-owned transaction')
  if (deferredRisk.has(req)) throw new Error('Previously observed payment risk remains unresolved')
  const row = await readPortOneTransaction(req, input.paymentID)
  if (row.id !== input.transactionID || req.user?.collection !== 'users' || String(req.user.id) !== row.portone.snapshot.customerID) throw new Error('Payment owner mismatch')
  const retained = holdOnly ? await readUnresolvedSettlementProof(req) : undefined
  const evidence = retained ?? minimalPaymentRiskProof(await providerPayment(deps, input.paymentID, req))
  return reviewPaymentEvidence(req, input, evidence, providerEventID, deps, holdOnly)
}

/** Adapter-only handoff after independent exact-identity classification. */
export function deferPaymentRisk(req: PayloadRequest, input: ReviewInput, evidence: unknown, deps: AdapterDependencies, holdOnly = false): void {
  // Keep the first validated observation; a later clear read cannot replace it.
  if (!deferredRisk.has(req)) deferredRisk.set(req, { input: inputSchema.parse(input), evidence: minimalPaymentRiskProof(evidence), deps,
    settlementToken: paymentTransactionToken(req), holdOnly })
}

/** Called only after the official handler has rolled back its settlement transaction. */
export async function flushDeferredPaymentRisk(req: PayloadRequest): Promise<void> {
  const deferred = deferredRisk.get(req)
  if (!deferred) return
  if (await req.transactionID) throw new Error('Settlement must roll back before persisting observed payment risk')
  if (deferred.settlementToken) assertPaymentRollback(req, deferred.settlementToken)
  // Never perform a third GET: a later clear response cannot erase observed risk.
  try {
    await reviewPaymentEvidence(req, deferred.input, deferred.evidence, undefined, deferred.deps, deferred.holdOnly)
    deferredRisk.delete(req)
  } catch (error) {
    // Only this error is constructed after acknowledged quarantine commit.
    if (error instanceof PaymentReviewRequired) deferredRisk.delete(req)
    throw error
  }
}

async function reviewPaymentEvidence(req: PayloadRequest, input: ReviewInput, evidence: unknown,
  providerEventID: string | undefined, deps: AdapterDependencies, holdOnly = false): Promise<void> {
  if (await req.transactionID) throw new Error('Risk preflight cannot commit a caller-owned transaction')
  const config = adapterConfig(deps)
  const row = await readPortOneTransaction(req, input.paymentID)
  const snapshot = row.portone.snapshot
  if (row.id !== input.transactionID || req.user?.collection !== 'users' || String(req.user.id) !== snapshot.customerID
    || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey) throw new Error('Payment owner mismatch')
  const expected = { mode: config.mode, paymentID: input.paymentID, customerID: snapshot.customerID,
    storeID: config.storeId, channelKey: config.channelKey, totalAmount: snapshot.totalAmount, currency: snapshot.currency }
  const risk = classifyPaymentRisk(evidence, expected)
  if (risk === 'clear') {
    validatePaidPayment(evidence, expected)
  }
  await retainReconciliationRisk(req, evidence, holdOnly)
  if (risk === 'clear' && !holdOnly) assertOrdinaryReconciliation(req)
  // Authenticated GET evidence also has a stable local correlation identity when
  // a browser discovers the risk before delivery of the signed provider event.
  const evidenceID = providerEventID ?? `provider-get:${createHash('sha256').update(JSON.stringify([input.paymentID, risk, evidence])).digest('hex')}`
  const reviewRequired = await inPaymentTransaction(req, () => withCommerceWrite(req, async () => {
      // Customer first, like initiate and retirement: initiate holds this lock from its
      // account check through commit, so contradiction evidence for an already released
      // attempt commits either before that check reads it or after the new attempt exists.
      await lockCommerce(req, [paidReviewCustomerLock(snapshot.customerID)])
      await assertReconciliationFence(req)
      // Resource lock order matches settlement/returns before admissions locks.
      const context = await lockReservationContext(req, row.id)
      const current = await readPortOneTransaction(req, input.paymentID)
      if (current.portone.snapshotHash !== row.portone.snapshotHash) throw new Error('Payment snapshot changed')
      // Serialize even the clear decision with retirement. A PAID observation
      // must not disappear merely because an older FAILED GET held this lock.
      if (!holdOnly && risk === 'clear' && !['failed', 'cancelled', 'refunded'].includes(current.status)
        && context.reservation.state !== 'released' && !current.commerceResolutionConflict) return current.commerceReviewHold
      // Keep this validated observation in request-private memory until native
      // quarantine acknowledgement. This is not a durable recovery journal.
      // Token-less preflight risk cannot impersonate a settlement rollback handoff.
      if (!deferredRisk.has(req)) deferredRisk.set(req, { input, evidence: minimalPaymentRiskProof(evidence), deps, holdOnly })
      const cancel = !holdOnly && risk === 'full-cancel'
      const cancelled = cancel && !['failed', 'refunded'].includes(current.status)
      const conflict = risk === 'clear' || holdOnly && (['failed', 'cancelled', 'refunded'].includes(current.status) || context.reservation.state === 'released')
      const tuple = { transactionID: row.id, paymentID: input.paymentID, customerID: snapshot.customerID,
        cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash }
      try {
        if (cancel) verifiedCancellations.set(req, row.id)
        await req.payload.update({ collection: 'transactions' as CollectionSlug, id: row.id, req,
          overrideAccess: true, data: { commerceReviewHold: true, ...(conflict ? { commerceResolutionConflict: true } : {}),
            ...(cancelled ? { status: 'cancelled' } : {}) } as never })
        // Evidence apart from the sticky flag: it reopens a case a verified cancellation had closed.
        if (conflict) await recordPaymentContradiction(req, tuple, evidenceID)
        // Same transaction as the verified cancellation; any Paid case itself is never edited.
        if (cancel) await recordVerifiedCancellation(req, tuple, evidenceID, current.commerceResolutionConflict === true)
      } finally { verifiedCancellations.delete(req) }
      if (cancel) {
        // This releases account/event reservations or commitments; the domain
        // deliberately does NOT restock physical products automatically.
        await releaseReservation({ req, attemptID: row.id, verifiedReason: 'confirmed-cancel', providerEventID: evidenceID })
        if (current.order != null) {
          await revokeOrderBenefits({ req, orderID: relationshipID(current.order),
            providerEventID: evidenceID, reason: 'verified-full-cancellation' })
          // The order itself: refunded once, with its record. Membership granted by the payment is not reversed.
          await recordOrderRefund({ req, orderID: relationshipID(current.order), transactionID: row.id,
            providerEventID: evidenceID, source: await hasRefundRequest(req, row.id) ? 'admin' : 'provider' })
          // Unlock seats wait for every key to be invalid; keys never sent were just cancelled, so release those now.
          await releaseInvalidatedSeats({ req, orderID: relationshipID(current.order) })
        }
      } else if (!holdOnly && current.order != null) {
        await holdOrderBenefits({ req, orderID: relationshipID(current.order), providerEventID: evidenceID,
          reason: 'verified-provider-payment-risk' })
      }
      return true
    }))
  if (!reviewRequired) return
  deferredRisk.delete(req)
  throw new PaymentReviewRequired()
}
