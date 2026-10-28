import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  emissionGainAt,
  referenceConfig
} from "@/components/gl/flame-backdrop/field/material";
import { createGasFlameShader } from "@/components/gl/flame-backdrop/field/gas-shader";

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
  const before = readFileSync(
    new URL("./fixtures/appearance/footer-current.glsl", import.meta.url),
    "utf8"
  );
  assert.equal(
    createHash("sha256").update(before).digest("hex"),
    current.shaderHash
  );
  const after = createGasFlameShader(referenceConfig(1440, 900));
  const token = /(?<![\w.])(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?(?![\w.])/g;
  assert.deepEqual(after.split(token), before.split(token));
  const original = [...before.matchAll(token)];
  const generated = [...after.matchAll(token)];
  assert.equal(generated.length, original.length);
  original.forEach((number, i) =>
    assert.equal(
      Math.fround(Number(generated[i][0])),
      Math.fround(Number(number[0]))
    )
  );
  for (const { input, result } of current.lighting) {
    const actual = sampleBodyMaterialLighting(input);
    for (const key of Object.keys(actual) as Array<keyof typeof actual>)
      assert.ok(Math.abs(actual[key] - result[key]) < 1e-12);
  }
  for (const { time, result } of current.gains)
    assert.equal(emissionGainAt(time), result);
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../../public/masks/flame-envelope.png", import.meta.url)
        )
      )
      .digest("hex"),
    current.maskHash
  );
});

test("front softness remains a real configurable shader input rather than a duplicated annotation", () => {
  const config = referenceConfig(1440, 900);
  const changed = createGasFlameShader({
    ...config,
    fire: { ...config.fire, frontSoftness: 0.07 }
  });
  assert.match(changed, /float softness = 0\.07 \+/);
  assert.doesNotMatch(changed, /float softness = 0\.045 \+/);
});
