import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: { useAsTitle: "label", group: "Reading" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "label", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true }
  ]
};
