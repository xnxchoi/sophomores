import type { Payload, TypedUser } from "payload";
import { isCmsStaff } from "@/lib/auth/access";

/**
 * Who may see Home drafts on this request: the CMS staff member whose session is verified now, or null.
 * Next draft mode alone is not enough: its cookie outlives logout, expiry and revoked staff authority, so
 * every draft read re-checks the live session (payload.auth with the request's headers). Draft mode off:
 * null, without an auth call. payload.auth can run the staff strategy's own provisioning; nothing here
 * writes Home copy.
 */
export async function homePageDraftViewer(
  payload: Pick<Payload, "auth">,
  { draftMode, headers }: { draftMode: boolean; headers: Headers }
): Promise<TypedUser | null> {
  if (!draftMode) return null;
  try {
    const { user } = await payload.auth({ headers });
    return isCmsStaff(user) ? (user as TypedUser) : null;
  } catch {
    return null;
  }
}

/** A Home copy id as Payload stores it (uuid). Anything else is not a draft to look up. */
export function homePageDraftId(raw: string | null | undefined): string | null {
  return raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}

/** `staff` comes from homePageDraftViewer, never from the query string: `?draft` and `?draftId` are public input. */
export type HomePageCopyRequest = { locale: "en" | "ko"; staff: TypedUser | null; draftId?: string | null };

/**
 * The home page copy a request should see. For verified staff in draft mode: the requested draft, then the
 * newest draft, read as that user with collection access applied (overrideAccess: false). For everyone: the
 * published copy, then the designated fallback copy. Null when none exists; callers serve the built
 * defaults then. It never writes: the first copies are seeded at startup (src/payload/seed/home-page.ts).
 */
export async function resolveHomePageCopy(
  payload: Payload,
  { locale, staff, draftId }: HomePageCopyRequest
): Promise<Record<string, unknown> | null> {
  if (staff) {
    const asStaff = { draft: true, locale, depth: 1, overrideAccess: false, user: staff } as const;
    const id = homePageDraftId(draftId);
    if (id) {
      try {
        const doc = await payload.findByID({ collection: "home-page", id, ...asStaff });
        if (doc) return doc as unknown as Record<string, unknown>;
      } catch {
        // An unknown draft id falls through to the newest draft.
      }
    }
    const drafts = await payload.find({ collection: "home-page", ...asStaff, limit: 1, sort: "-updatedAt" });
    if (drafts.totalDocs > 0) return drafts.docs[0] as unknown as Record<string, unknown>;
  }
  const published = await payload.find({
    collection: "home-page",
    where: { _status: { equals: "published" } },
    locale,
    limit: 1,
    depth: 1
  });
  if (published.totalDocs > 0) return published.docs[0] as unknown as Record<string, unknown>;
  const fallback = await payload.find({
    collection: "home-page",
    where: { isFallback: { equals: true } },
    draft: true,
    locale,
    limit: 1,
    depth: 1
  });
  return fallback.totalDocs > 0 ? (fallback.docs[0] as unknown as Record<string, unknown>) : null;
}

/** The route's and the page's shared reading of `?locale`: ko or en, en otherwise. */
export function homePageLocale(raw: string | null | undefined): "en" | "ko" {
  return raw === "ko" ? "ko" : "en";
}

/**
 * Where the Live Preview entry sends verified staff: always the local Home page, with a query built here from
 * approved values only (locale en|ko, a uuid draft id). No caller-supplied path, so it can't leave the site.
 */
export function homePagePreviewLocation(params: URLSearchParams): string {
  const target = new URLSearchParams({ locale: homePageLocale(params.get("locale")) });
  const id = homePageDraftId(params.get("draftId"));
  if (id) target.set("draftId", id);
  return `/?${target.toString()}`;
}
