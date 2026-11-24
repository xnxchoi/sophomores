/**
 * The essays section's switch (owner, 24 Nov: "Let's 404 the entire essays path for now"). While it is false, every
 * /essays URL is the site's 404 (next.config.ts rewrites them to the unmatched route before any page renders), and
 * every link into /essays is hidden: the menu, the tour, search, and notifications. The reading code and the imported
 * essays stay as they are; setting this to true turns the section back on.
 */
export const essaysEnabled: boolean = false;

/** True when a site path leads into the essays section. */
export function isEssaysPath(href: string): boolean {
  return /^\/essays(?:[/?#]|$)/.test(href);
}

/** The href if it can be followed now; undefined for a link into /essays while essays are off. */
export function reachableHref(href: string | null | undefined): string | undefined {
  if (!href) return undefined;
  return essaysEnabled || !isEssaysPath(href) ? href : undefined;
}
