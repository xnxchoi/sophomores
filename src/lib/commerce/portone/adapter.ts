import english from "../../../../messages/en.json";
import { createHash, randomUUID } from 'node:crypto'
import { APIError, type PayloadRequest, type GroupField, type CollectionSlug } from 'payload'
import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'
import { z } from 'zod'
import { guestCheckoutQuoteSchema, shippingAddressSchema, ticketEmailConsentSchema } from '../contracts'
import { optionalRelationshipID, purchaseSnapshotSchema } from '../purchase-snapshot'
import { commerceSnapshotHash } from '../snapshot-hash'
import { buildCommerceSnapshot } from '../catalogue'
import { commerceServerField, withCommerceWrite } from '../access'
import { serverChosenIDContext } from '../../../payload/server-chosen-ids'
import { lockReservationContext, reservePurchase } from '../reservations'
import { counter, lockCommerce, relationshipID, requirePaymentTransaction } from '../_shared/transaction'
import { isPinnedSandboxChannel, loadPortOneConfig, type PortOneConfig } from '../../tickets/portone/config'
import { orderIdFromPaymentId, paymentIdFromOrderId, providerPaymentId } from '../../tickets/portone/payment-id'
import { classifyReconciliationPayment, minimalPaymentRiskProof } from './proof'
import { createAdapterEndpoints } from './endpoints'
import { accountedProviderGet, assertReconciliationFence, appendSettlementObservation, assertOrdinaryReconciliation, retainReconciliationRisk, readUnresolvedSettlementProof, paidReviewCustomerLock } from './accounting'
import { assertPurchaseWithoutPaidReview, deferPaymentRisk } from './review'
import { currentRefundTerms, sameRefundTerms } from './refund-terms'
export { isVerifiedCommerceWebhook } from './endpoints'

const uuid = z.uuid()
const relation = z.union([z.string().min(1), z.number(), z.object({ id: z.union([z.string().min(1), z.number()]) })])
const relationID = (value: z.infer<typeof relation>) => String(typeof value === 'object' ? value.id : value)
const transactionSchema = z.object({
  id: uuid, status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']),
  order: relation.nullish(), commerceReviewHold: z.boolean().optional().default(false),
  commerceResolutionConflict: z.boolean().optional().default(false),
  customer: relation, cart: relation, amount: z.int().positive(), currency: z.literal('KRW'), paymentMethod: z.literal('portone'),
  items: z.array(z.object({ product: relation, quantity: z.int().min(1).max(3), variant: relation.nullish() })).length(1),
  portone: z.object({ paymentID: providerPaymentId, prepareKey: z.string().regex(/^[a-f0-9]{64}$/),
    snapshot: purchaseSnapshotSchema, snapshotHash: z.string().regex(/^[a-f0-9]{64}$/), storeID: z.string(), channelKey: z.string() }),
})
export type PortOneTransaction = z.infer<typeof transactionSchema>
type ProviderGet = (input: { paymentId: string; storeId: string }) => Promise<unknown>
export type AdapterDependencies = {
  config?: PortOneConfig | null
  /** Explicitly set by the isolated native settlement proof; not request or environment data. */
  allowNativeEditions?: boolean
  getPayment?: ProviderGet
  verifyWebhook?: (raw: string, headers: Record<string, string>) => Promise<unknown>
}

export function adapterConfig(deps: AdapterDependencies): PortOneConfig {
  const config = deps.config === undefined ? loadPortOneConfig() : deps.config
  // The env-configured channel of the validated mode is authoritative; disabled throws.
  if (!config || (config.mode !== 'test' && config.mode !== 'live')) throw new Error('Payment channel unavailable')
  // The sandbox runtime re-checks its pinned TEST store and channel before every PortOne use, checkout initiation included.
  if (process.env.PREVIEW_RUNTIME !== undefined && (config.mode !== 'test' || !isPinnedSandboxChannel(config))) {
    throw new Error('Payment channel unavailable')
  }
  return config
}

