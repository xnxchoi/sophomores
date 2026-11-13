import type { CommerceSnapshot } from '../contracts'
import type { ConfirmTransportObservation } from './confirm-transport'

export type LocalPaymentResult =
  | { outcome: 'confirmed'; transactionID: string; paymentID: string; cartID: string; orderID: string;
      snapshot: CommerceSnapshot; assurance: 'local-consistency' }
  | { outcome: 'review-required'; orderID?: string }
  | { outcome: 'local-terminal'; status: 'failed' | 'cancelled' | 'refunded' }
  | { outcome: 'unavailable' | 'local-unresolved' | 'integrity-stop' | 'completion-unknown'
      | 'authentication-required' | 'rate-stop' | 'authority-stop' | 'invalid-request' }

/** Policy observations, not UI copy, provider aliases or scheduling eligibility. */
export type PaymentObservation =
  | { kind: 'provider-paid' | 'verified-failure' | 'provider-ready' | 'provider-not-found' | 'provider-not-found-generic'
      | 'local-unresolved' | 'unavailable' | 'review-required' | 'integrity-stop'
      | 'authentication-required' | 'authority-stop' | 'configuration-stop'
      | 'rate-stop' | 'budget-stop' | 'completion-unknown' }
  | { kind: 'provider-unsupported'; status: string }

export type PaymentObservationProjection = { automatic: 'stopped' } & (
  | { outcome: Exclude<PaymentObservation['kind'], 'provider-unsupported'> | 'local-read-required' | 'stale' }
  | { outcome: 'provider-unsupported'; status: string }
  | { outcome: 'transport-unknown'; phase: 'headers' | 'body' }
  | { outcome: 'receipt-integrity'; reason: 'json' | 'schema' | 'identity' | 'status' }
)

/** No approved I2 eligibility policy exists: nothing here authorizes a retry. */
export function projectPaymentObservation(observation: PaymentObservation | ConfirmTransportObservation): PaymentObservationProjection {
  if (observation.kind === 'confirmation-receipt') return { outcome: 'local-read-required' as const, automatic: 'stopped' as const }
  if (observation.kind === 'transport-unknown') return { outcome: observation.kind, phase: observation.phase, automatic: 'stopped' as const }
  if (observation.kind === 'receipt-integrity') return { outcome: observation.kind, reason: observation.reason, automatic: 'stopped' as const }
  return observation.kind === 'provider-unsupported'
    ? { outcome: observation.kind, status: observation.status, automatic: 'stopped' as const }
    : { outcome: observation.kind, automatic: 'stopped' as const }
}
