import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, globSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { matchHas } from "next/dist/shared/lib/router/utils/prepare-destination";
import { z } from "zod";

// No 404 may paint unstyled or in the wrong theme (owner, 2026-11-16). A notFound() thrown while a page
// renders is served as Next's bare error shell (<html id="__next_error__">: no theme, no stylesheet) and the
// 404 only appears once the client renders it; Next's not-found boundary is client-only. The one 404 Next
// renders on the server is an unmatched route (global-not-found, dark on <html>). So every site 404 is sent
// to an unmatched route before a page renders: order ids by a config rewrite, essays and setlists by a
// redirect to their own URL with a `not-found` marker, which a config rewrite sends to the unmatched route.
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

type Rewrite = {
  source: string;
  destination: string;
  has?: { type: string; key: string }[];
};
async function beforeFiles(): Promise<Rewrite[]> {
  const config = (await import("../../next.config")).default;
  const rewrites = await config.rewrites?.();
  assert.ok(
    rewrites && !Array.isArray(rewrites),
    "rewrites run before the filesystem"
  );
  return rewrites.beforeFiles as Rewrite[];
}
// The same matcher Next builds for a custom route (server/lib/router-utils/filesystem.js).
const matches = (rule: Rewrite, pathname: string) =>
  getPathMatch(rule.source, {
    strict: true,
    removeUnnamedParams: true,
    sensitive: false
  })(pathname) !== false;
const isRoute = (pathname: string) =>
  globSync("src/app/**/{page,route}.{ts,tsx}", { cwd: new URL(root) }).some(
    (file) => {
      const segments = file
        .replace(/^src\/app\//, "")
        .split("/")
        .slice(0, -1)
        .filter((segment) => !/^\(.*\)$/.test(segment));
      const parts = pathname.split("/").filter(Boolean);
      return (
        segments.length === parts.length &&
        segments.every(
          (segment, i) => segment.startsWith("[") || segment === parts[i]
        )
      );
    }
  );

test("only the order pages still call notFound(), and the config catches every case they reject", () => {
  const calls = globSync("src/{app/(site),components}/**/*.{ts,tsx}", {
    cwd: new URL(root)
  }).filter((file) => /\bnotFound\(\)/.test(read(file)));
  assert.deepEqual(calls.sort(), [
    "src/app/(site)/me/orders/[id]/page.tsx",
    "src/app/(site)/shop/orders/[id]/page.tsx"
  ]);
});

test("an order id the page would reject never reaches the page; a real one does", async () => {
  const rules = await beforeFiles();
  for (const section of ["shop", "me"]) {
    const reaches = (id: string) =>
      !rules.some(
        (rule) => !rule.has && matches(rule, `/${section}/orders/${id}`)
      );
    const ids = [
      "nope",
      "123",
      "00000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
      "{" + randomUUID() + "}",
      randomUUID() + "x",
      "x" + randomUUID(),
      randomUUID().replace(/-/g, ""),
      randomUUID().toUpperCase(),
      "0190f5a2-7b1c-7cde-8f00-123456789abc",
      "0190f5a2-7b1c-9cde-8f00-123456789abc",
      "0190f5a2-7b1c-7cde-cf00-123456789abc",
      "0190f5a2-7b1c-0cde-8f00-123456789abc",
      "g190f5a2-7b1c-7cde-8f00-123456789abc"
    ];
    // Random near-UUIDs: each character position flipped to another hex digit, letter case or dash.
    const alphabet = "0123456789abcdefABCDEFg-";
    for (let n = 0; n < 4000; n += 1) {
      const chars = randomUUID().split("");
      chars[n % chars.length] =
        alphabet[Math.floor(Math.random() * alphabet.length)];
      ids.push(chars.join(""));
    }
    for (const id of ids) {
      if (reaches(id)) {
        assert.ok(
          z.uuid().safeParse(id).success,
          `${section}: ${id} would reach a page that rejects it`
        );
      }
    }
    for (let n = 0; n < 200; n += 1) {
      const id = randomUUID();
      assert.ok(
        reaches(id),
        `${section}: a real order id ${id} reaches its page`
      );
      assert.ok(reaches(id.toUpperCase()), `${section}: ${id.toUpperCase()}`);
    }
  }
});

test("a missing essay or setlist redirects to its own URL with the marker, which the config sends to the unmatched route", async () => {
  const rules = await beforeFiles();
  for (const [page, path] of [
    ["src/app/(site)/essays/[slug]/page.tsx", "/essays/some-slug"],
    ["src/app/(site)/setlists/[slug]/page.tsx", "/setlists/some-slug"]
  ] as const) {
    const source = read(page);
    assert.doesNotMatch(source, /\bnotFound\(/, page);
    const targets = [
      ...source.matchAll(
        /redirect\(`\/(?:essays|setlists)\/\$\{encodeURIComponent\(slug\)\}\?([^`]+)`\)/g
      )
    ].map((match) => match[1]);
    assert.ok(targets.length > 0, `${page} redirects a missing slug`);
    for (const search of targets) {
      // Next's own check: a query `has` with no value needs a non-empty value (`?not-found` alone never
      // matches, and the page would redirect to itself forever).
      const query = Object.fromEntries(new URLSearchParams(search));
      const rule = rules.find(
        (r) =>
          r.has &&
          matchHas(
            { headers: {}, cookies: {} } as never,
            query,
            r.has as never
          ) !== false &&
          matches(r, path)
      );
      assert.ok(rule, `${path}?${search} is rewritten`);
      assert.equal(
        rules.some(
          (r) =>
            r.has &&
            matches(r, path) &&
            matchHas(
              { headers: {}, cookies: {} } as never,
              {},
              r.has as never
            ) !== false
        ),
        false,
        `${path} without the marker still reaches its page`
      );
    }
  }
  const destinations = new Set(rules.map((rule) => rule.destination));
  assert.equal(destinations.size, 1, "one unmatched destination");
  const [destination] = destinations;
  assert.equal(
    isRoute(destination),
    false,
    `${destination} must match no route, so global-not-found serves it`
  );
  assert.doesNotMatch(
    destination,
    /^\/(admin|api)(\/|$)/,
    "the site's 404, not Payload's"
  );
  assert.equal(existsSync(new URL("src/app/global-not-found.tsx", root)), true);
});

test("Payload keeps its own 404s: every admin URL reaches Payload's admin, and the bare API root answers in Payload's JSON", () => {
  assert.equal(
    existsSync(
      new URL("src/app/(payload)/admin/[[...segments]]/page.tsx", root)
    ),
    true
  );
  assert.match(
    read("src/app/(payload)/admin/[[...segments]]/not-found.tsx"),
    /NotFoundPage\(\{/
  );
  const api = read("src/app/(payload)/api/route.ts");
  assert.match(api, /REST_GET\(configPromise\)\(request, params\)/);
  assert.match(api, /slug: \[\] as string\[\]/);
});