export async function providerPayment(deps: AdapterDependencies, paymentID: string, req: PayloadRequest): Promise<unknown> {
  const config = adapterConfig(deps)
  // Existing native transport supplies the deadline missing from installed SDK
  // 0.19.0. Reuse it without invoking its legacy order handlers or catalogue.
  const get: ProviderGet = deps.getPayment ?? ((input) => import('../../tickets/portone/runtime').then(({ getResumePayment }) => getResumePayment(config, input)))
  return accountedProviderGet(req, paymentID, () => get({ paymentId: paymentID, storeId: config.storeId }))
}

/** Read exact proof or a retained review obligation; effects happen only outside this reader. */
export async function readSettlementProof(req: PayloadRequest, paymentID: string, deps: AdapterDependencies = {}) {
  assertOrdinaryReconciliation(req)
  const config = adapterConfig(deps)
  const row = await readPortOneTransaction(req, paymentID)
  const snapshot = row.portone.snapshot
  if (row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey ||
      req.user?.collection !== 'users' || String(req.user.id) !== snapshot.customerID) throw new Error('Payment owner mismatch')
  const retained = await readUnresolvedSettlementProof(req)
  if (retained) {
    deferPaymentRisk(req, { transactionID: row.id, paymentID }, retained, deps, true)
    return 'review-required' as const
  }
  let evidence: unknown
  try { evidence = await providerPayment(deps, paymentID, req) }
  catch (error) {
    // If there was no acknowledged debit or the fence is lost, refuse the
    // journal write instead of inventing an observation about the provider.
    await appendSettlementObservation(req, 'completion-unknown')
    throw error
  }
  const expected = { mode: config.mode, paymentID, customerID: snapshot.customerID,
    storeID: config.storeId, channelKey: config.channelKey, totalAmount: snapshot.totalAmount, currency: snapshot.currency }
  let observation = classifyReconciliationPayment(evidence, expected, 'unresolved').kind
  const backlink = observation === 'provider-paid' && row.status === 'pending' && await hasOrderBacklink(req, row.id)
  if (backlink) observation = 'review-required'
  switch (observation) {
    case 'provider-paid': case 'verified-failure': case 'provider-ready': case 'provider-not-found':
    case 'provider-unsupported': case 'review-required': case 'integrity-stop':
      if (observation === 'review-required') {
        const proof = minimalRiskForSettlement(evidence)
        // Exact partial/disputed evidence may have a financial effect. Plain
        // non-PAID first reads remain observation-only; none can release capacity.
        if (proof && (backlink || proof.status === 'PARTIAL_CANCELLED' || proof.disputes?.length || await req.transactionID)) {
          await retainReconciliationRisk(req, proof, true)
          deferPaymentRisk(req, { transactionID: row.id, paymentID }, proof, deps, true)
        }
      }
      await appendSettlementObservation(req, observation)
      return observation
    default:
      throw new Error('Unexpected settlement observation')
  }
}

function minimalRiskForSettlement(value: unknown) {
  try { return minimalPaymentRiskProof(value) }
  catch (error) { if (error instanceof z.ZodError) return null; throw error }
}

// Match the installed finalizer's unversioned backlink query. This is
// deliberately different from the commerce-v1-only local receipt read.
async function hasOrderBacklink(req: PayloadRequest, transactionID: string): Promise<boolean> {
  const found = await req.payload.find({ collection: 'orders', req, overrideAccess: true, depth: 0,
    limit: 1, pagination: false, where: { transactions: { equals: transactionID } } })
  return found.docs.length > 0 || found.totalDocs > 0
}

/**
 * The response a member entry point gives when its owned read stops: 403 when the
 * signed-in principal is no longer the one authorized at entry, 404 when no readable
 * attempt exists. Anything else is the caller's own failure (null).
 */
