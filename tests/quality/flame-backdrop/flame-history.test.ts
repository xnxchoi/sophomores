import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HISTORICAL_INITIAL_GLSL,
  HISTORICAL_STRONGER_GLSL,
  createHistoricalShader,
  referenceConfig
} from "@/components/gl/flame-backdrop/field/material";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";
import { FOOTER_SUBSTANCE_GLSL } from "@/components/gl/flame-backdrop/footer-material";
import { assertShaderFloat32Equivalent } from "../../flame-backdrop/support/shader-fixture";

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

test("renderer validates historical source before allocation and unwinds failed initialization", () => {
  const source = readFileSync(
    new URL(
      "../../../src/components/devtools/flame-reference/historical-renderer.ts",
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
