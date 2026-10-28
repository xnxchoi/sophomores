import assert from "node:assert/strict";
import test from "node:test";
import {
  BODY_MATERIAL_PROFILE,
  BODY_MATERIAL_GLSL,
  ORIGINAL_MATERIAL_LIGHT,
  createBodyMaterialBlock,
  createBodyMaterialShader,
  sampleBodyMaterialLighting
} from "@/components/gl/flame-backdrop/field/body-material";
import { FLAME_BLEND_WEIGHTS } from "@/components/gl/flame-backdrop/field/blend";
import { referenceConfig } from "@/components/gl/flame-backdrop/field/material";
import { createResponsiveEnvelopeShader } from "@/components/gl/flame-backdrop/field/shader";

const sample = (
  reaction: number,
  fuel = 0.8,
  backlight = 0.6,
  emissionGain = 1.9
) =>
  sampleBodyMaterialLighting({
    reaction,
    softness: 0.065,
    fuel,
    backlight,
    emissionGain
  });

test("comparison overrides change only the lighting mix and leave the approved default frozen", () => {
  const config = referenceConfig(1440, 900);
  const approved = JSON.stringify(FLAME_BLEND_WEIGHTS);
  assert.equal(createBodyMaterialBlock(), BODY_MATERIAL_GLSL);
  const original = createResponsiveEnvelopeShader(config);
  const defaultStatement =
    "float materialLight = materialLightOG * 0.75 + materialLightNG * 0.25;";
  for (const weights of [
    { original: 0.9, next: 0.1 },
    { original: 0.7, next: 0.3 },
    { original: 0.5, next: 0.5 },
    { original: 1, next: 0 },
    { original: 0, next: 1 }
  ]) {
    Object.freeze(weights);
    const block = createBodyMaterialBlock(weights);
    const statement = `float materialLight = materialLightOG * ${weights.original.toFixed(2)} + materialLightNG * ${weights.next.toFixed(2)};`;
    assert.equal(
      block.replace(statement, defaultStatement),
      BODY_MATERIAL_GLSL
    );
    assert.equal(
      createBodyMaterialShader(config, weights).replace(
        block,
        ORIGINAL_MATERIAL_LIGHT
      ),
      original
    );
    const input = {
      reaction: 0.1,
      softness: 0.065,
      fuel: 0.8,
      backlight: 0.6,
      emissionGain: 1.9
    };
    const result = sampleBodyMaterialLighting(input, weights);
    assert.equal(
      result.blended,
      result.original * weights.original + result.next * weights.next
    );
    assert.ok(result.next <= input.emissionGain);
    if (weights.next === 1) assert.equal(result.blended, result.next);
    if (weights.original === 1) assert.equal(result.blended, result.original);
  }
  assert.equal(JSON.stringify(FLAME_BLEND_WEIGHTS), approved);
  assert.ok(Object.isFrozen(FLAME_BLEND_WEIGHTS.material));
  assert.equal(
    createBodyMaterialShader(config),
    createBodyMaterialShader(config, { original: 0.75, next: 0.25 })
  );
});

test("comparison weights reject malformed and nonnormalized pairs before shader or CPU sampling", () => {
  const config = referenceConfig(1440, 900);
  const input = {
    reaction: 0.1,
    softness: 0.065,
    fuel: 0.8,
    backlight: 0.6,
    emissionGain: 1.9
  };
  for (const weights of [
    null,
    [],
    "",
    {},
    { original: 0.9 },
    { original: NaN, next: 0.1 },
    { original: Infinity, next: 0 },
    { original: -0.1, next: 1.1 },
    { original: 0.7, next: 0.2 },
    { original: "0.7", next: 0.3 }
  ]) {
    assert.throws(() => createBodyMaterialBlock(weights as never), /weights/);
    assert.throws(
      () => createBodyMaterialShader(config, weights as never),
      /weights/
    );
    assert.throws(
      () => sampleBodyMaterialLighting(input, weights as never),
      /weights/
    );
  }
  const weights = { original: 0.3333, next: 0.6667 };
  assert.ok(
    createBodyMaterialBlock(weights).includes(
      "materialLightOG * 0.3333 + materialLightNG * 0.6667"
    )
  );
});

