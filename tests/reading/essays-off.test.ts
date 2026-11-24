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
  for (const href of ["/essays", "/essays/in", "/essays/lights-low", "/essays?x=1", "/essays#top"]) assert.equal(reachableHref(href), undefined, href);
  // Review-B r2: the gate matches what the config catches: any case, and the legacy aliases that redirect to /essays.
  for (const href of ["/ESSAYS/x", "/Essays", "/read/lights-low", "/READ", "/reading/x", "/Reading?x=1"]) assert.equal(reachableHref(href), undefined, href);
  for (const href of ["/", "/music", "/essaysx", "/readings", "/reader", "https://example.com/essays", "https://example.com/read/x"]) assert.equal(reachableHref(href), href, href);
  assert.equal(reachableHref(undefined), undefined);
});

test("the link gate hides exactly what the config sends to the 404, directly or through a redirect", async () => {
  const config = (await import("../../next.config")).default;
  const rules = await beforeFiles();
  const redirects = ((await config.redirects?.()) ?? []) as Rewrite[];
  const leadsTo404 = (pathname: string) =>
    rules.some((rule) => !rule.has && rule.destination === "/not-found" && matches(rule, pathname)) ||
    redirects.some((rule) => !rule.has && rule.destination.startsWith("/essays") && matches(rule, pathname));
  const paths = ["/essays", "/essays/x", "/ESSAYS/x", "/Essays/in/2", "/read", "/read/x", "/READ/x", "/reading", "/reading/x", "/Reading/x",
    "/", "/essaysx", "/readings", "/reader", "/music", "/shop/cart", "/setlists/a"];
  for (const pathname of paths) assert.equal(reachableHref(pathname) === undefined, leadsTo404(pathname), pathname);

  // Review-B r2: the gate reads the link as the browser resolves it. A same-origin absolute URL and a dot-segment path
  // reach the server as their resolved pathname; external origins pass unchanged.
  const previous = process.env.NEXT_PUBLIC_SERVER_URL;
  process.env.NEXT_PUBLIC_SERVER_URL = "https://site.example";
  try {
    const links = ["https://site.example/ESSAYS/story", "https://site.example/read/x?y=1", "https://site.example/music",
      "/shop/../reading/story", "/music/../Essays", "/essays/../music", "/%65ssays/x", "https://other.example/essays/x", "//other.example/essays"];
    for (const href of links) {
      const url = new URL(href, "https://site.example");
      const sameOrigin = url.origin === "https://site.example";
      const expected = sameOrigin && (leadsTo404(url.pathname) || leadsTo404(decodeURIComponent(url.pathname)));
      assert.equal(reachableHref(href) === undefined, expected, href);
    }
    assert.equal(reachableHref("https://site.example/ESSAYS/story"), undefined);
    assert.equal(reachableHref("/shop/../reading/story"), undefined);
    assert.equal(reachableHref("https://other.example/essays/x"), "https://other.example/essays/x");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL;
    else process.env.NEXT_PUBLIC_SERVER_URL = previous;
  }
});
