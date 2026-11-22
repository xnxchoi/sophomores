import type { PayloadRequest, Where } from "payload";

// Setlist entry routes write Tracks through Payload access
// (overrideAccess: false). Generic REST/admin writes stay staff-only, so a member
// cannot skip the route's visibility, deadline and eligibility checks by calling
// /api/tracks directly. A route opens one grant on its own PayloadRequest after
// those checks and only around the awaited write. The grant lives outside the
// serializable req.context/body (same pattern as src/lib/commerce/access.ts), so
// REST callers cannot forge it.
//
// An entry is a member's track row: a stable id with a fixed owner and setlist.
// Its place in the setlist is a separate setlist-positions row that only staff
// reorder; members never write it. `seat` is the hidden capacity token (1 or 2)
// that the unique (setlist, submittedBy, slotIndex) index uses to hold the
// two-entry cap under concurrent creates. It is not a position or an identity.
export type EntryCreateGrant = {
  kind: "entry-create";
  userId: string;
  setlistId: string;
  seat: number;
};
export type EntryWriteGrant = {
  kind: "entry-write";
  userId: string;
  setlistId: string;
  entryId: string;
};
type Grant = EntryCreateGrant | EntryWriteGrant;

const grants = new WeakMap<PayloadRequest, Grant>();

export async function withMusicGrant<T>(
  req: PayloadRequest,
  grant: Grant,
  work: () => Promise<T>
): Promise<T> {
  if (grants.has(req))
    throw new Error("A music write grant is already open on this request.");
  grants.set(req, grant);
  try {
    return await work();
  } finally {
    grants.delete(req);
  }
}

export const relationId = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: unknown }).id);
  return undefined;
};

/** The grant this request holds for its own member, or null. */
function memberGrant(req: PayloadRequest): Grant | null {
  const grant = grants.get(req);
  if (!grant) return null;
  if (req.user?.collection !== "users" || String(req.user.id) !== grant.userId)
    return null;
  return grant;
}

// Member-supplied track content. Identity (owner, setlist, seat) is added only on
// create and never changes; ordering keys and anything else are refused.
const contentFields = new Set([
  "title",
  "artist",
  "slug",
  "albumTitle",
  "duration",
  "coverUrl",
  "previewUrl",
  "isrc",
  "appleMusic",
  "note",
  "syncStatus"
]);
const identityFields = new Set(["setlist", "submittedBy", "slotIndex"]);

const onlyFields = (
  data: Record<string, unknown> | undefined,
  allowed: (key: string) => boolean
) => Boolean(data) && Object.keys(data!).every(allowed);

export function slotCreateGrant(
  req: PayloadRequest,
  data: Record<string, unknown> | undefined
): boolean {
  const grant = memberGrant(req);
  if (grant?.kind !== "entry-create" || !data) return false;
  return (
    onlyFields(
      data,
      (key) => contentFields.has(key) || identityFields.has(key)
    ) &&
    relationId(data.submittedBy) === grant.userId &&
    relationId(data.setlist) === grant.setlistId &&
    data.slotIndex === grant.seat
  );
}

const ownEntry = (grant: EntryWriteGrant): Where => ({
  and: [
    { id: { equals: grant.entryId } },
    { submittedBy: { equals: grant.userId } },
    { setlist: { equals: grant.setlistId } }
  ]
});

export function slotUpdateGrant(
  req: PayloadRequest,
  data: Record<string, unknown> | undefined
): Where | false {
  const grant = memberGrant(req);
  if (grant?.kind !== "entry-write") return false;
  return onlyFields(data, (key) => contentFields.has(key))
    ? ownEntry(grant)
    : false;
}

export function slotDeleteGrant(req: PayloadRequest): Where | false {
  const grant = memberGrant(req);
  return grant?.kind === "entry-write" ? ownEntry(grant) : false;
}
