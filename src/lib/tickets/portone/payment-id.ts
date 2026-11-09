import { z } from 'zod'

// KPN requires alphanumeric IDs. Keep this encoding feature-private: uuid 14's
// parse/stringify work with bytes/canonical hyphenated UUIDs, not hex32 IDs;
// Zod owns UUID validity and native string operations only change representation.
const orderId = z.uuid()
const hexPaymentId = z.string().regex(/^[0-9a-f]{32}$/)
const decode = (value: string) => `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
export const providerPaymentId = hexPaymentId.refine(value => orderId.safeParse(decode(value)).success)
export function paymentIdFromOrderId(value: string): string {
  return orderId.parse(value).replaceAll('-', '').toLowerCase()
}
export function orderIdFromPaymentId(value: string): string {
  return orderId.parse(decode(providerPaymentId.parse(value)))
}
