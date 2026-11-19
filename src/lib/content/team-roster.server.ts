import "server-only";
import type { Payload } from "payload";
import type { CreditSlot } from "./slots";

/** What /team receives: display values only, never the linked account or its id. */
export type RosterPerson = Pick<CreditSlot, "id" | "name" | "role" | "bio" | "href" | "patronage" | "profilePic">;

type MediaRef = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null };

/** The fields the projection selects from a `team-members` entry, with `user` and `portrait` populated. */
export type RosterEntry = {
  id: string | number;
  displayName?: string | null;
  role?: string | null;
  bio?: string | null;
  link?: string | null;
  patronage?: boolean | null;
  useAccountImage?: boolean | null;
  portrait?: MediaRef | string | number | null;
  /** The linked account's id. The relationship is held at depth 0 (`maxDepth: 0`), so it is never populated. */
  user?: string | number | { id?: string | number } | null;
};

const accountID = (user: RosterEntry["user"]) =>
  user === null || user === undefined ? null : typeof user === "object" ? (user.id === undefined ? null : String(user.id)) : String(user);

const text = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");

/**
 * Sign-in providers whose profile-image hosts the roster may show. Anything else (another scheme, host or a
 * malformed URL) falls back to no portrait, so an account value can't point the page at an arbitrary origin.
 */
const ACCOUNT_IMAGE_HOSTS = [".googleusercontent.com", ".kakaocdn.net"];
export function approvedAccountImage(value: string | null | undefined): string {
  const candidate = text(value);
  if (!URL.canParse(candidate)) return "";
  const url = new URL(candidate);
  const allowed = url.protocol === "https:" && !url.username && !url.password && !url.port
    && ACCOUNT_IMAGE_HOSTS.some((suffix) => url.hostname.endsWith(suffix));
  return allowed ? url.href : "";
}

/**
 * One roster entry for the page, built only from values staff approved: the staff-set display name, an
 * uploaded portrait, or the account image when staff ticked "Use account image" (looked up separately, by
 * account id). Returns null when the entry can't be shown: no display name or role, or its account is gone.
 */
export function toTeamPerson(entry: RosterEntry, accountImages: ReadonlyMap<string, string | null | undefined> = new Map()): RosterPerson | null {
  const account = accountID(entry.user);
  const name = text(entry.displayName);
  const role = text(entry.role);
  if (!account || !name || !role) return null;
  const portrait = entry.portrait && typeof entry.portrait === "object" ? entry.portrait : null;
  const src = text(portrait?.url) || (entry.useAccountImage ? approvedAccountImage(accountImages.get(account)) : "");
  const bio = text(entry.bio);
  const href = text(entry.link);
  const size = portrait?.url && portrait.width && portrait.height ? { width: portrait.width, height: portrait.height } : {};
  return {
    id: String(entry.id),
    name,
    role,
    ...(bio ? { bio } : {}),
    ...(href ? { href } : {}),
    ...(entry.patronage ? { patronage: true } : {}),
    ...(src ? { profilePic: { src, alt: text(portrait?.alt) || name, ...size } } : {})
  };
}

/**
 * The published roster in staff order: the one fixed, server-only projection behind /team. The collection is
 * staff-read only, so these are trusted Local API reads; access is never delegated to `populate`. The entry
 * read populates only portrait media (the account link stays an id at `maxDepth: 0`). A second fixed-select
 * read fetches `image` alone, and only for accounts whose image staff approved. Only display values return.
 */
export async function loadTeamRoster(payload: Payload): Promise<RosterPerson[]> {
  const { docs } = await payload.find({
    collection: "team-members",
    overrideAccess: true,
    where: { status: { equals: "published" } },
    // Ties in staff order fall back to the entry id, so the roll never reshuffles between reads.
    sort: ["order", "id"],
    depth: 1,
    pagination: false,
    select: { displayName: true, role: true, bio: true, link: true, patronage: true, useAccountImage: true, portrait: true, user: true },
    populate: { media: { url: true, alt: true, width: true, height: true } }
  });
  const entries = docs as RosterEntry[];
  const approved = [...new Set(entries.filter((entry) => entry.useAccountImage).map((entry) => accountID(entry.user)).filter((id): id is string => id !== null))];
  const accountImages = new Map<string, string | null | undefined>();
  if (approved.length > 0) {
    const accounts = await payload.find({
      collection: "users",
      overrideAccess: true,
      where: { id: { in: approved } },
      depth: 0,
      pagination: false,
      select: { image: true }
    });
    for (const account of accounts.docs as Array<{ id: string | number; image?: string | null }>) accountImages.set(String(account.id), account.image);
  }
  return entries.map((entry) => toTeamPerson(entry, accountImages)).filter((person): person is RosterPerson => person !== null);
}
