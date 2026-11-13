import english from "../../../../messages/en.json";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

export const CommerceRedemptions = ledgerCollection("commerce-redemptions", [
  { name: "redemptionKey", type: "text", required: true, unique: true },
  relation("admission", "commerce-admissions"), relation("operator", "admins"),
  { name: "kind", type: "select", required: true, options: [{ label: english.Staff.schema.partIDrink, value: "part-i-drink" }, { label: english.Staff.schema.sharedTransfer, value: "shared-transfer" }] },
  { name: "ordinal", type: "number", required: true, min: 1, max: 4 },
  { name: "redeemedAt", type: "date", required: true },
]);