test("body material replaces only the lighting statement and preserves original config and surface bytewise", () => {
  const config = referenceConfig(1440, 900);
  const before = JSON.stringify(config);
  const original = createResponsiveEnvelopeShader(config);
  const candidate = createBodyMaterialShader(config);
  assert.equal(
    candidate.replace(BODY_MATERIAL_GLSL, ORIGINAL_MATERIAL_LIGHT),
    original
  );
  assert.equal(JSON.stringify(config), before);
  assert.ok(
    candidate.includes(
      "float materialLightOG = (materialEmission + materialDiffusion) * uEmissionGain + materialInterior;"
    )
  );
  assert.ok(
    candidate.includes(
      "float materialLight = materialLightOG * 0.75 + materialLightNG * 0.25;"
    )
  );
  assert.ok(!candidate.includes("0.00975"));
  assert.throws(
    () =>
      createBodyMaterialShader({
        ...config,
        fire: { ...config.fire, rimStrength: 1 }
      }),
    /zero-ring/
  );
});

test("committed shape constants retain bounded 75:25 lighting, not alpha", () => {
  assert.ok(Object.isFrozen(BODY_MATERIAL_PROFILE));
  assert.equal(
    BODY_MATERIAL_PROFILE.bodyWeight +
      BODY_MATERIAL_PROFILE.edgeWeight +
      BODY_MATERIAL_PROFILE.haloWeight,
    1.1
  );
  assert.ok(!BODY_MATERIAL_GLSL.includes("gl_FragColor"));
  assert.ok(
    BODY_MATERIAL_GLSL.includes(
      "clamp(materialBody + materialEdge + materialHalo, 0.0, 1.0) * uEmissionGain"
    )
  );
  for (const reaction of [-10, -0.1, 0, 0.01, 0.08, 0.3, 1, 10]) {
    for (const fuel of [0, 0.1, 1])
      for (const backlight of [0, 0.5, 1])
        for (const gain of [0, 1, 1.9]) {
          const result = sample(reaction, fuel, backlight, gain);
          assert.ok(result.next >= 0 && result.next <= gain);
          assert.equal(
            result.blended,
            result.original * 0.75 + result.next * 0.25
          );
        }
  }
});

test("positive interiors remain connected beyond the edge and extinguish without fuel", () => {
  const interior = sample(0.4);
  assert.ok(interior.body > 0.2);
  assert.ok(interior.body > interior.edge * 100);
  assert.ok(interior.next > interior.original);
  for (let reaction = 0.01; reaction <= 1; reaction += 0.01)
    assert.ok(sample(reaction).next > 0);
  assert.equal(sample(0.4, 0).next, 0);
  assert.equal(sample(0, 0).next, 0);
  assert.equal(sample(-100).body, 0);
  assert.equal(sample(0.4, 1, 1, 0).next, 0);
});

test("bounded coverage correction reaches connected interiors before the old edge-only threshold", () => {
  assert.equal(BODY_MATERIAL_PROFILE.bodyThreshold, 0.1);
  assert.deepEqual(
    [
      BODY_MATERIAL_PROFILE.bodyWeight,
      BODY_MATERIAL_PROFILE.edgeWeight,
      BODY_MATERIAL_PROFILE.haloWeight
    ],
    [0.9, 0.18, 0.02]
  );
  assert.ok(sample(0.1).body >= 0.55);
  assert.ok(sample(0.1, 1, 0).body >= 0.54);
  assert.ok(sample(0.05).body > sample(0.05).edge);
});

test("original radiance retains canonical edge, diffusion and weak interior exactly", () => {
  const value = sample(0, 0.8, 0.6, 1.9);
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const expected =
    ((0.24 + 0.95 * 0.6) * 0.8 +
      0.22 * smooth((0.6 - 0.18) / (0.72 - 0.18)) * (0.25 + 0.75 * 0.8)) *
    1.9;
  assert.equal(value.original, expected);
  assert.ok(Math.abs(sample(0.8).original - 0.055 * 0.8 * 0.6) < 1e-9);
});

test("lighting boundary rejects invalid inputs and remains finite across 10k samples", () => {
  const valid = {
    reaction: 0.3,
    softness: 0.065,
    fuel: 0.8,
    backlight: 0.6,
    emissionGain: 1.9
  };
  for (const input of [
    null,
    undefined,
    "",
    [],
    { ...valid, reaction: NaN },
    { ...valid, softness: 0 },
    { ...valid, fuel: -1 },
    { ...valid, backlight: 2 },
    { ...valid, emissionGain: Infinity },
    { ...valid, emissionGain: -1 },
    { ...valid, reaction: "🔥" }
  ]) {
    assert.throws(
      () => sampleBodyMaterialLighting(input as never),
      /finite|lighting/
    );
  }
  for (let i = 0; i < 10_001; i++)
    assert.ok(Number.isFinite(sample((i - 5000) / 1000).blended));
});
