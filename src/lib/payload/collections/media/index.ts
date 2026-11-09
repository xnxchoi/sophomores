import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const ContentMedia: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "alt", group: "Reading" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  upload: true,
  fields: [{ name: "alt", type: "text" }]
};