export function attemptReadStop(req: PayloadRequest, authorized: string | undefined, error: unknown): { status: 403 | 404; outcome: 'authentication-required' | 'unavailable' } | null {
  const changed = authorized !== undefined && (req.user?.collection !== 'users' || String(req.user.id) !== authorized)
  if (changed || error instanceof AttemptPrincipalChanged) return { status: 403, outcome: 'authentication-required' }
  return error instanceof AttemptUnavailable ? { status: 404, outcome: 'unavailable' } : null
}

/**
 * Throw an authentication stop when the signed-in principal is no longer the one
 * authorized at entry. Entry points call it before their work and on every response,
 * including early non-throwing ones, so no reply is produced for a different member.
 */
export function assertPrincipalUnchanged(req: PayloadRequest, authorized: string | undefined): void {
  if (authorized !== undefined && (req.user?.collection !== 'users' || String(req.user.id) !== authorized)) throw new AttemptPrincipalChanged()
}

/** A browser entry point found no attempt it may read. Foreign and missing are identical. */
export class AttemptUnavailable extends APIError {
  constructor() { super('Payment attempt unavailable', 404) }
}

/**
 * The signed-in principal changed while the attempt was being read. This is an
 * authentication stop, not object visibility: the attempt may well belong to the
 * member authorized at entry, so it must never be reported as missing.
 */
export class AttemptPrincipalChanged extends APIError {
  constructor() { super('Authentication required', 403) }
}

/**
 * Member entry points: read the signed-in member's own attempt with transaction-owner
 * access before any private parsing, so a foreign row and a missing row look the same.
 * Pass the principal authorized at entry when the caller reads more than once, so a
 * change between reads is an authentication stop rather than a foreign (missing) row.
 */
export async function readOwnedPortOneTransaction(req: PayloadRequest, paymentID: string, authorized?: string): Promise<PortOneTransaction> {
  const id = orderIdFromPaymentId(providerPaymentId.parse(paymentID))
  if (req.user?.collection !== 'users') throw authorized === undefined ? new AttemptUnavailable() : new AttemptPrincipalChanged()
  const principal = String(req.user.id)
  if (authorized !== undefined && principal !== authorized) throw new AttemptPrincipalChanged()
  const document = await req.payload.findByID({ collection: 'transactions' as CollectionSlug, id, req,
    overrideAccess: false, depth: 0, disableErrors: true })
  if (req.user?.collection !== 'users' || String(req.user.id) !== principal) throw new AttemptPrincipalChanged()
  // Access already filters by owner; the second check keeps a misconfigured rule from widening it.
  if (!document || relationshipID((document as { customer?: unknown }).customer) !== principal) throw new AttemptUnavailable()
  return parsePortOneTransaction(document, paymentID)
}

/**
 * SYSTEM reader: the signed webhook after verification, settlement, review and
 * invariant work. Member entry points use readOwnedPortOneTransaction first.
 */
export async function readPortOneTransaction(req: PayloadRequest, paymentID: string, transactionsSlug = 'transactions'): Promise<PortOneTransaction> {
  const id = orderIdFromPaymentId(providerPaymentId.parse(paymentID))
  return parsePortOneTransaction(await req.payload.findByID({ collection: transactionsSlug as CollectionSlug, id,
    req, overrideAccess: true, depth: 0 }), paymentID)
}

