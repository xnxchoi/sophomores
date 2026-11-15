import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection } from "@/lib/commerce/_shared/collection";
import { relationshipID } from "@/lib/commerce/_shared/transaction";
import { walletServerWrite } from "@/lib/member-auth/wallet/access";

/** Fields fixed when the row is created; the address and everything that derives it never change. */
export const memberWalletIdentityFields = [
  "member",
  "chainID",
  "walletKey",
  "memberWalletKey",
  "credentialSource",
  "signInPasskey",
  "credentialID",
  "publicKey",
  "publicKeyX",
  "publicKeyY",
  "rpID",
  "origin",
  "verifierAddress",
  "ownerAddress",
  "safeAddress",
  "proxyFactoryAddress",
  "singletonAddress",
  "safeVersion",
  "saltNonce",
  "configHash"
] as const;
const mutable = new Set([
  "status",
  "activeSlot",
  "activeWalletKey",
  "counter",
  "boundAt",
  "bindChallenge",
  "transports",
  "updatedAt",
  "createdAt",
  "id"
]);

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
const slot = (row: Record<string, unknown>) =>
  `${identity(row.member)}:${Number(row.chainID)}`;
const key = (row: Record<string, unknown>) =>
  `${Number(row.chainID)}:${String(row.safeAddress).toLowerCase()}`;

/**
 * ADR-0001 / ADR-0005: a member's Safe, owned by an ES256 passkey. `pending`
 * holds a registered wallet passkey awaiting its bind approval; `active` is the
 * one wallet per member and chain (unique `activeSlot`). Lost-passkey recovery
 * is not built: no path retires an active wallet or binds a second one.
 *
 * Uniqueness of the Safe (`walletKey`): registration uses attestation "none",
 * which does not prove possession of the key, so a pending row proves nothing
 * and must not block anyone. The key is unique among ACTIVE wallets
 * (`activeWalletKey`, set only after a bind assertion proves possession) and
 * per member (`memberWalletKey`).
 *
 * `member` is nullable on purpose: deleting a user keeps the wallet record,
 * anonymised (ON DELETE SET NULL), as evidence for keys already issued to its
 * Safe. Only the sweep deletes rows, and only stale pending ones.
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
      options: ["pending", "active"]
    },
    { name: "activeSlot", type: "text", unique: true },
    text("walletKey", { index: true }),
    { name: "activeWalletKey", type: "text", unique: true },
    text("memberWalletKey", { unique: true }),
    {
      name: "credentialSource",
      type: "select",
      required: true,
      options: ["sign_in_passkey", "wallet_passkey"]
    },
    { name: "signInPasskey", type: "text" },
    text("credentialID", { index: true }),
    text("publicKey"),
    text("publicKeyX"),
    text("publicKeyY"),
    { name: "transports", type: "json" },
    text("rpID"),
    text("origin"),
    {
      name: "counter",
      type: "number",
      required: true,
      min: 0,
      defaultValue: 0
    },
    text("verifierAddress"),
    text("ownerAddress"),
    text("safeAddress"),
    text("proxyFactoryAddress"),
    text("singletonAddress"),
    text("safeVersion"),
    text("saltNonce"),
    text("configHash"),
    { name: "boundAt", type: "date" },
    { name: "bindChallenge", type: "text" }
  ]),
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        if (!walletServerWrite(req))
          throw new APIError("Member wallets are server owned", 403);
        if (operation === "create") {
          if (!data.member)
            throw new APIError("A wallet belongs to a member", 400);
          if (
            data.walletKey !== key(data) ||
            data.memberWalletKey !== `${identity(data.member)}:${key(data)}`
          )
            throw new APIError("Wallet key mismatch", 400);
          if (
            data.status === "pending" &&
            (data.activeSlot || data.boundAt || data.activeWalletKey)
          )
            throw new APIError("A pending wallet is not bound", 400);
          if (
            data.status === "active" &&
            (data.activeSlot !== slot(data) ||
              !data.boundAt ||
              data.activeWalletKey !== data.walletKey)
          )
            throw new APIError("An active wallet needs its member slot", 400);
          return data;
        }
        for (const field of memberWalletIdentityFields) {
          if (
            field in data &&
            identity(data[field]) !== identity(originalDoc[field])
          )
            throw new APIError("Wallet identity is immutable", 409);
        }
        if (
          Object.keys(data).some(
            (field) =>
              !mutable.has(field) &&
              !(memberWalletIdentityFields as readonly string[]).includes(field)
          )
        )
          throw new APIError("Unknown wallet field", 400);
        const to = data.status ?? originalDoc.status;
        if (originalDoc.status === "active" && to !== "active")
          throw new APIError("An active wallet cannot be retired", 409);
        if (
          originalDoc.status === "active" &&
          (("activeSlot" in data &&
            data.activeSlot !== originalDoc.activeSlot) ||
            ("activeWalletKey" in data &&
              data.activeWalletKey !== originalDoc.activeWalletKey) ||
            ("boundAt" in data &&
              new Date(data.boundAt).getTime() !==
                new Date(originalDoc.boundAt).getTime()))
        )
          throw new APIError("Wallet binding is write-once", 409);
        if (
          originalDoc.status === "pending" &&
          to === "active" &&
          (data.activeSlot !== slot(originalDoc) ||
            !data.boundAt ||
            data.activeWalletKey !== originalDoc.walletKey)
        )
          throw new APIError("An active wallet needs its member slot", 400);
        if (
          to === "pending" &&
          (data.activeSlot || data.boundAt || data.activeWalletKey)
        )
          throw new APIError("A pending wallet is not bound", 400);
        if (
          "counter" in data &&
          Number(data.counter) < Number(originalDoc.counter)
        )
          throw new APIError("Authenticator counter cannot go back", 409);
        return data;
      }
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (!walletServerWrite(req))
          throw new APIError("Member wallets are server owned", 403);
        const row = (await req.payload.findByID({
          collection: "member-wallets" as never,
          id,
          depth: 0,
          overrideAccess: true,
          req
        })) as unknown as { status?: string };
        if (row.status !== "pending")
          throw new APIError("Only a pending wallet can be removed", 409);
      }
    ]
  }
};
