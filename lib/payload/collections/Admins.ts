import type { CollectionConfig } from "payload";

export const Admins: CollectionConfig = {
  slug: "admins",
  auth: true,
  access: {
    admin: ({ req }) => req.user?.collection === "admins",
  },
  admin: {
    useAsTitle: "email",
    group: "Staff & Administration",
    description: "Internal staff accounts authorized to edit website copy, review translations, and manage ticketing.",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      options: [
        { label: "Super Admin", value: "admin" },
        { label: "Editorial & Copywriter", value: "editor" },
        { label: "Event Host / Door Staff", value: "staff" },
      ],
      required: true,
    },
  ],
};
