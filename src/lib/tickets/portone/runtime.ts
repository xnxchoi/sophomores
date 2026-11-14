import { z } from 'zod'
import type { PortOneConfig } from './config'

export class CompletedProviderResponse extends Error {
  constructor() { super('Completed provider response rejected') }
}

// Installed SDK 0.19.0 does not expose AbortSignal. Keep this feature-private
// native transport separate for provider-free HTTP-status classification tests.
export async function getResumePayment(config: PortOneConfig, input: { paymentId: string; storeId: string }) {
  const url = new URL(`https://api.portone.io/payments/${encodeURIComponent(input.paymentId)}`)
  url.searchParams.set('storeId', input.storeId)
  const response = await fetch(url, { method: 'GET', headers: { Authorization: `PortOne ${config.apiSecret}` },
    signal: AbortSignal.timeout(5000), redirect: 'error', cache: 'no-store' })
  const text = await response.text()
  let body: unknown
  try { body = JSON.parse(text) } catch { throw new CompletedProviderResponse() }
  if (response.status === 404 && z.object({ type: z.literal('PAYMENT_NOT_FOUND') }).safeParse(body).success) return { type: 'PAYMENT_NOT_FOUND' as const }
  if (!response.ok || !z.object({ status: z.string() }).safeParse(body).success
    || z.object({ type: z.literal('PAYMENT_NOT_FOUND') }).safeParse(body).success) throw new CompletedProviderResponse()
  return body
}


/** Retired legacy ingress. Payment endpoints belong exclusively to Payload commerce. */
export async function portOneRequest(_action: 'prepare' | 'resume' | 'complete' | 'webhook', _request: Request) {
  return Response.json({ success: false, message: 'Legacy payment endpoint retired.' }, { status: 410,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
}
