import english from "../../../../messages/en.json";
import { createHash, randomUUID } from 'node:crypto'
import { type PayloadRequest, type GroupField, type CollectionSlug } from 'payload'
import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'
import { z } from 'zod'
import { commerceSnapshotSchema, shippingAddressSchema, type CommerceSnapshot } from '../contracts'
import { commerceSnapshotHash } from '../snapshot-hash'
import { buildCommerceSnapshot } from '../catalogue'
import { commerceServerField, withCommerceWrite } from '../access'
import { lockReservationContext, reservePurchase } from '../reservations'
import { counter, lockCommerce, requirePaymentTransaction } from '../_shared/transaction'
import { loadPortOneConfig, type PortOneConfig } from '../../tickets/portone/config'
import { orderIdFromPaymentId, paymentIdFromOrderId, providerPaymentId } from '../../tickets/portone/payment-id'
import { classifyPaymentRisk, validatePaidPayment } from './proof'
import { deferPaymentRisk } from './review'
import { createAdapterEndpoints } from './endpoints'
import { accountedProviderGet, assertReconciliationFence, retainReconciliationRisk, assertOrdinaryReconciliation } from './accounting'
export { isVerifiedCommerceWebhook } from './endpoints'
export { assertPaymentRiskReviewed, flushDeferredPaymentRisk } from './review'

const uuid = z.uuid()
const relation = z.union([z.string().min(1), z.number(), z.object({ id: z.union([z.string().min(1), z.number()]) })])
const relationID = (value: z.infer<typeof relation>) => String(typeof value === 'object' ? value.id : value)
const transactionSchema = z.object({
  id: uuid, status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']),
  order: relation.nullish(), commerceReviewHold: z.boolean().optional().default(false),
  commerceResolutionConflict: z.boolean().optional().default(false),
  customer: relation, cart: relation, amount: z.int().positive(), currency: z.literal('KRW'), paymentMethod: z.literal('portone'),
  items: z.array(z.object({ product: relation, quantity: z.int().min(1).max(3), variant: z.null().optional() })).length(1),
  portone: z.object({ paymentID: providerPaymentId, prepareKey: z.string().regex(/^[a-f0-9]{64}$/),
    snapshot: commerceSnapshotSchema, snapshotHash: z.string().regex(/^[a-f0-9]{64}$/), storeID: z.string(), channelKey: z.string() }),
})
export type PortOneTransaction = z.infer<typeof transactionSchema>
type ProviderGet = (input: { paymentId: string; storeId: string }) => Promise<unknown>
export type AdapterDependencies = {
  config?: PortOneConfig | null
  getPayment?: ProviderGet
  verifyWebhook?: (raw: string, headers: Record<string, string>) => Promise<unknown>
}

export function adapterConfig(deps: AdapterDependencies): PortOneConfig {
  const config = deps.config === undefined ? loadPortOneConfig() : deps.config
  // The env-configured channel of the validated mode is authoritative; disabled throws.
  if (!config || (config.mode !== 'test' && config.mode !== 'live')) throw new Error('Payment channel unavailable')
  return config
}

export async function providerPayment(deps: AdapterDependencies, paymentID: string, req: PayloadRequest): Promise<unknown> {
  const config = adapterConfig(deps)
  // Existing native transport supplies the deadline missing from installed SDK
  // 0.19.0. Reuse it without invoking its legacy order handlers or catalogue.
  const get: ProviderGet = deps.getPayment ?? ((input) => import('../../tickets/portone/runtime').then(({ getResumePayment }) => getResumePayment(config, input)))
  return accountedProviderGet(req, paymentID, () => get({ paymentId: paymentID, storeId: config.storeId }))
}

/** Read the plugin transaction, never legacy orders; bind UUID/hex, owner and immutable snapshot. */
export async function readPortOneTransaction(req: PayloadRequest, paymentID: string, transactionsSlug = 'transactions'): Promise<PortOneTransaction> {
  const id = orderIdFromPaymentId(providerPaymentId.parse(paymentID))
  const row = transactionSchema.parse(await req.payload.findByID({ collection: transactionsSlug as CollectionSlug, id,
    req, overrideAccess: true, depth: 0 }))
  const snapshot = row.portone.snapshot
  if (row.id !== id || row.portone.paymentID !== paymentID || relationID(row.customer) !== snapshot.customerID
    || relationID(row.cart) !== snapshot.cartID || row.amount !== snapshot.totalAmount || row.currency !== snapshot.currency
    || row.portone.snapshotHash !== commerceSnapshotHash(snapshot) || relationID(row.items[0].product) !== snapshot.productID
    || row.items[0].quantity !== snapshot.quantity) throw new Error('Payment transaction mismatch')
  return row
}

