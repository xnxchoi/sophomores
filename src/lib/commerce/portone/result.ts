import { APIError, type CollectionSlug, type Endpoint, type PayloadRequest, type Where } from 'payload'
import { z } from 'zod'
import { assertCommerceBrowserRead } from '../access'
import { commerceSnapshotSchema, shippingAddressSchema } from '../contracts'
import { commerceSnapshotHash } from '../snapshot-hash'
import { counter, relationshipID } from '../_shared/transaction'
import { paymentIdFromOrderId, providerPaymentId } from '../../tickets/portone/payment-id'
import { readPortOneTransaction, type PortOneTransaction } from './adapter'
import type { LocalPaymentResult } from './outcome'

type Row = Record<string, unknown> & { id: string }
const tupleSchema = z.strictObject({ transactionID: z.uuid(), paymentID: providerPaymentId, cartID: z.uuid() })
const relation = z.union([z.string().min(1), z.object({ id: z.string().min(1) })]).transform(relationshipID)
const orderSchema = z.object({ id: z.uuid(), customer: relation, commerceVersion: z.literal('commerce-v1'),
  commerceAttemptID: z.uuid(), commerceSnapshot: commerceSnapshotSchema, transactions: z.array(relation).length(1),
  amount: z.int().positive(), currency: z.literal('KRW'), status: z.enum(['processing', 'completed', 'cancelled', 'refunded']),
  items: z.array(z.object({ product: relation, quantity: z.int().min(1).max(3), variant: z.null().optional() })).length(1),
  shippingAddress: shippingAddressSchema })
const response = (status: number, result: LocalPaymentResult) => Response.json(result, { status, headers: {
  'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
} })

// findCommerce reads only the first match and cannot prove cardinality. These
// bounded feature-local reads must also detect an unexpected duplicate/tail.
async function rows(req: PayloadRequest, collection: string, where: Where, limit = 2): Promise<Row[]> {
  const found = await req.payload.find({ collection: collection as CollectionSlug, where, limit, depth: 0, overrideAccess: true, req })
  if (found.totalDocs !== found.docs.length || found.docs.length > limit) throw new Error('Result cardinality')
  return found.docs as unknown as Row[]
}
async function one(req: PayloadRequest, collection: string, where: Where): Promise<Row> {
  const found = await rows(req, collection, where)
  if (found.length !== 1) throw new Error('Result cardinality')
  return found[0]
}

function validateReservation(reservation: Row, row: PortOneTransaction): void {
  z.enum(['reserved', 'settled', 'released']).parse(reservation.state)
  z.union([z.uuid(), z.object({ id: z.uuid() })]).nullish().parse(reservation.order)
  const snapshot = row.portone.snapshot
  if (reservation.attemptID !== row.id || relationshipID(reservation.customer) !== snapshot.customerID
    || relationshipID(reservation.product) !== snapshot.productID || relationshipID(reservation.event) !== snapshot.eventID
    || reservation.releaseID !== snapshot.releaseID || reservation.quantity !== snapshot.quantity
    || reservation.snapshotHash !== row.portone.snapshotHash) throw new Error('Reservation integrity')
}
function validateOrder(raw: Row, row: PortOneTransaction) {
  const order = orderSchema.parse(raw)
  const snapshot = row.portone.snapshot
  if ((row.order && order.id !== relationshipID(row.order)) || order.customer !== snapshot.customerID || order.commerceAttemptID !== row.id
    || order.transactions[0] !== row.id || commerceSnapshotHash(order.commerceSnapshot) !== row.portone.snapshotHash
    || order.amount !== row.amount || order.currency !== row.currency || order.items[0].product !== snapshot.productID
    || order.items[0].quantity !== snapshot.quantity || JSON.stringify(order.shippingAddress) !== JSON.stringify(snapshot.shippingAddress)) {
    throw new Error('Order integrity')
  }
  return order
}

async function settlementEvidence(req: PayloadRequest, row: PortOneTransaction, orderID: string): Promise<boolean> {
  const snapshot = row.portone.snapshot
  const admissions = await rows(req, 'commerce-admissions', { order: { equals: orderID } }, snapshot.quantity + 1)
  if (admissions.length !== snapshot.quantity || new Set(admissions.map(a => a.unit)).size !== snapshot.quantity) throw new Error('Grant cardinality')
  for (const admission of admissions) {
    const unit = counter(admission.unit)
    if (unit < 1 || unit > snapshot.quantity || admission.orderUnitKey !== `${orderID}:${unit}`
      || relationshipID(admission.order) !== orderID || relationshipID(admission.transaction) !== row.id
      || relationshipID(admission.event) !== snapshot.eventID || relationshipID(admission.buyer) !== snapshot.customerID
      || !['available', 'claimed', 'checked-in', 'revoked'].includes(String(admission.status))) throw new Error('Grant integrity')
  }
  // Holds and benefit consumption remain history. This reader never repairs or
  // infers physical stock disposition from a cancellation/return.
  if (admissions.some(a => a.benefitReview === true || a.status === 'revoked')) return true
  const allowance = await one(req, 'commerce-allowances', { and: [{ customer: { equals: snapshot.customerID } }, { releaseID: { equals: snapshot.releaseID } }] })
  const event = await one(req, 'commerce-events', { id: { equals: snapshot.eventID } })
  const product = await one(req, 'products', { id: { equals: snapshot.productID } })
  const cart = await one(req, 'carts', { id: { equals: snapshot.cartID } })
  if (relationshipID(allowance.customer) !== snapshot.customerID || allowance.releaseID !== snapshot.releaseID
    || counter(allowance.paidQuantity) < snapshot.quantity || counter(allowance.paidQuantity) + counter(allowance.reservedQuantity) > 3
    || event.id !== snapshot.eventID || counter(event.committedQuantity) < snapshot.quantity
    || counter(event.committedQuantity) + counter(event.reservedQuantity) > counter(event.capacity)
    || product.id !== snapshot.productID || counter(product.inventory) < counter(product.reservedQuantity)
    || cart.id !== snapshot.cartID || relationshipID(cart.customer) !== snapshot.customerID
    || typeof cart.purchasedAt !== 'string' || !Number.isFinite(Date.parse(cart.purchasedAt))) throw new Error('Settlement integrity')
  return false
}

