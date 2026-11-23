import { createHash } from "node:crypto";

/**
 * The one occupancy key per event and attending account (the claimant, or the buyer for
 * their own unit). Admissions carry it while occupied; revocation clears it. Shared by
 * commerce admissions and music eligibility, so it has no runtime imports.
 */
export function eventAccountKey(eventID: string, accountID: string): string {
  return createHash("sha256").update(JSON.stringify([eventID, accountID])).digest("hex");
}
