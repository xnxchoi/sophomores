import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import tailwind from "@tailwindcss/postcss";

// Use the same PostCSS installation as Tailwind rather than a test-only compiler.
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss") as {
  (plugins: ReturnType<typeof tailwind>[]): {
    process: (css: string, options: { from: string }) => Promise<{ css: string }>;
  };
};

async function compileEntry(path: string) {
  const from = fileURLToPath(new URL(path, import.meta.url));
  return (await postcss([tailwind()]).process(readFileSync(from, "utf8"), { from })).css;
}

test("auth Tailwind emits real layout and focus utilities without site content", async () => {
  const css = await compileEntry("../../src/app/(auth)/index.css");
  for (const selector of [
    ".bg-preview-surface", ".max-w-100", ".min-h-svh", ".font-sans",
    ".focus-visible\\:outline-preview-accent"
  ]) assert.ok(css.includes(selector), `Missing compiled auth utility ${selector}`);
  assert.match(css, /--color-preview-surface:\s*#151515/);
  assert.match(css, /Helvetica Neue/);
  assert.doesNotMatch(css, /teaser|wordmark|Nib|Manrope|@font-face|url\(/);
});

test("site Tailwind does not emit auth-only utilities", async () => {
  const css = await compileEntry("../../src/styles/globals.css");
  assert.ok(css.includes(".bg-background"), "Site utilities must still compile");
  assert.doesNotMatch(css, /preview-surface|preview-accent|preview-foreground/);
});
