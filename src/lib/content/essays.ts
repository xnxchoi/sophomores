// Relative, not "@/": next.config.ts imports this module, and its loader does not resolve the path alias.
import { isInternalLink } from "../../utilities/isInternalLink";

/**
 * The essays section's switch (owner, 24 Nov: "Let's 404 the entire essays path for now"). While it is false, every
 * /essays URL is the site's 404 (next.config.ts rewrites them to the unmatched route before any page renders), and
 * every link into /essays is hidden: the menu, the tour, search, and notifications. The reading code and the imported
 * essays stay as they are; setting this to true turns the section back on.
 */
export const essaysEnabled: boolean = false;

/**
 * True when a link leads into the essays section: exactly what next.config.ts sends there, so the link gate and the
 * route gate agree. Only this site's links count (isInternalLink: relative, or absolute on the configured origin);
 * the URL parser resolves dot segments and drops the query and hash, and the path is matched as Next matches custom
 * routes: case-insensitively, with the legacy /read and /reading URLs that redirect to /essays.
 */
export function isEssaysPath(href: string): boolean {
  if (!isInternalLink(href)) return false;
  const { pathname } = new URL(href, "https://relative.invalid");
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // A malformed escape stays as written.
  }
  return [pathname, decoded].some((path) => /^\/(?:essays|read|reading)(?:\/|$)/i.test(path));
}

/** The href if it can be followed now; undefined for a link into /essays while essays are off. */
export function reachableHref(href: string | null | undefined): string | undefined {
  if (!href) return undefined;
  return essaysEnabled || !isEssaysPath(href) ? href : undefined;
}
