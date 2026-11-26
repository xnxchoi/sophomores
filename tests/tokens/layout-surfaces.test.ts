import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// F6/F7: one additive block of layout and surface roles; lane pages use the roles, not the literals they replace.
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const globals = read("src/styles/globals.css");

const roles: Record<string, string> = {
  "--spacing-header": "7rem",
  "--blur-floating": "20px",
  "--shadow-floating": "0 8px 28px -12px oklch(from var(--carbon-deep) l c h / 0.55)",
  "--shadow-resting": "none",
};

test("each layout and surface role is defined once, in a static theme block", () => {
  for (const [role, value] of Object.entries(roles)) {
    const lines = [...globals.matchAll(new RegExp(`^\\s*${role}:\\s*([^;]+);`, "gm"))];
    assert.equal(lines.length, 1, `${role} is defined once`);
    assert.equal(lines[0]![1].trim(), value, role);
  }
  const block = globals.slice(globals.indexOf("Layout and surfaces (F6/F7"));
  assert.match(block, /^[\s\S]*?\*\/\n@theme static \{\n\s*--spacing-header:/);
});

test("the 20/16px gutter stays the base", () => {
  assert.match(globals, /--gutter: 20px;/);
  assert.match(globals, /--gutter: 16px;/);
  assert.match(globals, /--spacing-gutter: var\(--gutter\);/);
});
