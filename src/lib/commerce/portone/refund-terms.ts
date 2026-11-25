import type { PayloadRequest } from 'payload'
import { refundPolicy, refundTerms, type RefundTerms } from '../refund-policy'

/**
 * The refund terms a purchase is under right now, from its own snapshot (owner, 25 Nov: told before the sale; Review-B
 * r3: fresh at Pay and Resume). Only an event-cutoff policy reads the event, and only its Part I start; an unreadable
 * event gives "closed", as staff refunds decide. `starts` shares one read per event across a batch.
 * SERVER: overrideAccess reads one date field of the event the snapshot names; nothing else leaves.
 */
export async function currentRefundTerms(req: PayloadRequest, snapshot: unknown, now = Date.now(),
  starts = new Map<string, Promise<unknown>>()): Promise<RefundTerms> {
  const policy = refundPolicy(snapshot)
  if (!policy.refundable || policy.cutoff === 'none') return refundTerms(policy, null, now)
  const eventID = String((snapshot as { eventID?: unknown }).eventID)
  if (!starts.has(eventID)) starts.set(eventID, req.payload.findByID({ collection: 'commerce-events', id: eventID, depth: 0,
    overrideAccess: true, select: { partIStartsAt: true }, req }).then((event) => (event as { partIStartsAt?: unknown }).partIStartsAt, () => null))
  return refundTerms(policy, await starts.get(eventID), now)
}

/** Same terms, field by field: what the customer saw is still what applies. */
export function sameRefundTerms(a: RefundTerms | undefined, b: RefundTerms): boolean {
  const flat = (terms: RefundTerms) => [terms.kind, 'cutoffAt' in terms ? terms.cutoffAt : null, 'reason' in terms ? terms.reason : null].join('|')
  return a !== undefined && flat(a) === flat(b)
}
