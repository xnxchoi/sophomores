import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FLAME_APPEARANCE } from "@/components/gl/flame-backdrop/appearance";
import { DEFAULT_FLAME_CONFIG } from "@/components/gl/flame-backdrop/config";
import { DEFAULT_FOOTER_CONFIG } from "@/components/gl/flame-backdrop/footer-config";
import {
  BODY_MATERIAL_PROFILE,
  sampleBodyMaterialLighting
} from "@/components/gl/flame-backdrop/field/body-material";
import { FLAME_BLEND_WEIGHTS } from "@/components/gl/flame-backdrop/field/blend";
import {
  BREATHING_CONFIG,
  emissionGainAt
} from "@/components/gl/flame-backdrop/field/material";

const current = JSON.parse(
  readFileSync(
    new URL("./fixtures/appearance/current.json", import.meta.url),
    "utf8"
  )
);

test("appearance defaults retain the current user-tuned values without normalizing independent gains", () => {
  assert.equal(
    FLAME_APPEARANCE.front.softness,
    current.config.fire.frontSoftness
  );
  assert.deepEqual(FLAME_APPEARANCE.bodyMaterial, current.profile);
  assert.deepEqual(FLAME_APPEARANCE.materialMix, current.weights);
  assert.deepEqual(FLAME_APPEARANCE.exposure.breathing, current.breathing);
  assert.ok(Object.isFrozen(FLAME_APPEARANCE));
  for (const group of Object.values(FLAME_APPEARANCE))
    assert.ok(Object.isFrozen(group));
  assert.equal(BODY_MATERIAL_PROFILE, FLAME_APPEARANCE.bodyMaterial);
  assert.equal(BREATHING_CONFIG, FLAME_APPEARANCE.exposure.breathing);
  assert.equal(FLAME_BLEND_WEIGHTS.material, FLAME_APPEARANCE.materialMix);
  assert.equal(
    DEFAULT_FLAME_CONFIG.fire.frontSoftness,
    FLAME_APPEARANCE.front.softness
  );
  assert.equal(
    DEFAULT_FOOTER_CONFIG.visual.brightness,
    FLAME_APPEARANCE.exposure.brightness
  );
  assert.equal(
    DEFAULT_FOOTER_CONFIG.fire.intensity,
    FLAME_APPEARANCE.exposure.intensity
  );
});

test("centralization preserves the current generated shader structure, Float32 values, lighting and gains", () => {
  for (const { input, result } of current.lighting) {
    const actual = sampleBodyMaterialLighting(input);
    for (const key of Object.keys(actual) as Array<keyof typeof actual>)
      assert.ok(Math.abs(actual[key] - result[key]) < 1e-12);
  }
  for (const { time, result } of current.gains)
    assert.equal(emissionGainAt(time), result);
});
