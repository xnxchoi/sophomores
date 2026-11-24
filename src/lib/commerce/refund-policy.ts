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
export type RefundPolicy =
  | { refundable: true; cutoff: "event" | "none" }
  | { refundable: false; reason: "personalised-edition" | "not-refundable-product" };

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
