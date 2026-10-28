import type { CollectionConfig } from "payload";
import { v7 as uuidv7 } from "uuid";
import { isStaffEmail, ensureStaffAdminProvisioned } from "@/lib/auth/staff";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // Passwordless phone-based verification for attendee registration
    disableLocalStrategy: true,
  },
  access: {
    // Block customer/attendee users from accessing Payload Admin panel
    admin: () => false,
  },
  admin: {
    useAsTitle: "email",
    group: "Membership & Registration",
    description: "Registered guests, attendees, and club membership applicants.",
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data.id) {
          data.id = uuidv7();
        }
        if (data) {
          if (isStaffEmail(data.email)) {
            data.role = ["staff"];
            data.membershipStatus = "staff";
          } else if (!data.role) {
            data.role = ["user"];
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (doc?.email && isStaffEmail(doc.email)) {
          await ensureStaffAdminProvisioned(
            {
              email: doc.email,
              name: doc.name,
              id: doc.id,
            },
            req.payload
          );
        }
        return doc;
      },
    ],
  },
  fields: [
    {
      name: "membershipStatus",
      type: "select",
      defaultValue: "applicant",
      options: [
        { label: "Applicant / Pending Review", value: "applicant" },
        { label: "Invited Guest", value: "invited" },
        { label: "Approved Member", value: "approved" },
        { label: "Staff Member", value: "staff" },
        { label: "Waitlisted", value: "waitlist" },
        { label: "Suspended", value: "suspended" },
      ],
      required: true,
    },
    {
      name: "localePreference",
      type: "select",
      defaultValue: "ko",
      options: [
        { label: "Korean (KO)", value: "ko" },
        { label: "English (EN)", value: "en" },
      ],
      required: true,
    },
    {
      name: "notes",
      type: "textarea",
      admin: {
        description: "Private staff notes regarding invitation source, guest table, or dietary needs.",
      },
    },
  ],
};
