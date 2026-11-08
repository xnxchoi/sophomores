import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const Albums: CollectionConfig = {
  slug: "albums",
  admin: { useAsTitle: "title", group: "Radio" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "artist", type: "text" },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "coverUrl", type: "text" }
  ]
};
