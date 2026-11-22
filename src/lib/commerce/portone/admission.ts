import { APIError, type PayloadRequest } from 'payload'
import { relationshipID, paymentTransactionOutcome } from '../_shared/transaction'
import { adapterConfig, assertPrincipalUnchanged, readOwnedPortOneTransaction, readPortOneTransaction, readSettlementProof, type AdapterDependencies } from './adapter'
import { admitReconciliation, endReconciliation, hasReconciliationOwner, recordReconciliationEvent, readReconciliationStart, recordPaidReviewCase, hasPaidReviewCase, isPaidReplayBeforeCancellation, type ReconciliationKind } from './accounting'
import { isVerifiedCommerceWebhook, verifiedCommerceEvent } from './endpoints'
import { assertPaymentRiskReviewed, flushDeferredPaymentRisk, PaymentReviewRequired } from './review'
import { projectLocalResult } from './result'
import { reconciliationPolicy } from './policy'

const reply = (outcome: string, status = 202, extra = {}) => Response.json({ outcome, ...extra }, { status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })

type ReconciliationInput = { transactionID: string; paymentID: string; cartID?: string }
type ReconciliationOptions = {
  boundedRecheck?: boolean
  /** The member authorized at a browser entry point. Every read, the work and every reply stay pinned to it. */
  principal?: string
}

/** Admission surrounds the existing finalizer/review owners; it is not a finalizer. */
export async function runReconciliation(req: PayloadRequest, input: ReconciliationInput, kind: ReconciliationKind,
  work: () => Promise<Response>, deps: AdapterDependencies = {}, options: ReconciliationOptions = {}): Promise<Response> {
  const { principal } = options
  if (principal === undefined) return reconcile(req, input, kind, work, deps, options)
  const response = await reconcile(req, input, kind, async () => {
    assertPrincipalUnchanged(req, principal)
    return work()
  }, deps, options)
  // Early replies (review-required, local-read-required, terminal, admission stops) included.
  assertPrincipalUnchanged(req, principal)
  return response
}

