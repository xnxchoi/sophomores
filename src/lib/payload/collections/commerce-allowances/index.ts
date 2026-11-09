import { ledgerCollection, numberField, relation } from "@/lib/commerce/_shared/collection";

export const CommerceAllowances = ledgerCollection("commerce-allowances", [
  { name: "accountReleaseKey", type: "text", required: true, unique: true },
  relation("customer", "users"),
  { name: "releaseID", type: "text", required: true },
  numberField("reservedQuantity"), numberField("paidQuantity"),
]);
