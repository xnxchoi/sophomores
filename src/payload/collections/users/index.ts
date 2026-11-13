import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { v7 as uuidv7 } from "uuid";
import {
  customerAccess,
  serverOwnedField,
  cmsStaffField
} from "@/lib/auth/access";
import { accountDisplayName } from "@/lib/auth/staff-email";
import { isVerifiedStaff, ensureStaffAdminProvisioned } from "@/lib/auth/staff";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // Passwordless phone-based verification for attendee registration
    disableLocalStrategy: true
  },
  access: customerAccess,
  admin: {
    useAsTitle: "email",
    group: english.Staff.schema.membershipRegistration,
    description: english.Staff.schema.registeredGuestsAttendeesAndClubMembershipApplicants
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data || (originalDoc && data.name === undefined)) return data;
        const name = accountDisplayName(
          typeof data.email === "string" ? data.email : "",
          typeof data.name === "string" ? data.name : ""
        );
        if (data.name === name) return data;
        return { ...data, name };
      }
    ],
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (!data) return data;
        const identity = { ...originalDoc, ...data };
        const existingRoles = Array.isArray(identity.role)
          ? identity.role
          : [identity.role];
        const role = isVerifiedStaff(identity)
          ? existingRoles.some(
              (value: unknown) =>
                typeof value === "string" &&
                ["admin", "editor", "staff"].includes(value)
            )
            ? existingRoles
            : ["staff"]
          : identity.role || ["user"];
        return {
          ...data,
          ...(operation === "create" && !data.id ? { id: uuidv7() } : {}),
          role
        };
      }
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (doc?.email && isVerifiedStaff(doc)) {
          await ensureStaffAdminProvisioned(
            {
              email: doc.email,
              emailVerified: doc.emailVerified,
              name: doc.name,
              id: doc.id
            },
            req.payload
          );
        }
        return doc;
      }
    ]
  },
  fields: [
    {
      name: "membershipStatus",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "select",
      defaultValue: "applicant",
      options: [
        { label: english.Staff.schema.applicantPendingReview, value: "applicant" },
        { label: english.Staff.schema.invitedGuest, value: "invited" },
        { label: english.Staff.schema.approvedMember, value: "approved" },
        { label: english.Staff.schema.staffMember, value: "staff" },
        { label: english.Staff.schema.waitlisted, value: "waitlist" },
        { label: english.Staff.schema.suspended, value: "suspended" }
      ],
      required: true
    },
    {
      name: "localePreference",
      type: "select",
      defaultValue: "ko",
      options: [
        { label: english.Staff.schema.koreanKO, value: "ko" },
        { label: english.Staff.schema.englishEN, value: "en" }
      ],
      required: true
    },
    {
      name: "notes",
      access: {
        read: cmsStaffField,
        create: cmsStaffField,
        update: cmsStaffField
      },
      type: "textarea",
      admin: {
        description:
          english.Staff.schema.privateStaffNotesRegardingInvitationSourceGuestTable
      }
    },
    {
      name: "isPlaylistEligible",
      type: "checkbox",
      defaultValue: false,
      access: {
        create: serverOwnedField,
        update: cmsStaffField
      },
      admin: {
        position: "sidebar",
        description:
          "Eligibility flag for playlist slot submissions. Bound to phone-verified product purchase."
      }
    },
    {
      name: "eligibilityPhoneBinding",
      type: "text",
      access: {
        create: serverOwnedField,
        update: cmsStaffField
      },
      admin: {
        position: "sidebar",
        description:
          "Verified phone number associated with the activated ticket product."
      }
    }
  ]
};
