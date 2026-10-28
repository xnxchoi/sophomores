import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Project, SyntaxKind } from "ts-morph";
import { Color, MathUtils, Vector2 } from "three";
import ts from "typescript";
import * as settings from "../../components/Warp/_shared/tuning";
import { getFrame, getWarpFrame, HANDOFF } from "../../components/Warp/sequence";
import { backdropTokens } from "../../lib/teaser/backdrop-tokens";

const source = readFileSync(new URL("../../components/Warp/warp-field.tsx", import.meta.url), "utf8");
const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("field.tsx", source);
const restoreEnd = .72;
const restoreBlend = (settings as unknown as { coronaRestoreBlend?: (value: number) => number }).coronaRestoreBlend;

// Execute the real frame callbacks with material/clock doubles. This observes the
// uniforms consumed by WebGL, rather than accepting a parallel interpolation helper.
function frameBody(component: "Ring" | "Filaments") {
  const call = file.getFunctionOrThrow(component).getDescendantsOfKind(SyntaxKind.CallExpression)
    .find(node => node.getExpression().getText() === "useFrame")!;
  return ts.transpileModule(call.getArguments()[0].asKindOrThrow(SyntaxKind.ArrowFunction).getBody().getText(), {
    compilerOptions: { target: ts.ScriptTarget.ESNext },
  }).outputText;
}

function ring(tuning: settings.WarpTuning = settings.DEFAULT_WARP_TUNING, size = { width: 1440, height: 900 }) {
  const uniforms = {
    uScale: { value: new Vector2() }, uOrigin: { value: new Vector2() },
    uCssPixel: { value: 0 }, uTime: { value: 0 }, uSettlement: { value: 0 },
    uFormation: { value: -1 },
    uCoreRadius: { value: -1 }, uCoreSoftness: { value: -1 }, uCoreTransfer: { value: -1 },
    uCoreBrightness: { value: -1 },
    uInteriorBrightness: { value: -1 }, uInteriorBloom: { value: -1 },
    uInteriorBlur: { value: -1 }, uEdgeBlur: { value: -1 },
    uInteriorColor: { value: new Color("#ff00ff") },
    uRingBrightness: { value: 0 }, uRingSaturation: { value: 0 },
  };
  const elapsed = { current: 2.4 };
  const speed = { current: 1 };
  const run = new Function("size", "delta", "material", "elapsed", "motionSpeed", "progress", "settlement", "coronaProgress", "getWarpFrame", "MathUtils", "tuning", "backdropTokens", "CORONA_RESTORE_END", "coronaRestoreBlend", "WORMHOLE_HOLE_START", frameBody("Ring"));
  return (settlement: number, corona = 0, warp = .74, delta = .016) => {
    run(size, delta, { current: { uniforms } }, elapsed, speed, { get: () => warp }, { get: () => settlement }, { get: () => corona }, getWarpFrame, MathUtils, tuning, backdropTokens, restoreEnd, restoreBlend, settings.WORMHOLE_HOLE_START);
    const side = size.width / uniforms.uScale.value.x;
    return {
      scale: side / Math.min(size.width, size.height) / getWarpFrame(warp).ringScale / (1 + corona * backdropTokens.scrollZoom),
      side, scaleX: uniforms.uScale.value.x, scaleY: uniforms.uScale.value.y,
      originY: uniforms.uOrigin.value.y, pixel: uniforms.uCssPixel.value,
      brightness: uniforms.uRingBrightness.value, saturation: uniforms.uRingSaturation.value,
      time: uniforms.uTime.value, settlement: uniforms.uSettlement.value,
      formation: uniforms.uFormation.value,
      coreRadius: uniforms.uCoreRadius.value, coreSoftness: uniforms.uCoreSoftness.value,
      coreTransfer: uniforms.uCoreTransfer.value,
      coreBrightness: uniforms.uCoreBrightness.value,
      interiorBrightness: uniforms.uInteriorBrightness.value,
      interiorBloom: uniforms.uInteriorBloom.value,
      interiorBlur: uniforms.uInteriorBlur.value, edgeBlur: uniforms.uEdgeBlur.value,
      interiorColor: uniforms.uInteriorColor.value.clone(),
    };
  };
}

