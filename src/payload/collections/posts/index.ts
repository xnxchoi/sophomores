import english from "../../../../messages/en.json";
import type { CollectionConfig, TextFieldSingleValidation } from "payload";
import { text } from "payload/shared";
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
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      // /essays/in is the essay listing, so an essay slugged "in" could never open. Payload's own text
      // validation (required, lengths) still runs for every other value.
      validate: ((value, options) =>
        value === "in" ? english.Staff.schema.postSlugReserved : text(value, options)) satisfies TextFieldSingleValidation
    },
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