export function paymentRequest(config: PortOneConfig, row: PortOneTransaction, customer: { email?: string; name?: string | null }) {
  const snapshot = row.portone.snapshot
  return { storeId: config.storeId, channelKey: config.channelKey, paymentId: row.portone.paymentID,
    orderName: snapshot.orderName, totalAmount: snapshot.totalAmount, currency: snapshot.currency,
    redirectUrl: `${config.origin}/shop/payment`, customer: { customerId: snapshot.customerID,
      email: z.email().parse(customer.email), ...(customer.name ? { fullName: customer.name } : {}) } }
}

const financialFieldAccess = { create: commerceServerField, update: commerceServerField }
const group: GroupField = {
  name: 'portone', type: 'group', access: financialFieldAccess,
  fields: [
    { name: 'paymentID', type: 'text', required: true, unique: true, index: true },
    { name: 'prepareKey', type: 'text', required: true, unique: true, index: true },
    { name: 'snapshot', type: 'json', required: true }, { name: 'snapshotHash', type: 'text', required: true },
    { name: 'storeID', type: 'text', required: true }, { name: 'channelKey', type: 'text', required: true },
  ],
}

export function createPortOneAdapter(deps: AdapterDependencies = {}): PaymentAdapter {
  // Endpoint modules also consume this adapter's transaction reader. Register
  // lazily so a direct endpoint import cannot observe a half-initialized cycle.
  let endpoints: PaymentAdapter['endpoints']
  return { name: 'portone', label: english.Staff.schema.portOneTEST, group,
    get endpoints() { return endpoints ??= createAdapterEndpoints(deps) },
    initiatePayment: async ({ data, req, transactionsSlug }) => {
      const config = adapterConfig(deps)
      const attemptID = uuid.parse(req.data?.attemptID)
      if (!req.user || req.user.collection !== 'users') throw new Error('Customer mismatch')
      await requirePaymentTransaction(req)
        await lockCommerce(req, []) // A real adapter session, not a truthy invented transactionID.
        return await withCommerceWrite(req, async () => {
          const prepareKey = createHash('sha256').update(attemptID).digest('hex')
          await lockCommerce(req, [`portone-prepare:${prepareKey}`, `cart:${data.cart.id}`])
          // The generated handler selects a cart projection without customer or
          // purchasedAt. Reload the actual access-controlled cart under our lock.
          const cart = await req.payload.findByID({ collection: 'carts' as CollectionSlug, id: data.cart.id,
            req, overrideAccess: false, depth: 0 })
          const shippingAddress = shippingAddressSchema.parse(data.shippingAddress)
          const found = await req.payload.find({ collection: transactionsSlug as CollectionSlug, req, overrideAccess: true,
            pagination: false, depth: 0, limit: 2, where: { 'portone.prepareKey': { equals: prepareKey } } })
          if (found.docs.length > 1) throw new Error('Ambiguous payment preparation')
          if (found.docs.length === 1) {
            const existing = transactionSchema.parse(found.docs[0])
            const row = await readPortOneTransaction(req, existing.portone.paymentID, transactionsSlug)
            const saved = row.portone.snapshot
            const currentCart = z.object({ id: relation, customer: relation, items: z.array(z.object({ product: relation, quantity: z.int() })).length(1) }).parse(cart)
            if (saved.customerID !== String(req.user!.id) || saved.cartID !== relationID(currentCart.id)
              || saved.customerID !== relationID(currentCart.customer) || saved.productID !== relationID(currentCart.items[0].product)
              || saved.quantity !== currentCart.items[0].quantity || JSON.stringify(saved.shippingAddress) !== JSON.stringify(shippingAddress)
              || row.portone.storeID !== config.storeId
              || row.portone.channelKey !== config.channelKey) throw new Error('Payment attempt cannot be rebound')
            return { message: 'Existing payment attempt', transactionID: row.id, paymentID: row.portone.paymentID, outcome: 'status-only' }
          }
          const snapshot = commerceSnapshotSchema.parse(await buildCommerceSnapshot({ req, cart, shippingAddress }))
          if (snapshot.customerID !== String(req.user!.id) || snapshot.cartID !== String(data.cart.id)) throw new Error('Snapshot owner mismatch')
          const active = await req.payload.find({ collection: transactionsSlug as CollectionSlug, req, overrideAccess: true,
            depth: 0, limit: 1, where: { and: [{ cart: { equals: snapshot.cartID } }, { status: { in: ['pending', 'processing', 'succeeded'] } }] } })
          if (active.docs.length) throw new Error('Cart already has an unresolved payment attempt')
          const id = randomUUID()
          const paymentID = paymentIdFromOrderId(id)
          await req.payload.create({ collection: transactionsSlug as CollectionSlug, req, overrideAccess: true, depth: 0,
            data: { id, customer: snapshot.customerID, customerEmail: z.email().parse(req.user!.email), cart: snapshot.cartID,
              amount: snapshot.totalAmount, currency: snapshot.currency, status: 'pending', paymentMethod: 'portone',
              items: [{ product: snapshot.productID, quantity: snapshot.quantity }], portone: { paymentID, prepareKey,
                snapshot, snapshotHash: commerceSnapshotHash(snapshot), storeID: config.storeId, channelKey: config.channelKey } } as never })
          await reservePurchase({ req, attemptID: id, customerID: snapshot.customerID, releaseID: snapshot.releaseID,
            productID: snapshot.productID, eventID: snapshot.eventID, quantity: snapshot.quantity, snapshotHash: commerceSnapshotHash(snapshot) })
          const row = await readPortOneTransaction(req, paymentID, transactionsSlug)
          const request = paymentRequest(config, row, { email: req.user!.email, name: req.user!.name })
          return { message: 'Payment prepared', transactionID: id, paymentID, paymentRequest: request, outcome: 'prepared' }
        })
    },
    confirmOrder: async ({ data, req, transactionsSlug, finalizeOrder }) => {
      await requirePaymentTransaction(req)
      assertOrdinaryReconciliation(req)
      const config = adapterConfig(deps)
      await lockCommerce(req, [])
      const transactionID = uuid.parse(data.transactionID)
      const row = await readPortOneTransaction(req, providerPaymentId.parse(data.paymentID), transactionsSlug)
      const snapshot: CommerceSnapshot = row.portone.snapshot
      if (!req.user || req.user.collection !== 'users' || String(req.user.id) !== snapshot.customerID || transactionID !== row.id || data.cartID !== snapshot.cartID
        || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey
        || row.commerceReviewHold || !['pending', 'succeeded'].includes(row.status)) throw new Error('Payment confirmation rejected')
      const evidence = await providerPayment(deps, row.portone.paymentID, req)
      const expected = { mode: config.mode, paymentID: row.portone.paymentID,
        customerID: snapshot.customerID, storeID: config.storeId, channelKey: config.channelKey,
        totalAmount: snapshot.totalAmount, currency: snapshot.currency }
      if (classifyPaymentRisk(evidence, expected) !== 'clear') {
        deferPaymentRisk(req, { transactionID: row.id, paymentID: row.portone.paymentID }, evidence, deps)
        await retainReconciliationRisk(req, evidence)
        throw new Error('Observed payment risk requires independent quarantine after rollback')
      }
      validatePaidPayment(evidence, expected)
      await retainReconciliationRisk(req, evidence)
      // Reserve's existing-attempt path locks the same domain resources before
      // plugin inventory row writes, preventing reserve/settle lock inversion.
      // A missing initiation reservation is corruption, not a new allocation.
      await assertReconciliationFence(req)
      const reservationContext = await lockReservationContext(req, row.id)
      const locked = await readPortOneTransaction(req, row.portone.paymentID, transactionsSlug)
      if (reservationContext.reservation.state === 'released' || ['failed', 'cancelled', 'refunded'].includes(locked.status)) {
        deferPaymentRisk(req, { transactionID: row.id, paymentID: row.portone.paymentID }, evidence, deps)
        throw new Error('Observed payment conflicts with retired reservation')
      }
      if (locked.commerceReviewHold || locked.portone.snapshotHash !== row.portone.snapshotHash
        || !['pending', 'succeeded'].includes(locked.status)) throw new Error('Payment entered review during confirmation')
      await reservePurchase({ req, attemptID: row.id, customerID: snapshot.customerID, releaseID: snapshot.releaseID,
        productID: snapshot.productID, eventID: snapshot.eventID, quantity: snapshot.quantity, snapshotHash: row.portone.snapshotHash })
      if (locked.status === 'pending' && counter(reservationContext.product.inventory) < snapshot.quantity) throw new Error('Reserved inventory requires review')
      const order = await withCommerceWrite(req, () => finalizeOrder({ transactionID: row.id, orderData: {
        commerceVersion: 'commerce-v1', commerceSnapshot: snapshot, commerceAttemptID: row.id,
        customer: snapshot.customerID, amount: snapshot.totalAmount, currency: snapshot.currency,
        items: row.items, status: 'processing', shippingAddress: snapshot.shippingAddress,
      } }))
      const orderID = z.string().min(1).parse(order.id)
      return { message: 'Order confirmed', orderID, transactionID: row.id }
    },
  }
}

// Registration is inert: configuration and transport are resolved only per call.
export const portonePaymentAdapter: PaymentAdapter = createPortOneAdapter()
