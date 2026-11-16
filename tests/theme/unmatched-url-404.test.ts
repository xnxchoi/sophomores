import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// A direct visit to an unmatched URL must paint dark from its first frame (ADR 0002). The site has three
// root layouts and no root not-found, so a thrown notFound() is served as Next's bare error shell
// (<html id="__next_error__">, no theme) and the 404 only appears once the client renders it. Unmatched
// URLs are served by global-not-found instead, which renders the whole document with the hold on <html>.
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("unmatched URLs reach global-not-found, not a catch-all page that throws notFound()", () => {
  assert.equal(
    existsSync(new URL("src/app/(site)/[...not_found]/page.tsx", root)),
    false,
    "a catch-all would match every URL and global-not-found would never run"
  );
  assert.match(
    read("next.config.ts"),
    /experimental:\s*\{[^}]*globalNotFound:\s*true/,
    "global-not-found is behind experimental.globalNotFound"
  );
  assert.equal(existsSync(new URL("src/app/global-not-found.tsx", root)), true);
});

test("global-not-found holds dark on the served <html> and runs no script that would apply the pick", () => {
  const source = read("src/app/global-not-found.tsx");
  const html = source.match(/<html\s[^>]*>/)?.[0];
  assert.ok(html, "renders its own <html>");
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /className=\{cn\(\s*"dark",/, "the dark class too");
  assert.doesNotMatch(
    source,
    /themeBoot|holdThemeBoot|localStorage|sophomores-theme/
  );
  assert.match(
    source,
    /<body data-themed="color, background-color">/,
    "the ground fades like the site's"
  );
  assert.match(
    source,
    /<Providers>\s*<ClientLayout>\s*<NotFoundPage \/>\s*<\/ClientLayout>\s*<\/Providers>/,
    "the same 404 inside the same shell as the site layout"
  );
});

test("notFound() inside the site keeps its own boundary and hold", () => {
  assert.match(read("src/app/(site)/not-found.tsx"), /holdThemeBoot\("dark"\)/);
});
