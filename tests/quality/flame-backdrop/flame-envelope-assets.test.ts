import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  CENTER_FADE,
  ENVELOPE_PATH
} from "@/components/gl/flame-backdrop/mask/profile";
import { createEnvelopeMaskUrl } from "@/components/gl/flame-backdrop/mask/svg";
import {
  ASSET_SIZE,
  createMaskAssetSvg,
  createIllustratorSourceSvg,
  reusableGradientStops
} from "../../../scripts/flame-envelope-assets";

test("saved mask uses approved values and exactly the live SVG generator", () => {
  assert.equal(CENTER_FADE.smoothing, 1.39);
  assert.equal(CENTER_FADE.exponent, 1.2);
  assert.deepEqual(ASSET_SIZE, { width: 2880, height: 1800 });
  assert.equal(
    createMaskAssetSvg(),
    decodeURIComponent(
      createEnvelopeMaskUrl(2880, 1800, 1.39, 1.2, false, 0.18).split(",")[1]
    )
  );
  assert.match(createMaskAssetSvg(), /stdDeviation="25.02"/);
});

test("Illustrator source retains expanded same-shape paths and separate native reusable fill", () => {
  const svg = createIllustratorSourceSvg();
  assert.match(
    svg,
    /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg version="1\.1"/
  );
  assert.match(svg, /id="approved-contour-mask"/);
  assert.match(svg, /id="reusable-gradient-fill"/);
  assert.match(svg, /id="reusable-opacity-gradient"/);
  assert.match(svg, /fill="url\(#reusable-opacity-gradient\)"/);
  assert.ok(svg.includes(ENVELOPE_PATH));
  assert.doesNotMatch(svg, /<use\b|<image\b|href="https?:/);
  assert.ok((svg.match(/data-contour-scale=/g) ?? []).length >= 128);
  const stops = reusableGradientStops();
  assert.equal(stops[0].opacity, 1);
  assert.equal(stops.at(-1)?.opacity, 0);
  stops
    .slice(1)
    .forEach((stop, index) => assert.ok(stop.opacity <= stops[index].opacity));
});

test("shipped SVG matches the approved procedural mask without retired design metadata", async () => {
  const svg = await readFile(new URL("../../../public/masks/flame-envelope.svg", import.meta.url), "utf8");
  assert.equal(svg, createMaskAssetSvg());
  const illustrator = createIllustratorSourceSvg();
  assert.match(illustrator, /12.51px/);
});
