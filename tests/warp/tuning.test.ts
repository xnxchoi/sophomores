import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Project, SyntaxKind } from "ts-morph";
import { MathUtils } from "three";
import ts from "typescript";
import { JSDOM } from "jsdom";
import * as settings from "../../components/Warp/_shared/tuning";
import { CORONA_RESTORE_END, DEFAULT_WARP_TUNING, WARP_TUNING_CONTROLS, WORMHOLE_HOLE_START } from "../../components/Warp/_shared/tuning";
import { warpFragmentShader } from "../../components/Warp/warp-shaders";

const source = readFileSync(new URL("../../components/Warp/warp-field.tsx", import.meta.url), "utf8");
const project = new Project({ useInMemoryFileSystem: true });
const file = project.createSourceFile("field.tsx", source);

test("reset defaults retain the user's approved edited values and visible layers", () => {
  assert.deepEqual(DEFAULT_WARP_TUNING, {
    ringScale: .11, ringBrightness: .51, ringSaturation: 1,
    pointScale: .11, pointBrightness: .51, pointSoftness: 1,
    interiorBrightness: .3, interiorColor: "#ffffff", interiorBloom: .1,
    interiorBlur: 1, edgeBlur: .5,
    bloomStrength: 1, bloomSpread: 1,
    rayIntensity: 1.35, rayDensity: .85, rayWidth: 1,
    hoverStrength: .24, motionSpeed: 1, blur: 0,
    showRing: true, showPoint: true, showBloom: true, showRays: true,
  });
  assert.ok(Object.isFrozen(DEFAULT_WARP_TUNING));
});

test("every numeric control has a finite bounded range containing its reset value", () => {
  const keys = Object.entries(DEFAULT_WARP_TUNING).filter(([, value]) => typeof value === "number").map(([key]) => key).sort();
  assert.deepEqual(WARP_TUNING_CONTROLS.map(control => control.key).sort(), keys);
  assert.ok(Object.isFrozen(WARP_TUNING_CONTROLS));
  for (const control of WARP_TUNING_CONTROLS) {
    assert.ok(Object.isFrozen(control));
    assert.ok([control.min, control.max, control.step].every(Number.isFinite));
    assert.ok(control.min < control.max && control.step > 0);
    assert.ok(DEFAULT_WARP_TUNING[control.key] >= control.min && DEFAULT_WARP_TUNING[control.key] <= control.max);
  }
  for (const key of ["ringScale", "pointScale", "pointSoftness", "bloomSpread", "rayDensity", "rayWidth"]) {
    assert.ok(WARP_TUNING_CONTROLS.find(control => control.key === key)!.min > 0);
  }
});

test("reset values align with slider steps rather than being silently quantized", () => {
  for (const control of WARP_TUNING_CONTROLS) {
    const steps = (DEFAULT_WARP_TUNING[control.key] - control.min) / control.step;
    assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9, `${control.key} reset must land on a native range step`);
  }
});

test("native size ranges reject zero before it can reach renderer divisions", () => {
  const dom = new JSDOM();
  try {
    for (const key of ["ringScale", "pointScale"]) {
      const control = WARP_TUNING_CONTROLS.find(control => control.key === key)!;
      const input = dom.window.document.createElement("input");
      input.type = "range";
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = "0";
      assert.equal(input.valueAsNumber, control.min);
      assert.ok(input.valueAsNumber > 0);
    }
  } finally { dom.window.close(); }
});

test("tuning updates the existing filament uniforms and preserves its clock at zero speed", () => {
  const callback = file.getFunctionOrThrow("Filaments").getDescendantsOfKind(SyntaxKind.CallExpression)
    .find(call => call.getExpression().getText() === "useFrame")!.getArguments()[0];
  const body = ts.transpileModule(callback.asKindOrThrow(SyntaxKind.ArrowFunction).getBody().getText(), {
    compilerOptions: { target: ts.ScriptTarget.ESNext },
  }).outputText;
  const run = new Function("size", "delta", "material", "elapsed", "renderedFrames", "hoverTarget", "progress", "settlement", "opening", "onReady", "getWarpFrame", "MathUtils", "tuning", "beamStyle", "CORONA_RESTORE_END", "coronaRestoreBlend", "WORMHOLE_HOLE_START", body);
  const uniforms = Object.fromEntries([
    "uTime", "uTravel", "uRays", "uPoint", "uRadius", "uOpening", "uDensity", "uIntensity", "uRingScale", "uRayWidth", "uPointScale", "uPointBrightness", "uPointSoftness", "uBloomStrength", "uBloomSpread", "uShowPoint", "uShowBloom", "uHover", "uHeartbeat",
  ].map(key => [key, { value: 0 }]));
  const vector = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; } };
  const material = { current: { uniforms: { ...uniforms, uViewport: { value: { set() {} } }, uHoverPointer: { value: vector } } } };
  const elapsed = { current: 2.4 };
  const tuning = { ...DEFAULT_WARP_TUNING, motionSpeed: 0, rayIntensity: 2, rayDensity: 1.2, pointScale: .1, pointSoftness: 2, showRays: false, showPoint: false, bloomStrength: .5 };
  run({ width: 1440, height: 900 }, .016, material, elapsed, { current: 2 }, { current: { active: false, startedAt: 0, x: 0, y: 0 } }, { get: () => .5 }, { get: () => 0 }, { get: () => 1 }, () => {}, () => ({ travel: 1, pointOpacity: .8, ringScale: .5 }), MathUtils, tuning, { heartbeat: .025, heartRate: 64 }, CORONA_RESTORE_END, (settings as unknown as Record<string, unknown>).coronaRestoreBlend, WORMHOLE_HOLE_START);
  assert.equal(elapsed.current, 2.4);
  assert.equal(uniforms.uRays.value, 0);
  assert.equal(uniforms.uIntensity.value, 2);
  assert.equal(uniforms.uDensity.value, 1.2);
  assert.equal(uniforms.uPointScale.value, .1);
  assert.ok(Math.abs(uniforms.uRingScale.value - .85 * tuning.pointScale) < 1e-10, "prelude aperture matches the filled core rather than the future ring silhouette");
  assert.equal(uniforms.uPointSoftness.value, 2);
  assert.equal(uniforms.uShowPoint.value, 0);
  assert.equal(uniforms.uBloomStrength.value, .5);
  assert.equal(uniforms.uRadius.value, .5 * .35, "tuning does not replace the existing radius choreography");
});

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
  const sceneSource = readFileSync(new URL("../../components/Warp/index.tsx", import.meta.url), "utf8");
  assert.match(sceneSource, /blur-\(--warp-blur\)/);
  assert.doesNotMatch(source, /blur-\(--warp-blur\)/, "only the existing scene wrapper owns blur, not a second canvas filter");
});
