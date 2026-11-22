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
  // Owner, 23 Nov: "Helvetica Neue + Pretendard as fallback for Korean".
  "--font-sans":
    '"Sophomores Sans", "Helvetica Neue", Helvetica, var(--font-pretendard), Arial, sans-serif',
  "--font-serif": "var(--font-narcissianNectare), serif",
  "--font-display": "var(--font-narcissianNectare), serif",
  // Owner, 21 Nov: no mono as a default anywhere he hasn't named, so the mono role is the sans (no-mono.test.ts).
  "--font-mono":
    '"Sophomores Sans", "Helvetica Neue", Helvetica, var(--font-pretendard), Arial, sans-serif',
  // Owner, 23 Nov: "Headings follow the same rule - Helvetica with Pretendard fallback".
  "--font-heading":
    '"Sophomores Sans", "Helvetica Neue", Helvetica, var(--font-pretendard), Arial, sans-serif'
};

test("each font role points at its loader's variable, once", () => {
  for (const [role, stack] of Object.entries(roles)) {
    const lines = [
      ...globals.matchAll(new RegExp(`^\\s*${role}:\\s*([^;]+);`, "gm"))
    ];
    assert.equal(lines.length, 1, `${role} is defined once`);
    assert.equal(
      lines[0]![1].replace(/\s+/g, " ").trim(),
      stack,
      `${role} in the typography block`
    );
  }
});

test("no font variable refers to itself", () => {
  for (const [, name, value] of globals.matchAll(
    /^\s*(--font-[\w-]+):\s*([^;]+);/gm
  )) {
    assert.equal(
      value!.includes(`var(${name})`),
      false,
      `${name} refers to itself`
    );
  }
});

test("every role's variable has a loader", () => {
  const defined = new Set(
    [...fonts.matchAll(/variable:\s*"(--font-[\w-]+)"/g)].map(
      (match) => match[1]
    )
  );
  for (const name of [
    "--font-pretendard",
    "--font-narcissianNectare",
    "--font-manrope",
    "--font-teaser-serif"
  ]) {
    assert.equal(defined.has(name), true, `${name} has a loader in fonts.ts`);
  }
  assert.doesNotMatch(layout, /geist\/font\/mono/, "Geist Mono isn't loaded");
});

test("the site root layout puts only .variable font classes on <html>", () => {
  assert.doesNotMatch(
    layout,
    /\b(Pretendard|Suit|NarcissianNectare|GeistMono|Hyd|message|serif)\.className\b/
  );
  for (const font of ["message", "serif", "NarcissianNectare", "Pretendard"]) {
    assert.match(
      layout,
      new RegExp(`\\b${font}\\.variable\\b`),
      `sets ${font}.variable`
    );
  }
});

test("loaders name existing files and no dead fallback literal", () => {
  const paths = [
    ...fonts.matchAll(/(?:path|src):\s*"(\.\/public\/[^"]+)"/g)
  ].map((match) => match[1]!);
  assert.ok(paths.length >= 5);
  for (const path of paths)
    assert.equal(existsSync(new URL(path, root)), true, path);
  assert.doesNotMatch(
    fonts,
    /fallback:\s*\["blase"\]/,
    'the "blase" literal matched no loaded face'
  );
});

test("Pretendard, the Korean fallback behind Helvetica, is not preloaded", () => {
  const pretendard =
    fonts.match(
      /export const Pretendard = localFont\(\{[\s\S]*?\n\s*\}\);/
    )?.[0] ?? "";
  assert.match(pretendard, /preload:\s*false/);
});

test("Pretendard loads from one place, the fonts.ts loader", () => {
  assert.doesNotMatch(
    globals,
    /PretendardGOVVariable/,
    "globals.css doesn't fetch the file a second time"
  );
  assert.match(fonts, /PretendardGOVVariable\.woff2/);
});

test("Helvetica Neue is named face by face, so weight 500 never lands on Condensed Bold", () => {
  for (const [weight, face] of [
    ["1 399", "HelveticaNeue-Light"],
    ["400 499", "HelveticaNeue"],
    ["500 599", "HelveticaNeue-Medium"],
    ["600 1000", "HelveticaNeue-Bold"]
  ]) {
    assert.match(
      globals,
      new RegExp(
        `font-family: "Sophomores Sans"; font-style: normal; font-weight: ${weight}; src: local\\("${face}"\\)`
      ),
      `${face} covers ${weight}`
    );
  }
});
