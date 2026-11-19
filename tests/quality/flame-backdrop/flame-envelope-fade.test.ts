import assert from "node:assert/strict";
import test from "node:test";
import {
  createEnvelopeMaskUrl,
  createPreviousEnvelopeMaskUrl
} from "@/components/gl/flame-backdrop/mask/svg";

test("shared SVG smooths both identical half-profile fields before clipping to the original boundary", () => {
  const svg = decodeURIComponent(createEnvelopeMaskUrl(1440, 900, 0.75, 3));
  assert.equal((svg.match(/data-fade-layer=/g) ?? []).length, 128);
  assert.match(svg, /stdDeviation="6.75"/);
  assert.match(svg, /<mask[^>]*id="edge-guard"[^>]*mask-type="alpha"/);
  assert.match(svg, /<mask[^>]*><g filter="url\(#soften\)">/);
  assert.equal((svg.match(/filter="url\(#soften\)"/g) ?? []).length, 2);
  assert.match(svg, /<clipPath id="outer-boundary"/);
  assert.match(
    svg,
    /<g clip-path="url\(#outer-boundary\)"><g mask="url\(#edge-guard\)"><g filter="url\(#soften\)"/
  );
  assert.match(svg, /translate\(50 62\) scale\(/);
  assert.doesNotMatch(
    svg,
    /radialGradient|ellipse|feFunc[RGBA]|feComponentTransfer/
  );
  assert.equal(
    (svg.match(/<path /g) ?? []).length,
    1,
    "all silhouettes reuse the one unchanged path"
  );
  assert.equal(
    (svg.match(/href="#profile"/g) ?? []).length,
    2,
    "field and guard share the same smoothed opacity contours"
  );
  assert.throws(() => createEnvelopeMaskUrl(1440, 900, 2.1, 3), /smoothing/);
  assert.throws(
    () => createEnvelopeMaskUrl(1440, 900, 0.75, 3, "yes" as never),
    /comparison/
  );
});

test("before is the frozen previous mask, unaffected by new smoothing or falloff settings", () => {
  const before = createPreviousEnvelopeMaskUrl(390, 844);
  for (const smoothing of [0, 0.75, 2])
    for (const exponent of [1, 3, 4]) {
      assert.equal(
        createEnvelopeMaskUrl(390, 844, smoothing, exponent, true),
        before
      );
    }
  const svg = decodeURIComponent(before);
  assert.match(svg, /stdDeviation="54.86"/);
  assert.match(svg, /exponent="2.2"/);
  assert.doesNotMatch(svg, /edge-guard|data-fade-layer/);
});
