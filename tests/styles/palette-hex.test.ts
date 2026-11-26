import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { PALETTE } from "@/utils/palette";

// Code that can't read a CSS variable uses these hex values; each must be the one the palette file records on its line.
test("every hex in PALETTE is the palette file's own", async () => {
  const palette = await readFile(join(process.cwd(), "src", "styles", "sophomores-palette.css"), "utf8");
  for (const [name, { paletteVar, hex }] of Object.entries(PALETTE)) {
    const recorded = new RegExp(`^\\s*${paletteVar}:\\s*oklch\\([^)]*\\);\\s*/\\*\\s*(#[0-9A-F]{6})\\b`, "m").exec(palette)?.[1];
    assert.equal(recorded, hex, name);
  }
});
