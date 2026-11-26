import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { appleRGB, WALLET_PASS_COLOURS } from "@/lib/commerce/keys/wallet-pass-colours";

// Owner, 26 Nov (via Cordy), picked "Medici Cypress Darker -1 #02221B background + Saffron Amber #FB9342 ink". The
// pinned values must stay the palette's own: each token's line in sophomores-palette.css records its sRGB hex.
test("the pass colours are the palette tokens the owner picked", async () => {
  const palette = await readFile(join(process.cwd(), "src", "styles", "sophomores-palette.css"), "utf8");
  for (const { paletteVar, hex } of Object.values(WALLET_PASS_COLOURS)) {
    const recorded = new RegExp(`^\\s*${paletteVar}:\\s*oklch\\([^)]*\\);\\s*/\\*\\s*(#[0-9A-F]{6})\\b`, "m").exec(palette)?.[1];
    assert.equal(recorded, hex, paletteVar);
  }
  assert.equal(appleRGB(WALLET_PASS_COLOURS.background.hex), "rgb(2, 34, 27)");
});

// Apple's sizes: logo up to 160×50 pt, icon 29×29 pt, each at 1×, 2× and 3×. The icon is a placeholder until the
// owner's logo arrives (owner, 26 Nov: "leave it for now, we have a logo incoming").
test("the pass art ships at Apple's sizes", async () => {
  const sizes = { logo: [160, 50], icon: [29, 29] } as const;
  for (const [name, [width, height]] of Object.entries(sizes)) {
    for (const scale of [1, 2, 3]) {
      const png = await readFile(join(process.cwd(), "public", "wallet-pass", `${name}${scale === 1 ? "" : `@${scale}x`}.png`));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width * scale, height * scale], `${name} @${scale}x`);
    }
  }
});
