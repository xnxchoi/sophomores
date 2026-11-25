/**
 * Which orders staff may refund (owner, 24 Nov, relayed by the coordinator), read from the order's frozen purchase
 * snapshot, the same record settlement grants from:
 * - Guest ticket orders (`guest-ticket-v1`): refundable until the event's cutoff.
 * - The book-only edition (no membership Signet, no launch ticket, so no event): refundable, no cutoff ("cheaper
 *   variant is not customized and subject to return").
 * - Editions that include membership: never ("it's custom-made, so it's subject to the 'No Refunds' rule").
 * - Anything else (the membership product): not refundable here.
 * Pure, so the admin button and the server decide alike; the server's check is the one that counts.
 */
import { z } from "zod";

export type RefundPolicy =
  | { refundable: true; cutoff: "event" | "none" }
  | { refundable: false; reason: "personalised-edition" | "not-refundable-product" };

/** The same rule for an edition's offer, before the sale: refundable only without membership (and its launch ticket). */
export function editionRefundable(included: Readonly<{ membershipSignet: boolean; freeLaunchTicket: boolean }>): boolean {
  return !included.membershipSignet && !included.freeLaunchTicket;
}

export function refundPolicy(snapshot: unknown): RefundPolicy {
  const recorded = (snapshot ?? {}) as { version?: unknown; kind?: unknown; eventID?: unknown; editionEntitlements?: { membershipSignet?: unknown; freeLaunchTicket?: unknown } };
  if (recorded.version === 3 && recorded.kind === "guest-ticket-v1" && typeof recorded.eventID === "string") return { refundable: true, cutoff: "event" };
  if (recorded.version === 2) {
    const included = recorded.editionEntitlements;
    const bookOnly = recorded.eventID === null && included?.membershipSignet === false && included?.freeLaunchTicket === false;
    return bookOnly ? { refundable: true, cutoff: "none" } : { refundable: false, reason: "personalised-edition" };
  }
  return { refundable: false, reason: "not-refundable-product" };
}

/**
 * Owner, 24 Nov (relayed): "Refund is only possible 3 days prior." Staff refunds close this long before the event's
 * Part I start. A cancellation made in PortOne's console after it is still reconciled (S1): it has happened.
 */
export const REFUND_CUTOFF_DAYS = 3;
const dayMs = 24 * 60 * 60 * 1000;
/** When staff refunds for an event close; null when the start time is unreadable (then refunds stay closed). */
export function refundCutoff(partIStartsAt: unknown): number | null {
  const start = new Date(String(partIStartsAt)).getTime();
  return Number.isFinite(start) ? start - REFUND_CUTOFF_DAYS * dayMs : null;
}

/**
 * What the customer is told before paying or resuming a payment (owner, 25 Nov: personalised products may refuse refunds
 * once the customer is told before the sale). Derived on the server from the same policy and cutoff staff refunds use,
 * so a page only renders it: refundable while now < cutoff, as the server decides.
 */
export const refundTermsSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("refundable") }),
  z.strictObject({ kind: z.literal("until"), cutoffAt: z.iso.datetime() }),
  z.strictObject({ kind: z.literal("closed"), cutoffAt: z.iso.datetime().nullable() }),
  z.strictObject({ kind: z.literal("none"), reason: z.enum(["personalised-edition", "not-refundable-product"]) })
]);
export type RefundTerms = z.infer<typeof refundTermsSchema>;

export function refundTerms(policy: RefundPolicy, partIStartsAt: unknown, now = Date.now()): RefundTerms {
  if (!policy.refundable) return { kind: "none", reason: policy.reason };
  if (policy.cutoff === "none") return { kind: "refundable" };
  const cutoff = refundCutoff(partIStartsAt);
  if (cutoff === null) return { kind: "closed", cutoffAt: null };
  return now < cutoff ? { kind: "until", cutoffAt: new Date(cutoff).toISOString() } : { kind: "closed", cutoffAt: new Date(cutoff).toISOString() };
}

/** An edition offer's terms, before any order exists. */
export function editionRefundTerms(included: Readonly<{ membershipSignet: boolean; freeLaunchTicket: boolean }>): RefundTerms {
  return editionRefundable(included) ? { kind: "refundable" } : { kind: "none", reason: "personalised-edition" };
}
