import assert from "node:assert/strict";
import test from "node:test";
import {
  CENTER_FADE,
  ENVELOPE_PATH,
  centerOpacityAt,
  envelopeFadeLayers
} from "@/components/gl/flame-backdrop/mask/profile";
import {
  createEnvelopeMaskUrl,
  createPreviousEnvelopeMaskUrl
} from "@/components/gl/flame-backdrop/mask/svg";

test("opacity decreases from near the center rather than keeping a broad opaque plateau", () => {
  assert.equal(CENTER_FADE.exponent, 1.2);
  assert.equal(CENTER_FADE.smoothing, 1.39);
  assert.deepEqual(CENTER_FADE.origin, [50, 62]);
  assert.equal(centerOpacityAt(0, 3), 1);
  assert.ok(Math.abs(centerOpacityAt(0.15, 3) - 0.93925 ** 3) < 1e-12);
  assert.equal(centerOpacityAt(0.5, 3), 0.125);
  assert.ok(centerOpacityAt(0.75, 3) < 0.004);
  assert.equal(centerOpacityAt(1, 3), 0);
  assert.equal(centerOpacityAt(1.5, 3), 0);
  let previous = 1;
  for (let index = 1; index <= 10000; index++) {
    const radius = index / 10000;
    const alpha = centerOpacityAt(radius, 3);
    assert.ok(Number.isFinite(alpha) && alpha >= 0 && alpha <= previous);
    previous = alpha;
  }
  for (const invalid of [null, undefined, "", {}, NaN, Infinity, -0.01])
    assert.throws(() => centerOpacityAt(invalid as number, 3), /radius/);
  for (const invalid of [null, undefined, "", {}, NaN, Infinity, 0.9, 4.1])
    assert.throws(() => centerOpacityAt(0.5, invalid as number), /exponent/);
});

test("128 nested contour opacities source-over to sqrt-profile, then multiply back to intended falloff", () => {
  const layers = envelopeFadeLayers(3);
  assert.equal(layers.length, 128);
  assert.equal(layers[0].scale, 1);
  assert.equal(layers[0].opacity, 0);
  assert.equal(layers.at(-1)?.scale, 0.001);
  assert.equal(layers.at(-1)?.opacity, 1);
  let accumulated = 0;
  layers.forEach((layer, index) => {
    assert.ok(layer.opacity >= 0 && layer.opacity <= 1);
    if (index) assert.ok(layer.scale < layers[index - 1].scale);
    accumulated = accumulated + layer.opacity * (1 - accumulated);
    const expected =
      index === layers.length - 1 ? 1 : centerOpacityAt(layer.scale, 3);
    assert.ok(Math.abs(accumulated ** 2 - expected) < 1e-12);
  });
  assert.equal(accumulated, 1);
  for (const exponent of [1, 2, 3, 4])
    assert.equal(envelopeFadeLayers(exponent).length, 128);
  assert.throws(() => envelopeFadeLayers(5), /exponent/);
});

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

test("homothetic contours stay nested inside the original amorphous silhouette", () => {
  const numbers = ENVELOPE_PATH.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const points: Array<readonly [number, number]> = [];
  let start = numbers.slice(0, 2);
  for (let offset = 2; offset < numbers.length; offset += 6) {
    const [cx1, cy1, cx2, cy2, endX, endY] = numbers.slice(offset, offset + 6);
    for (let step = 0; step < 64; step++) {
      const t = step / 64;
      const a = (1 - t) ** 3,
        b = 3 * (1 - t) ** 2 * t,
        c = 3 * (1 - t) * t ** 2,
        d = t ** 3;
      points.push([
        a * start[0] + b * cx1 + c * cx2 + d * endX,
        a * start[1] + b * cy1 + c * cy2 + d * endY
      ]);
    }
    start = [endX, endY];
  }
  const contains = (x: number, y: number) => {
    let inside = false;
    points.forEach(([ax, ay], index) => {
      const [bx, by] = points[(index + 1) % points.length];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
        inside = !inside;
    });
    return inside;
  };
  const [cx, cy] = CENTER_FADE.origin;
  assert.ok(contains(cx, cy));
  for (const scale of [0.001, 0.15, 0.5, 0.99])
    for (const [x, y] of points) {
      assert.ok(
        contains(cx + (x - cx) * scale, cy + (y - cy) * scale),
        `contour escapes at scale ${scale}`
      );
    }
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

test("center lift gently strengthens the core without changing the low-alpha outer field", () => {
  assert.equal(CENTER_FADE.centerLift, 0.18);
  assert.equal(CENTER_FADE.maxCenterLift, 0.4);
  assert.equal(centerOpacityAt(0, 1.2, 0.18), 1);
  assert.equal(centerOpacityAt(1, 1.2, 0.18), 0);
  assert.ok(centerOpacityAt(0.25, 1.2, 0.18) > centerOpacityAt(0.25, 1.2));
  assert.equal(centerOpacityAt(0.8, 1.2, 0.18), centerOpacityAt(0.8, 1.2));
  for (const lift of [0, 0.18, 0.4]) {
    let previous = 1;
    for (let step = 0; step <= 1000; step++) {
      const alpha = centerOpacityAt(step / 1000, 1.2, lift);
      assert.ok(alpha >= 0 && alpha <= previous);
      previous = alpha;
    }
    let accumulated = 0;
    envelopeFadeLayers(1.2, lift).forEach((layer, index) => {
      accumulated += layer.opacity * (1 - accumulated);
      const expected =
        index === CENTER_FADE.layers - 1
          ? 1
          : centerOpacityAt(layer.scale, 1.2, lift);
      assert.ok(Math.abs(accumulated ** 2 - expected) < 1e-12);
    });
  }
  for (const invalid of [-0.01, 0.41, NaN, Infinity, null, "0"]) {
    assert.throws(() => centerOpacityAt(0.2, 1.2, invalid as number), /lift/);
    assert.throws(
      () =>
        createEnvelopeMaskUrl(100, 100, 1.39, 1.2, false, invalid as number),
      /lift/
    );
  }
  assert.notEqual(
    createEnvelopeMaskUrl(100, 100, 1.39, 1.2, false, 0.18),
    createEnvelopeMaskUrl(100, 100, 1.39, 1.2, false, 0)
  );
});
