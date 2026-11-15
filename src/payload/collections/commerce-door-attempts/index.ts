import english from "../../../../messages/en.json";
import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

/** ADR-0007: every door attempt, by QR or by name, is recorded once and never changed. */
const ledger = ledgerCollection("commerce-door-attempts", [
  relation("operator", "admins"),
  relation("event", "commerce-events"),
  {
    name: "admission",
    type: "relationship",
    relationTo: "commerce-admissions",
    index: true
  },
  {
    name: "method",
    type: "select",
    required: true,
    options: [
      { label: english.Staff.door.schema.qr, value: "qr" },
      { label: english.Staff.door.schema.name, value: "name" }
    ]
  },
  {
    name: "result",
    type: "select",
    required: true,
    index: true,
    options: [
      { label: english.Staff.door.schema.admitted, value: "admitted" },
      {
        label: english.Staff.door.schema.alreadyCheckedIn,
        value: "already-checked-in"
      },
      { label: english.Staff.door.schema.refused, value: "refused" }
    ]
  },
  { name: "reason", type: "text", maxLength: 40 },
  { name: "tokenID", type: "text", maxLength: 80 },
  { name: "attemptedAt", type: "date", required: true }
]);

export const CommerceDoorAttempts: CollectionConfig = {
  ...ledger,
  admin: { ...ledger.admin, useAsTitle: "attemptedAt" },
  hooks: {
    beforeChange: [
      ({ operation }) => {
        if (operation !== "create")
          throw new APIError("Door attempts are append-only", 409);
      }
    ],
    beforeDelete: [
      () => {
        throw new APIError("Door attempts are append-only", 409);
      }
    ]
  }
};