function aperture(settlement: number, tuning: settings.WarpTuning = settings.DEFAULT_WARP_TUNING, size = { width: 1440, height: 900 }, warp = .74) {
  const names = ["uTime", "uTravel", "uRays", "uPoint", "uRadius", "uOpening", "uDensity", "uIntensity", "uRingScale", "uRayWidth", "uPointScale", "uPointBrightness", "uPointSoftness", "uBloomStrength", "uBloomSpread", "uShowPoint", "uShowBloom", "uHover", "uHeartbeat"];
  const uniforms = Object.fromEntries(names.map(name => [name, { value: 0 }]));
  const material = { current: { uniforms: { ...uniforms, uViewport: { value: new Vector2() }, uHoverPointer: { value: new Vector2() } } } };
  const run = new Function("size", "delta", "material", "elapsed", "renderedFrames", "hoverTarget", "progress", "settlement", "opening", "onReady", "getWarpFrame", "MathUtils", "tuning", "beamStyle", "CORONA_RESTORE_END", "coronaRestoreBlend", "WORMHOLE_HOLE_START", frameBody("Filaments"));
  run(size, .016, material, { current: 2.4 }, { current: 2 }, { current: { active: false, startedAt: 0, x: 0, y: 0 } }, { get: () => warp }, { get: () => settlement }, { get: () => 1 }, () => {}, getWarpFrame, MathUtils, tuning, { heartbeat: .025, heartRate: 64 }, restoreEnd, restoreBlend, settings.WORMHOLE_HOLE_START);
  return uniforms.uRingScale.value;
}

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} must equal ${expected}`);
}

test("restoration belongs to settlement and finishes before the original Hero starts", () => {
  assert.equal((settings as unknown as Record<string, unknown>).CORONA_RESTORE_END, restoreEnd);
  assert.equal(getFrame(.6).settlement, 0);
  close(getFrame(.672).settlement, restoreEnd);
  assert.equal(getFrame(HANDOFF).settlement, 1);
  assert.equal(getFrame(HANDOFF).phase, "Corona");
});

test("latest smaller look remains exact throughout the approach and jump", () => {
  const render = ring();
  for (const overall of [0, .2, .34, .5, .59, .6]) {
    const frame = getFrame(overall);
    const output = render(frame.settlement, 0, frame.warpProgress);
    close(output.scale, .11);
    close(output.brightness, .51);
    close(output.saturation, 1);
    close(output.time, 2.4);
  }
});

test("material morph follows bounded settlement without changing the small-light opening", () => {
  const render = ring();
  for (const overall of [0, .34, .5, .59, .6]) {
    const frame = getFrame(overall);
    close(render(frame.settlement, 0, frame.warpProgress).formation, 0);
  }
  for (const value of [-1, 0, .01, .14, .38, restoreEnd, 1, 2]) {
    close(render(value).formation, MathUtils.clamp(value, 0, 1));
  }
  close(render(getFrame(HANDOFF).settlement).formation, 1);
});

test("material morph retraces the same beat independently of elapsed frames", () => {
  const render = ring();
  const outward = [0, .05, .14, .38, .6, restoreEnd, 1].map(value => ({ value, output: render(value) }));
  // Advance the real material's ambient clock before scrubbing back. Formation
  // must be scroll-owned rather than restarting or following that clock.
  for (let index = 0; index < 120; index++) render(1, 0, .74, .05);
  for (const { value, output } of outward.toReversed()) {
    const reverse = render(value, 0, .74, .001);
    close(reverse.formation, value);
    for (const key of ["formation", "coreRadius", "coreSoftness", "coreTransfer", "coreBrightness", "scale", "brightness", "saturation", "originY", "settlement"] as const) {
      close(reverse[key], output[key]);
    }
  }
});

test("the remapped material starts at the existing filament core size across viewports and tuning", () => {
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 664 }]) {
    for (const pointScale of [.05, .11, 3]) for (const ringScale of [.05, .11, 3]) {
      const tuning = { ...settings.DEFAULT_WARP_TUNING, pointScale, ringScale };
      const render = ring(tuning, size);
      for (const settlement of [0, .14, .38, restoreEnd, 1]) {
        const output = render(settlement);
        assert.ok(Number.isFinite(output.coreRadius) && output.coreRadius > 0);
        const filamentCorePixels = .35 * .85 * pointScale * getWarpFrame(.74).ringScale * Math.min(size.width, size.height);
        close(output.coreRadius * output.side, filamentCorePixels);
      }
    }
  }
});

test("filled core ownership is complementary to the original hotspot instead of additive", () => {
  const render = ring();
  for (let index = 0; index <= 200; index++) {
    const overall = index / 200;
    const frame = getFrame(overall);
    const output = render(frame.settlement, 0, frame.warpProgress);
    const pointOpacity = getWarpFrame(frame.warpProgress).pointOpacity;
    assert.ok(output.coreTransfer >= 0 && output.coreTransfer <= 1);
    close(output.coreTransfer + pointOpacity, 1);
  }
  close(render(0, 0, 0).coreTransfer, 0);
  close(render(0, 0, .74).coreTransfer, 1);
});

test("the material core honors point softness without changing the corona endpoint", () => {
  for (const pointSoftness of [.25, 1, 4]) {
    const render = ring({ ...settings.DEFAULT_WARP_TUNING, pointSoftness });
    for (const settlement of [0, .2, restoreEnd, 1]) close(render(settlement).coreSoftness, pointSoftness);
    close(render(1).scale, 1);
    close(render(1).brightness, 1);
    close(render(1).settlement, 1);
  }
});

test("the material core carries point brightness and obeys the ring layer visibility override", () => {
  for (const pointBrightness of [0, .51, 3]) for (const showRing of [false, true]) {
    const render = ring({ ...settings.DEFAULT_WARP_TUNING, pointBrightness, showRing });
    for (const settlement of [0, .2, restoreEnd, 1]) {
      close(render(settlement).coreBrightness, showRing ? pointBrightness : 0);
      if (!showRing) close(render(settlement).brightness, 0);
    }
  }
});

test("formation deforms the production shade coordinates instead of crossfading a halo silhouette", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  assert.match(ringSource, /uniform\s+float\s+uFormation\s*;/);
  assert.match(ringSource, /uFormation\s*>=\s*\$\{CORONA_RESTORE_END\}/, "the completed morph must bypass deformation");
  assert.match(ringSource, /\bshade\(\s*(?:sampleRadius|sourceRadius|deformedRadius)\s*,/, "sample the original material at deformed radial coordinates");
  assert.doesNotMatch(ringSource, /\b(?:vec3\s+(?:innerVeil|outerVeil)|float\s+(?:gather|release))\b/, "remove the rejected temporary halo composition");
  for (const uniform of ["uCoreRadius", "uCoreSoftness", "uCoreTransfer", "uCoreBrightness"]) {
    assert.match(ringSource, new RegExp(`uniform\\s+float\\s+${uniform}\\s*;`));
  }
  assert.match(ringSource, /\bwarpRingMain\(\);/, "keep the production material as the final endpoint");
  assert.equal(ringSource.match(/<mesh\b/g)?.length, 1, "the intermediate beat must not add another ring node");
});

test("interior appearance controls reach the existing material independently of the point controls", () => {
  const baseline = ring()(0.3);
  for (const value of [0, .65, 2]) {
    const tuning = { ...settings.DEFAULT_WARP_TUNING, interiorBrightness: value, interiorBloom: value,
      interiorBlur: value + .25, edgeBlur: value, interiorColor: "#ab9876" };
    const render = ring(tuning);
    for (const settlement of [0, .1, .3, restoreEnd, 1, .3, 0]) {
      const output = render(settlement);
      close(output.interiorBrightness, value);
      close(output.interiorBloom, value);
      close(output.interiorBlur, value + .25);
      close(output.edgeBlur, value);
      const color = new Color(tuning.interiorColor).convertLinearToSRGB();
      for (const channel of ["r", "g", "b"] as const) close(output.interiorColor[channel], color[channel]);
      close(output.coreBrightness, baseline.coreBrightness);
      close(output.coreSoftness, baseline.coreSoftness);
    }
    const changed = render(.3);
    close(changed.scale, baseline.scale);
    close(changed.coreRadius, baseline.coreRadius);
  }
});

test("interior fill and bloom obey separate visibility switches without changing blur or point brightness", () => {
  for (const showRing of [false, true]) for (const showBloom of [false, true]) {
    const tuning = { ...settings.DEFAULT_WARP_TUNING, interiorBrightness: .7, interiorBloom: .4,
      interiorBlur: 1.5, edgeBlur: 2, showRing, showBloom };
    const render = ring(tuning);
    for (const settlement of [0, .3, restoreEnd, 1]) {
      const output = render(settlement);
      close(output.interiorBrightness, showRing ? .7 : 0);
      close(output.interiorBloom, showRing && showBloom ? .4 : 0);
      close(output.interiorBlur, 1.5);
      close(output.edgeBlur, 2);
      close(output.coreBrightness, showRing ? tuning.pointBrightness : 0);
    }
  }
});

test("changing any interior or edge knob leaves the other appearance channels alone", () => {
  const baseline = ring()(.3);
  const keys = ["interiorBrightness", "interiorBloom", "interiorBlur", "edgeBlur"] as const;
  for (const changedKey of keys) {
    const changed = ring({ ...settings.DEFAULT_WARP_TUNING, [changedKey]: 1.75 })(.3);
    for (const observedKey of keys) {
      close(changed[observedKey], observedKey === changedKey ? 1.75 : baseline[observedKey]);
    }
    for (const channel of ["r", "g", "b"] as const) close(changed.interiorColor[channel], baseline.interiorColor[channel]);
    close(changed.coreBrightness, baseline.coreBrightness);
    close(changed.coreSoftness, baseline.coreSoftness);
    close(changed.scale, baseline.scale);
  }
});

test("interior support lasts beyond radial formation but ends at the original corona endpoint", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  for (const name of ["uInteriorBrightness", "uInteriorBloom", "uInteriorBlur", "uEdgeBlur"]) {
    assert.match(ringSource, new RegExp(`uniform\\s+float\\s+${name}\\s*;`));
  }
  assert.match(ringSource, /uniform\s+vec3\s+uInteriorColor\s*;/);
  assert.match(ringSource, /smoothstep\(\s*\.01\s*,\s*\.18\s*,\s*uFormation\s*\)/);
  assert.match(ringSource, /1\.0\s*-\s*smoothstep\(\s*\.45\s*,\s*1\.0\s*,\s*uFormation\s*\)/);
  assert.doesNotMatch(ringSource, /\.006\b/, "the intermediate edge must no longer sharpen before blurring");
});

test("interior light preserves underlying detail instead of replacing it with a flat radiance floor", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  assert.match(
    ringSource,
    /float detail\s*=\s*smoothstep\(\s*\.05\s*,\s*\.7\s*,\s*morph\s*\)\s*;/,
    "surface detail becomes visible earlier rather than retaining a flat carrier through most formation"
  );
  assert.match(
    ringSource,
    /vec3 interiorLight\s*=\s*clamp\(uInteriorColor\s*\*\s*radiance,\s*vec3\(0\.0\),\s*vec3\(\.9\)\)\s*;/,
    "extreme light controls must retain at least ten percent underlying contrast"
  );
  assert.match(
    ringSource,
    /gl_FragColor\.rgb\s*\+=\s*interiorLight\s*\*\s*\(vec3\(1\.0\)\s*-\s*clamp\(gl_FragColor\.rgb,\s*0\.0,\s*1\.0\)\)\s*;/,
    "add interior radiance only into available color headroom, retaining surface variation"
  );
  assert.doesNotMatch(
    ringSource,
    /max\(\s*gl_FragColor\.rgb\s*,\s*uInteriorColor\s*\*\s*radiance\s*\)/,
    "a radiance floor erases all underlying differences below it"
  );
  assert.match(
    ringSource,
    /float radiance\s*=\s*\(fill\s*\*\s*uInteriorBrightness\s*\+\s*bloom\s*\*\s*uInteriorBloom\)\s*\*\s*interiorEnvelope\s*\*\s*uCoreTransfer\s*;/,
    "interior light remains independent of the surface brightness instead of clipping against it"
  );
});

test("surface detail emerges while the interior remains supported, with a gradual final release", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  const detail = ringSource.match(/float detail\s*=\s*([^;]+);/)?.[1];
  const envelope = ringSource.match(/float interiorEnvelope\s*=\s*([^;]+);/)?.[1];
  assert.ok(detail && envelope, "sample the actual shader channels, not a parallel timing model");
  const sample = new Function("uFormation", "morph", "smoothstep", `return { detail: ${detail}, envelope: ${envelope} };`);
  const smoothstep = (low: number, high: number, value: number) => MathUtils.smoothstep(value, low, high);
  for (const formation of [.18, .3, .45]) {
    const output = sample(formation, MathUtils.smoothstep(formation, 0, restoreEnd), smoothstep);
    close(output.envelope, 1);
    assert.ok(output.detail > .05, "texture must already emerge before interior light is released");
  }
  let previousDetail = 0;
  let previousEnvelope = 1;
  for (let index = 0; index <= 1000; index++) {
    const formation = index / 1000;
    const output = sample(formation, MathUtils.smoothstep(formation, 0, restoreEnd), smoothstep);
    assert.ok(output.detail >= previousDetail && output.detail <= 1);
    assert.ok(output.envelope >= 0 && output.envelope <= 1);
    if (formation > .45) {
      assert.ok(output.envelope <= previousEnvelope);
      assert.ok(previousEnvelope - output.envelope < .003, "no sudden hollowing during final release");
      previousEnvelope = output.envelope;
    }
    previousDetail = output.detail;
  }
  close(sample(0, 0, smoothstep).envelope, 0);
  close(sample(1, 1, smoothstep).envelope, 0);
});

test("the production light composition preserves contrast and HDR highlights at extreme controls", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  const light = ringSource.match(/vec3 interiorLight\s*=\s*([^;]+);/)?.[1];
  const addition = ringSource.match(/gl_FragColor\.rgb\s*\+=\s*([^;]+);/)?.[1];
  assert.ok(light && addition, "bounded additive composition must exist in the production shader");
  // This shader expression is channel-separable: execute its actual arithmetic
  // per scalar channel, not a duplicate blend implementation.
  const expression = `const interiorLight = ${light}; return base + ${addition};`
    .replace(/vec3\(([^)]+)\)/g, "$1")
    .replace(/gl_FragColor\.rgb/g, "base");
  const sample = new Function("base", "uInteriorColor", "radiance", "clamp", expression);
  for (const color of [0, .2, 1]) for (const radiance of [0, .1, .5, 1, 3, 10_000]) {
    let previous = -Infinity;
    for (const base of [0, .05, .2, .8, 1, 2, 100]) {
      const output = sample(base, color, radiance, MathUtils.clamp);
      assert.ok(Number.isFinite(output));
      assert.ok(output >= base, "interior illumination cannot darken the underlying material");
      assert.ok(output > previous, "different underlying samples retain their ordering and contrast");
      if (base <= 1) assert.ok(output <= 1);
      if (base >= 1 || color === 0 || radiance === 0) close(output, base);
      previous = output;
    }
    const dark = sample(.1, color, radiance, MathUtils.clamp);
    const bright = sample(.6, color, radiance, MathUtils.clamp);
    assert.ok(bright - dark >= .05 - 1e-10, "at least ten percent of the original .5 contrast survives");
  }
});

test("size, brightness and saturation restore monotonically without endpoint jumps", () => {
  const tuning = { ...settings.DEFAULT_WARP_TUNING, ringSaturation: .2 };
  const render = ring(tuning);
  let previous = render(0);
  for (let index = 1; index <= 100; index++) {
    const output = render(index / 100 * restoreEnd);
    for (const key of ["scale", "brightness", "saturation"] as const) {
      assert.ok(output[key] >= previous[key]);
      assert.ok(output[key] <= 1 + 1e-10);
    }
    previous = output;
  }
  const middle = render(restoreEnd / 2);
  assert.equal(typeof restoreBlend, "function", "all ring look channels share the configured Motion transform");
  const midpoint = restoreBlend!(restoreEnd / 2);
  assert.ok(midpoint > .6 && midpoint < .7, "restoration must not hold half its movement until the second half");
  close(middle.scale, MathUtils.lerp(.11, 1, midpoint));
  close(middle.brightness, MathUtils.lerp(.51, 1, midpoint));
  close(middle.saturation, MathUtils.lerp(.2, 1, midpoint));
  // Entry deliberately responds immediately; only the landing must settle to
  // zero velocity. This avoids reintroducing the rejected held-then-release feel.
  const exitVelocity = (epsilon: number) =>
    (render(restoreEnd).scale - render(restoreEnd - epsilon).scale) / epsilon;
  const coarse = exitVelocity(.0001);
  const fine = exitVelocity(.00001);
  assert.ok(fine >= 0 && fine < .0001);
  assert.ok(fine < coarse / 5 + 1e-9);
});

test("restoration responds immediately instead of holding then releasing", (context) => {
  const render = ring();
  const firstTenth = (render(restoreEnd * .1).scale - .11) / (1 - .11);
  const epsilon = .0001;
  const entryVelocity = (render(restoreEnd * epsilon).scale - .11) / (1 - .11) / epsilon;
  context.diagnostic(JSON.stringify({ firstTenth, entryVelocity }));
  assert.ok(firstTenth >= .1 && firstTenth <= .15, "first 10% of input must visibly advance the ring without a jump");
  assert.ok(entryVelocity >= .7 && entryVelocity <= 1, "entry should move promptly, not wait at zero velocity or burst outward");
  close(render(0).scale, .11);
});

test("responsive entry does not add a faster growth burst", (context) => {
  const render = ring();
  const step = 1 / 2000;
  let previous = render(0).scale;
  let peak = 0;
  for (let index = 1; index <= 2000; index++) {
    const scale = render(index * step).scale;
    peak = Math.max(peak, (scale - previous) / step);
    previous = scale;
  }
  // Loosening entry may not add a faster burst than the preceding cubic pass.
  const previousPeak = (1 - .11) * 1.5 / restoreEnd;
  context.diagnostic(JSON.stringify({ expansionPeak: peak, previousPeak, reductionPercent: (1 - peak / previousPeak) * 100 }));
  assert.ok(peak <= previousPeak + 1e-8, `expansion peak ${peak} exceeds the preceding cubic envelope`);
  close(previous, 1);
});

test("all post-restoration viewports match original corona geometry, brightness and travel", () => {
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 664 }, { width: 2560, height: 720 }]) {
    const render = ring({ ...settings.DEFAULT_WARP_TUNING, ringSaturation: 0 }, size);
    for (const settle of [restoreEnd, 1, 2]) for (const corona of [0, .25, 1]) {
      const output = render(settle, corona, .76);
      const side = Math.min(size.width, size.height) * backdropTokens.heroScale * (1 + corona * backdropTokens.scrollZoom);
      close(output.side, side);
      close(output.scaleX, size.width / side);
      close(output.scaleY, size.height / side);
      close(output.originY, -size.height * corona * backdropTokens.scrollY / 100 / side);
      close(output.pixel, 1 / side);
      close(output.brightness, 1);
      close(output.saturation, 1);
    }
  }
});

test("reverse scrubbing deterministically returns the smaller look without a second clock", () => {
  const render = ring();
  const outward = [0, .1, .3, restoreEnd, 1].map(value => ({ value, output: render(value) }));
  for (const { value, output } of outward.reverse()) {
    const reverse = render(value);
    for (const key of ["scale", "brightness", "saturation", "originY"] as const) close(reverse[key], output[key]);
  }
  close(render(-1).scale, .11);
});

test("ring visibility remains an explicit dev override after restoring its material", () => {
  const render = ring({ ...settings.DEFAULT_WARP_TUNING, showRing: false });
  for (const settlement of [0, .3, 1]) close(render(settlement).brightness, 0);
});

test("ray aperture follows the projected bright core and opening rim without a black gap", () => {
  for (const tuning of [settings.DEFAULT_WARP_TUNING, { ...settings.DEFAULT_WARP_TUNING, pointScale: .39, ringScale: .2 }]) {
    for (const value of [-1, 0, .05, .2, .325, restoreEnd, 1, 2]) {
      const effectiveScale = MathUtils.lerp(tuning.ringScale, 1, restoreBlend!(value));
      const morph = MathUtils.smoothstep(value, 0, restoreEnd);
      const hole = MathUtils.smoothstep(morph, settings.WORMHOLE_HOLE_START, 1);
      const side = 900 * getWarpFrame(.74).ringScale * effectiveScale;
      const coreRadius = Math.max(.35 * .85 * tuning.pointScale / effectiveScale, 1 / side);
      const width = MathUtils.lerp(coreRadius, .018, Math.pow(hole, 1.35)) * (1 + tuning.edgeBlur * Math.sin(Math.PI * hole));
      close(aperture(value, tuning), effectiveScale * (hole + width / .35 * (1 - hole)));
    }
    close(aperture(0, tuning), .85 * tuning.pointScale);
    close(aperture(1, tuning), 1);
  }
});

test("the forming rim softens independently of its radial travel and matches the ray aperture", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  const width = ringSource.match(/float width\s*=\s*([^;]+);/)?.[1];
  assert.ok(width);
  const sample = new Function("uCoreRadius", "uCssPixel", "morph", "hole", "uEdgeBlur", "mix", "max", "pow", "sin", `return ${width};`);
  const render = ring();
  for (let index = 0; index <= 100; index++) {
    const formation = index / 100 * restoreEnd;
    const output = render(formation);
    const morph = MathUtils.smoothstep(formation, 0, restoreEnd);
    const hole = MathUtils.smoothstep(morph, settings.WORMHOLE_HOLE_START, 1);
    const actual = sample(output.coreRadius, output.pixel, morph, hole, output.edgeBlur, MathUtils.lerp, Math.max, Math.pow, Math.sin);
    const synchronous = MathUtils.lerp(Math.max(output.coreRadius, output.pixel), .018, morph)
      * (1 + output.edgeBlur * Math.sin(3.14159265359 * morph));
    if (hole === 0) {
      close(actual, Math.max(output.coreRadius, output.pixel));
    } else if (index > 0 && index < 100) {
      assert.ok(actual > synchronous * 0.5, "the opening edge stays softer than a fully settled ring");
    }
    assert.ok(actual > 0 && Number.isFinite(actual));
    close(aperture(formation), output.scale * (hole + actual / .35 * (1 - hole)));
  }
});

test("the tiny opening aperture respects the same one-pixel core floor as the material", () => {
  const tuning = { ...settings.DEFAULT_WARP_TUNING, pointScale: .05, ringScale: 3 };
  const size = { width: 390, height: 664 };
  const radiusPixels = aperture(0, tuning, size, 0) * .35 * getWarpFrame(0).ringScale * Math.min(size.width, size.height);
  close(radiusPixels, 1);
});

test("corona ambient speed is original even when prelude speed is paused or accelerated", () => {
  for (const speed of [0, .3, 3]) {
    const render = ring({ ...settings.DEFAULT_WARP_TUNING, motionSpeed: speed });
    const output = render(1);
    close(output.time, 2.416);
  }
});


test("color waits for full-size landing, then returns continuously before Hero zero", () => {
  const render = ring();
  for (const value of [0, .1, .3, .5, restoreEnd]) close(render(value).settlement, 0);
  close(render((restoreEnd + 1) / 2).settlement, .5);
  close(render(1).settlement, 1);
  const epsilon = .0001;
  assert.ok(render(restoreEnd + epsilon).settlement < .0001);
  assert.ok(1 - render(1 - epsilon).settlement < .0001);
  assert.equal(render(1, 0, .4).settlement, 0, "early small geometry cannot restore color even if settlement is sought directly");
});

test("the later color return does not compensate with a faster saturation surge", (context) => {
  const render = ring();
  const step = 1 / 2000;
  let previous = render(0).settlement;
  let peak = 0;
  for (let index = 1; index <= 2000; index++) {
    const color = render(index * step).settlement;
    assert.ok(color >= previous && color <= 1);
    peak = Math.max(peak, (color - previous) / step);
    previous = color;
  }
  const previousPeak = 1.875 / (1 - .65);
  context.diagnostic(JSON.stringify({ colorPeak: peak, previousPeak }));
  assert.ok(peak <= previousPeak + 1e-8, `color peak ${peak} exceeds the previous envelope`);
  close(previous, 1);
});

test("oversized and brighter experimental settings also converge without overshooting", () => {
  const render = ring({ ...settings.DEFAULT_WARP_TUNING, ringScale: 3, ringBrightness: 3, ringSaturation: 2 });
  let previous = render(0);
  for (let index = 1; index <= 100; index++) {
    const output = render(index / 100 * restoreEnd);
    for (const key of ["scale", "brightness", "saturation"] as const) {
      assert.ok(output[key] <= previous[key] + 1e-10);
      assert.ok(output[key] >= 1 - 1e-10);
    }
    previous = output;
  }
  close(previous.scale, 1);
  close(previous.brightness, 1);
  close(previous.saturation, 1);
});

test("the existing scene's blur follows the same reversible restoration envelope", () => {
  const scene = new Project({ useInMemoryFileSystem: true }).createSourceFile("index.tsx", readFileSync(new URL("../../components/Warp/index.tsx", import.meta.url), "utf8"));
  const declaration = scene.getDescendantsOfKind(SyntaxKind.VariableDeclaration).find(node => node.getName() === "sceneBlur");
  assert.ok(declaration, "scene blur must be driven by the settlement MotionValue");
  const callback = declaration.getInitializerIfKindOrThrow(SyntaxKind.CallExpression).getArguments()[0].asKindOrThrow(SyntaxKind.ArrowFunction);
  const run = new Function("MathUtils", "tuning", "settlement", "CORONA_RESTORE_END", "coronaRestoreBlend", `return (${callback.getBody().getText()});`);
  for (const blur of [0, 8, 20]) {
    const sample = (value: number) => run(MathUtils, { ...settings.DEFAULT_WARP_TUNING, blur }, { get: () => value }, restoreEnd, restoreBlend);
    assert.equal(sample(0), `${blur}px`);
    assert.equal(typeof restoreBlend, "function");
    assert.equal(sample(restoreEnd / 2), `${MathUtils.lerp(blur, 0, restoreBlend!(restoreEnd / 2))}px`);
    assert.equal(sample(restoreEnd), "0px");
    assert.equal(sample(1), "0px");
    assert.equal(sample(0), `${blur}px`, "reverse scroll must restore the tuned prelude blur");
  }
});


test("interior light reaches the opening rim instead of forming an isolated central orb", () => {
  const source = file.getFunctionOrThrow("Ring").getText();
  const reach = source.match(/interiorRadius \* mix\(([^,]+), ([^,]+), softness\)/);
  assert.ok(reach, "interior reach remains relative to the opening radius");
  assert.ok(Number(reach[1]) >= 1, "even the tightest fill must reach the rim");
  assert.ok(Number(reach[2]) > Number(reach[1]), "blur spreads the fill outward");
});

test("the zero-transfer ring exits as opaque black before any unused surface work", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  const guard = ringSource.match(/if\s*\(([^)]*uCoreTransfer[^)]*)\)\s*\{\s*gl_FragColor\s*=\s*vec4\(([^)]*)\);\s*return;/);
  assert.ok(guard, "the invisible pre-ring must return before computing shade");
  assert.deepEqual(guard[2].split(",").map(Number), [0, 0, 0, 1], "keep the existing opaque black ring pass, not a transparent replacement");
  const condition = guard[1].replace("${CORONA_RESTORE_END}", String(restoreEnd));
  const skipsSurface = new Function("uFormation", "uCoreTransfer", `return (${condition});`);
  for (const formation of [0, .1, .5, restoreEnd - .000001, restoreEnd, 1]) {
    for (const transfer of [0, Number.EPSILON, .5, 1]) {
      assert.equal(skipsSurface(formation, transfer), formation < restoreEnd && transfer === 0);
    }
  }
  assert.ok(guard.index! < ringSource.indexOf("float brightness = uRingBrightness"));
});

test("all opening frames have zero ring transfer while the independent filaments reveal", () => {
  // The renderer-ready clock changes field opacity only; physical scroll stays
  // at zero. Execute the real uniform callback, not a second ring policy.
  const render = ring();
  const openingPose = getFrame(0);
  for (let index = 0; index <= 240; index++) {
    const output = render(openingPose.settlement, 0, openingPose.warpProgress, .01);
    assert.equal(output.formation, 0);
    assert.equal(output.coreTransfer, 0);
  }
});

test("surface shading runs only when its detail weight contributes to the forming ring", () => {
  const ringSource = file.getFunctionOrThrow("Ring").getText();
  assert.match(ringSource, /vec3\s+resolved\s*=\s*carrier\s*;/);
  assert.match(ringSource, /if\s*\(detail\s*>\s*0\.0\)\s*\{\s*vec3 surface = shade\(deformedRadius, theta, phase, 0\.0\);[\s\S]*?resolved = mix\(carrier, textured, detail\);\s*\}/);
  assert.match(ringSource, /gl_FragColor = vec4\(resolved \* uCoreTransfer, 1\.0\)/);
  assert.match(ringSource, /uFormation\s*>=\s*\$\{CORONA_RESTORE_END\}[\s\S]*?warpRingMain\(\);/, "the production endpoint remains the same shader");
});
