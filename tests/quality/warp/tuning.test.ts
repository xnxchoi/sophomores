import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { warpFragmentShader } from "@/components/Warp/warp-shaders";

const source = readFileSync(new URL("../../../src/components/Warp/warp-field.tsx", import.meta.url), "utf8");

test("neutral ring shader settings bypass color adjustments without resetting its clock", () => {
  assert.match(source, /if\s*\(uRingSaturation != 1\.0\)/);
  assert.match(source, /if\s*\((?:uRingBrightness|brightness) != 1\.0\)/);
  assert.doesNotMatch(source, /elapsed\.current\s*=\s*0/);
});

test("point, bloom and ray controls are independent shader inputs", () => {
  for (const name of ["uPointScale", "uPointBrightness", "uPointSoftness", "uBloomStrength", "uBloomSpread", "uShowPoint", "uShowBloom", "uRayWidth", "uRingScale"]) {
    assert.match(warpFragmentShader, new RegExp(`uniform float ${name};`));
  }
  assert.match(warpFragmentShader, /core\s*\*\s*uPointBrightness\s*\*\s*uShowPoint/);
  assert.match(warpFragmentShader, /bloom\s*\*\s*uBloomStrength\s*\*\s*uShowBloom/);
  assert.match(warpFragmentShader, /4\.0\s*\/\s*uPointSoftness/);
  const sceneSource = readFileSync(new URL("../../../src/components/Warp/index.tsx", import.meta.url), "utf8");
  assert.match(sceneSource, /blur-\(--warp-blur\)/);
  assert.doesNotMatch(source, /blur-\(--warp-blur\)/, "only the existing scene wrapper owns blur, not a second canvas filter");
});
