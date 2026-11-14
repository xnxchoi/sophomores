import { z } from 'zod'

type Environment = Readonly<Record<string, string | undefined>>
export type PaymentMode = 'test' | 'live'
export type PortOneConfig = Readonly<{
  mode: PaymentMode
  origin: string
  storeId: string
  channelKey: string
  apiSecret: string
  webhookSecret: string
  localKpnTestCheckout: boolean
}>
export type ReviewedTestChannel = Readonly<{ storeId: string; channelKey: string }>
// Console-reviewed 2026-11-09: owner-created KPN V2 TEST channel. Approval is
// code-only, not local activation or publication. This public identity is not a secret.
export const reviewedTestChannel: ReviewedTestChannel | null = Object.freeze({
  storeId: 'store-cb510f04-39fc-487a-ab60-3bba06344687',
  channelKey: 'channel-key-23c1cd59-1efd-42b7-b3ec-192f1c7bd221',
})

/** Unset/`disabled` is off; the legacy `sandbox` value means `test`. Unknown values throw. */
export function loadPaymentMode(env: Environment = process.env): PaymentMode | null {
  const value = env.PORTONE_PAYMENT_MODE
  if (!value || value === 'disabled') return null
  if (value === 'sandbox' || value === 'test') return 'test'
  if (value === 'live') return 'live'
  throw new Error('PortOne configuration unavailable.')
}

const catalogueSchema = z.strictObject({
  orderName: z.string().trim().min(1).max(100),
  unitAmount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.enum(['KRW', 'USD']),
  // Existing Orders storage supports at most six tickets, not a new sales policy.
  maximumQuantity: z.int().min(1).max(6),
  saleStartsAt: z.iso.datetime(),
  saleEndsAt: z.iso.datetime(),
}).refine((value) => Date.parse(value.saleStartsAt) < Date.parse(value.saleEndsAt))
export type PortOneCatalogue = Readonly<z.infer<typeof catalogueSchema>>

/** Server operator input only. No synthetic/default price or live activation. */
export function loadPortOneCatalogue(env: Environment = process.env): PortOneCatalogue | null {
  if (!env.PORTONE_PAYMENT_MODE || env.PORTONE_PAYMENT_MODE === 'disabled') return null
  if (!env.PORTONE_TICKET_CATALOGUE_JSON) return null
  try {
    if (!loadPaymentMode(env) || env.PORTONE_TICKET_CATALOGUE_JSON.length > 2048) throw new Error()
    return Object.freeze(catalogueSchema.parse(JSON.parse(env.PORTONE_TICKET_CATALOGUE_JSON)))
  } catch { throw new Error('PortOne catalogue unavailable.') }
}

export function loadPortOneConfig(env: Environment = process.env): PortOneConfig | null {
  try {
    if (env.PORTONE_LOCAL_KPN_TEST !== undefined && env.PORTONE_LOCAL_KPN_TEST !== 'disabled'
      && env.PORTONE_LOCAL_KPN_TEST !== 'enabled') throw new Error()
    const localKpnTestCheckout = env.PORTONE_LOCAL_KPN_TEST === 'enabled'
    const mode = loadPaymentMode(env)
    if (!localKpnTestCheckout && !mode) return null
    // The local KPN checkout is a development-only TEST channel aid.
    if (!mode || (localKpnTestCheckout && mode !== 'test')) throw new Error()
    const origin = new URL(env.PORTONE_ORIGIN ?? '')
    if (origin.origin !== env.PORTONE_ORIGIN || origin.username || origin.password
      || (origin.protocol !== 'https:' && !(origin.protocol === 'http:'
        && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) throw new Error()
    const values = z.strictObject({
      storeId: z.string().regex(/^store-[A-Za-z0-9-]{1,100}$/),
      channelKey: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
      apiSecret: z.string().min(8).max(2048).refine((value) => value.trim() === value),
      webhookSecret: z.string().min(8).max(2048).refine((value) => {
        try { return value.trim() === value && atob(value.replace(/^whsec_/, '')).length >= 32 }
        catch { return false }
      }),
    }).parse({ storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_CHANNEL_KEY,
      apiSecret: env.PORTONE_API_SECRET, webhookSecret: env.PORTONE_WEBHOOK_SECRET })
    if (values.apiSecret === values.webhookSecret) throw new Error()
    if (localKpnTestCheckout && (env.NODE_ENV !== 'development' || origin.protocol !== 'http:'
      || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
      || !reviewedTestChannel || values.storeId !== reviewedTestChannel.storeId
      || values.channelKey !== reviewedTestChannel.channelKey)) throw new Error()
    return Object.freeze({ mode, origin: origin.origin, ...values, localKpnTestCheckout })
  } catch { throw new Error('PortOne configuration unavailable.') }
}
