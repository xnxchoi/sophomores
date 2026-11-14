import { createHash } from 'node:crypto'
import { APIError, type CollectionSlug, type PayloadRequest } from 'payload'
import { z } from 'zod'
import { withCommerceWrite } from '../access'
import { lockReservationContext, releaseReservation } from '../reservations'
import { holdOrderBenefits, revokeOrderBenefits } from '../benefit-review'
import { assertPaymentRollback, inPaymentTransaction, paymentTransactionToken, relationshipID } from '../_shared/transaction'
import { adapterConfig, providerPayment, readPortOneTransaction, type AdapterDependencies } from './adapter'
import { classifyPaymentRisk, minimalPaymentRiskProof, validatePaidPayment } from './proof'
import { providerPaymentId } from '../../tickets/portone/payment-id'
import { assertReconciliationFence, retainReconciliationRisk, assertOrdinaryReconciliation } from './accounting'

const inputSchema = z.strictObject({ transactionID: z.uuid(), paymentID: providerPaymentId })
const failedEvidence = z.object({ id: providerPaymentId, status: z.literal('FAILED'), storeId: z.string(),
  channel: z.object({ key: z.string(), type: z.literal('TEST') }), customer: z.object({ id: z.string() }),
  currency: z.literal('KRW'), amount: z.object({ total: z.int().positive(), paid: z.literal(0), cancelled: z.literal(0) }),
  disputes: z.array(z.unknown()).length(0).optional() })
type ReviewInput = z.infer<typeof inputSchema>
const verifiedCancellations = new WeakMap<PayloadRequest, string>()
export const isVerifiedPaymentCancellation = (req: PayloadRequest, transactionID: string): boolean => verifiedCancellations.get(req) === transactionID
// Only a minimal validated provider projection survives the generated handler's
// rollback. Neither serializable request data nor context can forge this queue.
const deferredRisk = new WeakMap<PayloadRequest, { input: ReviewInput;
  evidence: ReturnType<typeof minimalPaymentRiskProof>; deps: AdapterDependencies; settlementToken?: string }>()

