import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { publishedOrStaff, staffWrite } from "../access";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: { useAsTitle: "title", group: english.Staff.schema.reading, defaultColumns: ["title", "status", "publishedAt"] },
  access: {
    read: publishedOrStaff,
    create: staffWrite,
    update: staffWrite,
    delete: staffWrite
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "dek", type: "textarea" },
    { name: "body", type: "textarea" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: english.Staff.schema.draft, value: "draft" },
        { label: english.Staff.schema.published, value: "published" }
      ]
    },
    { name: "publishedAt", type: "date" },
    { name: "heroUrl", type: "text" },
    { name: "authorName", type: "text" },
    { name: "authorImageUrl", type: "text" },
    { name: "category", type: "relationship", relationTo: "categories" },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true }
  ]
};
