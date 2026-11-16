import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Font roles follow The Hideaway (ADR 0008): each loader only defines a variable on <html>, and the
// @theme block in globals.css decides which face each role uses. A loader's .className sets font-family
// on <html> directly; with several of them the last stylesheet wins, which made every page Narcissian
// Nectare by accident.
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const globals = read("src/styles/globals.css");
const fonts = read("fonts.ts");

const roles: Record<string, string> = {
  "--font-sans": "var(--font-suit), sans-serif",
  "--font-serif": "var(--font-narcissianNectare), var(--font-blase), serif",
  "--font-wide": "var(--font-blase), serif",
  "--font-mono": "var(--font-geist-mono), monospace",
  "--font-heading": "var(--font-geist-mono), monospace",
  "--font-dots": "var(--font-doto), sans-serif"
};

test("each font role points at its loader's variable, as The Hideaway maps them", () => {
  for (const [role, stack] of Object.entries(roles)) {
    const line = globals.match(new RegExp(`^\\s*${role}:\\s*([^;]+);`, "m"));
    assert.equal(line?.[1].trim(), stack, `${role} in the @theme block`);
  }
});

test("no font variable refers to itself", () => {
  for (const [, name, value] of globals.matchAll(
    /^\s*(--font-[\w-]+):\s*([^;]+);/gm
  )) {
    assert.equal(
      value.includes(`var(${name})`),
      false,
      `${name} refers to itself`
    );
  }
});

test("every role's variable is defined by a loader", () => {
  const defined = new Set(
    [...fonts.matchAll(/variable:\s*"(--font-[\w-]+)"/g)].map((m) => m[1])
  );
  for (const name of [
    "--font-suit",
    "--font-narcissianNectare",
    "--font-blase",
    "--font-doto"
  ]) {
    assert.equal(defined.has(name), true, `${name} has a loader in fonts.ts`);
  }
  assert.match(
    fonts,
    /from "geist\/font\/mono"/,
    "Geist Mono comes from the installed geist package"
  );
});

test("root layouts put only .variable font classes on <html>", () => {
  for (const layout of [
    "src/app/(site)/layout.tsx",
    "src/app/global-not-found.tsx"
  ]) {
    const source = read(layout);
    assert.doesNotMatch(
      source,
      /\b(Suit|NarcissianNectare|Blase|Doto|GeistMono|Hyd|message|serif)\.className\b/,
      layout
    );
    for (const font of [
      "Suit",
      "NarcissianNectare",
      "Blase",
      "Doto",
      "GeistMono"
    ]) {
      assert.match(
        source,
        new RegExp(`\\b${font}\\.variable\\b`),
        `${layout} sets ${font}.variable`
      );
    }
  }
});

test("every font file a loader names exists", () => {
  const paths = [
    ...fonts.matchAll(/(?:path|src):\s*"(\.\/public\/[^"]+)"/g)
  ].map((m) => m[1]);
  assert.ok(paths.length >= 5);
  for (const path of paths)
    assert.equal(existsSync(new URL(path, root)), true, path);
});

test("Blase, the Korean serif, loads only when a page needs it", () => {
  const blase =
    fonts.match(/export const Blase = localFont\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
  assert.match(blase, /preload:\s*false/);
  assert.doesNotMatch(
    fonts,
    /fallback:\s*\["blase"\]/,
    'the "blase" literal matched no loaded face'
  );
});

test("Nib is gone; the home page's headings use the serif role", () => {
  assert.doesNotMatch(fonts, /nib-reference/);
  assert.equal(
    existsSync(new URL("public/fonts/nib-reference.woff2", root)),
    false
  );
  for (const file of [
    "src/components/teaser/hero.tsx",
    "src/components/teaser/narrative.tsx",
    "src/components/invitation/experience.tsx"
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /font-teaser-serif/, file);
    assert.match(source, /\bfont-serif\b/, file);
  }
});
