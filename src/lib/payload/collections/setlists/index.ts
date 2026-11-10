import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";

export const Setlists: CollectionConfig = {
  slug: "setlists",
  admin: {
    useAsTitle: "title",
    group: "Music & Setlists",
    defaultColumns: ["title", "status", "deadline", "provider", "lastSyncedAt"]
  },
  access: {
    read: () => true,
    create: staffWrite,
    update: staffWrite,
    delete: staffWrite
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        description: "Event setlist title (e.g. 'Sophomores Tokyo Pop-up Setlist')"
      }
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true
    },
    {
      name: "description",
      type: "textarea"
    },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "Draft (Setup & Testing)", value: "draft" },
        { label: "Active (Accepting Submissions)", value: "active" },
        { label: "Locked (Deadline Passed - Read Only)", value: "locked" },
        { label: "Finalized / Private", value: "finalized" }
      ],
      required: true,
      index: true
    },
    {
      name: "deadline",
      type: "date",
      required: true,
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description: "Exact UTC timestamp after which attendee slot edits are rejected"
      }
    },
    {
      name: "maxSlotsPerUser",
      type: "number",
      defaultValue: 2,
      required: true,
      admin: {
        description: "Number of slots awarded to each eligible attendee"
      }
    },
    {
      name: "provider",
      type: "select",
      defaultValue: "apple_music",
      options: [
        { label: "Apple Music", value: "apple_music" },
        { label: "Spotify", value: "spotify" },
        { label: "Dual Sync (Apple + Spotify)", value: "both" }
      ],
      required: true
    },
    {
      name: "appleMusic",
      type: "group",
      fields: [
        {
          name: "playlistId",
          type: "text",
          admin: {
            description: "Apple Music Library Playlist ID (e.g. p.XXXXXX)"
          }
        },
        {
          name: "playlistUrl",
          type: "text",
          admin: {
            description: "Apple Music public share URL for attendees to listen or add"
          }
        },
        {
          name: "ownerUserToken",
          type: "text",
          admin: {
            description: "Music User Token generated via MusicKit JS for the playlist owner. Overrides APPLE_MUSIC_USER_TOKEN."
          }
        }
      ]
    },
    {
      name: "spotify",
      type: "group",
      fields: [
        {
          name: "playlistId",
          type: "text"
        },
        {
          name: "playlistUrl",
          type: "text"
        }
      ]
    },
    {
      name: "tracks",
      type: "relationship",
      relationTo: "tracks",
      hasMany: true,
      admin: {
        description: "Tracks included in this setlist, ordered for the performance."
      }
    },
    {
      name: "isPublic",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Uncheck to make this setlist unqueryable and hidden from public views."
      }
    },
    {
      name: "needsSync",
      type: "checkbox",
      defaultValue: false,
      admin: {
        readOnly: true,
        description: "Set to true when attendee tracks have changed and pending sync to Apple Music / Spotify."
      }
    },
    {
      name: "lastSyncedAt",
      type: "date",
      admin: {
        readOnly: true
      }
    }
  ]
};
