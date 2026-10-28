import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ColorManagement, SRGBColorSpace } from "three";
import {
  DEFAULT_FLAME_CONFIG,
  linearColor
} from "@/components/gl/flame-backdrop/config";
import {
  pointerWeightAt,
  type Point
} from "@/components/gl/flame-backdrop/geometry";
import { sampleBodyMaterialLighting } from "@/components/gl/flame-backdrop/field/body-material";
import { advanceIgnition } from "@/components/gl/flame-backdrop/field/ignition";
import { createGasFlameShader } from "@/components/gl/flame-backdrop/field/gas-shader";
import { referenceConfig } from "@/components/gl/flame-backdrop/field/material";
import { centerOpacityAt } from "@/components/gl/flame-backdrop/mask/profile";
import { cyclePaletteWeights } from "@/components/gl/flame-backdrop/palette";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";
import { assertShaderFixture } from "./support/shader-fixture";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/library-reuse.json", import.meta.url),
    "utf8"
  )
);

test("installed Three math preserves approved flame lighting and silhouette samples", () => {
  for (const { input, result } of fixture.lighting) {
    const actual = sampleBodyMaterialLighting(input, fixture.materialWeights);
    // Preserve the recorded library-parity samples, applying only the explicit
    // backlight (.4 -> .74) and edge-gain (.08 -> .18) tuning in 4aedf35.
    const backlightRatio = (.6 + .74 * input.backlight) / (.6 + .4 * input.backlight);
    const body = result.body * backlightRatio;
    const edge = result.edge * backlightRatio * (.18 / .08);
    const next = Math.min(1, Math.max(0, body + edge + result.halo)) * input.emissionGain;
    const expected = { ...result, body, edge, next, blended: result.original * fixture.materialWeights.original + next * fixture.materialWeights.next };
    for (const key of Object.keys(actual) as Array<keyof typeof actual>)
      assert.ok(Math.abs(actual[key] - expected[key]) < 1e-12);
  }
  for (const { radius, result } of fixture.opacity)
    assert.ok(Math.abs(centerOpacityAt(radius, 1.2, 0.18) - result) < 1e-12);
  for (const { time, result } of fixture.palette)
    cyclePaletteWeights(time).forEach((value, i) =>
      assert.ok(Math.abs(value - result[i]) < 1e-12)
    );
  for (const { point, position, result } of fixture.pointer) {
    assert.ok(
      Math.abs(
        pointerWeightAt(
          point as Point,
          position as Point,
          0.8,
          2.4,
          DEFAULT_FLAME_CONFIG
        ) - result
      ) < 1e-12
    );
  }
});

test("flame CPU math imports library primitives rather than defining duplicate helpers", () => {
  for (const path of [
    "geometry.ts",
    "field/body-material.ts",
    "field/ignition.ts",
    "mask/profile.ts",
    "palette.ts"
  ]) {
    const source = readFileSync(
      new URL(`../../components/gl/flame-backdrop/${path}`, import.meta.url),
      "utf8"
    );
    assert.match(source, /import \{ MathUtils \} from ['"]three['"]/);
    assert.doesNotMatch(source, /(?:function|const) (?:smoothstep|clamp)\b/);
  }
});

test("installed color conversion preserves characterized channels independently of global color management", () => {
  const previous = {
    enabled: ColorManagement.enabled,
    workingColorSpace: ColorManagement.workingColorSpace
  };
  try {
    for (const enabled of [false, true])
      for (const space of [previous.workingColorSpace, SRGBColorSpace]) {
        ColorManagement.enabled = enabled;
        ColorManagement.workingColorSpace = space;
        for (const { input, result } of fixture.colors) {
          const actual = linearColor(input);
          assert.ok(Object.isFrozen(actual));
          actual.forEach((value, index) =>
            assert.ok(Math.abs(value - result[index]) < 2e-11)
          );
        }
      }
  } finally {
    ColorManagement.enabled = previous.enabled;
    ColorManagement.workingColorSpace = previous.workingColorSpace;
  }
  assert.ok(Number.isNaN(linearColor("")[0]));
  assert.throws(() => linearColor(null as never), TypeError);
  const source = readFileSync(
    new URL("../../components/gl/flame-backdrop/config.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /\.convertSRGBToLinear\(\)/);
  assert.doesNotMatch(source, /const linear\s*=/);
});

test("installed damping preserves scrub endpoints and state", () => {
  for (const { input, result } of fixture.ignition) {
    const actual = advanceIgnition(
      input.state,
      input.delta,
      true,
      input.exposure,
      true
    );
    assert.ok(Math.abs(actual.progress - result.progress) < 1e-12);
    assert.equal(actual.elapsed, result.elapsed);
    assert.equal(actual.hasLit, result.hasLit);
    assert.equal(actual.scrubbing, result.scrubbing);
    assert.equal(input.state.scrubbing, false);
  }
  const source = readFileSync(
    new URL("../../components/gl/flame-backdrop/field/ignition.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /MathUtils\.damp\(/);
});

test("installed color conversion changes only Float32-equivalent GLSL number spellings", () => {
  const generated = {
    ring: createFragmentShader(DEFAULT_FLAME_CONFIG),
    gas: createGasFlameShader(
      referenceConfig(1440, 900),
      fixture.materialWeights
    )
  };
  for (const name of ["ring", "gas"] as const) {
    assertShaderFixture(generated[name], name, fixture.shaderDigests[name]);
  }
});
