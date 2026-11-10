import english from "../../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const ContentMedia: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "alt", group: english.Staff.schema.reading },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  upload: true,
  fields: [{ name: "alt", type: "text" }]
};
