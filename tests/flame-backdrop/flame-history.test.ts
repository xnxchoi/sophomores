import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HISTORICAL_INITIAL_GLSL,
  HISTORICAL_STRONGER_GLSL,
  BREATHING_CONFIG,
  emissionGainAt,
  createHistoricalShader,
  replaceHistoricalOnce,
  referenceConfig
} from "@/components/gl/flame-backdrop/field/material";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";
import { FOOTER_SUBSTANCE_GLSL } from "@/components/gl/flame-backdrop/footer-material";
import { assertShaderFloat32Equivalent } from "./support/shader-fixture";

const hash = (source: string) =>
  createHash("sha256").update(source).digest("hex");

test("historical provenance remains exact apart from the explicitly committed initial-front tuning", () => {
  // 4aedf35 changed only the initial front-width baseline from .85 to .45.
  assert.match(HISTORICAL_INITIAL_GLSL, /softness \* \(\.45 \+ \.55 \* materialBacklight\)/);
  assert.equal(
    hash(HISTORICAL_INITIAL_GLSL.replace("softness * (.45 + .55 * materialBacklight)", "softness * (.85 + .55 * materialBacklight)")),
    "001b32124f88d4167110fc1b77ca73aa0e31a52c1757a6fd6c9c614b649a05d2"
  );
  assert.equal(
    hash(HISTORICAL_STRONGER_GLSL),
    "056b7f5eed5481b51e282772e9961a88914017c23e7047b2f62e593b912c31cf"
  );
});

test("historical shader changes only the material block and later-added root term", () => {
  const config = referenceConfig(1440, 900);
  const current = createFragmentShader(config, "substance");
  for (const [variant, block] of [
    ["initial", HISTORICAL_INITIAL_GLSL],
    ["stronger", HISTORICAL_STRONGER_GLSL]
  ] as const) {
    const historical = createHistoricalShader(config, variant);
    assert.equal(
      historical,
      current
        .replace(FOOTER_SUBSTANCE_GLSL, block)
        .replace(" + materialRoot * stemEnvelope * (1.0 - envelope)", "")
    );
    assert.doesNotMatch(
      historical,
      /materialRoot|aurora|materialNormal|materialGlint|uIgnitionProgress/
    );
    for (const name of [
      "flameHash",
      "flameNoise",
      "flameReaction",
      "flameFront"
    ]) {
      const pattern = new RegExp(`float ${name}\\([^]*?\\n\\}`);
      assert.ok(current.match(pattern));
      assert.equal(historical.match(pattern)?.[0], current.match(pattern)?.[0]);
    }
  }
  assert.equal(createFragmentShader(config, "substance"), current);
});

test("historical replacement fails closed on missing or ambiguous source markers", () => {
  assert.equal(replaceHistoricalOnce("abc def", "def", "ghi"), "abc ghi");
  assert.throws(
    () => replaceHistoricalOnce("abc", "def", "ghi"),
    /exactly once/
  );
  assert.throws(
    () => replaceHistoricalOnce("abc abc", "abc", "ghi"),
    /exactly once/
  );
  assert.throws(() => replaceHistoricalOnce("abc", "", "ghi"), /exactly once/);
  assert.throws(
    () =>
      createHistoricalShader(referenceConfig(1440, 900), "unknown" as never),
    /historical/
  );
  assert.equal(referenceConfig(375, 568).composition.verticalScale, 0.6);
  assert.equal(referenceConfig(1440, 900).ignition.enabled, false);
});

test("renderer validates historical source before allocation and unwinds failed initialization", () => {
  const source = readFileSync(
    new URL(
      "../../components/devtools/flame-reference/historical-renderer.ts",
      import.meta.url
    ),
    "utf8"
  );
  assert.ok(
    source.indexOf("const initialShader = createHistoricalShader") >= 0
  );
  assert.ok(
    source.indexOf("const initialShader = createHistoricalShader") <
      source.indexOf("new WebGLRenderer")
  );
  assert.match(source, /catch \(error\) \{\s*destroy\(\);\s*throw error;/);
  assert.match(
    source,
    /for \(let index = disposers\.length - 1; index >= 0; index--\)/
  );
  assert.match(source, /if \(disposed\) return;\s*disposed = true;/);
});

test("breathing gain starts at B, turns smoothly through A and repeats every 24 active seconds", () => {
  assert.equal(BREATHING_CONFIG.periodSeconds, 24);
  assert.equal(emissionGainAt(0), 1.9);
  assert.equal(emissionGainAt(12), 1);
  assert.equal(emissionGainAt(24), 1.9);
  for (let index = 0; index < 10000; index++) {
    const seconds = index / 31;
    const gain = emissionGainAt(seconds);
    assert.ok(gain >= 1 && gain <= 1.9);
    assert.ok(Math.abs(gain - emissionGainAt(seconds + 24)) < 1e-12);
  }
  assert.ok(1.9 - emissionGainAt(0.001) < 1e-7);
  assert.ok(emissionGainAt(12.001) - 1 < 1e-7);
  assert.equal(emissionGainAt(5, 10), 1);
  for (const invalid of [NaN, Infinity, -1, null, undefined, "", {}]) {
    assert.throws(() => emissionGainAt(invalid as number), /elapsed/);
  }
  for (const invalid of [NaN, Infinity, 0, -1, null, "", {}]) {
    assert.throws(() => emissionGainAt(0, invalid as number), /period/);
  }
});

test("breathing adds only a scalar emission uniform to Float32-equivalent B, leaving interior and geometry untouched", () => {
  const config = referenceConfig(1440, 900);
  const b = createHistoricalShader(config, "stronger");
  const breathing = createHistoricalShader(config, "breathing");
  assertShaderFloat32Equivalent(
    breathing,
    b
      .replace(
        "precision highp float;",
        "precision highp float;\nuniform float uEmissionGain;"
      )
      .replace(
        "(materialEmission + materialDiffusion) * 1.9 + materialInterior",
        "(materialEmission + materialDiffusion) * uEmissionGain + materialInterior"
      )
  );
});
