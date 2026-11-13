import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { nanoid } from "nanoid";
import { staffWrite } from "../access";

export const Tracks: CollectionConfig = {
  slug: "tracks",
  admin: {
    useAsTitle: "title",
    group: english.Staff.schema.radio,
    defaultColumns: ["title", "artist", "setlist", "submittedBy", "slotIndex", "syncStatus"]
  },
  access: {
    read: () => true,
    create: staffWrite,
    update: staffWrite,
    delete: staffWrite
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // Ensure slug is populated
        if (!data.slug && data.title) {
          const sanitized = data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          data.slug = `${sanitized || "track"}-${nanoid(6)}`;
        }
        return data;
      }
    ],
    afterChange: [
      async ({ doc, req }) => {
        // When a track is created or updated with a setlist link, mark the setlist as dirty
        if (doc?.setlist) {
          const setlistId = typeof doc.setlist === "object" ? doc.setlist.id : doc.setlist;
          try {
            await req.payload.update({
              collection: "setlists",
              id: setlistId,
              data: { needsSync: true }
            });
          } catch {
            // Ignore error if setlist update fails in afterChange
          }
        }
      }
    ]
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "artist", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "albumTitle", type: "text" },
    { name: "isrc", type: "text", index: true, admin: { description: "Universal ISRC code" } },
    { name: "duration", type: "number", admin: { description: "Duration in milliseconds or seconds" } },
    { name: "coverUrl", type: "text" },
    { name: "previewUrl", type: "text", admin: { description: "30s audio preview snippet URL" } },
    {
      name: "audioUrl",
      type: "text",
      required: false,
      admin: { description: "Direct audio stream URL (for self-hosted or uploaded audio)" }
    },
    { name: "album", type: "relationship", relationTo: "albums" },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true },

    // --- Platform Sources ---
    {
      name: "appleMusic",
      type: "group",
      fields: [
        { name: "id", type: "text", index: true, admin: { description: "Apple Music Catalog Song ID" } },
        { name: "url", type: "text" },
        { name: "storefront", type: "text", defaultValue: "us" }
      ]
    },
    {
      name: "spotify",
      type: "group",
      fields: [
        { name: "id", type: "text", index: true },
        { name: "uri", type: "text" },
        { name: "url", type: "text" }
      ]
    },
    {
      name: "youtubeMusic",
      type: "group",
      fields: [
        { name: "videoId", type: "text" },
        { name: "url", type: "text" }
      ]
    },

    // --- Setlist Slot & Attendee Attribution ---
    {
      name: "setlist",
      type: "relationship",
      relationTo: "setlists",
      index: true
    },
    {
      name: "submittedBy",
      type: "relationship",
      relationTo: "users",
      index: true
    },
    {
      name: "slotIndex",
      type: "number",
      min: 1,
      max: 2,
      admin: { description: "1 for Slot 1, 2 for Slot 2" }
    },
    {
      name: "note",
      type: "text",
      maxLength: 120,
      admin: { description: "Attendee dedication or note" }
    },
    {
      name: "syncStatus",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending Sync", value: "pending" },
        { label: "Synced to Playlist", value: "synced" },
        { label: "Failed", value: "failed" }
      ]
    },
    {
      name: "syncedAt",
      type: "date",
      admin: { readOnly: true }
    }
  ]
};
