import english from "../../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const Tracks: CollectionConfig = {
  slug: "tracks",
  admin: { useAsTitle: "title", group: english.Staff.schema.radio },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "artist", type: "text" },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "coverUrl", type: "text" },
    { name: "audioUrl", type: "text", required: true },
    { name: "duration", type: "number" },
    { name: "album", type: "relationship", relationTo: "albums" },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true }
  ]
};
