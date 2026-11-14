import type { PayloadRequest } from "payload";
import { keyStatusOf, type KeyGrantState, type KeyStatus } from "./contracts";

/**
 * Page-facing key status for one signed-in member (the caller has already
 * authenticated `userID`). Exposes only no_key / key_pending / key_issued;
 * storage failures throw rather than reading as no_key.
 */
export async function readMemberKeyStatus(req: PayloadRequest, userID: string): Promise<KeyStatus> {
  if (!userID) throw new Error("Member required");
  const found = await req.payload.find({ collection: "commerce-key-grant-intents" as never, where: { beneficiaryUser: { equals: userID } }, limit: 10, depth: 0, overrideAccess: true, req, select: { state: true } as never });
  return keyStatusOf((found.docs as unknown as { state: KeyGrantState }[]).map((doc) => doc.state));
}
