import { z } from 'zod'

type Environment = Readonly<Record<string, string | undefined>>
export type PortOneConfig = Readonly<{
  origin: string
  storeId: string
  channelKey: string
  apiSecret: string
  webhookSecret: string
}>
export type ReviewedTestChannel = Readonly<{ storeId: string; channelKey: string }>
// Deliberately absent. Populate an immutable exact pair only after console TEST
// evidence and explicit owner approval. Env mode/key strings are not proof, and
// the public V2 API/SDK currently offers no pre-charge channel metadata lookup.
export const reviewedTestChannel: ReviewedTestChannel | null = null

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
    if (env.PORTONE_PAYMENT_MODE !== 'sandbox' || env.PORTONE_TICKET_CATALOGUE_JSON.length > 2048) throw new Error()
    return Object.freeze(catalogueSchema.parse(JSON.parse(env.PORTONE_TICKET_CATALOGUE_JSON)))
  } catch { throw new Error('PortOne catalogue unavailable.') }
}

export function loadPortOneConfig(env: Environment = process.env): PortOneConfig | null {
  if (!env.PORTONE_PAYMENT_MODE || env.PORTONE_PAYMENT_MODE === 'disabled') return null
  try {
    if (env.PORTONE_PAYMENT_MODE !== 'sandbox') throw new Error()
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
    return Object.freeze({ origin: origin.origin, ...values })
  } catch { throw new Error('PortOne configuration unavailable.') }
}
