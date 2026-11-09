import type { CollectionConfig } from "payload";
import { isCmsSuperAdmin } from "@/lib/auth/access";

export const AccountRecoveryRequests: CollectionConfig = {
  slug: "account-recovery-requests",
  access: {
    admin: ({ req }) => isCmsSuperAdmin(req.user),
    read: ({ req }) => isCmsSuperAdmin(req.user),
    create: () => false,
    update: () => false,
    delete: () => false
  },
  disableDuplicate: true,
  disableBulkEdit: true,
  disableBulkDelete: true,
  admin: {
    useAsTitle: "id",
    group: "Staff & Administration",
    description:
      "UNVERIFIED lost-email claims. Intake and review metadata only; no ownership proof, account association or recovery grant.",
    defaultColumns: ["createdAt", "status", "claimVerification", "revision"],
    hideAPIURL: true
  },
  fields: [
    {
      name: "phone",
      type: "text",
      required: true,
      admin: {
        readOnly: true,
        description:
          "Unverified claimant-provided phone. Never use as enrollment proof."
      }
    },
    {
      name: "contactEmail",
      type: "email",
      required: true,
      admin: {
        readOnly: true,
        description: "Unverified contact address, not an account email change."
      }
    },
    {
      name: "claimVerification",
      type: "text",
      required: true,
      defaultValue: "unverified",
      admin: { readOnly: true }
    },
    {
      name: "reason",
      type: "text",
      required: true,
      defaultValue: "lost_email",
      admin: { readOnly: true }
    },
    {
      name: "status",
      type: "text",
      required: true,
      defaultValue: "submitted",
      admin: { readOnly: true }
    },
    {
      name: "revision",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: { readOnly: true }
    },
    { name: "internalNote", type: "textarea", admin: { readOnly: true } },
    { name: "reviewerId", type: "text", admin: { readOnly: true } },
    { name: "reviewedAt", type: "date", admin: { readOnly: true } },
    { name: "reviewLog", type: "json", admin: { readOnly: true } },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      index: true,
      admin: { readOnly: true }
    },
    {
      name: "reviewControls",
      type: "ui",
      admin: {
        components: {
          Field: "/lib/payload/admin/recovery-review#RecoveryReview"
        }
      }
    }
  ]
};