/** This error is raised only after the independent quarantine transaction commits. */
export class PaymentReviewRequired extends APIError {
  constructor() { super('Payment requires review', 409) }
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
      await assertReconciliationFence(req)
      await lockReservationContext(req, row.id)
      const current = await readPortOneTransaction(req, input.paymentID)
      if (current.portone.snapshotHash !== row.portone.snapshotHash) throw new Error('Attempt changed')
      if (current.commerceResolutionConflict) throw new Error('Payment resolution conflict requires review')
      if (['failed', 'cancelled', 'refunded'].includes(current.status)) return
      if (!['pending', 'processing'].includes(current.status) || current.order != null || current.commerceReviewHold) throw new Error('Attempt cannot retire')
      if (evidence.id !== input.paymentID || evidence.storeId !== config.storeId || evidence.channel.key !== config.channelKey
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
  providerEventID?: string, deps: AdapterDependencies = {}): Promise<void> {
  if (await req.transactionID) throw new Error('Risk preflight cannot commit a caller-owned transaction')
  if (deferredRisk.has(req)) throw new Error('Previously observed payment risk remains unresolved')
  const row = await readPortOneTransaction(req, input.paymentID)
  if (row.id !== input.transactionID || req.user?.collection !== 'users' || String(req.user.id) !== row.portone.snapshot.customerID) throw new Error('Payment owner mismatch')
  const evidence = minimalPaymentRiskProof(await providerPayment(deps, input.paymentID, req))
  return reviewPaymentEvidence(req, input, evidence, providerEventID, deps)
}

/** Adapter-only handoff after independent exact-identity classification. */
export function deferPaymentRisk(req: PayloadRequest, input: ReviewInput, evidence: unknown, deps: AdapterDependencies): void {
  // Keep the first validated observation; a later clear read cannot replace it.
  if (!deferredRisk.has(req)) deferredRisk.set(req, { input: inputSchema.parse(input), evidence: minimalPaymentRiskProof(evidence), deps,
    settlementToken: paymentTransactionToken(req) })
}

/** Called only after the official handler has rolled back its settlement transaction. */
export async function flushDeferredPaymentRisk(req: PayloadRequest): Promise<void> {
  const deferred = deferredRisk.get(req)
  if (!deferred) return
  if (await req.transactionID) throw new Error('Settlement must roll back before persisting observed payment risk')
  assertPaymentRollback(req, deferred.settlementToken)
  // Never perform a third GET: a later clear response cannot erase observed risk.
  try {
    await reviewPaymentEvidence(req, deferred.input, deferred.evidence, undefined, deferred.deps)
    deferredRisk.delete(req)
  } catch (error) {
    // Only this error is constructed after acknowledged quarantine commit.
    if (error instanceof PaymentReviewRequired) deferredRisk.delete(req)
    throw error
  }
}

async function reviewPaymentEvidence(req: PayloadRequest, input: ReviewInput, evidence: unknown,
  providerEventID: string | undefined, deps: AdapterDependencies): Promise<void> {
  if (await req.transactionID) throw new Error('Risk preflight cannot commit a caller-owned transaction')
  const config = adapterConfig(deps)
  const row = await readPortOneTransaction(req, input.paymentID)
  const snapshot = row.portone.snapshot
  if (row.id !== input.transactionID || req.user?.collection !== 'users' || String(req.user.id) !== snapshot.customerID
    || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey) throw new Error('Payment owner mismatch')
  const expected = { paymentID: input.paymentID, customerID: snapshot.customerID,
    storeID: config.storeId, channelKey: config.channelKey, totalAmount: snapshot.totalAmount, currency: snapshot.currency }
  const risk = classifyPaymentRisk(evidence, expected)
  if (risk === 'clear') {
    validatePaidPayment(evidence, expected)
  }
  await retainReconciliationRisk(req, evidence)
  if (risk === 'clear') assertOrdinaryReconciliation(req)
  // Authenticated GET evidence also has a stable local correlation identity when
  // a browser discovers the risk before delivery of the signed provider event.
  const evidenceID = providerEventID ?? `provider-get:${createHash('sha256').update(JSON.stringify([input.paymentID, risk, evidence])).digest('hex')}`
  const reviewRequired = await inPaymentTransaction(req, () => withCommerceWrite(req, async () => {
      await assertReconciliationFence(req)
      // Resource lock order matches settlement/returns before admissions locks.
      const context = await lockReservationContext(req, row.id)
      const current = await readPortOneTransaction(req, input.paymentID)
      if (current.portone.snapshotHash !== row.portone.snapshotHash) throw new Error('Payment snapshot changed')
      // Serialize even the clear decision with retirement. A PAID observation
      // must not disappear merely because an older FAILED GET held this lock.
      if (risk === 'clear' && !['failed', 'cancelled', 'refunded'].includes(current.status)
        && context.reservation.state !== 'released' && !current.commerceResolutionConflict) return current.commerceReviewHold
      // Keep this validated observation in request-private memory until native
      // quarantine acknowledgement. This is not a durable recovery journal.
      // Token-less preflight risk cannot impersonate a settlement rollback handoff.
      if (!deferredRisk.has(req)) deferredRisk.set(req, { input, evidence: minimalPaymentRiskProof(evidence), deps })
      try {
        if (risk === 'full-cancel') verifiedCancellations.set(req, row.id)
        await req.payload.update({ collection: 'transactions' as CollectionSlug, id: row.id, req,
          overrideAccess: true, data: { commerceReviewHold: true, ...(risk === 'clear' ? { commerceResolutionConflict: true } : {}),
            ...(risk === 'full-cancel' && !['failed', 'refunded'].includes(current.status) ? { status: 'cancelled' } : {}) } as never })
      } finally { verifiedCancellations.delete(req) }
      if (risk === 'full-cancel') {
        // This releases account/event reservations or commitments; the domain
        // deliberately does NOT restock physical products automatically.
        await releaseReservation({ req, attemptID: row.id, verifiedReason: 'confirmed-cancel', providerEventID: evidenceID })
        if (current.order != null) await revokeOrderBenefits({ req, orderID: relationshipID(current.order),
          providerEventID: evidenceID, reason: 'verified-full-cancellation' })
      } else if (current.order != null) {
        await holdOrderBenefits({ req, orderID: relationshipID(current.order), providerEventID: evidenceID,
          reason: 'verified-provider-payment-risk' })
      }
      return true
    }))
  if (!reviewRequired) return
  deferredRisk.delete(req)
  throw new PaymentReviewRequired()
}
