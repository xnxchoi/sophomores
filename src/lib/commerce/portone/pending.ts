import { APIError, type Endpoint, type PayloadRequest, type Where } from 'payload'
import { z } from 'zod'
import { assertCommerceBrowserRead } from '../access'
import { hasUnresolvedPaidReview, loadOwnPaidReviewAttempts } from './review'
import { isClosedByVerifiedCancellation } from './accounting'
import { paymentIdFromOrderId, providerPaymentId } from '../../tickets/portone/payment-id'
import type { RefundTerms } from '../refund-policy'
import { currentRefundTerms } from './refund-terms'

const uuid = z.uuid().transform((value) => value.toLowerCase())
const relation = z.union([uuid, z.object({ id: uuid })]).transform((value) => typeof value === 'string' ? value : value.id)
const attemptSchema = z.object({ id: uuid, customer: relation, cart: relation, paymentMethod: z.literal('portone'),
  amount: z.int().positive().max(Number.MAX_SAFE_INTEGER), currency: z.literal('KRW'),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']),
  commerceReviewHold: z.boolean().nullish(),
  commerceResolutionConflict: z.boolean().nullish(),
  items: z.array(z.object({ product: relation, quantity: z.int().min(1).max(3) })).length(1),
  // The order name frozen in the attempt's own snapshot, so recovery rows can name what was being bought.
  portone: z.object({ paymentID: providerPaymentId, snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    // Loose: the refund terms read the snapshot's own product facts; the snapshot itself never leaves.
    snapshot: z.looseObject({ orderName: z.string().max(200).nullish() }).nullish() }),
})
const querySchema = z.strictObject({ productID: uuid.optional() })
const json = (status: number, data: unknown) => Response.json(data, { status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })

/** Server-owned plugin ledger discovery; no SDK request, provider I/O, snapshot or browser cache. */
export function createPendingEndpoint(authorize: (req: PayloadRequest) => Promise<string | null> = assertCommerceBrowserRead): Endpoint {
  return { path: '/pending', method: 'get', handler: async (req) => {
    try {
      if (req.method !== 'GET') throw new APIError('Request rejected', 405)
      const customerID = await authorize(req)
      if (!customerID || req.user?.collection !== 'users' || String(req.user.id) !== customerID) throw new APIError('Verified membership required', 403)
      const url = new URL(req.url ?? '')
      const entries = [...url.searchParams]
      if (url.hash || entries.some(([key], index) => entries.findIndex(([other]) => other === key) !== index)) throw new APIError('Invalid query', 400)
      const parsed = querySchema.safeParse(Object.fromEntries(entries))
      if (!parsed.success) throw new APIError('Invalid query', 400)
      // Every commerce-v1 attempt shares the account's one membership allowance, so an
      // attempt on any product can block this one. productID is accepted but never
      // narrows discovery: a blocker must always be visible.
      const where: Where = { and: [{ customer: { equals: customerID } }, { paymentMethod: { equals: 'portone' } },
        { or: [{ status: { in: ['pending', 'processing'] } }, { commerceResolutionConflict: { equals: true } }, { and: [{ commerceReviewHold: { equals: true } },
          { status: { not_in: ['failed', 'cancelled', 'refunded'] } }] }] } ] }
      // MEMBER: the signed-in account's own transactions, through its owner read rule
      // (commerceOwnerRead). Every selected and filtered field is readable by the owner.
      const found = await req.payload.find({ collection: 'transactions', req, overrideAccess: false, depth: 0,
        pagination: false, limit: 101, sort: '-createdAt', where,
        select: { id: true, customer: true, cart: true, paymentMethod: true, amount: true, currency: true,
          status: true, commerceReviewHold: true, commerceResolutionConflict: true, items: true, portone: { paymentID: true, snapshotHash: true, snapshot: true } } })
      // Never silently select one attempt or omit a hidden overflow tail.
      if (found.docs.length > 100) throw new APIError('Too many attempts require review', 503)
      // The refund terms each attempt is under now, from its frozen snapshot (owner, 25 Nov: told before the sale,
      // including before a resumed payment); one event read per event, and only the derived terms leave.
      const now = Date.now()
      const starts = new Map<string, Promise<unknown>>()
      const termsOf = (snapshot: unknown): Promise<RefundTerms> => currentRefundTerms(req, snapshot, now, starts)
      const ordinaryAttempts = []
      for (const document of found.docs) {
        const row = attemptSchema.parse(document)
        const item = row.items[0]
        const terminal = ['failed', 'cancelled', 'refunded'].includes(row.status)
        if (row.customer !== customerID
          || !row.commerceResolutionConflict && terminal
          || !row.commerceResolutionConflict && !row.commerceReviewHold && !['pending', 'processing'].includes(row.status)) continue
        if (row.portone.paymentID !== paymentIdFromOrderId(row.id)) throw new Error('Attempt identity mismatch')
        // Same gate as purchase: a terminal conflict that the latest verified full
        // cancellation already settled no longer holds the account.
        if (terminal && await isClosedByVerifiedCancellation(req, { transactionID: row.id, paymentID: row.portone.paymentID,
          customerID, cartID: row.cart, snapshotHash: row.portone.snapshotHash }, row.commerceResolutionConflict === true)) continue
        ordinaryAttempts.push({ transactionID: row.id, paymentID: row.portone.paymentID, cartID: row.cart, productID: item.product,
          quantity: item.quantity, totalAmount: row.amount, currency: row.currency, status: row.status, orderName: row.portone.snapshot?.orderName?.trim() || null,
          refundTerms: await termsOf(row.portone.snapshot), reviewHold: row.commerceReviewHold === true, resolutionConflict: row.commerceResolutionConflict === true })
      }
      const attempts = new Map(ordinaryAttempts.map(attempt => [attempt.transactionID, attempt]))
      for (const row of await loadOwnPaidReviewAttempts(req, customerID)) {
        const snapshot = row.portone.snapshot
        if (!await hasUnresolvedPaidReview(req, row)) continue
        attempts.set(row.id, { transactionID: row.id, paymentID: row.portone.paymentID, cartID: snapshot.cartID,
          productID: snapshot.productID, quantity: snapshot.quantity, totalAmount: row.amount, currency: row.currency,
          status: row.status, orderName: snapshot.orderName?.trim() || null, refundTerms: await termsOf(snapshot), reviewHold: true, resolutionConflict: row.commerceResolutionConflict })
      }
      if (attempts.size > 100) throw new APIError('Too many attempts require review', 503)
      return json(200, { attempts: [...attempts.values()] })
    } catch (error) {
      return json(error instanceof APIError ? error.status : 503,
        { message: 'Payment attempts could not be retrieved' })
    }
  } }
}
