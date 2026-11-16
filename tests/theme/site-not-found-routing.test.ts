import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, globSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { z } from "zod";

// No 404 may paint unstyled (owner, 2026-11-16). A notFound() thrown before the response starts is served
// as Next's bare error shell (<html id="__next_error__">: no stylesheet, no theme; vercel/next.js#62228), so
// a page that looks a record up does it inside <Suspense>, as The Hideaway does: the styled document is sent
// first and the 404 renders inside it (it answers 200; the owner accepted that). Unmatched URLs are served
// by global-not-found, and order ids the order pages would reject are rewritten there by the config.
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

const slugPages = [
  "src/app/(site)/essays/[slug]/page.tsx",
  "src/app/(site)/setlists/[slug]/page.tsx"
];

test("notFound() is called only by the order pages and inside the essay and setlist pages' Suspense", () => {
  const calls = globSync("src/{app/(site),components}/**/*.{ts,tsx}", {
    cwd: new URL(root)
  }).filter((file) => /\bnotFound\(\)/.test(read(file)));
  assert.deepEqual(calls.sort(), [
    ...slugPages,
    "src/app/(site)/me/orders/[id]/page.tsx",
    "src/app/(site)/shop/orders/[id]/page.tsx"
  ].sort());
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

test("a missing essay or setlist calls notFound() in a body the page renders inside <Suspense>, with no redirect or marker", async () => {
  for (const page of slugPages) {
    const source = read(page);
    assert.doesNotMatch(source, /\bredirect\(|not-found=1|notFoundUrl/, page);
    const body = source.match(/<Suspense[^>]*>\s*<(\w+)\b[^>]*\/>\s*<\/Suspense>/)?.[1];
    assert.ok(body, `${page}: the default export renders its body inside <Suspense>`);
    const definition = source.match(
      new RegExp(`async function ${body}\\([\\s\\S]*?\\n}\\n`)
    )?.[0];
    assert.ok(definition, `${page}: ${body} is defined in the page`);
    assert.match(definition, /\bnotFound\(\)/, `${page}: ${body} calls notFound()`);
    assert.equal(
      source.split(definition).join("").match(/\bnotFound\(\)/),
      null,
      `${page}: notFound() is called only inside ${body}`
    );
  }
});

test("the site layout has no <Suspense>, so a page's server redirect() stays an HTTP redirect", () => {
  // A layout-wide boundary would start streaming before every page, turning the /me pages' sign-in
  // redirect() into a client-side one (ADR 0002). The boundary belongs around the page bodies that need it.
  assert.doesNotMatch(read("src/app/(site)/layout.tsx"), /<Suspense\b/);
});

test("the config rewrites only malformed order ids, to one URL no route matches", async () => {
  const rules = await beforeFiles();
  assert.equal(rules.some((rule) => rule.has), false, "no marker rewrite");
  assert.equal(
    rules.some((rule) => /essays|setlists/.test(rule.source)),
    false,
    "essays and setlists reach their pages"
  );
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
