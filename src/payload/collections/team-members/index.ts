import english from "../../../../messages/en.json";
import type { Access, CollectionConfig } from "payload";
import type { PostgresSchemaHook } from "@payloadcms/drizzle/postgres";
import { cmsStaffField, isCmsStaff } from "@/lib/auth/access";
import { linkable } from "@/lib/content/team-profile-link";
import { staffWrite } from "../access";

const labels = english.Staff.schema;
const staffOnly: Access = ({ req }) => isCmsStaff(req.user);

/**
 * The public Team roster. Staff designate a member by linking their account (owner, 19 Nov). Adding someone
 * is the record of their consent to appear; publishing stays a separate, deliberate staff step.
 *
 * The users boundary (Auth, 19 Nov): the collection and every field on it are readable by CMS staff only, so
 * REST and GraphQL return nothing to anonymous or signed-in members, whatever select, depth, populate, where
 * or sort they ask for. Nothing account-derived is stored or exposed until staff approve it: the display name
 * is staff-set ("Use account value" copies the account name in for review), and the account image is shown
 * only when staff tick `useAccountImage`. The public page reads through one fixed server-only projection
 * (`src/lib/content/team-roster.server.ts`). The `users` collection itself is not changed.
 */
export const TeamMembers: CollectionConfig = {
  slug: "team-members",
  labels: { singular: labels.teamMember, plural: labels.teamMembers },
  admin: {
    useAsTitle: "displayName",
    group: labels.teamRoster,
    defaultColumns: ["displayName", "role", "status", "order"]
  },
  access: {
    read: staffOnly,
    create: staffWrite,
    update: staffWrite,
    delete: staffWrite
  },
  defaultSort: "order",
  fields: [
    {
      name: "user",
      label: labels.teamAccount,
      type: "relationship",
      relationTo: "users",
      required: true,
      unique: true,
      index: true,
      maxDepth: 0,
      access: { read: cmsStaffField, create: cmsStaffField, update: cmsStaffField }
    },
    {
      name: "displayName",
      label: labels.teamDisplayName,
      type: "text",
      access: { read: cmsStaffField },
      admin: {
        description: labels.teamDisplayNameHelp,
        components: { afterInput: ["/payload/admin/team-members/use-account-value#UseAccountName"] }
      },
      // Published entries need a name staff have approved: the raw account name never goes public unreviewed.
      validate: (value: string | null | undefined, { siblingData }: { siblingData: { status?: string } }) =>
        siblingData.status !== "published" || Boolean(value?.trim()) || labels.teamDisplayNameRequired
    },
    {
      name: "portrait",
      label: labels.teamPortrait,
      type: "upload",
      relationTo: "media",
      access: { read: cmsStaffField },
      admin: {
        description: labels.teamPortraitHelp,
        components: { afterInput: ["/payload/admin/team-members/use-account-value#UseAccountImage"] }
      }
    },
    {
      name: "useAccountImage",
      label: labels.teamUseAccountImage,
      type: "checkbox",
      defaultValue: false,
      access: { read: cmsStaffField },
      admin: { description: labels.teamUseAccountImageHelp }
    },
    { name: "role", label: labels.teamPublicRole, type: "text", required: true, access: { read: cmsStaffField } },
    { name: "bio", label: labels.teamBio, type: "textarea", access: { read: cmsStaffField } },
    {
      name: "link",
      label: labels.teamLink,
      type: "text",
      access: { read: cmsStaffField },
      admin: { description: labels.teamLinkHelp },
      // The same rule the page applies, so a saved link is never silently dropped there.
      validate: (value: string | null | undefined) => !value || linkable(value) !== null || labels.teamLinkInvalid
    },
    {
      // The Hideaway credits celebrate patrons: a cake after the name and confetti when the profile opens.
      name: "patronage",
      label: labels.teamPatronage,
      type: "checkbox",
      defaultValue: false,
      access: { read: cmsStaffField },
      admin: { position: "sidebar", description: labels.teamPatronageHelp }
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      access: { read: cmsStaffField },
      options: [
        { label: labels.draft, value: "draft" },
        { label: labels.published, value: "published" }
      ],
      admin: { position: "sidebar" }
    },
    {
      name: "order",
      label: labels.teamOrder,
      type: "number",
      defaultValue: 0,
      index: true,
      access: { read: cmsStaffField },
      admin: { position: "sidebar", description: labels.teamOrderHelp }
    }
  ]
};

/**
 * The roster's delete contract: deleting an account deletes its roster entry (ON DELETE CASCADE).
 *
 * Payload emits `ON DELETE SET NULL` for every single relationship (`@payloadcms/drizzle`
 * `schema/traverseFields.js`). On this required, `NOT NULL` link that would make deleting a linked account
 * fail. Cascade is the fitting contract: an entry is the record of that person's consent to appear (owner,
 * 19 Nov: "Adding counts as record"), so it can't outlive their account, and the public projection already
 * leaves out an entry without an account. Restrict would instead block an account deletion on a display row.
 *
 * Set on the adapter's raw schema before it is built, so generated migrations and the snapshot carry it and
 * later `migrate:create` runs don't drift. The Hideaway shapes its schema with a Postgres schema hook the same
 * way (`src/scripts/afterSchemaInit.ts`, registered in its `payload.config.ts`).
 */
export const teamMemberDeleteContract: PostgresSchemaHook = ({ adapter, schema }) => {
  const account = adapter.rawTables.team_members?.columns.user;
  if (!account?.reference) throw new Error("team_members.user_id is missing from the raw schema; the delete contract can't be set.");
  account.reference.onDelete = "cascade";
  return schema;
};
