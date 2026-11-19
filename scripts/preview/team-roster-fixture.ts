import type { CollectionSlug, Payload, PayloadRequest, Where } from "payload";

/**
 * A synthetic Team roster for the disposable preview, so /team (the Hideaway credits port) can be checked
 * live: enough names for the roll to loop, one patron (cake and confetti), one entry with no portrait (the
 * no-portrait focus card), and one with an approved account image on an allowlisted host. Every account,
 * entry and image is PREVIEW-labelled and synthetic; none is a real person. The account image URL is a
 * synthetic path on an allowlisted host. It isn't expected to load, and the check is that the page takes the
 * approved-image path.
 */
const id = (n: number) => `ed98b970-55aa-4e85-a3dc-0b173be1c${String(100 + n).padStart(3, "0")}`;
const ROLES = ["PREVIEW Design", "PREVIEW Editorial", "PREVIEW Music"] as const;
const COUNT = 12;
export const PREVIEW_ROSTER_MEDIA_ID = id(99);
const PORTRAIT_FILE = "preview-team-portrait.png";
const ACCOUNT_IMAGE = "https://lh3.googleusercontent.com/a/PREVIEW-synthetic-account-image";

export const previewRoster = Array.from({ length: COUNT }, (_, index) => {
  const n = index + 1;
  const label = String(n).padStart(2, "0");
  return {
    user: { id: id(n), email: `team-roster-${label}@preview.invalid`, name: `PREVIEW account ${label}`, ...(n === 3 ? { image: ACCOUNT_IMAGE } : {}) },
    entry: {
      id: id(50 + n),
      user: id(n),
      displayName: `PREVIEW Credit ${label}`,
      role: ROLES[index % ROLES.length],
      bio: `PREVIEW synthetic profile ${label}. Not a real person.`,
      ...(n === 1 ? { patronage: true, link: "/help" } : {}),
      // 02: no portrait at all. 03: the account image, approved. Everyone else: the synthetic portrait.
      ...(n === 2 ? {} : n === 3 ? { useAccountImage: true } : { portrait: PREVIEW_ROSTER_MEDIA_ID }),
      status: "published",
      order: n
    }
  };
});

type Deps = {
  payload: Payload;
  local: { req: PayloadRequest; depth: 0; overrideAccess: true };
  create: (collection: CollectionSlug, id: string, data: Record<string, unknown>) => Promise<{ id: string | number }>;
  requireFixture: (condition: unknown, message: string) => asserts condition;
};

/**
 * Idempotent. With no roster and none of the fixture accounts present, it creates them all. When the whole
 * fixture is already there, it does nothing. Anything else is refused and nothing is changed: a roster entry
 * that isn't part of the fixture, a partial fixture, or an existing account that clashes.
 */
export async function ensurePreviewRoster(deps: Deps): Promise<"created" | "present"> {
  const { payload, local, create } = deps;
  // An assertion function must be called through an explicitly typed name (TS2775).
  const requireFixture: Deps["requireFixture"] = deps.requireFixture;
  const roster = "team-members" as CollectionSlug;
  const userIDs = previewRoster.map((row) => row.user.id);
  const entryIDs = previewRoster.map((row) => row.entry.id);
  const find = (collection: CollectionSlug, where: Where) => payload.find({ ...local, collection, where, limit: 200, pagination: false });
  const entries = await find(roster, {});
  const accounts = await find("users", { or: [{ id: { in: userIDs } }, { email: { in: previewRoster.map((row) => row.user.email) } }] });
  const media = await find("media", { or: [{ id: { equals: PREVIEW_ROSTER_MEDIA_ID } }, { filename: { equals: PORTRAIT_FILE } }] });
  requireFixture(entries.docs.every((doc) => entryIDs.includes(String(doc.id))),
    "Refusing to seed the roster: team-members holds entries that are not the preview fixture.");
  const complete = entries.totalDocs === COUNT && accounts.totalDocs === COUNT && media.totalDocs === 1
    && accounts.docs.every((doc) => userIDs.includes(String(doc.id)));
  if (complete) return "present";
  requireFixture(entries.totalDocs === 0 && accounts.totalDocs === 0 && media.totalDocs === 0,
    "Refusing to seed the roster: a partial or clashing roster fixture exists; no repair was attempted.");

  const { default: sharp } = await import("sharp");
  const portrait = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="704" height="800"><rect width="704" height="800" fill="#3a3a3a"/><circle cx="352" cy="320" r="150" fill="#6a6a6a"/><rect x="152" y="520" width="400" height="280" rx="200" fill="#6a6a6a"/><text x="352" y="760" font-family="sans-serif" font-size="40" fill="#cfcfcf" text-anchor="middle">PREVIEW</text></svg>`)).png().toBuffer();
  const { serverChosenIDContext } = await import("../../src/payload/server-chosen-ids");
  const stored = await payload.create({ ...local, collection: "media", context: serverChosenIDContext(PREVIEW_ROSTER_MEDIA_ID),
    data: { id: PREVIEW_ROSTER_MEDIA_ID, alt: "PREVIEW synthetic portrait" } as never,
    file: { name: PORTRAIT_FILE, mimetype: "image/png", size: portrait.length, data: portrait } });
  requireFixture(String(stored.id) === PREVIEW_ROSTER_MEDIA_ID, "The preview portrait identity was not retained.");
  for (const row of previewRoster) {
    const { id: userID, ...account } = row.user;
    await create("users", userID, { ...account, emailVerified: true, membershipStatus: "approved", localePreference: "en" });
  }
  for (const row of previewRoster) {
    const { id: entryID, ...entry } = row.entry;
    await create(roster, entryID, entry);
  }
  const check = await find(roster, { id: { in: entryIDs } });
  requireFixture(check.totalDocs === COUNT, "The preview roster was not retained.");
  return "created";
}
