import { APIError, type PayloadRequest } from "payload";
import type { MemberWallet } from "@/payload-types";
import { loadWalletConfig, predictMemberSafe } from "../../member-auth/wallet/safe";
import { lockCommerce, relationshipID, requirePaymentTransaction } from "../_shared/transaction";

const collection = "member-wallets" as const;
type WalletCreate = Omit<MemberWallet, "id" | "createdAt" | "updatedAt" | "member"> & { member: string };
const walletCreates = new WeakMap<PayloadRequest, Readonly<WalletCreate>>();

/** One exact Local API create; request JSON and req.context convey no authority. */
export async function requireWalletCreate(req: PayloadRequest, operation: string, data: Record<string, unknown>) {
  const expected = walletCreates.get(req);
  if (operation !== "create" || !expected || !Object.entries(expected).every(([key, value]) => data[key] === value)) {
    throw new APIError("Wallet writes are not enabled", 403);
  }
  walletCreates.delete(req);
  await requirePaymentTransaction(req);
  return { ...expected };
}

function compareWallet(req: PayloadRequest, existing: MemberWallet | null, expected: WalletCreate) {
  if (!existing) return null;
  if (existing.status !== "active" || relationshipID(existing.member) !== expected.member) {
    throw new Error("Member wallet identity is inconsistent");
  }
  if (Object.entries(expected).every(([key, value]) =>
    key === "boundAt" || key === "member" || existing[key as keyof MemberWallet] === value)) return "already-recorded";

  req.payload.logger.warn({ msg: "Member wallet configuration differs from the existing record", cause: "wallet-config-drift" });
  return "config-drift";
}

export async function lockMemberWallet(req: PayloadRequest, memberID: string) {
  await requirePaymentTransaction(req);
  await lockCommerce(req, [`member-wallet:${memberID}`]);
}

/** On the exact payment request and after taking the member-wallet lock. */
export async function readMemberWalletBinding(req: PayloadRequest, memberID: string) {
  await requirePaymentTransaction(req);
  const found = await req.payload.find({
    collection, req, overrideAccess: true, depth: 0, limit: 2,
    where: { or: [
      { activeSlot: { equals: memberID } },
      { and: [{ member: { equals: memberID } }, { status: { equals: "active" } }] },
    ] },
  });
  await requirePaymentTransaction(req);
  if (found.totalDocs === 0 && !found.docs[0]) return null;
  if (found.totalDocs !== 1 || found.docs.length !== 1 || !found.docs[0]) throw new Error("Member wallet identity is inconsistent");
  return found.docs[0];
}

/** Call only after admission proof, on the exact settlement request. */
export async function recordMemberWallet(
  req: PayloadRequest,
  memberID: string,
  env?: Readonly<Record<string, string | undefined>>,
) {
  await requirePaymentTransaction(req);
  const config = loadWalletConfig(env);
  if (!config) return "disabled";
  const safe = await predictMemberSafe(config, memberID);
  await lockMemberWallet(req, memberID);
  const existing = await readMemberWalletBinding(req, memberID);
  const data: WalletCreate = {
    ...safe, member: memberID, activeSlot: memberID, status: "active",
    walletKey: `${safe.chainID}:${safe.safeAddress}`, boundAt: new Date().toISOString(),
  };
  const previous = compareWallet(req, existing, data);
  if (previous) return previous;

  walletCreates.set(req, Object.freeze(data));
  try {
    await req.payload.create({ collection, req, overrideAccess: true, depth: 0, data: { ...data } });
    if (walletCreates.has(req)) throw new Error("Member wallet create hook did not verify the write");
    await requirePaymentTransaction(req);
    return "recorded";
  } finally {
    walletCreates.delete(req);
  }
}
