import { Webhook } from '@portone/server-sdk'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getPayloadMemberRuntime } from '../../member-auth/payload-runtime'
import { loadPortOneCatalogue, loadPortOneConfig, reviewedTestChannel, type PortOneConfig } from './config'
import { commerceDisclosure, publishedCommerceDisclosureSchema } from '../../commerce/disclosures'
import { createPortOneHandlers, paymentJson } from './http'
import { preparePayment, reconcilePayment, resumePayment } from './server'

// Installed SDK 0.19.0 does not expose AbortSignal. Keep this feature-private
// native transport separate for provider-free HTTP-status classification tests.
export async function getResumePayment(config: PortOneConfig, input: { paymentId: string; storeId: string }) {
  const url = new URL(`https://api.portone.io/payments/${encodeURIComponent(input.paymentId)}`)
  url.searchParams.set('storeId', input.storeId)
  const response = await fetch(url, { method: 'GET', headers: { Authorization: `PortOne ${config.apiSecret}` },
    signal: AbortSignal.timeout(5000), redirect: 'error', cache: 'no-store' })
  const body: unknown = await response.json()
  if (response.status === 404 && z.object({ type: z.literal('PAYMENT_NOT_FOUND') }).safeParse(body).success) return { type: 'PAYMENT_NOT_FOUND' as const }
  if (!response.ok || !z.object({ status: z.string() }).safeParse(body).success
    || z.object({ type: z.literal('PAYMENT_NOT_FOUND') }).safeParse(body).success) throw new Error('Payment provider unavailable.')
  return body
}

let current: ReturnType<typeof createPortOneHandlers> | undefined
function handlers() {
  if (current) return current
  const config = loadPortOneConfig()
  const catalogue = loadPortOneCatalogue()
  const member = config ? getPayloadMemberRuntime() : null
  // Current canonical runtime is intentionally local-only. Do not bypass its
  // unavailable email/phone gate to make a production payment demo appear live.
  if (!config || !member || member.config.origin !== config.origin) return null
  const payload = async () => (await import('../../payload')).getPayload()
  current = createPortOneHandlers({ config, catalogue,
    publicationReady: () => publishedCommerceDisclosureSchema.safeParse(commerceDisclosure).success,
    verifyTestChannel: async () => reviewedTestChannel !== null
      && reviewedTestChannel.storeId === config.storeId && reviewedTestChannel.channelKey === config.channelKey,
    eligibleOwner: async (request) => {
      const principal = await member.toMemberPrincipal(request)
      if (!principal?.emailVerified || !await member.repository.isActiveMember(principal.userId)) return null
      return principal.userId
    },
    prepare: async (quantity, ownerId, request, attemptId) => {
      if (!catalogue) throw new Error('Payment unavailable.')
      const principal = await member.toMemberPrincipal(request)
      const email = z.email().safeParse(principal?.email)
      if (principal?.userId !== ownerId || !principal.emailVerified || !email.success) throw new Error('Payment unavailable.')
      const fullName = z.string().trim().min(1).max(100).safeParse(principal.name)
      return preparePayment({ payload: await payload(), config, catalogue, quantity, ownerId, attemptId,
        customer: { email: email.data, ...(fullName.success ? { fullName: fullName.data } : {}) } })
    },
    resume: async (paymentId, ownerId, request, attemptId) => {
      if (!catalogue) throw new Error('Payment unavailable.')
      const principal = await member.toMemberPrincipal(request)
      const email = z.email().safeParse(principal?.email)
      if (principal?.userId !== ownerId || !principal.emailVerified || !email.success) throw new Error('Payment unavailable.')
      const fullName = z.string().trim().min(1).max(100).safeParse(principal.name)
      return resumePayment({ payload: await payload(), config, catalogue, paymentId, ownerId, attemptId,
        customer: { email: email.data, ...(fullName.success ? { fullName: fullName.data } : {}) },
        getPayment: (input) => getResumePayment(config, input) })
    },
    complete: async (paymentId, ownerId) => reconcilePayment({ payload: await payload(), config,
      paymentId, ownerId, getPayment: async (input) => {
        // SDK 0.19.0 cannot accept AbortSignal/transport options. Official REST
        // uses the same authenticated GET; native fetch supplies its missing
        // deadline without wrapping/patching the SDK or a global transport.
        const url = new URL(`https://api.portone.io/payments/${encodeURIComponent(input.paymentId)}`)
        url.searchParams.set('storeId', input.storeId)
        const response = await fetch(url, { method: 'GET',
          headers: { Authorization: `PortOne ${config.apiSecret}` },
          signal: AbortSignal.timeout(5000), redirect: 'error', cache: 'no-store' })
        if (!response.ok) throw new Error('Payment provider unavailable.')
        return response.json()
      } }),
    verifyWebhook: (raw, headers) => Webhook.verify(config.webhookSecret, raw, headers),
  })
  return current
}

export async function portOneRequest(action: 'prepare' | 'resume' | 'complete' | 'webhook', request: Request) {
  try { return await handlers()?.[action](request) ?? paymentJson(503) }
  catch {
    console.warn('PortOne request unavailable.', { action, reason: 'runtime-unavailable', correlationId: randomUUID() })
    return paymentJson(503)
  }
}
