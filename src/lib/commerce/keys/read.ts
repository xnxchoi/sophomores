import type { PayloadRequest } from "payload";
import { keyStatusOf, type KeyGrantState, type KeyStatus } from "./contracts";

/**
 * Aggregate grant status, including event tickets. Never use this as a Signet or membership projection.
 * Page-facing key status for the signed-in member. The beneficiary is the verified Payload
 * principal on `req`, never a caller-supplied id. Exposes only no_key / key_pending /
 * key_issued; storage failures throw rather than reading as no_key.
 * The intents collection stays server-only (no member read rule, so no REST/GraphQL
 * exposure); this projection reads only `state`, bound to that principal.
 */
export async function readMemberGrantStatus(req: PayloadRequest): Promise<KeyStatus> {
  if (req.user?.collection !== "users" || !req.user.id) throw new Error("Member required");
  const userID = String(req.user.id);
  const found = await req.payload.find({ collection: "commerce-key-grant-intents" as never, where: { beneficiaryUser: { equals: userID } }, limit: 10, depth: 0, overrideAccess: true, req, select: { state: true } as never });
  return keyStatusOf((found.docs as unknown as { state: KeyGrantState }[]).map((doc) => doc.state));
}
