import { APIError, type PayloadRequest } from 'payload'
import { z } from 'zod'
import { isCmsSuperAdmin } from '../../auth/access'
import { withCommerceWrite } from '../access'
import { refundableOrderStatuses } from '../order-refund'
import { createCommerce, findCommerce, inCommerceTransaction, lockCommerce, readCommerce, relationshipID } from '../_shared/transaction'
import { adapterConfig, parsePortOneTransaction, type AdapterDependencies } from './adapter'
import type { PortOneConfig } from '../../tickets/portone/config'

/**
 * Staff full refund (refunds S2). The owner starts it from the admin; PortOne does the money. This module only:
 * 1. records the request ahead of the call (a create-only ledger row, committed before PortOne is asked), and
 * 2. asks PortOne for a full cancel that goes through only while the whole amount is still cancellable.
 * The order becomes refunded only when PortOne's signed cancellation webhook is verified (S1, portone/review.ts), which
 * then records the source as `admin` because this row exists.
 */
export const refundRequestScope = (transactionID: string) => `reconciliation-refund-request:${transactionID}`
export const refundRequestSchema = z.strictObject({
  orderID: z.string().min(1).max(128), transactionID: z.uuid(), paymentID: z.string().min(1).max(128),
  amount: z.int().positive(), reason: z.string().min(1).max(200), requestedBy: z.string().min(1).max(128), requestedAt: z.iso.datetime(),
})

/**
 * Owner, 24 Nov (relayed): "Refund is only possible 3 days prior." Staff refunds close this long before the event's
 * Part I start. A cancellation made in PortOne's console after it is still reconciled (S1): it has happened.
 */
export const REFUND_CUTOFF_DAYS = 3
const dayMs = 24 * 60 * 60 * 1000
/** When staff refunds for an event close; null when the start time is unreadable (then refunds stay closed). */
export function refundCutoff(partIStartsAt: unknown): number | null {
  const start = new Date(String(partIStartsAt)).getTime()
  return Number.isFinite(start) ? start - REFUND_CUTOFF_DAYS * dayMs : null
}

export type RefundOutcome =
  | { outcome: 'requested' | 'already-cancelled' | 'refunded' | 'unknown' }
  | { outcome: 'closed'; cutoffAt: string | null }
  | { outcome: 'refused'; providerType: string }

/** PortOne's cancel request: the transport only, so a test passes a stand-in. */
export type ProviderCancel = (input: { paymentId: string; storeId: string; reason: string; currentCancellableAmount: number; idempotencyKey: string })
  => Promise<{ ok: true } | { ok: false; type: string }>

export type RefundDependencies = AdapterDependencies & { cancelPayment?: ProviderCancel; now?: () => number }

const providerError = z.object({ type: z.string().min(1).max(100) })

