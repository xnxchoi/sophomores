import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { staffWrite } from "../access";
import { serverOwnedField } from "@/lib/auth/access";
import { isAuthorizedCurator } from "@/lib/music/curator";

const curatorField = ({ req }: { req: { user?: unknown } }) => isAuthorizedCurator(req.user);

export const Setlists: CollectionConfig = {
  slug: "setlists",
  admin: {
    useAsTitle: "title",
    group: "Music & Setlists",
    defaultColumns: ["title", "status", "deadline", "provider", "lastSyncedAt"]
  },
  hooks: {
    // A setlist's positions go with it (their setlist column cannot be emptied).
    beforeDelete: [async ({ id, req }) => {
      const result = await req.payload.delete({
        collection: "setlist-positions", where: { setlist: { equals: id } }, depth: 0, req, overrideAccess: true
      });
      if (result.errors.length > 0) throw new Error("Could not remove the setlist's running order.");
    }]
  },
  access: {
    read: ({ req }) => staffWrite({ req }) ? true : { isPublic: { equals: true } },
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
      // Owner, 22 Nov: "You are afforded 2 entries". The routes, eligibility and
      // the hidden seat all read this, so it stays within 1 to 2.
      min: 1,
      max: 2,
      validate: (value: number | null | undefined) =>
        (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 2) || "Entries per member must be 1 or 2.",
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
          // A stored Apple credential: only a granted curator may set it.
          access: { read: serverOwnedField, create: curatorField, update: curatorField },
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
      // The running order. Staff drag rows here; Payload keeps a fractional key
      // per row, so deleting one never moves the others. Members never write it.
      name: "runningOrder",
      type: "join",
      collection: "setlist-positions",
      on: "setlist",
      orderable: true,
      defaultLimit: 0,
      label: english.Staff.schema.runningOrder,
      admin: { description: english.Staff.schema.runningOrderDescription, defaultColumns: ["track"] }
    },
    {
      name: "tracks",
      type: "relationship",
      relationTo: "tracks",
      hasMany: true,
      admin: {
        description: "Kept by sync in running order. Set the order in Running order."
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
