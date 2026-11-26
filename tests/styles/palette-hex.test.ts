import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { PALETTE } from "@/utils/palette";

// sRGB hex → OKLab (Björn Ottosson's published matrices).
function oklabOfHex(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// Code that can't read a CSS variable uses these hex values. Each must be the colour the palette file DECLARES (its
// oklch value, not the comment beside it). The declarations round L to 0.1% and hue to 1°, so a match is a distance
// under 0.002 in OKLab, a tenth of a just-noticeable difference; the largest today is 0.0013.
test("every hex in PALETTE is the colour the palette file declares", async () => {
  const palette = await readFile(join(process.cwd(), "src", "styles", "sophomores-palette.css"), "utf8");
  for (const [name, { paletteVar, hex }] of Object.entries(PALETTE)) {
    const declared = new RegExp(`${paletteVar}:\\s*oklch\\(\\s*([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\s*\\)`).exec(palette);
    assert.ok(declared, `${name}: no oklch declaration for ${paletteVar}`);
    const [L, C, H] = declared.slice(1).map(Number);
    const hue = (H * Math.PI) / 180;
    const want = [L / 100, C * Math.cos(hue), C * Math.sin(hue)];
    const got = oklabOfHex(hex);
    const distance = Math.hypot(...want.map((v, i) => v - got[i]));
    assert.ok(distance < 0.002, `${name}: ${hex} is ${distance.toFixed(4)} from ${paletteVar}'s declared colour`);
  }
});
