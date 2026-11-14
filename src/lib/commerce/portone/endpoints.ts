import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { assertCommerceBrowserMutation } from '../access'
import { hasLocalRequestAuthority } from '../../phone-verification/server/local-request'
import { providerPaymentId } from '../../tickets/portone/payment-id'
import { adapterConfig, paymentRequest, providerPayment, readPortOneTransaction, type AdapterDependencies } from './adapter'
import { assertPaymentRiskReviewed, retireFailedPayment } from './review'
import { createPendingEndpoint } from './pending'
import { createResultEndpoint } from './result'
import { runReconciliation } from './admission'
import { withSignedRiskEvidence } from './accounting'
import { channelType } from './proof'

const verifiedWebhooks = new WeakMap<PayloadRequest, { id: string; type: string }>()
/** A capability held for one verified native request dispatch, never req.context/body. */
export const isVerifiedCommerceWebhook = (req: PayloadRequest): boolean => verifiedWebhooks.has(req)
export const verifiedCommerceEvent = (req: PayloadRequest) => verifiedWebhooks.get(req)
const resumeSchema = z.strictObject({ transactionID: z.uuid(), paymentID: providerPaymentId, cartID: z.string().optional() })
const webhookSchema = z.object({ type: z.enum(['Transaction.Paid', 'Transaction.Cancelled', 'Transaction.PartialCancelled', 'Transaction.DisputeCreated', 'Transaction.DisputeResolved']),
  data: z.object({ paymentId: providerPaymentId, storeId: z.string() }) })

// Existing legacy signed-body reader is private. Streaming is necessary here:
// neither Payload's generic parser nor req.json preserves bounded signed bytes.
async function boundedText(req: PayloadRequest, limit: number): Promise<string> {
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json' || !req.body) throw new Error('Invalid body')
  const declared = req.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('Invalid body size')
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined) }, 5000)
  try {
    while (true) {
      const part = await reader.read()
      if (timedOut) throw new Error('Body deadline exceeded')
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > limit) throw new Error('Body too large')
      chunks.push(part.value)
    }
    if (!bytes) throw new Error('Missing body')
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
  } finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock() }
}