/** POST /payments/{paymentId}/cancel with a deadline, like the existing GET transport; the API secret is never logged. */
function portOneCancel(config: PortOneConfig): ProviderCancel {
  return async ({ paymentId, storeId, reason, currentCancellableAmount, idempotencyKey }) => {
    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `PortOne ${config.apiSecret}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ storeId, reason, requester: 'ADMIN', currentCancellableAmount }),
    })
    if (response.ok) return { ok: true }
    const parsed = providerError.safeParse(await response.json().catch(() => null))
    // Without a typed refusal the result is unknown, not a failure.
    if (!parsed.success || response.status >= 500) throw new Error('Provider cancel result unknown')
    return { ok: false, type: parsed.data.type }
  }
}

/** The ledger row, written once per payment inside its own committed transaction; a repeat request reuses it. */
async function recordRefundRequest(req: PayloadRequest, orderID: string, reason: string, now: number) {
  return inCommerceTransaction(req, () => withCommerceWrite(req, async () => {
    await lockCommerce(req, [`order-benefits:${orderID}`])
    const order = await readCommerce(req, 'orders', orderID)
    if (order.commerceVersion !== 'commerce-v1') throw new APIError('Historical orders cannot be refunded here', 409, undefined, true)
    if (order.status === 'refunded') return null
    if (!refundableOrderStatuses.includes(String(order.status))) throw new APIError('This order cannot be refunded', 409, undefined, true)
    if (!Array.isArray(order.transactions) || order.transactions.length !== 1) throw new APIError('Order payment unavailable', 409, undefined, true)
    const transactionID = relationshipID(order.transactions[0])
    const document = await readCommerce(req, 'transactions', transactionID)
    const paymentID = z.object({ portone: z.object({ paymentID: z.string() }) }).parse(document).portone.paymentID
    const transaction = parsePortOneTransaction(document, paymentID)
    if (transaction.status !== 'succeeded' || transaction.order == null || relationshipID(transaction.order) !== orderID) {
      throw new APIError('Only a settled payment can be refunded', 409, undefined, true)
    }
    // The cutoff is checked before anything is written or sent. Orders without an event have none.
    const eventID = transaction.portone.snapshot.eventID
    if (eventID != null) {
      const cutoff = refundCutoff((await readCommerce(req, 'commerce-events', eventID)).partIStartsAt)
      if (cutoff === null || now >= cutoff) return { closed: cutoff === null ? null : new Date(cutoff).toISOString() }
    }
    const scope = refundRequestScope(transactionID)
    const existing = await findCommerce(req, 'commerce-reconciliations', 'scope', scope)
    if (existing) return refundRequestSchema.parse(existing.state)
    const state = refundRequestSchema.parse({ orderID, transactionID, paymentID, amount: transaction.amount, reason,
      requestedBy: String(req.user?.id), requestedAt: new Date().toISOString() })
    await createCommerce(req, 'commerce-reconciliations', { scope, state })
    return state
  }))
}

/** Whether staff asked for this payment's refund (the source S1 records). */
export async function hasRefundRequest(req: PayloadRequest, transactionID: string): Promise<boolean> {
  return Boolean(await findCommerce(req, 'commerce-reconciliations', 'scope', refundRequestScope(transactionID)))
}

/**
 * SYSTEM entry for the admin's "Refund in full". Super admin only; it runs outside any caller transaction so the
 * request row commits before PortOne is asked. Asking again is safe: PortOne refuses a second full cancel because the
 * cancellable amount no longer matches.
 */
export async function requestOrderRefund({ req, orderID, reason, deps = {} }: {
  req: PayloadRequest; orderID: string; reason: string; deps?: RefundDependencies
}): Promise<RefundOutcome> {
  if (!isCmsSuperAdmin(req.user)) throw new APIError('Refunds are started by an administrator', 403, undefined, true)
  if (await req.transactionID) throw new Error('A refund request cannot run inside a caller transaction')
  const config = adapterConfig(deps)
  const request = await recordRefundRequest(req, orderID, reason, (deps.now ?? Date.now)())
  if (!request) return { outcome: 'refunded' }
  if ('closed' in request) return { outcome: 'closed', cutoffAt: request.closed }
  const cancel = deps.cancelPayment ?? portOneCancel(config)
  let result: Awaited<ReturnType<ProviderCancel>>
  try {
    result = await cancel({ paymentId: request.paymentID, storeId: config.storeId, reason: request.reason,
      currentCancellableAmount: request.amount, idempotencyKey: `refund:${request.transactionID}` })
  } catch {
    req.payload.logger.warn({ msg: 'PortOne refund result unknown', orderID })
    return { outcome: 'unknown' }
  }
  if (result.ok) return { outcome: 'requested' }
  if (result.type === 'PAYMENT_ALREADY_CANCELLED') return { outcome: 'already-cancelled' }
  req.payload.logger.warn({ msg: 'PortOne refused the refund', orderID, providerType: result.type })
  return { outcome: 'refused', providerType: result.type }
}
