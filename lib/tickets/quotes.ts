import { randomUUID } from 'node:crypto'
import { z } from 'zod'

// Protocol bounds limit validation work; commercial quantity rules come only
// from an explicitly injected catalogue, never the interaction-study limits.
const identifier = z.string().trim().min(1).max(128)
const catalogueSchema = z
  .strictObject({
    version: identifier,
    currency: z.string().regex(/^[A-Z]{3}$/),
    saleStartsAt: z.iso.datetime(),
    saleEndsAt: z.iso.datetime(),
    quoteTtlSeconds: z.int().positive(),
    maximumTotalQuantity: z.int().positive(),
    ticketTypes: z
      .array(
        z
          .strictObject({
            id: identifier,
            unitAmountMinor: z.int().nonnegative(),
            minimumQuantity: z.int().positive(),
            maximumQuantity: z.int().positive(),
          })
          .refine((type) => type.minimumQuantity <= type.maximumQuantity),
      )
      .min(1)
      .max(100),
  })
  .refine((value) => Date.parse(value.saleStartsAt) < Date.parse(value.saleEndsAt))
  .refine(
    (value) => new Set(value.ticketTypes.map((type) => type.id)).size === value.ticketTypes.length,
  )

const requestSchema = z
  .strictObject({
    catalogueVersion: identifier,
    items: z
      .array(
        z.strictObject({
          ticketTypeId: identifier,
          quantity: z.int().positive(),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) => new Set(value.items.map((item) => item.ticketTypeId)).size === value.items.length,
  )

export type LocalTicketCatalogue = z.infer<typeof catalogueSchema>
export type LocalTicketQuoteContext = {
  catalogue: LocalTicketCatalogue | null
  // Only an authenticated server caller supplies this; request data cannot.
  principal: { userId: string; emailVerified: boolean; phoneBound: boolean } | null
  now?: Date
}

type QuoteLine = {
  ticketTypeId: string
  quantity: number
  unitAmountMinor: number
  totalAmountMinor: number
}
type QuoteError =
  | 'quotes-unavailable'
  | 'member-required'
  | 'catalogue-unavailable'
  | 'invalid-request'
  | 'catalogue-changed'
  | 'sale-not-open'
  | 'catalogue-expired'
  | 'ticket-unavailable'
  | 'quantity-unavailable'
  | 'amount-overflow'

export type LocalTicketQuoteResult =
  | {
      success: true
      quote: {
        id: string
        ownerId: string
        catalogueVersion: string
        currency: string
        items: QuoteLine[]
        totalAmountMinor: number
        issuedAt: string
        expiresAt: string
        reservation: 'none'
        checkoutAvailable: false
      }
    }
  | { success: false; error: QuoteError }

function priceSelections(
  request: z.infer<typeof requestSchema>,
  catalogue: LocalTicketCatalogue,
):
  | { success: true; items: QuoteLine[]; totalAmountMinor: number }
  | { success: false; error: QuoteError } {
  const quantity = request.items.reduce((sum, item) => sum + BigInt(item.quantity), 0n)
  if (quantity > BigInt(catalogue.maximumTotalQuantity))
    return { success: false, error: 'quantity-unavailable' }
  const types = new Map(catalogue.ticketTypes.map((type) => [type.id, type]))
  const lines = request.items.map((item): QuoteLine | QuoteError => {
    const type = types.get(item.ticketTypeId)
    if (!type) return 'ticket-unavailable'
    if (item.quantity < type.minimumQuantity || item.quantity > type.maximumQuantity)
      return 'quantity-unavailable'
    const total = BigInt(type.unitAmountMinor) * BigInt(item.quantity)
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) return 'amount-overflow'
    return { ...item, unitAmountMinor: type.unitAmountMinor, totalAmountMinor: Number(total) }
  })
  const error = lines.find((line) => typeof line === 'string')
  if (error) return { success: false, error }
  const items = lines.filter((line): line is QuoteLine => typeof line !== 'string')
  const total = items.reduce((sum, item) => sum + BigInt(item.totalAmountMinor), 0n)
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return { success: false, error: 'amount-overflow' }
  return { success: true, items, totalAmountMinor: Number(total) }
}

/**
 * Local/test-only advisory snapshot. No persistence, hold, order, payment, or
 * redemption authority is created. A future checkout must revalidate prices,
 * eligibility, expiry and inventory against trusted server state independently.
 */
export function createLocalTicketQuote(
  input: unknown,
  context: LocalTicketQuoteContext,
): LocalTicketQuoteResult {
  if (process.env.NODE_ENV === 'production') return { success: false, error: 'quotes-unavailable' }
  const principal = context.principal
  if (
    !principal?.userId.trim() ||
    principal.emailVerified !== true ||
    principal.phoneBound !== true
  ) {
    return { success: false, error: 'member-required' }
  }
  const catalogue = catalogueSchema.safeParse(context.catalogue)
  const now = context.now ?? new Date()
  if (!catalogue.success || !Number.isFinite(now.getTime()))
    return { success: false, error: 'catalogue-unavailable' }
  const request = requestSchema.safeParse(input)
  if (!request.success) return { success: false, error: 'invalid-request' }
  if (request.data.catalogueVersion !== catalogue.data.version)
    return { success: false, error: 'catalogue-changed' }
  const endsAt = Date.parse(catalogue.data.saleEndsAt)
  if (now.getTime() < Date.parse(catalogue.data.saleStartsAt))
    return { success: false, error: 'sale-not-open' }
  if (now.getTime() >= endsAt) return { success: false, error: 'catalogue-expired' }
  const prices = priceSelections(request.data, catalogue.data)
  if (!prices.success) return prices
  const expiresAt = Math.min(endsAt, now.getTime() + catalogue.data.quoteTtlSeconds * 1000)
  return {
    success: true,
    quote: {
      id: randomUUID(),
      ownerId: principal.userId,
      catalogueVersion: catalogue.data.version,
      currency: catalogue.data.currency,
      items: prices.items,
      totalAmountMinor: prices.totalAmountMinor,
      issuedAt: now.toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      reservation: 'none',
      checkoutAvailable: false,
    },
  }
}
