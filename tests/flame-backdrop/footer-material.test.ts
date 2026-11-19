import assert from "node:assert/strict";
import test from "node:test";
import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { resolveFooterConfig } from "@/components/gl/flame-backdrop/FlameFooterBackdrop";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";
import { FOOTER_SUBSTANCE_GLSL } from "@/components/gl/flame-backdrop/footer-material";

test("substance is explicit and restricted to an emitting footer", () => {
  const footer = resolveFooterConfig();
  const before = JSON.stringify(footer);
  const substance = createFragmentShader(footer, "substance");
  assert.notEqual(substance, createFragmentShader(footer));
  assert.equal(
    createFragmentShader(footer, "light"),
    createFragmentShader(footer)
  );
  for (const config of [
    resolveFlameConfig(),
    resolveFlameConfig({ fire: { intensity: 1 } }),
    resolveFooterConfig({ fire: { intensity: 0 } })
  ]) {
    assert.equal(
      createFragmentShader(config, "substance"),
      createFragmentShader(config)
    );
  }
  assert.equal(JSON.stringify(footer), before);
});

test("invalid runtime material selectors fail rather than silently choosing a style", () => {
  for (const invalid of [null, "", "glass", 1, {}, []]) {
    assert.throws(
      () => createFragmentShader(resolveFooterConfig(), invalid as never),
      /footerMaterial/
    );
  }
});

// Evaluate the actual scalar emission equations, not a duplicated model. This verifies
// light-energy contracts; GPU compilation and perceptual appearance need browser QA.
function materialLightAt(
  reaction: number,
  patch: number,
  backlight: number,
  lift = 0.9
): number {
  const smoothstep = (low: number, high: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
  };
  const evaluate = new Function(
    "reaction",
    "softness",
    "phase",
    "x",
    "lift",
    "flameNoise",
    "flameFront",
    "smoothstep",
    `${FOOTER_SUBSTANCE_GLSL.replace(/\bfloat\b/g, "const")} return materialLight;`
  );
  return evaluate(
    reaction,
    0.035,
    0,
    0,
    lift,
    (x: number) => (x < 20 ? patch : backlight),
    (value: number, width: number) => Math.exp(-((value / width) ** 2)),
    smoothstep
  );
}

test("fronts have genuine dark interruptions and depth without a filled sheet", () => {
  const hotFront = materialLightAt(0, 0.9, 0.9);
  const coldGap = materialLightAt(0, 0.1, 0.1);
  const hotInterior = materialLightAt(0.3, 0.9, 0.9);
  assert.ok(
    hotFront > 1.5,
    "reaction front retains luminous energy through the existing scene opacity"
  );
  assert.ok(
    coldGap < hotFront * 0.05,
    "fuel gaps break the contour rather than forming a continuous neon edge"
  );
  assert.ok(
    hotInterior < hotFront * 0.1,
    "aloft interior stays gaseous rather than filling the ribbons"
  );
  assert.ok(
    materialLightAt(0.06, 0.9, 0.9) > hotInterior,
    "soft emission extends around the reaction front"
  );
  assert.ok(
    materialLightAt(0, 0.9, 0.8) > materialLightAt(0, 0.9, 0.3),
    "independently advected depth changes luminosity"
  );
});

test("root body fades upward into ribbons while low-fuel roots remain attached", () => {
  for (const patch of [0.1, 0.5, 0.9]) {
    const root = materialLightAt(0.3, patch, 0.6, 0);
    const mid = materialLightAt(0.3, patch, 0.6, 0.4);
    const tip = materialLightAt(0.3, patch, 0.6, 0.95);
    assert.ok(
      root > mid && mid > tip,
      "root opacity grades continuously into transparent upper ribbons"
    );
  }
  assert.ok(
    materialLightAt(-0.3, 0.1, 0.1, 0) > 0.08,
    "cold roots retain a restrained luminous connection"
  );
  assert.ok(
    materialLightAt(-0.3, 0.1, 0.1, 0.95) < 0.001,
    "cold gaps aloft stay dark"
  );
  assert.ok(
    materialLightAt(0.3, 0.9, 0.9, 0) > materialLightAt(0.3, 0.1, 0.1, 0),
    "roots retain uneven field depth"
  );
});

test("emission remains finite, nonnegative and bounded across the fuel field", () => {
  for (const reaction of [-1, -0.3, -0.035, 0, 0.035, 0.3, 1]) {
    for (const patch of [0, 0.2, 0.5, 0.8, 1]) {
      for (const backlight of [0, 0.2, 0.5, 0.8, 1]) {
        for (const lift of [-0.65, -0.3, 0, 0.4, 0.95]) {
          const light = materialLightAt(reaction, patch, backlight, lift);
          assert.ok(Number.isFinite(light) && light >= 0 && light <= 3.5);
        }
      }
    }
  }
});
