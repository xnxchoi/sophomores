import { z } from 'zod'
import { providerPaymentId } from '../../tickets/portone/payment-id'
import type { PaymentObservation } from './outcome'

const amount = z.int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const identity = z.string().trim().min(1).max(128)
const riskPaymentSchema = z.object({
  id: providerPaymentId, storeId: identity, status: z.enum(['PAID', 'CANCELLED', 'PARTIAL_CANCELLED']),
  channel: z.object({ key: identity, type: z.literal('TEST') }),
  customer: z.object({ id: identity }), currency: z.literal('KRW'),
  amount: z.object({ total: amount.positive(), paid: amount, cancelled: amount }),
  // Retained proof records only absence/emptiness/risk, never dispute payloads.
  disputes: z.unknown().optional().transform((value) => value === undefined ? undefined
    : Array.isArray(value) && value.length === 0 ? [] : [true]),
})
const paymentSchema = riskPaymentSchema.extend({ status: z.literal('PAID'),
  amount: z.object({ total: amount.positive(), paid: amount.positive(), cancelled: z.literal(0) }),
  disputes: z.array(z.unknown()).length(0) })
type ExpectedPayment = { paymentID: string; customerID: string; storeID: string; channelKey: string; totalAmount: number; currency: 'KRW' }

/** Zod's nested object projection strips cards, custom data and all extra fields. */
export const minimalPaymentRiskProof = (value: unknown) => riskPaymentSchema.parse(value)

/** Provider evidence only; browser redirect and signed event bodies are not payment proof. */
export function validatePaidPayment(value: unknown, expected: ExpectedPayment): void {
  const payment = paymentSchema.parse(value)
  if (payment.id !== expected.paymentID || payment.storeId !== expected.storeID
    || payment.channel.key !== expected.channelKey || payment.customer.id !== expected.customerID
    || payment.amount.total !== expected.totalAmount || payment.amount.paid !== expected.totalAmount
    || payment.currency !== expected.currency) throw new Error('Payment could not be confirmed')
}

/** Only exact provider identity/total proof may cause any local quarantine write. */
export function classifyPaymentRisk(value: unknown, expected: ExpectedPayment): 'clear' | 'hold' | 'full-cancel' {
  const payment = minimalPaymentRiskProof(value)
  if (payment.id !== expected.paymentID || payment.storeId !== expected.storeID
    || payment.channel.key !== expected.channelKey || payment.customer.id !== expected.customerID
    || payment.amount.total !== expected.totalAmount || payment.currency !== expected.currency) throw new Error('Payment identity mismatch')
  const noDisputes = Array.isArray(payment.disputes) && payment.disputes.length === 0
  if (payment.status === 'CANCELLED' && payment.amount.cancelled === expected.totalAmount && payment.amount.paid <= expected.totalAmount
    && (payment.disputes === undefined || noDisputes)) return 'full-cancel'
  if (payment.status === 'PAID' && payment.amount.paid === expected.totalAmount && payment.amount.cancelled === 0 && noDisputes) return 'clear'
  return 'hold'
}

const observationSchema = riskPaymentSchema.extend({ status: z.string().min(1).max(80) })
const missingSchema = z.strictObject({ type: z.literal('PAYMENT_NOT_FOUND') })

/** Exact authoritative GET evidence only, never redirects, HTTP status or events.
 * Does not settle, retire, clear a hold or grant eligibility. The stricter TEST
 * channel/identity contract deliberately rejects incomplete FAILED evidence.
 */
export function classifyReconciliationPayment(value: unknown, expected: ExpectedPayment,
  local: 'unresolved' | 'succeeded' | 'terminal' | 'held'): PaymentObservation {
  if (missingSchema.safeParse(value).success) return { kind: local === 'unresolved' ? 'provider-not-found' : 'review-required' }
  const parsed = observationSchema.safeParse(value)
  if (!parsed.success) return { kind: 'integrity-stop' }
  const payment = parsed.data
  if (payment.id !== expected.paymentID || payment.storeId !== expected.storeID
    || payment.channel.key !== expected.channelKey || payment.customer.id !== expected.customerID
    || payment.amount.total !== expected.totalAmount || payment.currency !== expected.currency) return { kind: 'integrity-stop' }
  if (local === 'held' || local === 'terminal' || payment.status === 'CANCELLED' || payment.status === 'PARTIAL_CANCELLED'
    || payment.amount.cancelled > 0 || payment.disputes?.length) return { kind: 'review-required' }
  if (payment.status === 'PAID') {
    try { validatePaidPayment(value, expected); return { kind: 'provider-paid' } }
    catch { return { kind: 'integrity-stop' } }
  }
  if (payment.status === 'FAILED') {
    if (local === 'succeeded') return { kind: 'review-required' }
    return { kind: payment.amount.paid === 0 ? 'verified-failure' : 'integrity-stop' }
  }
  if (local === 'succeeded') return { kind: 'review-required' }
  if (payment.status === 'READY') return { kind: 'provider-ready' }
  return { kind: 'provider-unsupported', status: payment.status }
}
