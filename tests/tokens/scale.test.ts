import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { compile } from "tailwindcss";

const require = createRequire(import.meta.url);
const globals = readFileSync(new URL("../../src/styles/globals.css", import.meta.url), "utf8");
const root = new URL("../../", import.meta.url);
const defaults = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
const sizes = { h1: 32, h2: 24, h3: 20, h4: 18, h5: 16, h6: 14, body: 14, p: 14, small: 10 };
const radii = { sm: 4, md: 6, lg: 8, xl: 12, "2xl": 16, "3xl": 24, "4xl": 32, pill: 999 };
const candidates = [
  ...Object.keys(sizes).map((name) => `text-${name}`),
  ...Object.keys(radii).map((name) => `rounded-${name}`),
  "px-gutter", "gap-gutter", "grid-cols-12"
];

// Exercise the site's actual CSS import graph with installed Tailwind, including shadcn and palette imports.
const compileOptions = {
  base: dirname(new URL("../../src/styles/globals.css", import.meta.url).pathname),
  loadStylesheet: async (id: string, base: string) => {
    const path = id.startsWith(".") ? resolve(base, id)
      : id === "tailwindcss" ? require.resolve("tailwindcss/index.css")
        : id === "tw-animate-css" ? new URL("node_modules/tw-animate-css/dist/tw-animate.css", root).pathname
          : require.resolve(id);
    return { path, base: dirname(path), content: readFileSync(path, "utf8") };
  }
};
const compiled = compile(globals, compileOptions).then((compiler) => compiler.build(candidates));

test("the named text scale uses pixel sizes on the unchanged 16px root", () => {
  for (const [name, px] of Object.entries(sizes)) {
    assert.equal(new RegExp(`--text-${name}:\\s*${px}px;`).test(globals), true, `${name}: ${px}px`);
    const lineHeight = name === "small" ? "1.333" : ["h6", "body", "p"].includes(name) ? "1.75" : "1.5";
    assert.equal(new RegExp(`--text-${name}--line-height:\\s*${lineHeight.replace(".", "\\.")};`).test(globals), true, `${name} line height`);
  }
});

test("Tailwind emits every named size and its line height", async () => {
  const css = await compiled;
  for (const [name, px] of Object.entries(sizes)) {
    const lineHeight = name === "small" ? "1.333" : ["h6", "body", "p"].includes(name) ? "1.75" : "1.5";
    const rule = css.match(new RegExp(`\\.text-${name}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
    assert.equal(rule.includes(`font-size: ${px}px;`), true, `text-${name} compiles`);
    assert.equal(rule.includes(`line-height: var(--tw-leading, ${lineHeight});`), true, `text-${name} line height compiles`);
  }
});

test("small radii use the Hideaway scale, pill works, and larger radii keep Tailwind defaults", async () => {
  const css = await compiled;
  for (const [name, px] of Object.entries(radii)) {
    assert.equal(new RegExp(`\\.rounded-${name}\\s*\\{[^}]*border-radius:\\s*(?:${px}px|var\\(--radius-${name}\\));`).test(css), true, `rounded-${name} compiles`);
    if (["2xl", "3xl", "4xl"].includes(name)) {
      assert.equal(new RegExp(`--radius-${name}:`).test(globals), false, `${name} uses the installed default`);
      assert.equal(defaults.includes(`--radius-${name}: ${px / 16}rem;`), true, `${name} is ${px}px on the 16px root`);
    } else {
      assert.equal(new RegExp(`--radius-${name}:\\s*${px}px;`).test(globals), true, `${name}: ${px}px`);
    }
  }
});

test("raw pill-radius consumers retain a root variable even without a utility candidate", async () => {
  const compiler = await compile(globals, compileOptions);
  const css = compiler.build([]);
  const rootRules = [...css.matchAll(/:root[^{}]*\{([^{}]*)\}/g)].map((match) => match[1]).join("\n");
  assert.equal(/--radius-pill:\s*999px;/.test(rootRules), true, "raw var(--radius-pill) is defined without rounded-pill discovery");
});

test("gutter utilities share the raw responsive gutter, including exactly 768px", async () => {
  assert.equal(/--gutter:\s*20px;/.test(globals), true, "desktop gutter");
  assert.equal(/@media\s*\(max-width:\s*768px\)\s*\{\s*:root\s*\{\s*--gutter:\s*16px;/.test(globals), true, "phone/tablet gutter");
  const css = await compiled;
  assert.equal(/\.px-gutter\s*\{\s*padding-inline:\s*var\(--gutter\);/.test(css), true, "px-gutter compiles");
  assert.equal(/\.gap-gutter\s*\{\s*gap:\s*var\(--gutter\);/.test(css), true, "gap-gutter compiles");
});

test("the 12-column grid comes directly from installed Tailwind", async () => {
  assert.equal(/\.grid-cols-12\s*\{\s*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\);/.test(await compiled), true);
});
