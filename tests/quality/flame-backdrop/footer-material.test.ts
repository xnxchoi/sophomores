import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { resolveFooterConfig } from "@/components/gl/flame-backdrop/FlameFooterBackdrop";
import { createFragmentShader } from "@/components/gl/flame-backdrop/shaders";
import { FOOTER_SUBSTANCE_GLSL } from "@/components/gl/flame-backdrop/footer-material";

test("substance is explicit and restricted to an emitting footer", () => {
  const footer = resolveFooterConfig();
  const before = JSON.stringify(footer);
  const substance = createFragmentShader(footer, "substance");
  assert.match(substance, /float materialEmission/);
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

test("material preserves settled geometry, color and clocks without textures or new animation", () => {
  const config = resolveFooterConfig();
  const original = createFragmentShader(config);
  const substance = createFragmentShader(config, "substance");
  for (const name of ["flameReaction"]) {
    const fn = new RegExp(`float ${name}\\([^}]+\\}`);
    assert.equal(substance.match(fn)?.[0], original.match(fn)?.[0]);
  }
  assert.match(substance, /materialEmission/);
  assert.match(substance, /materialDiffusion/);
  assert.match(
    substance,
    /float envelope = launch \* dissolve \* shoulders \* crown/
  );
  assert.equal(
    substance.match(/float hueCycle[^;]+;/)?.[0],
    original.match(/float hueCycle[^;]+;/)?.[0]
  );
  assert.doesNotMatch(
    substance,
    /sampler|texture2D|dFdx|dFdy|undefined|NaN|Infinity/
  );
  assert.equal(
    (substance.match(/flameReaction\(/g) ?? []).length,
    2,
    "definition and existing field only; no surface-normal samples"
  );
});

test("only the substance footer changes transient ignition, with an exact settled neutral endpoint", () => {
  const fn = /float flameIgnition\([^}]+\}/;
  const footer = resolveFooterConfig();
  const original = createFragmentShader(footer);
  const substance = createFragmentShader(footer, "substance");
  assert.notEqual(substance.match(fn)?.[0], original.match(fn)?.[0]);
  assert.match(
    substance.match(fn)?.[0] ?? "",
    /if \(progress >= 1\.0\) return 1\.0/
  );
  const ring = resolveFlameConfig({
    fire: { intensity: 1 },
    ignition: { enabled: true }
  });
  assert.equal(
    createFragmentShader(ring, "substance").match(fn)?.[0],
    createFragmentShader(ring).match(fn)?.[0]
  );
  const still = createFragmentShader(
    resolveFooterConfig({ ignition: { enabled: false } }),
    "substance"
  );
  assert.doesNotMatch(
    still,
    /flameIgnition|footerIgnitionHeight|uIgnitionProgress/
  );
});

test("gaseous substance emits broken fronts and uneven glow without reflective membrane shading", () => {
  assert.doesNotMatch(
    FOOTER_SUBSTANCE_GLSL,
    /materialNormal|materialFacing|materialTransmission|materialGlint|normalize|dot\(/
  );
  assert.equal(
    (FOOTER_SUBSTANCE_GLSL.match(/flameFront\(/g) ?? []).length,
    2,
    "one reaction front and its broad glow, not offset contour bands"
  );
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialFuel/);
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialEmission/);
  assert.match(FOOTER_SUBSTANCE_GLSL, /float materialDiffusion/);
  assert.doesNotMatch(
    FOOTER_SUBSTANCE_GLSL,
    /\bedge\s*\*|\bhalo\s*\*|uColorTime|uTime|vUv|gl_FragCoord/
  );
  assert.equal(
    (FOOTER_SUBSTANCE_GLSL.match(/flameReaction\(/g) ?? []).length,
    0
  );
  assert.equal(
    (FOOTER_SUBSTANCE_GLSL.match(/flameNoise\(/g) ?? []).length,
    2,
    "only two cheap advected patches"
  );
});

test("root glow continues through the existing smooth stem envelope without changing light shaders", () => {
  const substance = createFragmentShader(resolveFooterConfig(), "substance");
  assert.match(
    substance,
    /materialRoot \* stemEnvelope \* \(1\.0 - envelope\)/
  );
  assert.doesNotMatch(
    createFragmentShader(resolveFooterConfig()),
    /materialRoot/
  );
  assert.doesNotMatch(
    createFragmentShader(
      resolveFooterConfig({ fire: { stemStrength: 0 } }),
      "substance"
    ),
    /stemEnvelope|stems/
  );
  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const coverage = (lift: number) => {
    const launch = smoothstep(-0.3, 0.12, lift);
    const stem =
      smoothstep(-0.65, -0.3, lift) * (1 - smoothstep(-0.05, 0.2, lift));
    return launch + stem * (1 - launch);
  };
  assert.equal(coverage(-0.65), 0);
  assert.equal(coverage(0.2), 1);
  for (let lift = -0.65; lift <= 0.2; lift += 0.01) {
    assert.ok(coverage(lift) >= 0 && coverage(lift) <= 1);
    assert.ok(
      Math.abs(coverage(lift + 0.0001) - coverage(lift)) < 0.001,
      "no seam at the arc root"
    );
  }
});

test("site uses the image-backed field while legacy material controls remain isolated", () => {
  const scene = readFileSync(
    new URL("../../../src/components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  const hero = scene.match(/<FlameBackdrop\s([\s\S]*?)\/>/)?.[1];
  const footer = scene.match(/<FlameFooterBackdrop\s([\s\S]*?)\/>/)?.[1];
  assert.ok(hero);
  assert.ok(footer);
  assert.doesNotMatch(hero, /footerMaterial|config=/);
  assert.doesNotMatch(footer, /footerMaterial|config=/);
  const component = readFileSync(
    new URL("../../../src/components/gl/flame-backdrop/FlameBackdrop.tsx", import.meta.url),
    "utf8"
  );
  assert.match(component, /config: settings,\s*footerMaterial/);
  assert.match(
    component,
    /\[configKey, viewportActivation, viewportThreshold, footerMaterial\]/
  );
});
