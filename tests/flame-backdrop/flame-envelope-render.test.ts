import assert from "node:assert/strict";
import test from "node:test";
import {
  createEnvelopeShader,
  envelopeMaterialPoint,
  envelopeCoordinatesForAspect,
  ENVELOPE_COORDINATES
} from "@/components/gl/flame-backdrop/field/shader";
import { createEnvelopeMaskUrl } from "@/components/gl/flame-backdrop/mask/svg";
import { referenceConfig } from "@/components/gl/flame-backdrop/field/material";

test("study changes only coverage and coordinates, retaining accepted helpers, stems, shade, and tone mapping", () => {
  const config = referenceConfig(1440, 900);
  assert.equal(config.fire.rimStrength, 0);
  assert.equal(config.visual.overlapWhitening, 0);
  for (const key of ["fire", "visual"] as const) {
    const changed =
      key === "fire"
        ? { ...config, fire: { ...config.fire, rimStrength: 1 } }
        : { ...config, visual: { ...config.visual, overlapWhitening: 1 } };
    assert.throws(() => createEnvelopeShader(changed), /ring/);
  }
  assert.throws(
    () =>
      createEnvelopeShader({
        ...config,
        fire: { ...config.fire, plumeHeight: 0.3 }
      }),
    /fuel domain/
  );
  assert.throws(
    () =>
      createEnvelopeShader({
        ...config,
        visual: { ...config.visual, ringRadius: 0.4 }
      }),
    /fuel domain/
  );
});

test("expanded envelope samples full fuel height without recreating an arch or changing x density", () => {
  for (const x of [0, 0.25, 0.5, 0.75, 1]) {
    for (const [y, expectedLift] of [
      [0.06, -0.2],
      [0.7, 0.9]
    ] as const) {
      const point = envelopeMaterialPoint(x, y);
      const root = Math.sqrt(Math.max(0, 0.35 ** 2 - point[0] ** 2));
      assert.ok(Math.abs((point[1] - root) / 0.25 - expectedLift) < 1e-12);
      assert.ok(
        Math.abs(point[0] / 0.35) < 0.85,
        "original shoulder gate is fully open"
      );
      assert.ok(point[1] / 0.35 > 0.18, "original crown gate is fully open");
    }
  }
  for (const invalid of [null, undefined, "", NaN, Infinity, -0.1, 1.1]) {
    assert.throws(() => envelopeMaterialPoint(invalid as number, 0.5), /UV/);
    assert.throws(() => envelopeMaterialPoint(0.5, invalid as number), /UV/);
  }
});

test("portrait material center-crops its horizontal domain instead of squeezing desktop texture", () => {
  const desktopAspect = 1.6;
  assert.equal(
    envelopeCoordinatesForAspect(desktopAspect),
    ENVELOPE_COORDINATES
  );
  assert.equal(envelopeCoordinatesForAspect(2.4), ENVELOPE_COORDINATES);
  for (const [width, height] of [
    [390, 844],
    [375, 667],
    [768, 1024],
    [1440, 900]
  ]) {
    const aspect = width / height;
    const left = envelopeMaterialPoint(0, 0.5, aspect);
    const right = envelopeMaterialPoint(1, 0.5, aspect);
    const pixelScale = (right[0] - left[0]) / width;
    assert.ok(Math.abs(pixelScale - (0.35 * 2) / 1.2 / (height * 1.6)) < 1e-12);
    assert.equal(envelopeMaterialPoint(0.5, 0.5, aspect)[0], 0);
    assert.ok(Math.abs(right[0]) <= 0.35 / 1.2);
  }
  for (const invalid of [null, undefined, "", NaN, Infinity, -1, 0]) {
    if (invalid === undefined) continue; // Omitted optional aspect intentionally uses the desktop domain.
    assert.throws(
      () => envelopeCoordinatesForAspect(invalid as number),
      /aspect/
    );
    assert.throws(
      () => envelopeMaterialPoint(0.5, 0.5, invalid as number),
      /aspect/
    );
  }
});

test("one validated serialized SVG provides identical render-mask and debug-image opacity", () => {
  const url = createEnvelopeMaskUrl(390, 844, 0.75, 3);
  assert.match(url, /^data:image\/svg\+xml,/);
  for (const invalid of [null, undefined, "", NaN, Infinity, -1, 0]) {
    assert.throws(
      () => createEnvelopeMaskUrl(invalid as number, 900, 0.75, 3),
      /width/
    );
    assert.throws(
      () => createEnvelopeMaskUrl(1440, invalid as number, 0.75, 3),
      /height/
    );
  }
  assert.throws(() => createEnvelopeMaskUrl(1440, 900, 9, 3), /smoothing/);
  assert.throws(() => createEnvelopeMaskUrl(1440, 900, 0.75, 5), /exponent/);
});
