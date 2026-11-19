import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { referenceConfig } from "@/components/gl/flame-backdrop/field/material";
import {
  createEnvelopeShader,
  createResponsiveEnvelopeShader
} from "@/components/gl/flame-backdrop/field/shader";

test("R3F owns field rendering rather than nesting a second renderer or animation loop", () => {
  const canvas = readFileSync(
    new URL("../../../src/components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
    "utf8"
  );
  assert.match(canvas, /from ['"]@react-three\/fiber['"]/);
  assert.match(canvas, /<Canvas\b/);
  assert.match(canvas, /useFrame/);
  assert.doesNotMatch(
    canvas,
    /new WebGLRenderer|requestAnimationFrame|new ResizeObserver/
  );
  assert.doesNotMatch(canvas, /prefers-reduced-motion|useReducedMotion/);
});

test("native R3F frameloop pauses the retained field without a parallel scheduler", () => {
  const canvas = readFileSync(
    new URL("../../../src/components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    canvas,
    /frameloop=\{playing\s*&&\s*available\s*\?\s*['"]always['"]\s*:\s*['"]demand['"]\}/,
    "Canvas prop must remain the single authority through incidental parent re-renders"
  );
  assert.doesNotMatch(
    canvas,
    /setFrameloop/,
    "an imperative setter races Canvas reconfiguration and can silently stop an active field"
  );
  assert.doesNotMatch(
    canvas,
    /setTimeout|clearTimeout|requestAnimationFrame|cancelAnimationFrame/
  );
  const frameBody = canvas.slice(
    canvas.indexOf("  useFrame("),
    canvas.indexOf("\n  return <mesh")
  );
  assert.ok(
    frameBody.includes("advanceFieldTime"),
    "frame loop still owns the active-time clock"
  );
  assert.doesNotMatch(
    frameBody,
    /invalidate\(/,
    "useFrame must not create a self-invalidating animation loop"
  );
});

test("responsive field uses a width uniform without changing the accepted material or mask", () => {
  const config = referenceConfig(1440, 900);
  const responsive = createResponsiveEnvelopeShader(config);
  assert.match(responsive, /uniform float uMaterialWidth;/);
  assert.match(responsive, /float studyX = [^;]*\* uMaterialWidth;/);
  const canonical = responsive
    .replace(/uniform float uMaterialWidth;\n?/, "")
    .replace("(2.0 / 1.2) * uMaterialWidth;", "(2.0 / 1.2);");
  assert.equal(canonical, createEnvelopeShader(config));
});

test("vertical presentation transforms the shared mask/material UV while keeping the viewport plane fixed", async () => {
  const { FIELD_VERTEX_SHADER } =
    await import("@/components/gl/flame-backdrop/field/presentation");
  assert.match(FIELD_VERTEX_SHADER, /uniform float uVerticalStretch;/);
  assert.match(FIELD_VERTEX_SHADER, /vUv\.y\s*\/=\s*uVerticalStretch;/);
  assert.match(
    FIELD_VERTEX_SHADER,
    /gl_Position\s*=\s*vec4\(position\.xy,\s*0\.0,\s*1\.0\)/,
    "presentation stretches samples, not the viewport-fixed plane or camera"
  );
  assert.doesNotMatch(
    FIELD_VERTEX_SHADER,
    /vUv\.x\s*\/=|modelMatrix|projectionMatrix/
  );
});

test("footer opts into vertical presentation without changing the editor or remounting its clock", () => {
  const canvas = readFileSync(
    new URL("../../../src/components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
    "utf8"
  );
  assert.match(canvas, /verticalStretch\s*=\s*1\b/);
  assert.match(canvas, /validateVerticalStretch\(verticalStretch\)/);
  assert.match(canvas, /uVerticalStretch/);
  assert.match(canvas, /vertexShader=\{FIELD_VERTEX_SHADER\}/);
  assert.doesNotMatch(canvas, /key=\{verticalStretch\}/);
  assert.equal((canvas.match(/const elapsed = useRef\(0\)/g) ?? []).length, 1);
  const scene = readFileSync(
    new URL("../../../src/components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    scene,
    /verticalStretch=\{backdropTokens\.footerVerticalStretch\}/
  );
  const editor = readFileSync(
    new URL(
      "../../../src/components/devtools/flame-editor/flame-editor.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.doesNotMatch(
    editor,
    /verticalStretch=/,
    "the shared editor retains its canonical default presentation"
  );
});