async function projectLocalResult(req: PayloadRequest, row: PortOneTransaction): Promise<LocalPaymentResult> {
  const snapshot = row.portone.snapshot
  const terminalStatus = row.status === 'failed' || row.status === 'cancelled' || row.status === 'refunded' ? row.status : undefined
  const orders = await rows(req, 'orders', { or: [{ commerceAttemptID: { equals: row.id } },
    { transactions: { contains: row.id } }, ...(row.order ? [{ id: { equals: relationshipID(row.order) } }] : [])] })
  if (orders.length > 1 || (row.order && !orders.length) || (!terminalStatus && Boolean(row.order) !== Boolean(orders.length))) throw new Error('Order linkage')
  const order = orders.length ? validateOrder(orders[0], row) : undefined
  if (row.commerceReviewHold || row.commerceResolutionConflict) return { outcome: 'review-required', ...(order ? { orderID: order.id } : {}) }
  const reservation = await one(req, 'commerce-reservations', { attemptID: { equals: row.id } })
  validateReservation(reservation, row)
  if (terminalStatus) {
    if (order || reservation.state === 'settled' || reservation.order) return { outcome: 'review-required', ...(order ? { orderID: order.id } : {}) }
    const admissions = await rows(req, 'commerce-admissions', { transaction: { equals: row.id } }, snapshot.quantity + 1)
    if (admissions.length) return { outcome: 'review-required' }
    return { outcome: 'local-terminal', status: terminalStatus }
  }
  if (row.status !== 'succeeded') {
    if (order || reservation.state !== 'reserved' || reservation.order) throw new Error('Unresolved linkage')
    return { outcome: 'local-unresolved' }
  }
  if (!order) throw new Error('Missing canonical order')
  if (order.status === 'cancelled' || order.status === 'refunded') return { outcome: 'review-required', orderID: order.id }
  if (reservation.state !== 'settled' || relationshipID(reservation.order) !== order.id) throw new Error('Unsettled order')
  if (await settlementEvidence(req, row, order.id)) return { outcome: 'review-required', orderID: order.id }
  // Independent visible local consistency, not a claim of DB crash durability.
  return { outcome: 'confirmed', transactionID: row.id, paymentID: row.portone.paymentID, cartID: snapshot.cartID,
    orderID: order.id, snapshot, assurance: 'local-consistency' }
}

/** Exact local GET only. No provider reconciliation, locks, finalization or repair. */
export function createResultEndpoint(authorize: (req: PayloadRequest) => Promise<string | null> = assertCommerceBrowserRead): Endpoint {
  return { path: '/result', method: 'get', handler: async (req) => {
    let authorized = false
    let customerID: string | null = null
    try {
      if (req.method !== 'GET') return response(405, { outcome: 'authority-stop' })
      if (!req.url) return response(400, { outcome: 'invalid-request' })
      customerID = await authorize(req)
      if (!customerID || req.user?.collection !== 'users' || String(req.user.id) !== customerID) return response(403, { outcome: 'authentication-required' })
      authorized = true
      const url = new URL(req.url)
      const entries = [...url.searchParams]
      const tuple = tupleSchema.safeParse(Object.fromEntries(entries))
      if (url.hash || new Set(entries.map(([key]) => key)).size !== entries.length || !tuple.success
        || paymentIdFromOrderId(tuple.data.transactionID) !== tuple.data.paymentID) return response(400, { outcome: 'integrity-stop' })
      if (await req.transactionID) return response(503, { outcome: 'completion-unknown' })
      const owned = await rows(req, 'transactions', { and: [{ id: { equals: tuple.data.transactionID } }, { customer: { equals: customerID } }] })
      // Check ownership before parsing private shape: foreign/missing is identical.
      if (!owned.length || owned.length === 1 && relationshipID(owned[0].customer) !== customerID) return response(404, { outcome: 'unavailable' })
      if (owned.length !== 1) throw new Error('Ambiguous attempt')
      const row = await readPortOneTransaction(req, tuple.data.paymentID)
      if (row.id !== tuple.data.transactionID || row.portone.snapshot.customerID !== customerID || row.portone.snapshot.cartID !== tuple.data.cartID) throw new Error('Attempt mismatch')
      const result = await projectLocalResult(req, row)
      // Do not publish an earlier clear read after a later hold/terminal transition.
      // This is a fail-closed reread, not an atomic DB snapshot or I0DB proof.
      const current = await readPortOneTransaction(req, tuple.data.paymentID)
      if (JSON.stringify(current) !== JSON.stringify(row)) return response(409, { outcome: 'integrity-stop' })
      if (req.user?.collection !== 'users' || String(req.user.id) !== customerID) return response(403, { outcome: 'authentication-required' })
      return response(200, result)
    } catch (error) {
      if (customerID && (req.user?.collection !== 'users' || String(req.user.id) !== customerID)) return response(403, { outcome: 'authentication-required' })
      if (error instanceof APIError && (error.status === 401 || error.status === 403)) return response(403, { outcome: 'authentication-required' })
      if (error instanceof APIError && error.status === 429) return response(429, { outcome: 'rate-stop' })
      return response(503, { outcome: authorized ? 'integrity-stop' : 'authority-stop' })
    }
  } }
}
