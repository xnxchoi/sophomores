import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const Playlists: CollectionConfig = {
  slug: "playlists",
  admin: { useAsTitle: "title", group: english.Staff.schema.radio },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "coverUrl", type: "text" },
    { name: "tracks", type: "relationship", relationTo: "tracks", hasMany: true }
  ]
};
