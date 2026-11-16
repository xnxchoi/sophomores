import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection } from "@/lib/commerce/_shared/collection";
import { relationshipID } from "@/lib/commerce/_shared/transaction";
import { walletServerWrite } from "@/lib/member-auth/wallet/access";
import { predictMemberSafe } from "@/lib/member-auth/wallet/safe";

/** Every field is fixed when the row is created; nothing about a wallet changes afterwards. */
export const memberWalletFields = [
  "member",
  "chainID",
  "status",
  "activeSlot",
  "walletKey",
  "safeAddress",
  "ownerAddress",
  "threshold",
  "saltNonce",
  "safeVersion",
  "proxyFactoryAddress",
  "singletonAddress",
  "fallbackHandlerAddress",
  "configHash",
  "boundAt"
] as const;
const bookkeeping = new Set(["updatedAt", "createdAt", "id"]);
/** Fields the Safe address derives from; checked against an offline recomputation on create. */
const derived = [
  "safeAddress",
  "ownerAddress",
  "threshold",
  "saltNonce",
  "safeVersion",
  "proxyFactoryAddress",
  "singletonAddress",
  "fallbackHandlerAddress",
  "configHash"
] as const;

const text = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: "text" as const,
  required: true,
  ...extra
});
const identity = (value: unknown): string | null =>
  value === null || value === undefined
    ? null
    : typeof value === "object"
      ? relationshipID(value)
      : String(value);

/**
 * ADR-0013: a member's Safe, owned by the custody key we hold and created
 * when their membership payment settles. One active wallet per member and
 * chain (unique `activeSlot`), and one member per Safe (unique `walletKey`).
 * No passkey owns it. Nothing retires, replaces or removes a wallet: keys may
 * already be granted to its Safe.
 *
 * `member` is nullable on purpose: deleting a user keeps the wallet record,
 * anonymised (ON DELETE SET NULL), as evidence for keys already issued to its
 * Safe.
 */
export const MemberWallets: CollectionConfig = {
  ...ledgerCollection("member-wallets", [
    { name: "member", type: "relationship", relationTo: "users", index: true },
    { name: "chainID", type: "number", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      index: true,
      options: ["active"]
    },
    text("activeSlot", { unique: true }),
    text("walletKey", { unique: true }),
    text("safeAddress"),
    text("ownerAddress"),
    { name: "threshold", type: "number", required: true, min: 1 },
    text("saltNonce"),
    text("safeVersion"),
    text("proxyFactoryAddress"),
    text("singletonAddress"),
    text("fallbackHandlerAddress"),
    text("configHash"),
    { name: "boundAt", type: "date", required: true }
  ]),
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        if (!walletServerWrite(req))
          throw new APIError("Member wallets are server owned", 403);
        if (operation === "create") {
          const member = identity(data.member);
          if (!member) throw new APIError("A wallet belongs to a member", 400);
          if (data.status !== "active" || !data.boundAt)
            throw new APIError("A wallet is created active", 400);
          let expected: ReturnType<typeof predictMemberSafe>;
          try {
            expected = predictMemberSafe({
              chainID: Number(data.chainID),
              owner: String(data.ownerAddress),
              memberID: member
            });
          } catch {
            throw new APIError("Wallet does not match its Safe scheme", 400);
          }
          for (const field of derived)
            if (String(data[field]) !== String(expected[field]))
              throw new APIError("Wallet does not match its Safe scheme", 400);
          if (
            data.activeSlot !== `${member}:${expected.chainID}` ||
            data.walletKey !==
              `${expected.chainID}:${expected.safeAddress.toLowerCase()}`
          )
            throw new APIError("Wallet key mismatch", 400);
          return data;
        }
        for (const field of Object.keys(data)) {
          if (bookkeeping.has(field)) continue;
          if (!(memberWalletFields as readonly string[]).includes(field))
            throw new APIError("Unknown wallet field", 400);
          const before = originalDoc?.[field];
          const after = data[field];
          const same =
            field === "boundAt"
              ? new Date(String(after)).getTime() ===
                new Date(String(before)).getTime()
              : identity(after) === identity(before);
          if (!same) throw new APIError("A wallet is write-once", 409);
        }
        return data;
      }
    ],
    beforeDelete: [
      () => {
        throw new APIError("A wallet can't be removed", 409);
      }
    ]
  }
};
