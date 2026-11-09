import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

export const CommerceClaims = ledgerCollection("commerce-claims", [
  relation("admission", "commerce-admissions"),
  { name: "tokenDigest", type: "text", required: true, unique: true, access: { read: () => false } },
  { name: "expiresAt", type: "date", required: true },
  { name: "consumedAt", type: "date" },
  { name: "revokedAt", type: "date" },
]);
