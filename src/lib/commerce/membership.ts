import { APIError, type Payload, type PayloadRequest } from "payload";

// Owner decision 2026-11-14: a settled payment grants the buyer's membership.
// staff, suspended and approved accounts are never changed.
const grantable = new Set(["applicant", "invited", "waitlist"]);

/**
 * Runs on the settling req, inside the same transaction as the order, so a
 * rollback undoes it. Idempotent: an approved account is not written again.
 */
export async function grantMembershipOnPayment(req: PayloadRequest, customerID: string): Promise<void> {
  const user = await req.payload.findByID({ collection: "users", id: customerID, req, overrideAccess: true, depth: 0 });
  if (!grantable.has(String(user.membershipStatus ?? "applicant"))) return;
  await req.payload.update({ collection: "users", id: customerID, req, overrideAccess: true, depth: 0,
    data: { membershipStatus: "approved" } });
}

/** Checkout's verified-account proof is not evidence of paid membership. */
export async function hasGuestSponsorMembership(payload: Payload, customerID: string, req?: PayloadRequest): Promise<boolean> {
  // System read of the canonical membership status for the already authenticated buyer only.
  const member = await payload.findByID({ collection: "users", id: customerID, req,
    overrideAccess: true, disableErrors: true, depth: 0, select: { membershipStatus: true } });
  return member?.membershipStatus === "approved";
}

export async function assertGuestSponsorMembership(req: PayloadRequest, customerID: string): Promise<void> {
  if (req.user?.collection !== "users" || String(req.user.id) !== customerID ||
    !await hasGuestSponsorMembership(req.payload, customerID, req)) {
    throw new APIError("Guest Tickets require approved membership", 403, undefined, true);
  }
}
