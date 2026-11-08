import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { hasLocalRequestAuthority } from '../../phone-verification/server/local-request'
import { PaymentRejected } from './server'
import type { PortOneCatalogue, PortOneConfig } from './config'

type Dependencies = {
  config: PortOneConfig | null
  catalogue: PortOneCatalogue | null
  publicationReady: () => boolean
  verifyTestChannel: () => Promise<boolean>
  eligibleOwner: (request: Request) => Promise<string | null>
  prepare: (quantity: number, ownerId: string, request: Request, attemptId: string) => Promise<unknown>
  resume?: (paymentId: string, ownerId: string, request: Request, attemptId: string) => Promise<unknown>
  complete: (paymentId: string, ownerId?: string) => Promise<unknown>
  verifyWebhook: (raw: string, headers: Record<string, string>) => Promise<unknown>
}
class HttpError extends Error {
  constructor(readonly status: number) { super('Payment request rejected.') }
}
export function paymentJson(status: number, data?: unknown): Response {
  const response = Response.json(status === 200 ? { success: true, data }
    : { success: false, error: { code: status === 503 ? 'PAYMENT_UNAVAILABLE' : 'PAYMENT_REJECTED', message: 'Payment could not be confirmed.' } },
  { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } })
  if (status === 429) response.headers.set('Retry-After', '60')
  return response
}
function failure(error: unknown, action: 'prepare' | 'resume' | 'complete' | 'webhook') {
  const status = error instanceof HttpError ? error.status : error instanceof PaymentRejected ? 409 : 503
  console.warn('PortOne request rejected.', { action, status,
    reason: error instanceof PaymentRejected ? 'payment-mismatch-or-unsupported-state'
      : error instanceof HttpError ? 'request-rejected' : 'dependency-unavailable', correlationId: randomUUID() })
  return paymentJson(status)
}
function accept(request: Request, config: PortOneConfig, browser: boolean) {
  if (request.method !== 'POST') throw new HttpError(405)
  const url = new URL(request.url)
  const origin = new URL(config.origin)
  const authority = origin.protocol === 'http:' ? hasLocalRequestAuthority(request, config.origin)
    : url.origin === config.origin && (!request.headers.has('host') || request.headers.get('host') === origin.host)
  if (!authority || url.search || request.headers.has('rsc') || (browser
    && (request.headers.get('origin') !== config.origin || request.headers.get('sec-fetch-site') === 'cross-site'))) throw new HttpError(403)
}

// Existing member HTTP body reader is private and JSON-parses before return;
// signatures require untouched UTF-8 text, so this bounded reader stays here.
async function rawBody(request: Request, limit: number): Promise<string> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpError(415)
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new HttpError(413)
  if (!request.body) throw new HttpError(400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined) }, 5000)
  try {
    while (true) {
      const part = await reader.read()
      if (timedOut) throw new HttpError(408)
      if (part.done) break
      length += part.value.byteLength
      if (length > limit) throw new HttpError(413)
      chunks.push(part.value)
    }
    if (!length) throw new HttpError(400)
    try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)) }
    catch { throw new HttpError(400) }
  } finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock() }
}
async function jsonBody(request: Request): Promise<unknown> {
  const raw = await rawBody(request, 2048)
  try { return JSON.parse(raw) } catch { throw new HttpError(400) }
}
const quantityInput = z.strictObject({ quantity: z.int().min(1).max(6), attemptId: z.uuid() })
const resumeInput = z.strictObject({ paymentId: z.uuid(), attemptId: z.uuid() })
const completionInput = z.strictObject({ paymentId: z.uuid() })
const paidWebhook = z.object({ type: z.enum(['Transaction.Paid', 'Transaction.Cancelled', 'Transaction.DisputeCreated', 'Transaction.DisputeResolved']),
  data: z.object({ paymentId: z.uuid(), storeId: z.string() }) })

export function createPortOneHandlers(deps: Dependencies) {
  // Bounded per-process abuse protection only, not a distributed payment ledger.
  // Multi-instance activation additionally requires an ingress/shared rate limit.
  const limits = new Map<string, { count: number; expires: number }>()
  function rate(key: string) {
    const now = Date.now()
    for (const [entry, value] of limits) if (value.expires <= now) limits.delete(entry)
    const old = limits.get(key)
    if (!old && limits.size >= 1024) throw new HttpError(503)
    if (old && old.count >= 10) throw new HttpError(429)
    limits.set(key, { count: (old?.count ?? 0) + 1, expires: old?.expires ?? now + 60_000 })
  }
  async function owner(request: Request) {
    const userId = await deps.eligibleOwner(request)
    if (!userId) throw new HttpError(403)
    rate(`member:${userId}`)
    return userId
  }
  return {
    async prepare(request: Request) {
      try {
        if (!deps.config || !deps.catalogue || !deps.publicationReady()) throw new HttpError(503)
        accept(request, deps.config, true)
        const ownerId = await owner(request)
        const input = quantityInput.safeParse(await jsonBody(request))
        if (!input.success || input.data.quantity > deps.catalogue.maximumQuantity) throw new HttpError(400)
        if (!await deps.verifyTestChannel()) throw new HttpError(503)
        return paymentJson(200, await deps.prepare(input.data.quantity, ownerId, request, input.data.attemptId))
      } catch (error) { return failure(error, 'prepare') }
    },
    async resume(request: Request) {
      try {
        if (!deps.config || !deps.catalogue || !deps.publicationReady() || !deps.resume) throw new HttpError(503)
        accept(request, deps.config, true)
        const ownerId = await owner(request)
        const input = resumeInput.safeParse(await jsonBody(request))
        if (!input.success) throw new HttpError(400)
        if (!await deps.verifyTestChannel()) throw new HttpError(503)
        return paymentJson(200, await deps.resume(input.data.paymentId, ownerId, request, input.data.attemptId))
      } catch (error) { return failure(error, 'resume') }
    },
    async complete(request: Request) {
      try {
        if (!deps.config) throw new HttpError(503)
        accept(request, deps.config, true)
        const ownerId = await owner(request)
        const input = completionInput.safeParse(await jsonBody(request))
        if (!input.success) throw new HttpError(400)
        return paymentJson(200, await deps.complete(input.data.paymentId, ownerId))
      } catch (error) { return failure(error, 'complete') }
    },
    async webhook(request: Request) {
      try {
        if (!deps.config) throw new HttpError(503)
        accept(request, deps.config, false)
        const headers: Record<string, string> = {}
        for (const name of ['webhook-id', 'webhook-timestamp', 'webhook-signature']) {
          const value = request.headers.get(name)
          if (!value || value.length > 2048) throw new HttpError(400)
          headers[name] = value
        }
        const raw = await rawBody(request, 16384)
        let verified: unknown
        try { verified = await deps.verifyWebhook(raw, headers) }
        catch { throw new HttpError(400) }
        const event = paidWebhook.safeParse(verified)
        if (!event.success || event.data.data.storeId !== deps.config.storeId) throw new HttpError(400)
        rate(`payment:${event.data.data.paymentId}`)
        return paymentJson(200, await deps.complete(event.data.data.paymentId))
      } catch (error) { return failure(error, 'webhook') }
    },
  }
}
