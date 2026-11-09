import { orderIdFromPaymentId, paymentIdFromOrderId, providerPaymentId } from './payment-id'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import type { Payload, Where } from 'payload'
import type { PortOneCatalogue, PortOneConfig } from './config'

type OrderPayload = Pick<Payload, 'find' | 'findByID' | 'create'> & { db: Pick<Payload['db'], 'updateOne'> }
const identifier = z.uuid()
const storedOrder = z.object({
  id: identifier, user: z.union([identifier, z.object({ id: identifier })]),
  ticketQuantity: z.int().min(1).max(6), totalAmount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.enum(['KRW', 'USD']), status: z.enum(['pending', 'paid', 'cancelled', 'refunded', 'held']),
  paymentProvider: z.literal('portone'), paymentReference: providerPaymentId,
})
const authoritativePayment = z.object({
  id: providerPaymentId, status: z.enum(['PAID', 'CANCELLED', 'PARTIAL_CANCELLED']), storeId: z.string(),
  channel: z.object({ key: z.string(), type: z.literal('TEST') }), customer: z.object({ id: identifier }),
  currency: z.enum(['KRW', 'USD']),
  amount: z.object({ total: z.int().positive().max(Number.MAX_SAFE_INTEGER),
    paid: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER), cancelled: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
  disputes: z.unknown().optional(),
})
const preparedOrder = storedOrder.extend({ paymentReference: providerPaymentId.nullish(),
  prepareKey: z.string().regex(/^[a-f0-9]{64}$/), prepareFingerprint: z.string().regex(/^[a-f0-9]{64}$/) })

export class PaymentRejected extends Error {
  constructor() { super('Payment could not be confirmed.') }
}

/** Existing Orders are the only local payment authority. No client quote is trusted. */
export async function preparePayment(input: {
  payload: OrderPayload; config: PortOneConfig; catalogue: PortOneCatalogue;
  quantity: number; ownerId: string; attemptId: string; now?: Date; customer?: { email: string; fullName?: string }
}) {
  const { payload, config, catalogue, quantity, ownerId } = input
  const now = (input.now ?? new Date()).getTime()
  if (!identifier.safeParse(ownerId).success || !identifier.safeParse(input.attemptId).success || !Number.isInteger(quantity) || quantity < 1
    || quantity > catalogue.maximumQuantity || quantity > 6 || !Number.isFinite(now)) throw new PaymentRejected()
  const totalAmount = catalogue.unitAmount * quantity
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 1) throw new PaymentRejected()
  // Global key prevents a retained browser attempt crossing account boundaries.
  // Native crypto and Zod own hashing/validation; no custom key or ORM framework.
  const prepareKey = createHash('sha256').update(input.attemptId).digest('hex')
  const prepareFingerprint = createHash('sha256').update(JSON.stringify([ownerId, quantity,
    config.origin, config.storeId, config.channelKey, catalogue.orderName, catalogue.unitAmount,
    catalogue.currency, catalogue.maximumQuantity, catalogue.saleStartsAt, catalogue.saleEndsAt])).digest('hex')
  const lookup = async () => {
    const found = await payload.find({ collection: 'orders', overrideAccess: true, depth: 0,
      pagination: false, limit: 2, where: { prepareKey: { equals: prepareKey } } })
    if (found.docs.length > 1) throw new PaymentRejected()
    return found.docs[0] ?? null
  }
  const validate = (value: unknown) => {
    const parsed = preparedOrder.safeParse(value)
    if (!parsed.success) throw new PaymentRejected()
    const row = parsed.data
    const owner = typeof row.user === 'string' ? row.user : row.user.id
    if (owner !== ownerId || row.prepareKey !== prepareKey || row.prepareFingerprint !== prepareFingerprint
      || row.ticketQuantity !== quantity || row.totalAmount !== totalAmount || row.currency !== catalogue.currency
      || (row.paymentReference != null && row.paymentReference !== paymentIdFromOrderId(row.id))) throw new PaymentRejected()
    return row
  }
  let candidate: unknown = await lookup()
  let recovered = candidate !== null
  if (!candidate) {
    if (now < Date.parse(catalogue.saleStartsAt) || now >= Date.parse(catalogue.saleEndsAt)) throw new PaymentRejected()
    try {
      // Let Payload allocate its actual ID; a DB unique index arbitrates races.
      candidate = await payload.create({ collection: 'orders', overrideAccess: true, depth: 0, data: {
        user: ownerId, ticketQuantity: quantity, totalAmount, currency: catalogue.currency,
        status: 'pending', paymentProvider: 'portone', prepareKey, prepareFingerprint,
      } })
    } catch (error) {
      // Payload maps unique violations into ValidationError. Recover only from
      // an exact durable row, also covering a committed-but-lost create response.
      candidate = await lookup()
      if (!candidate) throw error
      recovered = true
    }
  }
  let row = validate(candidate)
  const paymentId = paymentIdFromOrderId(row.id)
  if (row.paymentReference == null) {
    if (row.status !== 'pending') throw new PaymentRejected()
    const bound = await payload.db.updateOne({ collection: 'orders', options: { atomic: true }, returning: true,
      where: { and: [{ id: { equals: row.id } }, { user: { equals: ownerId } },
        { prepareKey: { equals: prepareKey } }, { prepareFingerprint: { equals: prepareFingerprint } },
        { ticketQuantity: { equals: quantity } }, { totalAmount: { equals: totalAmount } },
        { currency: { equals: catalogue.currency } }, { status: { equals: 'pending' } },
        { paymentProvider: { equals: 'portone' } }, { paymentReference: { exists: false } }] },
      data: { paymentReference: paymentId, updatedAt: new Date().toISOString() } })
    if (!bound) {
      // Another request may have bound it; never replace the row or bypass CAS.
      row = validate(await payload.findByID({ collection: 'orders', id: orderIdFromPaymentId(paymentId),
        overrideAccess: true, depth: 0, disableErrors: true }))
      recovered = true
    } else row = validate(bound)
  } else recovered = true
  if (row.paymentReference !== paymentId) throw new PaymentRejected()
  recovered = recovered || row.status !== 'pending'
  return { storeId: config.storeId, channelKey: config.channelKey, paymentId,
    orderName: catalogue.orderName, totalAmount, currency: catalogue.currency,
    redirectUrl: `${config.origin}/tickets/payment`, customer: { customerId: ownerId, ...input.customer }, recovered }
}

