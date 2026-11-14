import { APIError, type PayloadRequest } from 'payload'
import { relationshipID, paymentTransactionOutcome } from '../_shared/transaction'
import { adapterConfig, readPortOneTransaction, type AdapterDependencies } from './adapter'
import { admitReconciliation, endReconciliation, hasReconciliationOwner, recordReconciliationEvent, readReconciliationStart, type ReconciliationKind } from './accounting'
import { isVerifiedCommerceWebhook, verifiedCommerceEvent } from './endpoints'
import { PaymentReviewRequired } from './review'
import { projectLocalResult } from './result'
import { reconciliationPolicy } from './policy'

const reply = (outcome: string, status = 202, extra = {}) => Response.json({ outcome, ...extra }, { status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })

/** Admission surrounds the existing finalizer/review owners; it is not a finalizer. */
export async function runReconciliation(req: PayloadRequest, input: { transactionID: string; paymentID: string; cartID?: string },
  kind: ReconciliationKind, work: () => Promise<Response>, deps: AdapterDependencies = {}): Promise<Response> {
  // A verified webhook dispatch reenters secureEndpoint on the same native req.
  if (hasReconciliationOwner(req)) {
    if (!isVerifiedCommerceWebhook(req)) throw new Error('Nested reconciliation rejected')
    return work()
  }
  const config = adapterConfig(deps)
  const row = await readPortOneTransaction(req, input.paymentID)
  const snapshot = row.portone.snapshot
  if (row.id !== input.transactionID || input.cartID && input.cartID !== snapshot.cartID
    || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey
    || req.user?.collection !== 'users' || String(req.user.id) !== snapshot.customerID) throw new Error('Attempt mismatch')
  if (!isVerifiedCommerceWebhook(req)) {
    if (row.commerceReviewHold || row.commerceResolutionConflict) return reply('review-required', 409)
    if (row.status === 'succeeded') return reply('local-read-required')
    if (['failed', 'cancelled', 'refunded'].includes(row.status)) return reply('local-terminal', 409)
  }
  const reservations = await req.payload.find({ collection: 'commerce-reservations', req, overrideAccess: true, depth: 0,
    limit: 2, where: { attemptID: { equals: row.id } } })
  if (reservations.docs.length !== 1) throw new Error('Reservation integrity')
  const reservation = reservations.docs[0]
  if (reservation.attemptID !== row.id || reservation.snapshotHash !== row.portone.snapshotHash
    || relationshipID(reservation.customer) !== snapshot.customerID || relationshipID(reservation.product) !== snapshot.productID
    || relationshipID(reservation.event) !== snapshot.eventID || reservation.releaseID !== snapshot.releaseID || reservation.quantity !== snapshot.quantity
    || (!isVerifiedCommerceWebhook(req) && (reservation.state !== 'reserved' || reservation.order || row.order))) throw new Error('Reservation integrity')
  const startedAt = await readReconciliationStart(req, row.id)
  const identity = { transactionID: row.id, paymentID: input.paymentID, customerID: snapshot.customerID,
    cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash, startedAt }
  const event = verifiedCommerceEvent(req)
  if (event) await recordReconciliationEvent(req, identity, event)
  if (event?.type === 'Transaction.Paid' && row.status === 'succeeded') {
    const local = await projectLocalResult(req, row)
    const current = await readPortOneTransaction(req, input.paymentID)
    if (local.outcome === 'confirmed' && JSON.stringify(current) === JSON.stringify(row)) return reply('already-confirmed', 200)
    return reply('review-required', 409)
  }
  const decision = await admitReconciliation(req, identity, kind, req.payload, { automatic: Boolean(event && event.type !== 'Transaction.Paid') })
  if (decision.decision !== 'started') return reply(decision.decision, event ? 409 : decision.decision === 'rate-stop' ? 429 : 202,
    { generation: decision.generation, nextCheckAt: decision.nextCheckAt, foregroundWaitMs: reconciliationPolicy.foregroundWaitMs })
  let response: Response
  try {
    // Another native owner may have settled between the first read and admission.
    const current = await readPortOneTransaction(req, input.paymentID)
    if (current.status === 'succeeded' && kind !== 'risk') {
      await endReconciliation(req, 'completed')
      return reply('local-read-required', event ? 409 : 202)
    }
    response = await work()
  } catch (error) {
    const outcome = paymentTransactionOutcome(req) === 'unknown' ? 'unknown'
      : error instanceof PaymentReviewRequired ? 'review' : 'completed'
    try { await endReconciliation(req, outcome) }
    catch { throw new APIError('Reconciliation completion unknown', 503) }
    throw error
  }
  try {
    const completion = await endReconciliation(req, paymentTransactionOutcome(req) === 'unknown' ? 'unknown' : 'completed')
    if (completion === 'unknown' && !(response.ok && paymentTransactionOutcome(req) === 'committed')) return reply('ownership-unknown', 503)
  } catch {
    // An acknowledged financial commit is never turned into a failed checkout.
    // The durable active ledger remains fenced for catch-up/escalation.
    req.payload.logger?.error({ msg: 'Reconciliation completion requires escalation', cause: 'ledger-completion-unconfirmed' })
    if (!(response.ok && paymentTransactionOutcome(req) === 'committed')) return reply('ownership-unknown', 503)
  }
  return response
}
