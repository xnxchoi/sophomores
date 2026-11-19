/** The one rule for Team profile links, shared by the profile viewer and the roster collection's validation. */
const SITE = "https://site.invalid";
/**
 * Only a genuine site path or an absolute https address becomes a link; anything else is left out.
 * Backslashes and protocol-relative forms are rejected before parsing (URL parsing turns a slash and
 * backslash into another origin), and the normalised path that is emitted is checked again: dot
 * segments can collapse `/.//host` into a protocol-relative `//host`.
 */
export function linkable(href?: string) {
  if (!href) return null;
  if (/^https:\/\//i.test(href)) return URL.canParse(href) ? new URL(href).href : null;
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\") || !URL.canParse(href, SITE)) return null;
  const url = new URL(href, SITE);
  if (url.origin !== SITE) return null;
  const path = url.pathname + url.search + url.hash;
  return /^\/(?!\/)/.test(path) ? path : null;
}
