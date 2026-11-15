import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";
import { walletServerWrite } from "@/lib/member-auth/wallet/access";

/**
 * Single-use, purpose-bound WebAuthn challenges for wallet activation. A
 * challenge belongs to one member session and one purpose; a bind challenge
 * also fixes the credential and the server-computed Safe candidate. Only
 * `consumedAt` may change, once.
 */
export const MemberWalletChallenges: CollectionConfig = {
  ...ledgerCollection("member-wallet-challenges", [
    relation("member", "users"),
    { name: "sessionID", type: "text", required: true },
    { name: "purpose", type: "select", required: true, options: ["wallet-register", "wallet-bind"] },
    { name: "challenge", type: "text", required: true, unique: true },
    { name: "credentialID", type: "text" },
    { name: "candidate", type: "json" },
    { name: "candidateDigest", type: "text" },
    { name: "expiresAt", type: "date", required: true, index: true },
    { name: "consumedAt", type: "date" },
  ]),
  hooks: {
    beforeChange: [({ data, originalDoc, operation, req }) => {
      if (!walletServerWrite(req)) throw new APIError("Wallet challenges are server owned", 403);
      if (operation === "create") {
        if (data.consumedAt) throw new APIError("A new challenge is unused", 400);
        if (data.purpose === "wallet-bind" && (!data.credentialID || !data.candidateDigest || !data.candidate)) throw new APIError("A bind challenge fixes its candidate", 400);
        return data;
      }
      if (originalDoc.consumedAt) throw new APIError("Challenge already used", 409);
      if (Object.keys(data).some((field) => !["consumedAt", "updatedAt"].includes(field) && JSON.stringify(data[field]) !== JSON.stringify(originalDoc[field]))) throw new APIError("Challenges are immutable", 409);
      return data;
    }],
  },
};
