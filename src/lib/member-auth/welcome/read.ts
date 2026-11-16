import type { PayloadRequest } from "payload";
import { keyGrantHold } from "../../commerce/keys/member-wallet";
import { keyStatusOf, type KeyGrantState } from "../../commerce/keys/contracts";
import {
  relationshipID,
  type CommerceDocument
} from "../../commerce/_shared/transaction";
import type { MemberPrincipal } from "../contracts";

/**
 * The welcome page's state (ADR-0013). It needs nothing but a signed-in
 * member: the wallet and Signet already exist from payment, so there is no
 * activation step. It reports where the Signet stands and how many sign-in
 * passkeys the member has; any signed-in member may add one (no phone
 * binding needed; owner, 2026-11-16). Reading never writes. No address, key, target or credential ID
 * leaves the server.
 *
 * Bounded reads: user, intents, their payments and admissions (batched with
 * `in`) and passkeys: five queries whatever the number of intents.
 */
export type SignetStatus = "none" | "pending" | "issued" | "on_hold";
export type WelcomeView =
  | { state: "signed_out" }
  | { state: "unavailable" }
  | {
      state: "welcome";
      signet: SignetStatus;
      passkeys: number;
      /** Passkeys need a verified email; the page offers one only then. */
      emailVerified: boolean;
    };

const find = async (
  req: PayloadRequest,
  collection: string,
  where: Record<string, unknown>,
  limit = 50
): Promise<CommerceDocument[]> =>
  (
    await req.payload.find({
      collection: collection as never,
      where: where as never,
      limit,
      depth: 0,
      overrideAccess: true,
      req
    })
  ).docs as unknown as CommerceDocument[];
const byID = (rows: CommerceDocument[]) =>
  new Map(rows.map((row) => [String(row.id), row]));

async function signetOf(
  req: PayloadRequest,
  memberID: string,
  emailVerified: boolean
): Promise<SignetStatus> {
  const user = (await req.payload.findByID({
    collection: "users" as never,
    id: memberID,
    depth: 0,
    overrideAccess: true,
    req,
    disableErrors: true
  })) as unknown as CommerceDocument | null;
  if (!user || user.membershipStatus === "suspended" || !emailVerified)
    return "none";
  const intents = (
    await find(req, "commerce-key-grant-intents", {
      and: [
        { beneficiaryUser: { equals: memberID } },
        { recipientMode: { equals: "member_safe" } }
      ]
    })
  ).filter((intent) => intent.state !== "cancelled");
  if (!intents.length) return "none";
  const ids = (field: string) => [
    ...new Set(intents.map((intent) => relationshipID(intent[field])))
  ];
  const payments = byID(
    await find(req, "transactions", { id: { in: ids("payment") } })
  );
  const admissions = byID(
    await find(req, "commerce-admissions", { id: { in: ids("entitlement") } })
  );
  const paid = intents.filter(
    (intent) =>
      payments.get(relationshipID(intent.payment))?.status === "succeeded"
  );
  if (!paid.length) return "none";
  if (
    keyStatusOf(paid.map((intent) => intent.state as KeyGrantState)) ===
    "key_issued"
  )
    return "issued";
  const held = paid.filter(
    (intent) =>
      intent.state !== "granted" &&
      keyGrantHold(
        intent,
        admissions.get(relationshipID(intent.entitlement)),
        payments.get(relationshipID(intent.payment))
      )
  );
  return paid.every(
    (intent) => intent.state === "granted" || held.includes(intent)
  )
    ? "on_hold"
    : "pending";
}

/**
 * The account's total number of sign-in passkeys. A count, never a page of
 * rows: better-auth's list-user-passkeys stops at the adapter's default page
 * of 10, so it can't be used to tell whether one was added.
 */
export async function countPasskeys(
  req: PayloadRequest,
  memberID: string
): Promise<number> {
  const found = await req.payload.find({
    collection: "passkeys" as never,
    where: { user: { equals: memberID } } as never,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req
  });
  return found.totalDocs;
}

export async function readWelcome({
  req,
  principal
}: {
  req: PayloadRequest;
  principal: MemberPrincipal | null;
}): Promise<WelcomeView> {
  if (!principal) return { state: "signed_out" };
  const memberID = principal.userId;
  const [signet, passkeys] = await Promise.all([
    signetOf(req, memberID, principal.emailVerified),
    countPasskeys(req, memberID)
  ]);
  return {
    state: "welcome",
    signet,
    passkeys,
    emailVerified: principal.emailVerified
  };
}
