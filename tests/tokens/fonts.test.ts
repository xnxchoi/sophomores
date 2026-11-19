import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Font roles (F2/F3): each loader only defines a variable on <html>, and the "Typography roles" @theme block
// in globals.css decides which face each role uses. A loader's .className sets font-family on <html>
// directly; with several of them, the stylesheet that loads last decides the page's face.
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const globals = read("src/styles/globals.css");
const fonts = read("fonts.ts");
const layout = read("src/app/(site)/layout.tsx");

const roles: Record<string, string> = {
  "--font-sans": '"Helvetica Neue", Helvetica, var(--font-suit), Arial, sans-serif',
  "--font-serif": "var(--font-narcissianNectare), serif",
  "--font-display": "var(--font-narcissianNectare), serif",
  "--font-mono": "var(--font-geist-mono), ui-monospace, monospace",
  "--font-heading": "var(--font-geist-mono), ui-monospace, monospace",
};

test("each font role points at its loader's variable, once", () => {
  for (const [role, stack] of Object.entries(roles)) {
    const lines = [...globals.matchAll(new RegExp(`^\\s*${role}:\\s*([^;]+);`, "gm"))];
    assert.equal(lines.length, 1, `${role} is defined once`);
    assert.equal(lines[0]![1].trim(), stack, `${role} in the typography block`);
  }
});

test("no font variable refers to itself", () => {
  for (const [, name, value] of globals.matchAll(/^\s*(--font-[\w-]+):\s*([^;]+);/gm)) {
    assert.equal(value!.includes(`var(${name})`), false, `${name} refers to itself`);
  }
});

test("every role's variable has a loader", () => {
  const defined = new Set([...fonts.matchAll(/variable:\s*"(--font-[\w-]+)"/g)].map((match) => match[1]));
  for (const name of ["--font-suit", "--font-narcissianNectare", "--font-manrope", "--font-teaser-serif"]) {
    assert.equal(defined.has(name), true, `${name} has a loader in fonts.ts`);
  }
  assert.match(layout, /import \{ GeistMono \} from "geist\/font\/mono";/, "Geist Mono comes from the installed geist package");
});

test("the site root layout puts only .variable font classes on <html>", () => {
  assert.doesNotMatch(layout, /\b(Suit|NarcissianNectare|GeistMono|Hyd|message|serif)\.className\b/);
  for (const font of ["message", "serif", "NarcissianNectare", "Suit", "GeistMono"]) {
    assert.match(layout, new RegExp(`\\b${font}\\.variable\\b`), `sets ${font}.variable`);
  }
});

test("loaders name existing files and no dead fallback literal", () => {
  const paths = [...fonts.matchAll(/(?:path|src):\s*"(\.\/public\/[^"]+)"/g)].map((match) => match[1]!);
  assert.ok(paths.length >= 5);
  for (const path of paths) assert.equal(existsSync(new URL(path, root)), true, path);
  assert.doesNotMatch(fonts, /fallback:\s*\["blase"\]/, 'the "blase" literal matched no loaded face');
});

test("SUIT, the Korean fallback behind Helvetica, is not preloaded", () => {
  const suit = fonts.match(/export const Suit = localFont\(\{[\s\S]*?\n\s*\}\);/)?.[0] ?? "";
  assert.match(suit, /preload:\s*false/);
});
