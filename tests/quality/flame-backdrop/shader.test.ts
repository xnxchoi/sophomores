import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveFlameConfig,
  PALETTES,
  RINGS
} from "@/components/gl/flame-backdrop/config";
import {
  createFragmentShader,
  vertexShader
} from "@/components/gl/flame-backdrop/shaders";

test("shader uses linear weighted palettes and sampler-free analytic geometry", () => {
  const source = createFragmentShader(resolveFlameConfig());
  assert.match(source, /uniform vec3 uPaletteWeights/);
  assert.doesNotMatch(source, /sampler|texture2D|uniform int uPalette/);
  assert.match(source, /neutralBudget/);
  assert.match(source, /0\.35 \+ offset/);
  assert.match(vertexShader, /aPosition/);
  for (const palette of PALETTES) {
    assert.ok(
      palette.colors.flat(2).every((value) => value >= 0 && value <= 1)
    );
    assert.match(source, new RegExp(String(palette.strength)));
  }
  assert.equal(RINGS.length, 5);
});

test("every group changes shader controls while retaining native edge dispersion", () => {
  const source = createFragmentShader(
    resolveFlameConfig({
      visual: {
        ringRadius: 0.3,
        brightness: 0.9,
        breathingAmount: 0.5,
        inwardLeakAmount: 0.6,
        overlapWhitening: 0.8,
        backgroundColor: "#000000"
      },
      pointer: { enabled: false },
      prism: { enabled: false },
      motion: { loopSeconds: 18 }
    })
  );
  assert.match(source, /0\.3 \+ offset/);
  assert.match(source, /18\.0/);
  assert.match(source, /0\.0018/);
  assert.doesNotMatch(source, /undefined|NaN/);
});

test("one-hot palette endpoints preserve each approved strength times pigment without cross terms", () => {
  const source = createFragmentShader(resolveFlameConfig());
  for (let ring = 0; ring < RINGS.length; ring++) {
    const branch = source
      .split(`if (index == ${ring}) return `)[1]
      .split(";")[0];
    assert.equal((branch.match(/uPaletteWeights\./g) ?? []).length, 3);
    for (const [index, palette] of PALETTES.entries()) {
      const vectors = palette.colors[ring].map(
        (color) => `vec3(${color.join(",")})`
      );
      assert.ok(
        branch.includes(
          `uPaletteWeights.${"rgb"[index]} * ${palette.strength} * mix(${vectors[0]}, ${vectors[1]}, blend)`
        )
      );
    }
  }
});