async function reconcile(req: PayloadRequest, input: ReconciliationInput, kind: ReconciliationKind,
  work: () => Promise<Response>, deps: AdapterDependencies, options: ReconciliationOptions): Promise<Response> {
  // A verified webhook dispatch reenters secureEndpoint on the same native req.
  if (hasReconciliationOwner(req)) {
    if (!isVerifiedCommerceWebhook(req)) throw new Error('Nested reconciliation rejected')
    return work()
  }
  const config = adapterConfig(deps)
  // Browser entry: owner access before parsing, so foreign and missing attempts look the same.
  // The verified webhook resolves its attempt as SYSTEM after signature and store checks.
  const row = isVerifiedCommerceWebhook(req) ? await readPortOneTransaction(req, input.paymentID)
    : await readOwnedPortOneTransaction(req, input.paymentID, options.principal)
  const snapshot = row.portone.snapshot
  if (row.id !== input.transactionID || input.cartID && input.cartID !== snapshot.cartID
    || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey
    || req.user?.collection !== 'users' || String(req.user.id) !== snapshot.customerID) throw new Error('Attempt mismatch')
  if (!isVerifiedCommerceWebhook(req)) {
    if ((kind === 'resume' || kind === 'retire') && row.status !== 'succeeded' &&
        await hasPaidReviewCase(req, { transactionID: row.id, paymentID: input.paymentID, customerID: snapshot.customerID,
          cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash })) return reply('review-required', 409)
    if (row.commerceReviewHold || row.commerceResolutionConflict) return reply('review-required', 409)
    if (row.status === 'succeeded') return kind === 'confirm' ? replaySettlement(req, row, false) : reply('local-read-required')
    if (['failed', 'cancelled', 'refunded'].includes(row.status)) return reply('local-terminal', 409)
  }
  const event = verifiedCommerceEvent(req)
  const tuple = { transactionID: row.id, paymentID: input.paymentID, customerID: snapshot.customerID,
    cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash }
  const paid = event?.type === 'Transaction.Paid'
  // A redelivered Paid that predates the verified full cancellation is stale and
  // cannot reopen the closed case. A Paid with a new event id is still reviewed.
  if (paid && await isPaidReplayBeforeCancellation(req, tuple, event.id)) return reply('already-cancelled', 200)
  // Preserve the signed signal before any reservation check can fail or provider read can run.
  const paidIdentity = paid ? { ...tuple, startedAt: await readReconciliationStart(req, row.id) } : undefined
  if (paidIdentity && event) await recordReconciliationEvent(req, paidIdentity, event, row.status !== 'succeeded')
  const reservations = await req.payload.find({ collection: 'commerce-reservations', req, overrideAccess: true, depth: 0,
    limit: 2, where: { attemptID: { equals: row.id } } })
  if (reservations.docs.length !== 1) throw new Error('Reservation integrity')
  const reservation = reservations.docs[0]
  if (reservation.attemptID !== row.id || reservation.snapshotHash !== row.portone.snapshotHash
    || relationshipID(reservation.customer) !== snapshot.customerID || relationshipID(reservation.product) !== snapshot.productID
    || relationshipID(reservation.event) !== snapshot.eventID || reservation.releaseID !== snapshot.releaseID || reservation.quantity !== snapshot.quantity
    || (!isVerifiedCommerceWebhook(req) && (reservation.state !== 'reserved' || reservation.order || row.order))) throw new Error('Reservation integrity')
  const identity = paidIdentity ?? { ...tuple, startedAt: await readReconciliationStart(req, row.id) }
  if (event && !paid) await recordReconciliationEvent(req, identity, event)
  if (paid) {
    const terminal = ['failed', 'cancelled', 'refunded'].includes(row.status) || reservation.state === 'released'
    if (row.commerceResolutionConflict || (row.commerceReviewHold && !terminal)) return reply('payment-quarantined', 200)
    if (row.status === 'succeeded') {
      const response = await replaySettlement(req, row, true)
      if (!response.ok) await recordPaidReviewCase(req, identity, event.id, 'review-required')
      return response
    }
  }
  const unavailableForSettlement = row.status !== 'pending' || row.order != null || reservation.state !== 'reserved' || reservation.order != null
  const decision = await admitReconciliation(req, identity, kind, req.payload, {
    automatic: Boolean(event && !paid), boundedRecheck: options.boundedRecheck,
    quarantineOnly: paid && unavailableForSettlement,
  })
  if (decision.decision !== 'started') {
    const reason = decision.decision
    if (paid && (reason === 'budget-stop' || reason === 'lifetime-stop' || reason === 'ownership-unknown' || reason === 'review-required')) {
      await recordPaidReviewCase(req, identity, event.id, reason)
    }
    return reply(decision.decision, event ? 409 : decision.decision === 'rate-stop' ? 429 : decision.decision === 'review-required' ? 409 : 202,
      { generation: decision.generation, nextCheckAt: decision.nextCheckAt, foregroundWaitMs: reconciliationPolicy.foregroundWaitMs })
  }
  let response: Response
  let disposition: 'completed' | 'review' = 'completed'
  try {
    // Another native owner may have settled between the first read and admission.
    const current = await readPortOneTransaction(req, input.paymentID)
    if (current.status === 'succeeded' && kind !== 'risk') {
      response = kind === 'confirm' ? await replaySettlement(req, current, Boolean(event)) : reply('local-read-required', event ? 409 : 202)
    } else if (paid && (decision.bucket === 'risk' || unavailableForSettlement || current.status !== 'pending' || current.order)) {
      try {
        await assertPaymentRiskReviewed(req, input, undefined, deps, true)
      } catch (error) {
        if (!(error instanceof PaymentReviewRequired)) throw error
      }
      const reviewed = await readPortOneTransaction(req, input.paymentID)
      if (reviewed.status === 'succeeded') response = await replaySettlement(req, reviewed, true)
      else if (reviewed.commerceReviewHold || reviewed.commerceResolutionConflict) {
        disposition = 'review'
        response = reply('late-paid-quarantined', 200)
      } else throw new Error('Late Paid review did not persist a hold')
    } else response = await work()
  } catch (error) {
    if (kind === 'confirm' && error instanceof PaymentReviewRequired) {
      disposition = 'review'
      response = reply('review-required', paid ? 200 : 409)
    } else {
      const outcome = paymentTransactionOutcome(req) === 'unknown' ? 'unknown'
        : error instanceof PaymentReviewRequired ? 'review' : 'completed'
      let completionUnknown = outcome === 'unknown'
      try { completionUnknown = await endReconciliation(req, outcome) === 'unknown' }
      catch { completionUnknown = true }
      if (paid) await recordPaidReviewCase(req, identity, event.id, completionUnknown ? 'ownership-unknown' : 'review-required')
      if (completionUnknown) throw new APIError('Reconciliation completion unknown', 503)
      throw error
    }
  }
  let completionUnknown
  try {
    completionUnknown = await endReconciliation(req, paymentTransactionOutcome(req) === 'unknown' ? 'unknown' : disposition) === 'unknown'
  } catch {
    // An acknowledged financial commit is never turned into a failed checkout.
    // The durable active ledger remains fenced for catch-up/escalation.
    req.payload.logger?.error({ msg: 'Reconciliation completion requires escalation', cause: 'ledger-completion-unconfirmed' })
    completionUnknown = true
  }
  if (completionUnknown && !(response.ok && paymentTransactionOutcome(req) === 'committed')) {
    if (paid) await recordPaidReviewCase(req, identity, event.id, 'ownership-unknown')
    return reply('ownership-unknown', 503)
  }
  if (paid && !response.ok) await recordPaidReviewCase(req, identity, event.id, 'review-required')
  return response
}

/** A checkout trigger may stop before the financial transaction opens. */
export async function settleIfProviderPaid(req: PayloadRequest, paymentID: string, settle: () => Promise<Response>,
  deps: AdapterDependencies = {}, webhook = false): Promise<Response> {
  const observation = await readSettlementProof(req, paymentID, deps)
  if (observation === 'provider-paid') {
    // The official handler can return a rejection or throw; only an acknowledged
    // rollback lets the separate review transaction consume second-read proof.
    try { return await settle() }
    finally { await flushDeferredPaymentRisk(req) }
  }
  await flushDeferredPaymentRisk(req)
  if (webhook) return reply('local-unresolved', 409) // PortOne should redeliver.
  if (observation === 'review-required' || observation === 'integrity-stop') return reply(observation, 409)
  return reply('local-unresolved')
}

async function replaySettlement(req: PayloadRequest, row: Awaited<ReturnType<typeof readPortOneTransaction>>, webhook: boolean) {
  try {
    const local = await projectLocalResult(req, row)
    const current = await readPortOneTransaction(req, row.portone.paymentID)
    if (local.outcome === 'confirmed' && JSON.stringify(current) === JSON.stringify(row)
      && req.user?.collection === 'users' && String(req.user.id) === row.portone.snapshot.customerID) {
      return webhook ? reply('already-confirmed', 200) : reply('already-confirmed', 200, {
        orderID: local.orderID, transactionID: local.transactionID,
      })
    }
  } catch { /* Incomplete or inconsistent linkage is not a replay receipt. */ }
  return reply('review-required', 409)
}
