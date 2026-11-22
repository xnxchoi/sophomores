import english from "../../../../messages/en.json";
import { ValidationError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionConfig, type PayloadRequest, type Where } from "payload";
import { nanoid } from "nanoid";
import { staffWrite } from "../access";
import { relationId, slotCreateGrant, slotDeleteGrant, slotUpdateGrant } from "../music-grants";

// The dirty flag is server bookkeeping on a readOnly field: it runs inside the
// caller's request (same transaction) as a trusted system write, and a failure
// fails the track write with it.
// It writes that one column through the adapter's atomic where-update
// (`UPDATE setlists SET needs_sync = true WHERE id = …`). A Local API update
// would rewrite the whole setlist row, id and Apple token included, from a read
// taken earlier: that undoes a concurrent staff edit, and rewriting the id takes
// a lock that deadlocks against simultaneous track inserts on the same setlist.
// No match is a since-deleted setlist, not an error.
async function markSetlistDirty(req: PayloadRequest, setlist: unknown): Promise<void> {
  const id = relationId(setlist);
  if (id === undefined) return;
  await req.payload.db.updateOne({
    // `updatedAt: null` is the adapter's documented way to leave updated_at as it
    // is: the flag is bookkeeping, not a staff edit of the setlist.
    collection: "setlists", where: { id: { equals: id } }, data: { needsSync: true, updatedAt: null }, req,
    options: { atomic: true }, returning: false
  });
}

// An entry (a member's track row) has a stable id and a fixed owner, setlist and
// hidden seat. Its order lives in setlist-positions, so nothing here is a
// position. Member rows must carry all three; none of them change after creation,
// on any update path (trusted overrideAccess writes included). Staff move an
// entry by deleting it and creating a new one.
const keepEntryIdentity: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (!data) return data;
  if (operation === "create") {
    const memberRow = relationId(data.submittedBy) !== undefined;
    if (memberRow && (relationId(data.setlist) === undefined || typeof data.slotIndex !== "number"))
      throw new ValidationError({ collection: "tracks", errors: [{ path: "slotIndex", message: english.Staff.schema.entryNeedsSetlistAndSeat }], req });
    return data;
  }
  if (operation !== "update" || !originalDoc) return data;
  const memberRow = relationId(originalDoc.submittedBy) !== undefined;
  const changed = (["submittedBy", "slotIndex", ...(memberRow ? ["setlist"] : [])] as const).filter((name) => {
    if (!(name in data) || data[name] === undefined) return false;
    return name === "slotIndex"
      ? (data.slotIndex ?? null) !== (originalDoc.slotIndex ?? null)
      : relationId(data[name]) !== relationId(originalDoc[name]);
  });
  if (changed.length === 0) return data;
  throw new ValidationError({
    collection: "tracks",
    errors: changed.map((path) => ({ path, message: english.Staff.schema.slotIdentityIsFixed })),
    req
  });
};

// The track's setlist-positions row: added at the end when the track joins a
// setlist, removed when it leaves or before it is deleted. Trusted system writes inside the
// track's request (same transaction). A position row is never updated here,
// because Payload rewrites a whole row and would put back a stale order key.
async function removePositions(req: PayloadRequest, trackId: string): Promise<void> {
  const result = await req.payload.delete({
    collection: "setlist-positions", where: { track: { equals: trackId } }, depth: 0, req, overrideAccess: true
  });
  if (result.errors.length > 0) throw new Error("Could not remove the track's setlist position.");
}

const syncPosition: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const setlist = relationId(doc?.setlist);
  const previous = operation === "update" ? relationId(previousDoc?.setlist) : undefined;
  if (operation === "update" && setlist === previous) return doc;
  if (operation === "update" && previous !== undefined) await removePositions(req, String(doc.id));
  if (setlist !== undefined)
    await req.payload.create({
      collection: "setlist-positions", data: { setlist, track: doc.id }, depth: 0, req, overrideAccess: true
    });
  return doc;
};

export const Tracks: CollectionConfig = {
  slug: "tracks",
  admin: {
    useAsTitle: "title",
    group: english.Staff.schema.radio,
    defaultColumns: ["title", "artist", "setlist", "submittedBy", "syncStatus"]
  },
  // Review-copy CMS editing (admin and REST) retains setlist/track CRUD; an
  // entry's owner, setlist and seat are fixed after creation (keepEntryIdentity).
  // It does not enable attendee nominations or Apple sync. Attendees write only
  // their own entries, only through the setlist entry routes, which open a
  // request-scoped grant after their eligibility checks.
  access: {
    read: ({ req }): boolean | Where => staffWrite({ req }) || {
      or: [
        { setlist: { exists: false } },
        { "setlist.isPublic": { equals: true } }
      ]
    },
    create: ({ req, data }) => staffWrite({ req }) || slotCreateGrant(req, data),
    update: ({ req, data }) => staffWrite({ req }) || slotUpdateGrant(req, data),
    delete: ({ req }) => staffWrite({ req }) || slotDeleteGrant(req)
  },
  // At most two entries per member per setlist: each takes a hidden seat (1 or 2)
  // and the database keeps one entry per seat, so two simultaneous creates for
  // the last seat leave one row and the other gets 409. Staff-curated rows leave
  // the owner and seat NULL, which Postgres never treats as equal.
  indexes: [{ fields: ["setlist", "submittedBy", "slotIndex"], unique: true }],
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
    // A created, changed or removed setlist track marks its setlist for sync.
    beforeChange: [keepEntryIdentity],
    afterChange: [syncPosition, async ({ doc, req }) => { await markSetlistDirty(req, doc?.setlist); }],
    // Before the row goes, while the position still points at it.
    beforeDelete: [async ({ id, req }) => { await removePositions(req, String(id)); }],
    afterDelete: [async ({ doc, req }) => { await markSetlistDirty(req, doc?.setlist); }]
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
      index: true,
      // Fixed on a member's entry; a curated track can still be placed.
      access: { update: ({ doc }) => relationId(doc?.submittedBy) === undefined }
    },
    {
      name: "submittedBy",
      type: "relationship",
      relationTo: "users",
      index: true,
      access: { update: () => false }
    },
    {
      name: "slotIndex",
      type: "number",
      min: 1,
      max: 2,
      // A custom validate replaces Payload's numeric default, so it keeps the bounds.
      validate: (value: number | null | undefined) =>
        value === null || value === undefined || (Number.isInteger(value) && value >= 1 && value <= 2)
          || "Slot number must be 1 or 2.",
      access: { update: () => false },
      // Hidden capacity seat for the two-entry cap; not a position or an identity.
      admin: { hidden: true }
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