const response = (status: number, data: unknown) => Response.json(data, { status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
const unavailable = () => response(409, { message: 'Payment could not be confirmed' })

export function createAdapterEndpoints(deps: AdapterDependencies): Endpoint[] {
  // Signed retries are idempotent via plugin settlement, not this bounded local
  // abuse limiter. Public ingress/distributed limiting remains an activation gate.
  const rates = new Map<string, { count: number; expires: number }>()
  return [createPendingEndpoint(), createResultEndpoint(), { path: '/retire', method: 'post', handler: async (req) => {
    try {
      await assertCommerceBrowserMutation(req)
      const input = resumeSchema.parse(req.data ?? JSON.parse(await boundedText(req, 2048)))
      const row = await readPortOneTransaction(req, input.paymentID)
      if (input.cartID && input.cartID !== row.portone.snapshot.cartID) throw new Error('Attempt mismatch')
      return await runReconciliation(req, input, 'retire', async () => {
        await retireFailedPayment(req, input, deps)
        return response(200, { outcome: 'retired', transactionID: row.id, paymentID: input.paymentID })
      }, deps)
    } catch { return unavailable() }
  } }, { path: '/resume', method: 'post', handler: async (req) => {
    try {
      await assertCommerceBrowserMutation(req)
      const config = adapterConfig(deps)
      const input = resumeSchema.parse(req.data ?? JSON.parse(await boundedText(req, 2048)))
      const row = await readPortOneTransaction(req, input.paymentID)
      if (row.id !== input.transactionID || row.portone.snapshot.customerID !== String(req.user?.id)
        || input.cartID && input.cartID !== row.portone.snapshot.cartID
        || row.portone.storeID !== config.storeId || row.portone.channelKey !== config.channelKey) throw new Error('Attempt mismatch')
      const statusOnly = () => response(200, { message: 'Payment status only', outcome: 'status-only',
        transactionID: row.id, paymentID: input.paymentID, status: row.status })
      if (row.status !== 'pending' || row.commerceReviewHold) return statusOnly()
      return await runReconciliation(req, input, 'resume', async () => {
      const evidence = await providerPayment(deps, input.paymentID, req)
      const current = await readPortOneTransaction(req, input.paymentID)
      if (current.status !== 'pending' || current.commerceReviewHold || current.portone.snapshotHash !== row.portone.snapshotHash) return statusOnly()
      const missing = z.strictObject({ type: z.literal('PAYMENT_NOT_FOUND') }).safeParse(evidence).success
      if (!missing) {
        const failed = z.object({ id: providerPaymentId, status: z.literal('FAILED'), storeId: z.string(),
          channel: z.object({ key: z.string(), type: z.literal(channelType(config.mode)) }), customer: z.object({ id: z.string() }),
          currency: z.literal('KRW'), amount: z.object({ total: z.int().positive(), paid: z.literal(0), cancelled: z.literal(0) }),
          disputes: z.array(z.unknown()).length(0).optional() }).safeParse(evidence)
        if (!failed.success) return statusOnly() // READY/PENDING/unknown never reopen the SDK.
        const payment = failed.data
        if (payment.id !== input.paymentID || payment.storeId !== config.storeId || payment.channel.key !== config.channelKey
          || payment.customer.id !== row.portone.snapshot.customerID || payment.amount.total !== row.amount) throw new Error('Provider mismatch')
        return response(200, { message: 'Failed payment may be retired', outcome: 'retirable', transactionID: row.id,
          paymentID: input.paymentID, status: 'failed' })
      }
      return response(200, { message: 'Same payment may be resumed', outcome: 'resumable', transactionID: row.id,
        paymentID: input.paymentID, paymentRequest: paymentRequest(config, row, { email: req.user!.email, name: req.user!.name }) })
      }, deps)
    } catch { return unavailable() }
  } }, { path: '/webhooks', method: 'post', handler: async (req) => {
    try {
      const config = adapterConfig(deps)
      const url = new URL(req.url ?? '')
      const authority = config.origin.startsWith('http:') ? hasLocalRequestAuthority(req as Request, config.origin)
        : url.origin === config.origin && (!req.headers.has('host') || req.headers.get('host') === new URL(config.origin).host)
      if (!authority || url.search || req.headers.has('rsc')) throw new Error('Request rejected')
      const headers: Record<string, string> = {}
      for (const name of ['webhook-id', 'webhook-timestamp', 'webhook-signature']) {
        const value = req.headers.get(name)
        if (!value || value.length > 2048) throw new Error('Signature required')
        headers[name] = value
      }
      const raw = await boundedText(req, 16384)
      const verify: NonNullable<AdapterDependencies['verifyWebhook']> = deps.verifyWebhook ?? ((body, signature) => import('@portone/server-sdk').then(({ Webhook }) => Webhook.verify(config.webhookSecret, body, signature)))
      const event = webhookSchema.parse(await verify(raw, headers))
      if (event.data.storeId !== config.storeId) throw new Error('Store mismatch')
      const now = Date.now()
      for (const [key, entry] of rates) if (entry.expires <= now) rates.delete(key)
      const previous = rates.get(event.data.paymentId)
      if ((!previous && rates.size >= 1024) || previous && previous.count >= 20) throw new Error('Please retry later')
      rates.set(event.data.paymentId, { count: (previous?.count ?? 0) + 1, expires: previous?.expires ?? now + 60000 })
      const row = await readPortOneTransaction(req, event.data.paymentId)
      const customer = await req.payload.findByID({ collection: 'users', id: row.portone.snapshot.customerID,
        overrideAccess: true, depth: 0, req })
      if (String(customer.id) !== row.portone.snapshot.customerID) throw new Error('Customer mismatch')
      const previousUser = req.user
      const previousData = req.data
      const previousText = req.text
      const data = { cartID: row.portone.snapshot.cartID, transactionID: row.id, paymentID: event.data.paymentId }
      try {
        // Keep the same native PayloadRequest and real transaction lifecycle.
        // addDataAndFileToRequest reads text again, so replay only our verified,
        // server-selected dispatch payload instead of the consumed signed body.
        req.user = { ...customer, collection: 'users' } as PayloadRequest['user']
        req.data = data
        req.text = async () => JSON.stringify(data)
        verifiedWebhooks.set(req, { id: headers['webhook-id'], type: event.type })
        const dispatch = () => runReconciliation(req, data, event.type === 'Transaction.Paid' ? 'confirm' : 'risk', async () => {
          await assertPaymentRiskReviewed(req, data, headers['webhook-id'], deps)
          if (event.type !== 'Transaction.Paid') return response(200, { outcome: 'risk-reviewed' })
          const handler = req.payload.config.endpoints?.find(endpoint => endpoint.method === 'post' && endpoint.path === '/payments/portone/confirm-order')?.handler
          if (!handler) throw new Error('Plugin confirmation unavailable')
          return handler(req)
        }, deps)
        return event.type === 'Transaction.Paid' ? await dispatch()
          : await withSignedRiskEvidence(req, { id: headers['webhook-id'], type: event.type }, dispatch)
      } finally {
        verifiedWebhooks.delete(req)
        req.user = previousUser
        req.data = previousData
        req.text = previousText
      }
    } catch { return unavailable() }
  } }]
}
