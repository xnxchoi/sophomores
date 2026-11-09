import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const root = new URL("../../", import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), "utf8");

test("src relocation preserves root resources and resolves active entrypoints", () => {
  const config = JSON.parse(source("tsconfig.json"));
  assert.equal(config.compilerOptions.baseUrl, undefined);
  assert.deepEqual(config.compilerOptions.paths["@/fonts"], ["./fonts.ts"]);
  assert.equal(config.compilerOptions.paths["@/styles/*"], undefined);
  assert.deepEqual(config.compilerOptions.paths["@/*"], ["./src/*"]);
  assert.match(source("next.config.ts"), /createNextIntlPlugin\("\.\/src\/i18n\/request\.ts"\)/);
  assert.match(source("src/i18n/request.ts"), /messagesByLocale\[locale as Locale\]/);
  assert.match(source("src/i18n/messages.ts"), /from "\.\.\/\.\.\/messages\/en\.json"/);
  assert.match(source("src/i18n/messages.ts"), /from "\.\.\/\.\.\/messages\/ko\.json"/);
  assert.ok(existsSync(new URL("src/proxy.ts", root)));
  assert.equal(existsSync(new URL("proxy.ts", root)), false);
});

test("relocated essays layout resolves the existing root public font assets", () => {
  const layout = new URL("src/app/(site)/essays/layout.tsx", root);
  const fonts = [...readFileSync(layout, "utf8").matchAll(/\bsrc:\s*["']([^"']+)["']/g)].map((match) => new URL(match[1], layout));
  assert.equal(fonts.length, 2);
  const expected = [
    new URL("public/fonts/SUIT-Variable.woff2", root).href,
    new URL("public/fonts/Narcissian-Nectare/NarcissianNectare-Regular.woff2", root).href,
  ];
  for (const font of fonts) assert.equal(existsSync(font), true, "The existing font must resolve from the relocated layout");
  assert.deepEqual(fonts.map((font) => font.href), expected);
});

test("migration commands retain historical migrations under src/lib with relocated config", () => {
  const manifest = JSON.parse(source("package.json"));
  for (const name of ["micreate", "migrate", "migrate:fresh"])
    assert.match(manifest.scripts[name], /PAYLOAD_CONFIG_PATH=\.\/src\/payload\.config\.ts/);
  assert.match(source("src/payload.config.ts"), /migrationDir: path\.resolve\(dirname, "\.\/lib\/migrations"\)/);
  for (const file of [
    "20261026_071140.ts",
    "20261026_071140.json",
    "20261027_124500_auth_integrity.ts",
    "20261101_000000_canonical_members.ts",
    "index.ts",
  ]) assert.ok(existsSync(new URL(`src/lib/migrations/${file}`, root)), file);
});

test("src Tailwind entries discover the relocated source", () => {
  const site = source("src/styles/globals.css");
  for (const directory of ["app/(site)", "components", "lib"])
    assert.ok(site.includes(`@source "../${directory}";`));
  assert.ok(site.includes('@source not "../app/(auth)";'));
  const staff = source("src/styles/staff-login.css");
  assert.ok(staff.includes('@source "../lib/payload/admin/staff-login.tsx";'));
  assert.doesNotMatch(staff, /@source "\.\.\/src\//);
});

// Parse with Tailwind's installed PostCSS rather than a hand-written brace check.
test("the src site stylesheet remains valid CSS after source relocation", () => {
  const require = createRequire(import.meta.url);
  const tailwindRequire = createRequire(require.resolve("@tailwindcss/postcss"));
  const postcss = tailwindRequire("postcss") as { parse: (css: string) => unknown };
  assert.doesNotThrow(() => postcss.parse(source("src/styles/globals.css")));
});
