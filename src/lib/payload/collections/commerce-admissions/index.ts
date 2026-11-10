import english from "../../../../../messages/en.json";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

export const CommerceAdmissions = ledgerCollection("commerce-admissions", [
  { name: "commerceOperations", type: "ui", admin: { components: { Field: "@/lib/payload/admin/commerce/fields#AdmissionOperationsField" } } },
  { name: "orderUnitKey", type: "text", required: true, unique: true },
  relation("order", "orders"), relation("transaction", "transactions"), relation("event", "commerce-events"), relation("buyer", "users"),
  { name: "unit", type: "number", required: true, min: 1, max: 3 },
  { name: "guestName", type: "text", maxLength: 100 },
  { name: "claimedAccount", type: "relationship", relationTo: "users" },
  { name: "eventAccountKey", type: "text", unique: true },
  { name: "status", type: "select", required: true, options: [{ label: english.Staff.schema.available, value: "available" }, { label: english.Staff.schema.claimed, value: "claimed" }, { label: english.Staff.schema.checkedIn, value: "checked-in" }, { label: english.Staff.schema.revoked, value: "revoked" }] },
  { name: "checkedInAt", type: "date" },
  { name: "benefitReview", type: "checkbox", defaultValue: false },
  { name: "benefitHoldEvidence", type: "text" },
  { name: "benefitHoldReason", type: "text" },
  { name: "returnAcceptedAt", type: "date" },
  { name: "returnEvidence", type: "text" },
  { name: "returnAcceptedBy", type: "relationship", relationTo: "admins" },
  { name: "returnReviewApproved", type: "checkbox", defaultValue: false },
  { name: "stockDisposition", type: "select", options: [{ label: english.Staff.schema.pendingInspection, value: "pending-inspection" }, { label: english.Staff.schema.restock, value: "restock" }, { label: english.Staff.schema.doNotRestock, value: "do-not-restock" }] },
  { name: "stockDispositionBy", type: "relationship", relationTo: "admins" },
  { name: "stockDisposedAt", type: "date" },
]);