/** Read-only eligibility check: never allocates an order or rewinds financial state. */
export async function resumePayment(input: {
  payload: Pick<OrderPayload, 'findByID'>; config: PortOneConfig; catalogue: PortOneCatalogue;
  paymentId: string; ownerId: string; attemptId: string; now?: Date;
  customer?: { email: string; fullName?: string };
  getPayment: (input: { paymentId: string; storeId: string }) => Promise<unknown>
}) {
  const { payload, config, catalogue, paymentId, ownerId, attemptId } = input
  if (!providerPaymentId.safeParse(paymentId).success || ![ownerId, attemptId].every(value => identifier.safeParse(value).success)) throw new PaymentRejected()
  const prepareKey = createHash('sha256').update(attemptId).digest('hex')
  const read = async () => preparedOrder.parse(await payload.findByID({ collection: 'orders', id: orderIdFromPaymentId(paymentId),
    overrideAccess: true, depth: 0, disableErrors: true }))
  const order = await read()
  const prepareFingerprint = createHash('sha256').update(JSON.stringify([ownerId, order.ticketQuantity,
    config.origin, config.storeId, config.channelKey, catalogue.orderName, catalogue.unitAmount,
    catalogue.currency, catalogue.maximumQuantity, catalogue.saleStartsAt, catalogue.saleEndsAt])).digest('hex')
  const now = (input.now ?? new Date()).getTime()
  const storedOwner = typeof order.user === 'string' ? order.user : order.user.id
  if (order.id !== orderIdFromPaymentId(paymentId) || order.paymentReference !== paymentId || storedOwner !== ownerId
    || order.prepareKey !== prepareKey || order.prepareFingerprint !== prepareFingerprint
    || order.ticketQuantity > catalogue.maximumQuantity || order.totalAmount !== catalogue.unitAmount * order.ticketQuantity
    || order.currency !== catalogue.currency || !Number.isFinite(now)
    || now < Date.parse(catalogue.saleStartsAt) || now >= Date.parse(catalogue.saleEndsAt)) throw new PaymentRejected()
  if (order.status !== 'pending') return { outcome: 'status-only' as const }
  const snapshot = await input.getPayment({ paymentId, storeId: config.storeId })
  const refreshed = await read()
  if (JSON.stringify({ ...refreshed, status: order.status }) !== JSON.stringify(order)) throw new PaymentRejected()
  if (refreshed.status !== 'pending') return { outcome: 'status-only' as const }
  const refreshedNow = (input.now ?? new Date()).getTime()
  if (!Number.isFinite(refreshedNow) || refreshedNow < Date.parse(catalogue.saleStartsAt)
    || refreshedNow >= Date.parse(catalogue.saleEndsAt)) throw new PaymentRejected()
  const missing = z.strictObject({ type: z.literal('PAYMENT_NOT_FOUND') }).safeParse(snapshot).success
  if (!missing) {
    const observed = z.object({ status: z.string() }).safeParse(snapshot)
    if (!observed.success) throw new Error('Payment provider unavailable.')
    if (['READY', 'PENDING', 'PAID', 'CANCELLED', 'PARTIAL_CANCELLED'].includes(observed.data.status)) return { outcome: 'status-only' as const }
    if (observed.data.status !== 'FAILED') throw new Error('Payment provider unavailable.')
    // V2 FailedPayment has no disputes field (unlike PaidPayment). Absence is
    // valid only here; any supplied dispute snapshot must still be empty.
    const payment = authoritativePayment.extend({ status: z.literal('FAILED'), disputes: z.array(z.unknown()).length(0).optional() }).safeParse(snapshot)
    if (!payment.success || payment.data.id !== paymentId || payment.data.storeId !== config.storeId
      || payment.data.channel.key !== config.channelKey || payment.data.customer.id !== ownerId
      || payment.data.amount.total !== order.totalAmount || payment.data.amount.paid !== 0
      || payment.data.amount.cancelled !== 0 || payment.data.currency !== order.currency) throw new PaymentRejected()
  }
  return { outcome: 'resumable' as const, request: { storeId: config.storeId, channelKey: config.channelKey,
    paymentId, orderName: catalogue.orderName, totalAmount: order.totalAmount, currency: order.currency,
    redirectUrl: `${config.origin}/tickets/payment`, customer: { customerId: ownerId, ...input.customer } } }
}

