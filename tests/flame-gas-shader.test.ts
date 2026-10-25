import assert from "node:assert/strict";
import test from "node:test";
import {
  createGasFlameShader,
  ignitionUvSample
} from "../components/flame-backdrop/field/gas-shader";
import { referenceConfig } from "../components/flame-backdrop/field/material";
import {
  FLAME_BLEND_WEIGHTS,
  flameMotionSeconds
} from "../components/flame-backdrop/field/blend";
import { createResponsiveEnvelopeShader } from "../components/flame-backdrop/field/shader";
import {
  BODY_MATERIAL_GLSL,
  ORIGINAL_MATERIAL_LIGHT,
  createBodyMaterialBlock
} from "../components/flame-backdrop/field/body-material";

test("comparison generator varies only lighting weights without changing the production default or wrapper", () => {
  const config = referenceConfig(1440, 900);
  const original = createGasFlameShader(config);
  for (const weights of [
    { original: 0.9, next: 0.1 },
    { original: 0.7, next: 0.3 },
    { original: 0.5, next: 0.5 }
  ]) {
    assert.equal(
      createGasFlameShader(config, weights).replace(
        createBodyMaterialBlock(weights),
        BODY_MATERIAL_GLSL
      ),
      original
    );
  }
  assert.equal(
    createGasFlameShader(config, { original: 0.75, next: 0.25 }),
    original
  );
  assert.throws(
    () => createGasFlameShader(config, { original: 0.7, next: 0.4 }),
    /weights/
  );
});

test("ignition preserves original surface with only the approved lighting statement and UV wrapper", () => {
  const config = referenceConfig(1440, 900);
  const canonical = createResponsiveEnvelopeShader(config);
  const shader = createGasFlameShader(config);
  const preserved = shader
    .slice(0, shader.indexOf("\n// IGNITION WRAPPER"))
    .replace(
      "void renderEnvelopeMaterial(vec2 vUv, float uTime)",
      "void renderEnvelopeMaterial()"
    )
    .replace(
      "void renderOriginalField(vec2 vUv, float motionTime)",
      "void main()"
    )
    .replace(
      "renderEnvelopeMaterial(vUv, motionTime);",
      "renderEnvelopeMaterial();"
    )
    .replace(BODY_MATERIAL_GLSL, ORIGINAL_MATERIAL_LIGHT);
  assert.equal(preserved, canonical);
});

test("settled field uses exact original UVs without replacement flame geometry", () => {
  const shader = createGasFlameShader(referenceConfig(1440, 900));
  assert.ok(
    shader.includes(
      "if (progress >= 1.0 && exposureOffset == 0.0) {\n    renderOriginalField(vUv, motionTime);"
    )
  );
  for (const rejected of [
    "gasFlow",
    "gasRoot",
    "streamCell",
    "jetLight",
    "seam",
    "ribbons"
  ]) {
    assert.ok(!shader.includes(rejected));
  }
  assert.ok(shader.includes("renderOriginalField(ignitionUv, motionTime);"));
});

test("crackles use active time after canonical rendering with bounded count", () => {
  const shader = createGasFlameShader(referenceConfig(1440, 900));
  assert.ok(shader.includes("i < 7"));
  assert.ok(shader.includes("uColorTime"));
  assert.ok(shader.includes("if (progress <= 0.0)"));
  assert.equal(shader.split("uniform float uColorTime;").length, 2);
  assert.equal(shader.split("uniform float uIgnitionProgress;").length, 2);
  assert.ok(
    shader.indexOf("vec3 sparkLight = ignitionCrackles") >
      shader.lastIndexOf("renderOriginalField(ignitionUv, motionTime);")
  );
});

test("approved independent controls are frozen and normalized", () => {
  const expected = {
    silhouette: [0.7, 0.3],
    material: [0.75, 0.25],
    color: [0.8, 0.2],
    surface: [1, 0],
    motion: [0.3, 0.7],
    animation: [0, 1]
  };
  assert.ok(Object.isFrozen(FLAME_BLEND_WEIGHTS));
  for (const [factor, weights] of Object.entries(FLAME_BLEND_WEIGHTS)) {
    assert.ok(Object.isFrozen(weights));
    assert.deepEqual(
      [weights.original, weights.next],
      expected[factor as keyof typeof expected]
    );
    assert.equal(weights.original + weights.next, 1);
  }
  const shader = createGasFlameShader(referenceConfig(1440, 900));
  for (const controlled of [
    "0.70 + 0.30 * heightEnvelope",
    "materialLightOG * 0.75 + materialLightNG * 0.25",
    "accent, 0.20",
    "uMotionTime * 1.42"
  ]) {
    assert.ok(shader.includes(controlled));
  }
  assert.ok(!shader.includes("materialBreath"));
});

test("motion uses continuous active advection with no new loop-boundary jump", () => {
  assert.equal(flameMotionSeconds(0), 0);
  assert.ok(Math.abs(flameMotionSeconds(1) - 1.42) < 1e-12);
  assert.ok(
    Math.abs(
      flameMotionSeconds(16.001) - flameMotionSeconds(15.999) - 0.00284
    ) < 1e-10
  );
  for (const invalid of [-1, NaN, Infinity])
    assert.throws(() => flameMotionSeconds(invalid), /finite and nonnegative/);
});

test("shared UV transform remains continuous when ignition reaches settled at partial exposure", () => {
  for (const exposure of [0.08, 0.15, 0.4, 1]) {
    for (const v of [0, 0.15, 0.5, 1]) {
      assert.ok(
        Math.abs(
          ignitionUvSample(v, 0.9999999, exposure) -
            ignitionUvSample(v, 1, exposure)
        ) < 1e-8
      );
    }
  }
  for (const v of [0, 0.15, 0.5, 1])
    assert.ok(Math.abs(ignitionUvSample(v, 1, 1) - v) < 1e-12);
  for (const invalid of [-1, NaN, Infinity])
    assert.throws(() => ignitionUvSample(0.5, 1, invalid), /normalized finite/);
});
