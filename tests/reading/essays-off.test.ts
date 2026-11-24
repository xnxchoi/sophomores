import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { essaysEnabled, reachableHref } from "@/lib/content/essays";
import { menuLinks } from "@/lib/content/menu";
import { INTERFACE_TARGETS } from "@/stores/Tour/TourStore";

// Owner, 24 Nov: "Let's 404 the entire essays path for now". One switch (src/lib/content/essays.ts) turns every
// /essays URL into the site's 404 and hides every link into them; the reading code stays.

type Rewrite = { source: string; destination: string; has?: unknown };
async function beforeFiles(): Promise<Rewrite[]> {
  const config = (await import("../../next.config")).default;
  const rewrites = await config.rewrites?.();
  assert.ok(rewrites && !Array.isArray(rewrites));
  return rewrites.beforeFiles as Rewrite[];
}
// The same matcher Next builds for a custom route (server/lib/router-utils/filesystem.js).
const matches = (rule: Rewrite, pathname: string) =>
  getPathMatch(rule.source, { strict: true, removeUnnamedParams: true, sensitive: false })(pathname) !== false;

test("essays are switched off", () => {
  assert.equal(essaysEnabled, false);
});

test("every /essays URL goes to the site's 404 before a page renders; other paths don't", async () => {
  const rules = await beforeFiles();
  const notFound = (pathname: string) => rules.some((rule) => !rule.has && rule.destination === "/not-found" && matches(rule, pathname));
  for (const pathname of ["/essays", "/essays/in", "/essays/in/2", "/essays/lights-low", "/ESSAYS/lights-low"]) {
    assert.equal(notFound(pathname), true, pathname);
  }
  for (const pathname of ["/", "/essaysx", "/music", "/setlists/a", "/shop"]) {
    assert.equal(notFound(pathname), false, pathname);
  }
});

test("nothing links into /essays: menu, tour, search and notification fallbacks", () => {
  assert.equal(menuLinks.some((link) => link.href.startsWith("/essays")), false);
  assert.equal(menuLinks[0]?.href, "/");
  assert.equal(INTERFACE_TARGETS.some((target) => target.href.startsWith("/essays")), false);
  // Search's Discover rows (header-panels.tsx; its module needs the Payload environment, so it is read, not imported).
  const panels = readFileSync(new URL("../../src/components/shell/header-panels.tsx", import.meta.url), "utf8");
  assert.match(panels, /export const DISCOVER = \[[^\]]*\]\.filter\(\(row\) => reachableHref\(row\.href\) !== undefined\)/);
  // Notification rows, See All and search results ask this before they render a link.
  for (const href of ["/essays", "/essays/in", "/essays/lights-low", "/essays?x=1"]) assert.equal(reachableHref(href), undefined, href);
  for (const href of ["/", "/music", "/essaysx", "https://example.com/essays"]) assert.equal(reachableHref(href), href, href);
  assert.equal(reachableHref(undefined), undefined);
});
