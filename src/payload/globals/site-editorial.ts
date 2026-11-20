import english from "../../../messages/en.json";
import type { GlobalAfterChangeHook, GlobalAfterReadHook, GlobalConfig, Payload, Where } from "payload";
import { revalidatePath } from "next/cache";
import { staffWrite } from "../collections/access";
import { lockGlobalBeforeUpdate } from "./singleton-lock";

const label = english.Staff.schema;

/** Public, and past setup: what /setlists/[slug] shows a visitor (`isPublic`; `draft` is setup and testing). */
export const FEATURABLE_SETLIST: Where = { and: [{ isPublic: { equals: true } }, { status: { not_equals: "draft" } }] };

/** The title and description sit in the site layout; the featured setlist on /music (Payload template). */
const revalidateSite: GlobalAfterChangeHook = ({ doc, context }) => {
  if (!context.disableRevalidate) {
    try {
      revalidatePath("/", "layout");
    } catch {
      // Outside a Next request (scripts, tests) there is nothing to revalidate.
    }
  }
  return doc;
};

/**
 * A setlist that went back to draft after it was chosen isn't returned populated, by the public API either.
 * This runs after population (a field hook runs before it); the stored choice stays until staff change it.
 * A request can populate with a projection that leaves out `isPublic` or `status`; then their stored values
 * are looked up, so an eligible setlist isn't blanked and an ineligible one isn't let through.
 */
export const hideStaleFeaturedSetlist: GlobalAfterReadHook = async ({ doc, req }) => {
  const setlist = (doc as Record<string, unknown>).featuredSetlist as Record<string, unknown> | null | undefined;
  if (!setlist || typeof setlist !== "object") return doc;
  let flags: unknown = setlist;
  if (typeof setlist.isPublic !== "boolean" || typeof setlist.status !== "string") {
    flags = typeof setlist.id === "string" || typeof setlist.id === "number"
      ? await req.payload.findByID({ collection: "setlists", id: setlist.id, select: { isPublic: true, status: true }, depth: 0, overrideAccess: true, disableErrors: true, req })
      : null;
  }
  return featurable(flags) ? doc : { ...doc, featuredSetlist: null };
};

/**
 * Site-wide editorial facts the business edits in the admin (owner, 20 Nov: "all the stuff that must be
 * provided by us - the business- should be wired to Payloadcms for convenient editing."). Shaped like The
 * Hideaway's Header and Footer globals. The wordmark stays the approved BrandMark in code.
 */
export const SiteEditorial: GlobalConfig = {
  slug: "site-editorial",
  label: label.siteEditorial,
  admin: { description: label.siteEditorialDescription },
  access: { read: () => true, update: staffWrite },
  hooks: { beforeOperation: [lockGlobalBeforeUpdate], afterRead: [hideStaleFeaturedSetlist], afterChange: [revalidateSite] },
  fields: [
    {
      name: "siteTitle",
      type: "text",
      localized: true,
      label: label.siteTitle
    },
    {
      name: "siteDescription",
      type: "textarea",
      localized: true,
      label: label.siteDescription
    },
    {
      name: "featuredSetlist",
      type: "relationship",
      relationTo: "setlists",
      label: label.featuredSetlist,
      // Only a setlist the public can open: the admin offers these, and a save of any other is refused.
      filterOptions: () => FEATURABLE_SETLIST
    }
  ]
};

export type SiteEditorialCopy = Readonly<{
  title: string;
  description: string;
  featuredSetlistSlug: string;
}>;

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/** A populated setlist the public can open; an unpopulated id (hidden by access) or a private or draft one isn't. */
function featurable(setlist: unknown): boolean {
  if (!setlist || typeof setlist !== "object") return false;
  const doc = setlist as Record<string, unknown>;
  return doc.isPublic === true && doc.status !== "draft";
}

export function parseSiteEditorial(value: unknown): SiteEditorialCopy {
  const doc = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const setlist = doc.featuredSetlist;
  return {
    title: text(doc.siteTitle),
    description: text(doc.siteDescription),
    featuredSetlistSlug: featurable(setlist) ? text((setlist as Record<string, unknown>).slug) : ""
  };
}

/** The site's editorial facts in one locale; depth 1 resolves the featured setlist, read with visitor access. */
export async function loadSiteEditorial(
  payload: Payload,
  locale: "en" | "ko"
): Promise<SiteEditorialCopy> {
  return parseSiteEditorial(
    await payload.findGlobal({
      slug: "site-editorial",
      locale,
      depth: 1,
      // Populate as a visitor: a private setlist stays an unpopulated id and isn't featured.
      overrideAccess: false
    })
  );
}
