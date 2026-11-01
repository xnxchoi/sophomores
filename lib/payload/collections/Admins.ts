import type { CollectionConfig } from "payload";
import { administratorAccess } from "@/lib/auth/access";
import { staffBetterAuthStrategy } from "@/lib/auth/staff-strategy";

export const Admins: CollectionConfig = {
  slug: "admins",
  auth: {
    disableLocalStrategy: true,
    strategies: [staffBetterAuthStrategy]
  },
  access: administratorAccess,
  admin: {
    useAsTitle: "email",
    group: "Staff & Administration",
    description:
      "Internal staff accounts authorized to edit website copy, review translations, and manage ticketing."
  },
  fields: [
    {
      name: "email",
      type: "email",
      unique: true,
      required: true,
      index: true
    },
    {
      name: "name",
      type: "text",
      required: true
    },
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      options: [
        { label: "Super Admin", value: "admin" },
        { label: "Editorial & Copywriter", value: "editor" },
        { label: "Event Host / Door Staff", value: "staff" }
      ],
      required: true
    }
  ]
};
