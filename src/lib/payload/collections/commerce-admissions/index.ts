import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

export const CommerceAdmissions = ledgerCollection("commerce-admissions", [
  { name: "orderUnitKey", type: "text", required: true, unique: true },
  relation("order", "orders"), relation("transaction", "transactions"), relation("event", "commerce-events"), relation("buyer", "users"),
  { name: "unit", type: "number", required: true, min: 1, max: 3 },
  { name: "guestName", type: "text", maxLength: 100 },
  { name: "claimedAccount", type: "relationship", relationTo: "users" },
  { name: "eventAccountKey", type: "text", unique: true },
  { name: "status", type: "select", required: true, options: ["available", "claimed", "checked-in", "revoked"] },
  { name: "checkedInAt", type: "date" },
  { name: "benefitReview", type: "checkbox", defaultValue: false },
  { name: "benefitHoldEvidence", type: "text" },
  { name: "benefitHoldReason", type: "text" },
  { name: "returnAcceptedAt", type: "date" },
  { name: "returnEvidence", type: "text" },
  { name: "returnAcceptedBy", type: "relationship", relationTo: "admins" },
  { name: "returnReviewApproved", type: "checkbox", defaultValue: false },
  { name: "stockDisposition", type: "select", options: ["pending-inspection", "restock", "do-not-restock"] },
  { name: "stockDispositionBy", type: "relationship", relationTo: "admins" },
  { name: "stockDisposedAt", type: "date" },
]);
