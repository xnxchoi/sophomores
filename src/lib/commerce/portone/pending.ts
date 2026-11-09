import { APIError, type Endpoint, type PayloadRequest, type Where } from 'payload'
import { z } from 'zod'
import { assertCommerceBrowserRead } from '../access'
import { paymentIdFromOrderId, providerPaymentId } from '../../tickets/portone/payment-id'

const uuid = z.uuid().transform((value) => value.toLowerCase())
const relation = z.union([uuid, z.object({ id: uuid })]).transform((value) => typeof value === 'string' ? value : value.id)
const attemptSchema = z.object({ id: uuid, customer: relation, cart: relation, paymentMethod: z.literal('portone'),
  amount: z.int().positive().max(Number.MAX_SAFE_INTEGER), currency: z.literal('KRW'),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']),
  commerceReviewHold: z.boolean().nullish(),
  commerceResolutionConflict: z.boolean().nullish(),
  items: z.array(z.object({ product: relation, quantity: z.int().min(1).max(3) })).length(1),
  portone: z.object({ paymentID: providerPaymentId }),
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
      const query = querySchema.parse(Object.fromEntries(entries))
      const where: Where = { and: [{ customer: { equals: customerID } }, { paymentMethod: { equals: 'portone' } },
        { or: [{ status: { in: ['pending', 'processing'] } }, { commerceResolutionConflict: { equals: true } }, { and: [{ commerceReviewHold: { equals: true } },
          { status: { not_in: ['failed', 'cancelled', 'refunded'] } }] }] },
        ...(query.productID ? [{ 'items.product': { equals: query.productID } }] : [])] }
      const found = await req.payload.find({ collection: 'transactions', req, overrideAccess: true, depth: 0,
        pagination: false, limit: 101, sort: '-createdAt', where,
        select: { id: true, customer: true, cart: true, paymentMethod: true, amount: true, currency: true,
          status: true, commerceReviewHold: true, commerceResolutionConflict: true, items: true, portone: { paymentID: true } } })
      // Never silently select one attempt or omit a hidden overflow tail.
      if (found.docs.length > 100) throw new APIError('Too many attempts require review', 503)
      const attempts = found.docs.flatMap((document) => {
        const row = attemptSchema.parse(document)
        const item = row.items[0]
        if (row.customer !== customerID || query.productID && item.product !== query.productID
          || !row.commerceResolutionConflict && ['failed', 'cancelled', 'refunded'].includes(row.status)
          || !row.commerceResolutionConflict && !row.commerceReviewHold && !['pending', 'processing'].includes(row.status)) return []
        if (row.portone.paymentID !== paymentIdFromOrderId(row.id)) throw new Error('Attempt identity mismatch')
        return [{ transactionID: row.id, paymentID: row.portone.paymentID, cartID: row.cart, productID: item.product,
          quantity: item.quantity, totalAmount: row.amount, currency: row.currency, status: row.status,
          reviewHold: row.commerceReviewHold === true, resolutionConflict: row.commerceResolutionConflict === true }]
      })
      return json(200, { attempts })
    } catch (error) {
      return json(error instanceof APIError ? error.status : error instanceof z.ZodError ? 400 : 503,
        { message: 'Payment attempts could not be retrieved' })
    }
  } }
}
