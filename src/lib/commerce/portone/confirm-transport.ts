import { z } from 'zod'

const receiptSchema = z.object({ transactionID: z.uuid(), orderID: z.uuid() })
const rejectionSchema = z.object({ success: z.literal(false), error: z.object({ code: z.literal('COMMERCE_REJECTED'), message: z.string() }) })
export type ConfirmTransportObservation =
  | { kind: 'transport-unknown'; phase: 'headers' | 'body' }
  | { kind: 'receipt-integrity'; reason: 'json' | 'schema' | 'identity' | 'status' }
  | { kind: 'confirmation-receipt'; transactionID: string; orderID: string }
  | { kind: 'stale' | 'authentication-required' | 'rate-stop' | 'authority-stop' | 'completion-unknown' }

/** Consumes one official confirmation response, without dispatching retries.
 * A receipt is not canonical local settlement proof: the exact result GET must
 * validate the order before disclosure. isCurrent captures I4's generation/tuple
 * boundary; this classifier performs no navigation, persistence or UI effects.
 */
export async function readConfirmTransport(
  dispatch: () => Promise<Response>,
  expected: { transactionID: string; orderID?: string },
  isCurrent = () => true,
): Promise<ConfirmTransportObservation> {
  let response: Response
  try { response = await dispatch() }
  catch { return isCurrent() ? { kind: 'transport-unknown', phase: 'headers' } : { kind: 'stale' } }
  if (!isCurrent()) return { kind: 'stale' }
  let text: string
  // Separate body I/O from JSON parsing: response.json() conflates both failures.
  try { text = await response.text() }
  catch { return isCurrent() ? { kind: 'transport-unknown', phase: 'body' } : { kind: 'stale' } }
  if (!isCurrent()) return { kind: 'stale' }
  // Neither a gateway page nor an apparent receipt on 5xx proves completion.
  if (response.status >= 500) return { kind: 'completion-unknown' }
  let body: unknown
  try { body = JSON.parse(text) }
  catch { return { kind: 'receipt-integrity', reason: 'json' } }
  const receipt = receiptSchema.safeParse(body)
  if (!isCurrent()) return { kind: 'stale' }
  if (receipt.success) {
    if (receipt.data.transactionID !== expected.transactionID || expected.orderID && receipt.data.orderID !== expected.orderID) {
      return { kind: 'receipt-integrity', reason: 'identity' }
    }
    if (!response.ok) return { kind: 'receipt-integrity', reason: 'status' }
    return { kind: 'confirmation-receipt', ...receipt.data }
  }
  if (rejectionSchema.safeParse(body).success && !response.ok) {
    if (response.status === 401 || response.status === 403) return { kind: 'authentication-required' }
    if (response.status === 429) return { kind: 'rate-stop' }
    return { kind: 'authority-stop' }
  }
  return { kind: 'receipt-integrity', reason: 'schema' }
}
