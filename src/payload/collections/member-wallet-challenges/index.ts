import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection } from "@/lib/commerce/_shared/collection";
import { walletServerWrite } from "@/lib/member-auth/wallet/access";

/**
 * Single-use, purpose-bound WebAuthn challenges for wallet activation. A
 * challenge belongs to one member session and one purpose; a bind challenge
 * also fixes the offered set: every credential it allows, each with its
 * server-computed Safe candidate, in `candidate`. `credentialID` is unused
 * (kept for the schema-freeze migration to drop). Only
 * `consumedAt` may change, once. `member` is nullable so deleting a user is
 * not blocked (ON DELETE SET NULL); the sweep purges expired challenges, and
 * that is the only delete.
 */
export const MemberWalletChallenges: CollectionConfig = {
  ...ledgerCollection("member-wallet-challenges", [
    { name: "member", type: "relationship", relationTo: "users", index: true },
    { name: "sessionID", type: "text", required: true },
    {
      name: "purpose",
      type: "select",
      required: true,
      options: ["wallet-register", "wallet-bind"]
    },
    { name: "challenge", type: "text", required: true, unique: true },
    { name: "credentialID", type: "text" },
    { name: "candidate", type: "json" },
    { name: "candidateDigest", type: "text" },
    { name: "expiresAt", type: "date", required: true, index: true },
    { name: "consumedAt", type: "date" }
  ]),
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        if (!walletServerWrite(req))
          throw new APIError("Wallet challenges are server owned", 403);
        if (operation === "create") {
          if (!data.member)
            throw new APIError("A challenge belongs to a member", 400);
          if (data.consumedAt)
            throw new APIError("A new challenge is unused", 400);
          if (
            data.purpose === "wallet-bind" &&
            (!data.candidateDigest ||
              !Array.isArray(data.candidate) ||
              !data.candidate.length)
          )
            throw new APIError("A bind challenge fixes its candidate", 400);
          return data;
        }
        if (originalDoc.consumedAt)
          throw new APIError("Challenge already used", 409);
        if (
          Object.keys(data).some(
            (field) =>
              !["consumedAt", "updatedAt"].includes(field) &&
              JSON.stringify(data[field]) !== JSON.stringify(originalDoc[field])
          )
        )
          throw new APIError("Challenges are immutable", 409);
        return data;
      }
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (!walletServerWrite(req))
          throw new APIError("Wallet challenges are server owned", 403);
        const row = (await req.payload.findByID({
          collection: "member-wallet-challenges" as never,
          id,
          depth: 0,
          overrideAccess: true,
          req
        })) as unknown as { expiresAt?: string };
        if (!row.expiresAt || new Date(row.expiresAt).getTime() > Date.now())
          throw new APIError("Only an expired challenge can be removed", 409);
      }
    ]
  }
};
