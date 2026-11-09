import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

export const CommerceRedemptions = ledgerCollection("commerce-redemptions", [
  { name: "redemptionKey", type: "text", required: true, unique: true },
  relation("admission", "commerce-admissions"), relation("operator", "admins"),
  { name: "kind", type: "select", required: true, options: ["part-i-drink", "shared-transfer"] },
  { name: "ordinal", type: "number", required: true, min: 1, max: 4 },
  { name: "redeemedAt", type: "date", required: true },
]);
