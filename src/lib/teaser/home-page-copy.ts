import type { Payload } from "payload";

export type HomePageCopyRequest = { locale: "en" | "ko"; draft: boolean; draftId?: string | null };

/**
 * The home page copy a request should see: the requested draft, the newest draft in draft mode, the
 * published copy, then the designated fallback draft. Null when none exists; callers serve the built
 * defaults then. It never writes: the first copies are seeded at startup (src/payload/seed/home-page.ts).
 */
export async function resolveHomePageCopy(
  payload: Payload,
  { locale, draft, draftId }: HomePageCopyRequest
): Promise<Record<string, unknown> | null> {
  if (draftId) {
    try {
      const doc = await payload.findByID({ collection: "home-page", id: draftId, draft: true, locale, depth: 1 });
      if (doc) return doc as unknown as Record<string, unknown>;
    } catch {
      // An unknown draft id falls through to the draft/published lookup.
    }
  }
  if (draft) {
    const drafts = await payload.find({ collection: "home-page", draft: true, locale, limit: 1, sort: "-updatedAt", depth: 1 });
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