export function parsePortOneTransaction(document: unknown, paymentID: string): PortOneTransaction {
  const id = orderIdFromPaymentId(paymentID)
  const row = transactionSchema.parse(document)
  const snapshot = row.portone.snapshot
  if (row.id !== id || row.portone.paymentID !== paymentID || relationID(row.customer) !== snapshot.customerID
    || relationID(row.cart) !== snapshot.cartID || row.amount !== snapshot.totalAmount || row.currency !== snapshot.currency
    || row.portone.snapshotHash !== commerceSnapshotHash(snapshot) || relationID(row.items[0].product) !== snapshot.productID
    || row.items[0].quantity !== snapshot.quantity
    || optionalRelationshipID(row.items[0].variant) !== (snapshot.version === 2 ? snapshot.variantID : null)) throw new Error('Payment transaction mismatch')
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
          await lockCommerce(req, [paidReviewCustomerLock(String(req.user!.id))])
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
            const currentCart = z.object({ id: relation, customer: relation, items: z.array(z.object({ product: relation, variant: relation.nullish(), quantity: z.int() })).length(1) }).parse(cart)
            if (saved.customerID !== String(req.user!.id) || saved.cartID !== relationID(currentCart.id)
              || saved.customerID !== relationID(currentCart.customer) || saved.productID !== relationID(currentCart.items[0].product)
              || saved.quantity !== currentCart.items[0].quantity || JSON.stringify(saved.shippingAddress) !== JSON.stringify(shippingAddress)
              || optionalRelationshipID(currentCart.items[0].variant) !== (saved.version === 2 ? saved.variantID : null)
              || row.portone.storeID !== config.storeId
              || row.portone.channelKey !== config.channelKey) throw new Error('Payment attempt cannot be rebound')
            return { message: 'Existing payment attempt', transactionID: row.id, paymentID: row.portone.paymentID, outcome: 'status-only' }
          }
          const purchase = await buildCommerceSnapshot({ req, cart, shippingAddress, allowNativeEditions: deps.allowNativeEditions })
          const consent = ticketEmailConsentSchema.parse(req.data?.ticketEmailConsent)
          // Capture only fresh event-ticket consent, never infer it from an existing attempt.
          const snapshot = consent && process.env.UNLOCK_TICKET_EMAIL_CONSENT_ENABLED === '1' &&
            (purchase.version === 3 || (purchase.version === 2 && purchase.memberTicketTarget))
            ? { ...purchase, ticketEmailConsent: consent } : purchase
          const expected = guestCheckoutQuoteSchema.optional().parse(req.data?.guestQuote)
          // A fresh Guest charge needs the reviewed quote. Do not return a payment request or
          // write an attempt/reservation on mismatch; replay above still uses its saved attempt.
          if (snapshot.version === 3
            ? !expected || expected.productID !== snapshot.productID || expected.quantity !== snapshot.quantity || expected.totalAmount !== snapshot.totalAmount
            : expected) return { message: 'Guest quote changed', outcome: 'guest-quote-changed' }
          // The refund terms beside Pay must still be the ones that apply: re-derived now, against the event's current
          // start (Review-B r3). A change (the cutoff passed, the start moved) opens nothing; the page shows the new
          // terms and waits for a new press.
          if (snapshot.version === 3) {
            const terms = await currentRefundTerms(req, snapshot)
            if (!sameRefundTerms(expected?.refundTerms, terms)) return { message: 'Guest quote changed', outcome: 'guest-quote-changed', refundTerms: terms }
          }
          const variant = snapshot.version === 2 ? { variantID: snapshot.variantID,
            productVersion: snapshot.productVersion, variantVersion: snapshot.variantVersion } : undefined
          if (snapshot.customerID !== String(req.user!.id) || snapshot.cartID !== String(data.cart.id)) throw new Error('Snapshot owner mismatch')
          await assertPurchaseWithoutPaidReview(req, snapshot, transactionsSlug)
          const active = await req.payload.find({ collection: transactionsSlug as CollectionSlug, req, overrideAccess: true,
            depth: 0, limit: 1, where: { and: [{ cart: { equals: snapshot.cartID } }, { status: { in: ['pending', 'processing', 'succeeded'] } }] } })
          if (active.docs.length) throw new Error('Cart already has an unresolved payment attempt')
          const id = randomUUID()
          const paymentID = paymentIdFromOrderId(id)
          // The payment ID derives from this id, so the row must keep it (explicit opt-in).
          // MEMBER (S0c #52): the member's own attempt, created through commerceAttemptCreate.
          await req.payload.create({ collection: transactionsSlug as CollectionSlug, req, overrideAccess: false, depth: 0, context: serverChosenIDContext(id),
            data: { id, customer: snapshot.customerID, customerEmail: z.email().parse(req.user!.email), cart: snapshot.cartID,
              amount: snapshot.totalAmount, currency: snapshot.currency, status: 'pending', paymentMethod: 'portone',
              items: [{ product: snapshot.productID, quantity: snapshot.quantity, ...(variant ? { variant: variant.variantID } : {}) }], portone: { paymentID, prepareKey,
                snapshot, snapshotHash: commerceSnapshotHash(snapshot), storeID: config.storeId, channelKey: config.channelKey } } as never })
          await reservePurchase({ req, attemptID: id, customerID: snapshot.customerID, releaseID: snapshot.releaseID,
            productID: snapshot.productID, eventID: snapshot.eventID, quantity: snapshot.quantity,
            accountLimit: snapshot.version === 2 ? snapshot.maximumQuantity : snapshot.accountLimit,
            ...(snapshot.version === 3 ? { ticketTarget: snapshot.ticketTarget } : snapshot.version === 2 ? { memberTicketTarget: snapshot.memberTicketTarget } : {}),
            snapshotHash: commerceSnapshotHash(snapshot), ...variant })
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
      const snapshot = row.portone.snapshot
      if (!req.user || req.user.collection !== 'users' || String(req.user.id) !== snapshot.customerID || transactionID !== row.id || data.cartID !== snapshot.cartID
        || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey
        || row.commerceReviewHold || row.commerceResolutionConflict || !['pending', 'succeeded'].includes(row.status)) throw new Error('Payment confirmation rejected')
      if (await readSettlementProof(req, row.portone.paymentID, deps) !== 'provider-paid') {
        throw new Error('Payment not confirmed by the provider')
      }
      // Reserve's existing-attempt path locks the same domain resources before
      // plugin inventory row writes, preventing reserve/settle lock inversion.
      // A missing initiation reservation is corruption, not a new allocation.
      await assertReconciliationFence(req)
      const reservationContext = await lockReservationContext(req, row.id)
      const locked = await readPortOneTransaction(req, row.portone.paymentID, transactionsSlug)
      if (reservationContext.reservation.state === 'released' || ['failed', 'cancelled', 'refunded'].includes(locked.status)) {
        throw new Error('Observed payment conflicts with retired reservation')
      }
      if (locked.commerceReviewHold || locked.commerceResolutionConflict || locked.portone.snapshotHash !== row.portone.snapshotHash
        || locked.portone.storeID !== config.storeId || locked.portone.channelKey !== config.channelKey
        || !['pending', 'succeeded'].includes(locked.status)) throw new Error('Payment entered review during confirmation')
      await reservePurchase({ req, attemptID: row.id, customerID: snapshot.customerID, releaseID: snapshot.releaseID,
        productID: snapshot.productID, eventID: snapshot.eventID, quantity: snapshot.quantity,
        accountLimit: snapshot.version === 2 ? snapshot.maximumQuantity : snapshot.accountLimit,
        snapshotHash: row.portone.snapshotHash, ...(snapshot.version === 2 ? { variantID: snapshot.variantID } : {}),
        ...(snapshot.version === 3 ? { ticketTarget: snapshot.ticketTarget } : snapshot.version === 2 ? { memberTicketTarget: snapshot.memberTicketTarget } : {}) })
      if (locked.status === 'pending') {
        const stock = snapshot.version === 2
          ? await req.payload.findByID({ collection: 'variants', id: snapshot.variantID, depth: 0, overrideAccess: true, req })
          : reservationContext.product
        if (snapshot.version === 2 && optionalRelationshipID(Reflect.get(stock, 'product')) !== snapshot.productID) throw new Error('Reserved SKU changed')
        if (counter(stock.inventory) < snapshot.quantity) throw new Error('Reserved inventory requires review')
      }
      await assertReconciliationFence(req)
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
