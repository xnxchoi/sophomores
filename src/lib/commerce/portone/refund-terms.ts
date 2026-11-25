import type { PayloadRequest } from 'payload'
import { refundPolicy, refundTerms, type RefundTerms } from '../refund-policy'

/**
 * The refund terms a purchase is under right now, from its own snapshot (owner, 25 Nov: told before the sale; Review-B
 * r3: fresh at Pay and Resume). Only an event-cutoff policy reads the event, and only its Part I start; an unreadable
 * event gives "closed", as staff refunds decide. `starts` shares one read per event across a batch.
 * SERVER: overrideAccess reads one date field of the event the snapshot names; nothing else leaves.
 */
export async function currentRefundTerms(req: PayloadRequest, snapshot: unknown, now?: number,
  starts = new Map<string, Promise<unknown>>()): Promise<RefundTerms> {
  const policy = refundPolicy(snapshot)
  if (!policy.refundable || policy.cutoff === 'none') return refundTerms(policy, null, now ?? Date.now())
  const eventID = String((snapshot as { eventID?: unknown }).eventID)
  if (!starts.has(eventID)) starts.set(eventID, req.payload.findByID({ collection: 'commerce-events', id: eventID, depth: 0,
    overrideAccess: true, select: { partIStartsAt: true }, req }).then((event) => (event as { partIStartsAt?: unknown }).partIStartsAt, () => null))
  const start = await starts.get(eventID)
  // Without a given time, the clock is read after the event, so a cutoff crossed during the read counts (Review-B r4).
  return refundTerms(policy, start, now ?? Date.now())
}

export { sameRefundTerms } from '../refund-policy'

/**
 * A guest Pay whose terms changed under the event lock throws, so the whole preparation rolls back; the official
 * initiate handler turns any throw into a 500. The adapter notes the new terms against the request here, and the
 * endpoint wrapper answers with them once the rollback is done (ecommerce.ts secureCommerceEndpoint).
 */
const changedTerms = new WeakMap<PayloadRequest, RefundTerms>()
export const noteRefundTermsChange = (req: PayloadRequest, terms: RefundTerms) => { changedTerms.set(req, terms) }
export function takeRefundTermsChange(req: PayloadRequest): RefundTerms | undefined {
  const terms = changedTerms.get(req)
  changedTerms.delete(req)
  return terms
}
