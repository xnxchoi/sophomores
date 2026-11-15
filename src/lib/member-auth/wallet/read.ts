import type { PayloadRequest } from "payload";
import { keyGrantHold } from "../../commerce/keys/activation";
import { keyStatusOf, type KeyGrantState } from "../../commerce/keys/contracts";
import {
  relationshipID,
  type CommerceDocument
} from "../../commerce/_shared/transaction";
import type { MemberPrincipal } from "../contracts";
import { FRESH_SESSION_MS } from "./activation";
import type { WalletConfig } from "./config";
import { storedPasskeyCoordinates } from "./credentials";

/**
 * Page-facing activation state (plan: ENDPOINTS & STATES). Reading never
 * activates or attaches anything. An active wallet takes precedence, so an
 * activated member never sees "activate" again. Credential IDs are returned
 * only because the browser must name them in its WebAuthn request; addresses,
 * keys, targets and hashes never leave the server.
 *
 * Bounded reads: user, intents, their payments and admissions (batched with
 * `in`), wallets and passkeys — six queries whatever the number of intents.
 */
export type WalletCredentialOption = { id: string; kind: "wallet" | "sign_in" };
export type WalletActivationView =
  | {
      state:
        | "signed_out"
        | "unavailable"
        | "not_eligible"
        | "on_hold"
        | "key_pending"
        | "key_issued";
    }
  | {
      state: "activation_required";
      passkeys: "compatible" | "incompatible" | "none";
      credentials: WalletCredentialOption[];
      freshSession: boolean;
    }
  | {
      state: "approval_pending";
      credentials: WalletCredentialOption[];
      freshSession: boolean;
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

export async function readWalletActivation({
  req,
  principal,
  config,
  now = new Date()
}: {
  req: PayloadRequest;
  principal: MemberPrincipal | null;
  config: WalletConfig | null;
  now?: Date;
}): Promise<WalletActivationView> {
  if (!principal) return { state: "signed_out" };
  if (!config) return { state: "unavailable" };
  const memberID = principal.userId;
  const user = (await req.payload.findByID({
    collection: "users" as never,
    id: memberID,
    depth: 0,
    overrideAccess: true,
    req,
    disableErrors: true
  })) as unknown as CommerceDocument | null;
  if (
    !user ||
    user.membershipStatus === "suspended" ||
    !principal.emailVerified
  )
    return { state: "not_eligible" };

  const intents = (
    await find(req, "commerce-key-grant-intents", {
      and: [
        { beneficiaryUser: { equals: memberID } },
        { recipientMode: { equals: "member_safe" } }
      ]
    })
  ).filter((intent) => intent.state !== "cancelled");
  const ids = (field: string) => [
    ...new Set(intents.map((intent) => relationshipID(intent[field])))
  ];
  const payments = intents.length
    ? byID(await find(req, "transactions", { id: { in: ids("payment") } }))
    : new Map<string, CommerceDocument>();
  const admissions = intents.length
    ? byID(
        await find(req, "commerce-admissions", {
          id: { in: ids("entitlement") }
        })
      )
    : new Map<string, CommerceDocument>();
  const paid = intents.filter(
    (intent) =>
      payments.get(relationshipID(intent.payment))?.status === "succeeded"
  );
  const held = new Set(
    paid
      .filter(
        (intent) =>
          intent.state !== "granted" &&
          keyGrantHold(
            intent,
            admissions.get(relationshipID(intent.entitlement)),
            payments.get(relationshipID(intent.payment))
          )
      )
      .map((intent) => intent.id)
  );
  const wallets = await find(req, "member-wallets", {
    member: { equals: memberID }
  });
  const active = wallets.find(
    (wallet) =>
      wallet.status === "active" && Number(wallet.chainID) === config.chainID
  );

  if (active) {
    // No paid membership left (refunded or cancelled): nothing is on its way, so don't say a key is.
    if (!paid.length) return { state: "not_eligible" };
    const status = keyStatusOf(
      paid.map((intent) => intent.state as KeyGrantState)
    );
    if (status === "key_issued") return { state: "key_issued" };
    return paid.every(
      (intent) => intent.state === "granted" || held.has(intent.id)
    )
      ? { state: "on_hold" }
      : { state: "key_pending" };
  }
  if (!paid.length) return { state: "not_eligible" };
  if (paid.every((intent) => held.has(intent.id))) return { state: "on_hold" };

  const age = now.getTime() - principal.sessionCreatedAt.getTime();
  const freshSession =
    Number.isFinite(age) && age >= 0 && age <= FRESH_SESSION_MS;
  const pending = wallets
    .filter(
      (wallet) =>
        wallet.status === "pending" && Number(wallet.chainID) === config.chainID
    )
    .map((wallet): WalletCredentialOption => ({
      id: String(wallet.credentialID),
      kind: "wallet"
    }));
  const passkeys = await find(req, "passkeys", { user: { equals: memberID } });
  const compatible = passkeys
    .filter((passkey) => storedPasskeyCoordinates(String(passkey.publicKey)))
    .map((passkey): WalletCredentialOption => ({
      id: String(passkey.credentialId),
      kind: "sign_in"
    }));
  if (pending.length)
    return {
      state: "approval_pending",
      credentials: [...pending, ...compatible],
      freshSession
    };
  return {
    state: "activation_required",
    passkeys: compatible.length
      ? "compatible"
      : passkeys.length
        ? "incompatible"
        : "none",
    credentials: compatible,
    freshSession
  };
}