export async function reconcilePayment(input: {
  payload: Pick<OrderPayload, 'findByID' | 'db'>; config: PortOneConfig; paymentId: string;
  ownerId?: string; getPayment: (input: { paymentId: string; storeId: string }) => Promise<unknown>
}) {
  const { payload, config, paymentId, ownerId } = input
  if (!providerPaymentId.safeParse(paymentId).success) throw new PaymentRejected()
  const parsedOrder = storedOrder.safeParse(await payload.findByID({ collection: 'orders', id: orderIdFromPaymentId(paymentId),
    overrideAccess: true, depth: 0, disableErrors: true }))
  if (!parsedOrder.success) throw new PaymentRejected()
  const order = parsedOrder.data
  const storedOwner = typeof order.user === 'string' ? order.user : order.user.id
  // Deterministic one-order/one-payment binding avoids trusting a nonunique reference.
  if (order.id !== orderIdFromPaymentId(paymentId) || order.paymentReference !== paymentId
    || (ownerId !== undefined && ownerId !== storedOwner)) throw new PaymentRejected()
  const parsedPayment = authoritativePayment.safeParse(await input.getPayment({ paymentId, storeId: config.storeId }))
  if (!parsedPayment.success) throw new PaymentRejected()
  const payment = parsedPayment.data
  if (payment.id !== paymentId || payment.storeId !== config.storeId
    || payment.channel.key !== config.channelKey || payment.customer.id !== storedOwner
    || payment.amount.total !== order.totalAmount
    || payment.currency !== order.currency) throw new PaymentRejected()
  // Only identity/amount-verified provider evidence may invalidate an order.
  // Unknown/missing dispute snapshots are unsafe too; throwing alone would
  // leave an already-paid local row eligible for future fulfillment.
  const needsHold = payment.status === 'PARTIAL_CANCELLED'
    || (payment.status === 'PAID' && (payment.amount.paid !== order.totalAmount || payment.amount.cancelled !== 0
      || !Array.isArray(payment.disputes) || payment.disputes.length !== 0))
    || (payment.status === 'CANCELLED' && payment.amount.cancelled !== order.totalAmount)
  const guards: Where[] = [
    { id: { equals: order.id } }, { user: { equals: storedOwner } },
    { ticketQuantity: { equals: order.ticketQuantity } }, { totalAmount: { equals: order.totalAmount } },
    { currency: { equals: order.currency } },
    { paymentProvider: { equals: 'portone' } }, { paymentReference: { equals: paymentId } },
  ]
  // Installed Postgres adapter 3.92.1 implements atomic:true as UPDATE ... WHERE
  // RETURNING on main-table fields. Never pass id: that bypasses atomic where.
  // Bypasses hooks/access intentionally; only status changes after all checks.
  // Provider I/O can outlive a concurrent hold/refund. This read is the
  // duplicate/no-op confirmation's linearization point; never report the
  // pre-provider status or perform a no-op paid write just to refresh it.
  const refreshed = storedOrder.safeParse(await payload.findByID({ collection: 'orders', id: orderIdFromPaymentId(paymentId),
    overrideAccess: true, depth: 0, disableErrors: true }))
  if (!refreshed.success || JSON.stringify({ ...refreshed.data, status: order.status }) !== JSON.stringify(order)) throw new PaymentRejected()
  let current = refreshed.data
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!needsHold && payment.status === 'PAID' && !['pending', 'paid', 'held'].includes(current.status)) throw new PaymentRejected()
    const status = current.status === 'held' || needsHold ? 'held' as const : payment.status === 'PAID' ? 'paid' as const
      : ['paid', 'refunded'].includes(current.status) ? 'refunded' as const : 'cancelled' as const
    if (current.status === status) return { orderId: order.id, status }
    const updated = await payload.db.updateOne({ collection: 'orders',
      where: { and: [...guards, { status: { equals: current.status } }] },
      options: { atomic: true }, data: { status, updatedAt: new Date().toISOString() }, returning: true })
    if (updated) {
      if (updated.id !== order.id || updated.status !== status) throw new PaymentRejected()
      console.info('PortOne order transition.', { orderId: order.id, paymentId,
        previousStatus: current.status, status })
      return { orderId: order.id, status }
    }
    const latest = storedOrder.safeParse(await payload.findByID({ collection: 'orders', id: orderIdFromPaymentId(paymentId),
      overrideAccess: true, depth: 0, disableErrors: true }))
    if (!latest.success || JSON.stringify({ ...latest.data, status: order.status }) !== JSON.stringify(order)) throw new PaymentRejected()
    current = latest.data
  }
  throw new PaymentRejected()
}
