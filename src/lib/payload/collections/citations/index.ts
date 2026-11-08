import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const Citations: CollectionConfig = {
  slug: "citations",
  admin: { useAsTitle: "quote", group: "Reading" },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: staffWrite,
    delete: staffWrite
  },
  fields: [
    { name: "post", type: "relationship", relationTo: "posts", required: true },
    { name: "quote", type: "textarea", required: true },
    { name: "start", type: "number", required: true },
    { name: "end", type: "number", required: true },
    { name: "note", type: "textarea" },
    { name: "authorLabel", type: "text" }
  ]
};
