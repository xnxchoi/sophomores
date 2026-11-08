import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudyLight } from "@/components/invitation/study-light";
import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { artworkLayout } from "@/components/gl/flame-backdrop/layout";
import { paletteWeights } from "@/components/gl/flame-backdrop/palette";
import { backdropTokens } from "@/lib/teaser/backdrop-tokens";
import {
  advanceLightTime,
  createLightUniforms,
  lightPixelRatio
} from "@/lib/invitation/light";

test("study preserves approved geometry and palette on desktop and mobile", () => {
  const config = resolveFlameConfig();
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [844, 390]
  ]) {
    const uniforms = createLightUniforms(width, height);
    const layout = artworkLayout(width, height, config);
    assert.deepEqual(uniforms.uScale.value, layout.scale);
    assert.deepEqual(uniforms.uOrigin.value, layout.origin);
    assert.deepEqual(
      uniforms.uPaletteWeights.value,
      paletteWeights(backdropTokens.palette)
    );
    assert.equal(uniforms.uCssPixel.value, 1 / layout.side);
    assert.equal(uniforms.uPointerStrength.value, 0);
    assert.equal(uniforms.uChromatic.value, 1);
  }
});

test("empty surfaces retain safe geometry and the full chromatic effect", () => {
  const uniforms = createLightUniforms(0, 0);
  assert.deepEqual(uniforms.uScale.value, [0, 0]);
  assert.equal(uniforms.uCssPixel.value, 0);
  assert.equal(uniforms.uTime.value, 0);
  assert.equal(uniforms.uChromatic.value, 1);
  assert.equal(uniforms.uIgnitionProgress.value, 1);
});

test("time freezes, resumes without a jump, and wraps at the existing loop duration", () => {
  const loop = resolveFlameConfig().motion.loopSeconds;
  assert.equal(advanceLightTime(2, 999, false), 2);
  assert.equal(advanceLightTime(2, 999, true), 2.1);
  assert.equal(advanceLightTime(2, -1, true), 2);
  assert.equal(advanceLightTime(2, Number.NaN, true), 2);
  assert.ok(Math.abs(advanceLightTime(loop - 0.02, 0.05, true) - 0.03) < 1e-9);
});

test("DPR respects current quality, absolute 1.5 cap and maximum render dimension", () => {
  const quality = resolveFlameConfig().quality;
  assert.equal(
    lightPixelRatio(400, 400, 3),
    Math.min(1.5, quality.maxPixelRatio)
  );
  assert.equal(lightPixelRatio(4000, 2000, 3), quality.maxRenderSize / 4000);
  assert.equal(lightPixelRatio(0, 0, 0), 1);
  assert.equal(lightPixelRatio(400, 400, Number.NaN), 1);
});

test("study owns no raw WebGL renderer or animation scheduler", () => {
  const source = readFileSync(
    new URL("../../components/invitation/study-light.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /@react-three\/fiber/);
  assert.match(source, /createFragmentShader/);
  assert.doesNotMatch(
    source,
    /requestAnimationFrame|setInterval|createFlame\(|getContext\(/
  );
  assert.match(source, /webglcontextlost/);
  assert.match(source, /subscribeVisibility as subscribePage/);
  assert.match(source, /utils\/browser\/visibility/);
  assert.match(source, /IntersectionObserver/);
  assert.doesNotMatch(source, /ReducedMotion/);
});

test("SSR renders a neutral decorative fallback without a canvas or browser globals", () => {
  const html = renderToStaticMarkup(
    createElement(StudyLight, { paused: true })
  );
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /data-light-status="static"/);
  assert.doesNotMatch(html, /<canvas/);
});
