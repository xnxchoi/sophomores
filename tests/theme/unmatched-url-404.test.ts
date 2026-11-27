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
  // From <html up to its className={cn(...)}: the attributes in between hold JSX comments, which may
  // contain ">" (one names <html>), so the opening tag can't be matched as [^>]*.
  const html = source.match(/<html\s[\s\S]*?className=\{cn\(([\s\S]*?)\)\}/);
  assert.ok(html, "renders its own <html> with a className");
  assert.match(html[0], /data-theme="dark"/);
  assert.match(html[1], /^\s*"dark",/, "the dark class too, first");
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
    /<Providers>\s*<ClientLayout headerMember=\{headerMember\}>\s*<NotFoundPage \/>[\s\S]*?<Footer \/>[\s\S]*?<\/ClientLayout>\s*<\/Providers>/,
    "the same 404 inside the same shell as the site layout"
  );
});

test("global-not-found sets the same font variables and stylesheets as the site root, never a loader's class", () => {
  // The arguments of the <html> element's className={cn(...)}.
  const html = (path: string) => read(path).match(/<html\s[\s\S]*?className=\{cn\(([\s\S]*?)\)\}/)?.[1] ?? "";
  const fonts = (path: string) => [...html(path).matchAll(/\b(\w+)\.(variable|className)\b/g)].map((match) => match[0]).sort();
  const sheets = (path: string) => [...read(path).matchAll(/^import "([^"]+)";$/gm)].map((match) => match[1]);
  const site = "src/app/(site)/layout.tsx";
  const missing = "src/app/global-not-found.tsx";
  assert.ok(fonts(site).length > 0, "the site root sets font variables");
  assert.deepEqual(fonts(missing), fonts(site));
  assert.equal(fonts(missing).some((name) => name.endsWith(".className")), false);
  assert.deepEqual(sheets(missing), sheets(site));
});

test("notFound() inside the site keeps its own boundary and hold", () => {
  assert.match(read("src/app/(site)/not-found.tsx"), /holdThemeBoot\("dark"\)/);
});
