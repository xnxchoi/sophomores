import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";
import { relationshipID } from "@/lib/commerce/_shared/transaction";
import { attachForMember } from "@/lib/commerce/keys/member-wallet";

const admissionFields = ledgerCollection("commerce-admissions", [
  {
    name: "commerceOperations",
    type: "ui",
    admin: {
      components: {
        Field: "@/payload/admin/commerce/fields#AdmissionOperationsField"
      }
    }
  },
  { name: "orderUnitKey", type: "text", required: true, unique: true },
  relation("order", "orders"),
  relation("transaction", "transactions"),
  relation("event", "commerce-events"),
  relation("buyer", "users"),
  { name: "unit", type: "number", required: true, min: 1, max: 3 },
  { name: "guestName", type: "text", maxLength: 100 },
  // Set for a paid guest invite's admission: emailed to the guest, never claimed by an account.
  { name: "guestInvite", type: "relationship", relationTo: "commerce-guest-invites", index: true },
  { name: "claimedAccount", type: "relationship", relationTo: "users" },
  { name: "eventAccountKey", type: "text", unique: true },
  {
    name: "status",
    type: "select",
    required: true,
    options: [
      { label: english.Staff.schema.available, value: "available" },
      { label: english.Staff.schema.claimed, value: "claimed" },
      { label: english.Staff.schema.checkedIn, value: "checked-in" },
      { label: english.Staff.schema.revoked, value: "revoked" }
    ]
  },
  { name: "checkedInAt", type: "date" },
  { name: "benefitReview", type: "checkbox", defaultValue: false },
  { name: "benefitHoldEvidence", type: "text" },
  { name: "benefitHoldReason", type: "text" },
  { name: "returnAcceptedAt", type: "date" },
  { name: "returnEvidence", type: "text" },
  { name: "returnAcceptedBy", type: "relationship", relationTo: "admins" },
  { name: "returnReviewApproved", type: "checkbox", defaultValue: false },
  {
    name: "stockDisposition",
    type: "select",
    options: [
      {
        label: english.Staff.schema.pendingInspection,
        value: "pending-inspection"
      },
      { label: english.Staff.schema.restock, value: "restock" },
      { label: english.Staff.schema.doNotRestock, value: "do-not-restock" }
    ]
  },
  { name: "stockDispositionBy", type: "relationship", relationTo: "admins" },
  { name: "stockDisposedAt", type: "date" }
]);

/**
 * When a review hold on an admission is released, the member's key may be
 * owed again: attach their eligible intents to an active wallet under the
 * member+chain lock, in the same transaction (ADR-0005).
 */
export const CommerceAdmissions: CollectionConfig = {
  ...admissionFields,
  hooks: {
    ...admissionFields.hooks,
    afterChange: [
      ...(admissionFields.hooks?.afterChange ?? []),
      async ({ doc, previousDoc, req, operation }) => {
        if (
          operation === "update" &&
          previousDoc?.benefitReview === true &&
          doc.benefitReview !== true &&
          doc.buyer
        ) {
          await attachForMember(req, relationshipID(doc.buyer));
        }
        return doc;
      }
    ]
  }
};
