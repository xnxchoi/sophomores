import type { PayloadRequest } from "payload";

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
