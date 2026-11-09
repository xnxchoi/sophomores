import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getImageProps } from "next/image";
import nextConfig from "../../next.config";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = (path: string) => readFileSync(`${root}${path}`, "utf8");
test("private teaser images load directly without an unauthenticated optimizer fetch", () => {
  const { props } = getImageProps({
    src: "/teaser/story-orbit.webp",
    alt: "Story artwork",
    width: 3840,
    height: 2160,
    unoptimized: nextConfig.images?.unoptimized
  });
  assert.equal(nextConfig.images?.unoptimized, true);
  assert.equal(props.src, "/teaser/story-orbit.webp");
  assert.equal(props.srcSet, undefined);
});


test("preview authentication is authored in App Router TSX pages and shared typed logic", () => {
  for (const path of [
    "src/app/(auth)/layout.tsx",
    "src/app/(auth)/login/page.tsx",
    "src/app/(auth)/logout/page.tsx",
    "src/app/(auth)/api/session/route.ts",
    "src/app/(auth)/api/session/logout/route.ts",
    "src/app/(auth)/api/session/verify/route.ts",
    "src/lib/preview-auth/session.ts",
    "src/proxy.ts"
  ])
    assert.ok(
      existsSync(`${root}${path}`),
      `Missing consolidated source ${path}`
    );
  const pages =
    source("src/app/(auth)/login/page.tsx") +
    source("src/app/(auth)/logout/page.tsx");
  assert.match(pages, /<form[\s>]/);
  assert.match(pages, /<input[\s>]/);
  assert.doesNotMatch(pages, /dangerouslySetInnerHTML|["']use client["']/);
});

test("consolidation removes standalone auth source and build plumbing", () => {
  assert.equal(existsSync(`${root}src/app/%5F_preview`), false, "Auth route group must not create a preview URL prefix");
  for (const file of [
    "session.ts",
    "server.ts",
    "pages.tsx",
    "tsconfig.json"
  ]) {
    assert.equal(
      existsSync(`${root}deployment/preview-auth/${file}`),
      false,
      `Obsolete standalone source ${file}`
    );
  }
  assert.equal(existsSync(`${root}scripts/build-preview-auth.ts`), false);
  const manifest = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };
  assert.equal(manifest.scripts["build:preview-auth"], undefined);
  assert.ok(
    manifest.scripts["test:preview-runtime"]?.includes(
      "tests/runtime/preview-auth.test.ts"
    )
  );
  assert.doesNotMatch(manifest.scripts.test, /runtime/);
});

test("auth pages have their own root layout without importing the site shell", () => {
  assert.ok(existsSync(`${root}src/app/(site)/layout.tsx`));
  assert.ok(existsSync(`${root}src/app/(site)/page.tsx`));
  assert.equal(existsSync(`${root}src/app/layout.tsx`), false);
  assert.doesNotMatch(
    source("src/app/(auth)/layout.tsx"),
    /globals\.css|teaser|next\/font/
  );
});

test("auth documents import their own Tailwind root without client UI dependencies", () => {
  const layout = source("src/app/(auth)/layout.tsx");
  const login = source("src/app/(auth)/login/page.tsx");
  assert.match(layout, /import\s+["']\.\/index\.css["']/);
  assert.doesNotMatch(layout, /<style>|const styles|next\/font|["']use client["']/);
  assert.match(layout, /<html lang=\{locale\}>/);
  assert.match(layout, /await getLocale\(\)/, "document language follows the real request locale");
  assert.match(layout, /<main className="[^"]*max-w-100[^"]*">/);
  assert.match(layout, /t\("staffOnly"\)/, "staff footer uses canonical server-translated copy");
  assert.doesNotMatch(login, /components\/ui\/|@base-ui|["']use client["']/);
  assert.match(login, /type="checkbox"/);
});

test("auth controls use achromatic theme colors without green accents", () => {
  const css = source("src/app/(auth)/index.css");
  for (const role of [
    "surface", "foreground", "input", "border", "secondary", "muted", "accent", "on-accent"
  ]) {
    const color = css.match(new RegExp(`--color-preview-${role}:\\s*#([\\da-f]{6});`, "i"));
    assert.ok(color, `Missing preview ${role} color`);
    const [red, green, blue] = color[1].match(/../g)!;
    assert.equal(red, green, `Preview ${role} must be achromatic`);
    assert.equal(green, blue, `Preview ${role} must be achromatic`);
  }
  for (const path of ["src/app/(auth)/login/page.tsx", "src/app/(auth)/logout/page.tsx"]) {
    assert.doesNotMatch(source(path), /(?:bg|text|border|accent|outline)-(?:green|lime|emerald|teal|olive)-/);
  }
});

test("Tailwind entries explicitly isolate auth routes from site source discovery", () => {
  const auth = source("src/app/(auth)/index.css");
  const site = source("src/styles/globals.css");
  for (const css of [auth, site]) {
    assert.match(css, /@import ["']tailwindcss["'] source\(none\)/);
    assert.doesNotMatch(css, /@source\s+(?:not\s+)?["']@\//);
  }
  assert.match(auth, /@source ["']\.\/\*\*\/\*\.tsx["']/);
  assert.doesNotMatch(auth, /teaser|shadcn|tw-animate|@font-face|url\(/);
  assert.match(site, /@source not ["']\.\.\/app\/\(auth\)["']/);
  for (const path of ["../app/(site)", "../components", "../lib"]) {
    assert.ok(site.includes(`@source "${path}";`));
  }
});
