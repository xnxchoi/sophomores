import type { PayloadRequest } from "payload";
import { isHeldKeyGrant } from "../../commerce/keys/activation";
import { keyStatusOf, type KeyGrantState } from "../../commerce/keys/contracts";
import { relationshipID, type CommerceDocument } from "../../commerce/_shared/transaction";
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
 */
export type WalletCredentialOption = { id: string; kind: "wallet" | "sign_in" };
export type WalletActivationView =
  | { state: "signed_out" | "unavailable" | "not_eligible" | "on_hold" | "key_pending" | "key_issued" }
  | { state: "activation_required"; passkeys: "compatible" | "incompatible" | "none"; credentials: WalletCredentialOption[]; freshSession: boolean }
  | { state: "approval_pending"; credentials: WalletCredentialOption[]; freshSession: boolean };

const find = async (req: PayloadRequest, collection: string, where: Record<string, unknown>, limit = 50): Promise<CommerceDocument[]> =>
  (await req.payload.find({ collection: collection as never, where: where as never, limit, depth: 0, overrideAccess: true, req })).docs as unknown as CommerceDocument[];

export async function readWalletActivation({ req, principal, config, now = new Date() }: { req: PayloadRequest; principal: MemberPrincipal | null; config: WalletConfig | null; now?: Date }): Promise<WalletActivationView> {
  if (!principal) return { state: "signed_out" };
  if (!config) return { state: "unavailable" };
  const memberID = principal.userId;
  const user = await req.payload.findByID({ collection: "users" as never, id: memberID, depth: 0, overrideAccess: true, req, disableErrors: true }) as unknown as CommerceDocument | null;
  if (!user || user.membershipStatus === "suspended" || !principal.emailVerified) return { state: "not_eligible" };

  const intents = (await find(req, "commerce-key-grant-intents", { and: [{ beneficiaryUser: { equals: memberID } }, { recipientMode: { equals: "member_safe" } }] }))
    .filter((intent) => intent.state !== "cancelled");
  const paid: CommerceDocument[] = [];
  for (const intent of intents) {
    const payment = await req.payload.findByID({ collection: "transactions" as never, id: relationshipID(intent.payment), depth: 0, overrideAccess: true, req, disableErrors: true }) as unknown as CommerceDocument | null;
    if (payment?.status === "succeeded") paid.push(intent);
  }
  const held = new Set<string>();
  for (const intent of paid) if (intent.state !== "granted" && await isHeldKeyGrant(req, intent)) held.add(intent.id);
  const wallets = await find(req, "member-wallets", { member: { equals: memberID } });
  const active = wallets.find((wallet) => wallet.status === "active" && Number(wallet.chainID) === config.chainID);

  if (active) {
    if (!paid.length) return { state: "key_pending" };
    const status = keyStatusOf(paid.map((intent) => intent.state as KeyGrantState));
    if (status === "key_issued") return { state: "key_issued" };
    return paid.every((intent) => intent.state === "granted" || held.has(intent.id)) ? { state: "on_hold" } : { state: "key_pending" };
  }
  if (!paid.length) return { state: "not_eligible" };
  if (paid.every((intent) => held.has(intent.id))) return { state: "on_hold" };

  const age = now.getTime() - principal.sessionCreatedAt.getTime();
  const freshSession = Number.isFinite(age) && age >= 0 && age <= FRESH_SESSION_MS;
  const pending = wallets.filter((wallet) => wallet.status === "pending" && Number(wallet.chainID) === config.chainID)
    .map((wallet): WalletCredentialOption => ({ id: String(wallet.credentialID), kind: "wallet" }));
  const passkeys = await find(req, "passkeys", { user: { equals: memberID } });
  const compatible = passkeys.filter((passkey) => storedPasskeyCoordinates(String(passkey.publicKey)))
    .map((passkey): WalletCredentialOption => ({ id: String(passkey.credentialId), kind: "sign_in" }));
  if (pending.length) return { state: "approval_pending", credentials: [...pending, ...compatible], freshSession };
  return { state: "activation_required", passkeys: compatible.length ? "compatible" : passkeys.length ? "incompatible" : "none", credentials: compatible, freshSession };
}
