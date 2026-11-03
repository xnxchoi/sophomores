"use client";

import { ScreenQuad } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Color as ThreeColor,
  ShaderMaterial,
  Vector2,
  type Texture
} from "three";
import { type FieldConfig } from "./field-config";
import { MAX_LANES, useLaneScheduler } from "./useLaneScheduler";

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Fragment shader — single-layer line field.
 *
 * Per-lane scroll comes from `u_offsetsPx[]` produced by the CPU scheduler.
 * Each lane's offset already combines the constant scroll-direction-driven
 * base drift with the eased per-lane move/pause displacement (scaled). The
 * shader just reads it and renders.
 *
 * Variable line widths driven by the H+sparkle displacement map sampled at
 * SCREEN position so the mark stays anchored while lines flow past.
 */
const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform vec2 u_resolution;
  uniform sampler2D u_displacementMap;
  uniform float u_numRows;
  uniform float u_space;
  uniform float u_minWidth;
  uniform float u_maxWidth;
  uniform vec3 u_baseColor;
  uniform float u_baseAlpha;
  uniform float u_targetX;
  uniform float u_targetPullStrength;
  // Must match MAX_LANES exported from useLaneScheduler.ts. The
  // lookupOffset switch below is also unrolled to this length.
  uniform float u_offsetsPx[24];

  varying vec2 vUv;

  float lineMask(float x, float cx, float w) {
    float halfW = w * 0.5;
    float d = abs(x - cx);
    float edge = 0.6;
    return 1.0 - smoothstep(halfW - edge, halfW + edge, d);
  }

  float sampleOne(float screenX, float rowCenterPx) {
    vec2 uv = vec2(screenX / u_resolution.x, rowCenterPx / u_resolution.y);
    uv = clamp(uv, 0.0, 1.0);
    vec4 c = texture2D(u_displacementMap, uv);
    float lum = (c.r + c.g + c.b) / 3.0;
    return 1.0 - lum;
  }

  float sampleBump(float screenX, float rowCenterPx, float spaceWidth) {
    float total = 0.0;
    float weight = 0.0;
    for (int i = -2; i <= 2; i++) {
      float t = float(i) * (spaceWidth * 0.25);
      float w = exp(-float(i * i) * 0.5);
      total += sampleOne(screenX + t, rowCenterPx) * w;
      weight += w;
    }
    return total / weight;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Look up per-lane offset (24-slot uniform array). WebGL 1 doesn't allow
  // non-constant indexing into uniform arrays in many drivers, so we unroll.
  float lookupOffset(int rowI) {
    if (rowI == 0) return u_offsetsPx[0];
    else if (rowI == 1) return u_offsetsPx[1];
    else if (rowI == 2) return u_offsetsPx[2];
    else if (rowI == 3) return u_offsetsPx[3];
    else if (rowI == 4) return u_offsetsPx[4];
    else if (rowI == 5) return u_offsetsPx[5];
    else if (rowI == 6) return u_offsetsPx[6];
    else if (rowI == 7) return u_offsetsPx[7];
    else if (rowI == 8) return u_offsetsPx[8];
    else if (rowI == 9) return u_offsetsPx[9];
    else if (rowI == 10) return u_offsetsPx[10];
    else if (rowI == 11) return u_offsetsPx[11];
    else if (rowI == 12) return u_offsetsPx[12];
    else if (rowI == 13) return u_offsetsPx[13];
    else if (rowI == 14) return u_offsetsPx[14];
    else if (rowI == 15) return u_offsetsPx[15];
    else if (rowI == 16) return u_offsetsPx[16];
    else if (rowI == 17) return u_offsetsPx[17];
    else if (rowI == 18) return u_offsetsPx[18];
    else if (rowI == 19) return u_offsetsPx[19];
    else if (rowI == 20) return u_offsetsPx[20];
    else if (rowI == 21) return u_offsetsPx[21];
    else if (rowI == 22) return u_offsetsPx[22];
    return u_offsetsPx[23];
  }

  void main() {
    vec2 px = vUv * u_resolution;

    // Row 0 at the TOP of the band — invert vUv.y.
    float rowF = floor((1.0 - vUv.y) * u_numRows);
    float rowIndex = clamp(rowF, 0.0, u_numRows - 1.0);
    int rowI = int(rowIndex);

    float scrollPx = lookupOffset(rowI);

    float effectiveSpace = u_space;
    float rowCenterPx = (rowIndex + 0.5) * (u_resolution.y / u_numRows);

    float xScroll = px.x + scrollPx;
    float lineIdx = floor(xScroll / effectiveSpace);
    float lineCenterPx = (lineIdx + 0.5) * effectiveSpace - scrollPx;

    float bump = sampleBump(lineCenterPx, rowCenterPx, effectiveSpace);

    float distToTarget = abs(vUv.x - u_targetX);
    float targetBoost =
      (1.0 - smoothstep(0.0, 0.4, distToTarget)) * u_targetPullStrength;
    bump = clamp(bump + targetBoost, 0.0, 1.0);

    float lineW = mix(u_minWidth, u_maxWidth, bump);
    float inside = lineMask(px.x, lineCenterPx, lineW);

    // Tiny per-line noise — barely perceptible variation so adjacent
    // ticks at equal distance from center don't read as identical CRT
    // pixels. 0.92..1.0 range is below the threshold of dominating the
    // distance signal but adds a subtle organic texture.
    float jitter = hash21(vec2(lineIdx, rowIndex));
    float perLineAlpha = mix(0.92, 1.0, jitter);

    // Ruler alpha — brightness purely a function of distance from the
    // center bar. Floor at 0.45 keeps every tick visible; smoothstep
    // 0..0.7 gives a gentle gradient toward the indicator.
    float widthAlpha = mix(0.45, 1.0, smoothstep(0.0, 0.7, bump));

    float alpha = inside * u_baseAlpha * perLineAlpha * widthAlpha;
    gl_FragColor = vec4(u_baseColor, alpha);
  }
`;

interface LineFieldMeshProps {
  config: FieldConfig;
  displacementMap: Texture;
  baseColor: ThreeColor;
  baseAlpha?: number;
  driftEnabled: boolean;
  widthPx: number;
  heightPx: number;
  /** When true, the bezel "spins" — for hover (desktop) and tap (touch). */
  spinActive: boolean;
}

/**
 * Renders the line field via drei's `<ScreenQuad>` inside a `<View>`.
 *
 * The CPU scheduler produces a single per-lane offset array each frame —
 * each value is the sum of the constant base drift and the scaled eased
 * per-lane displacement.
 */
export function LineFieldMesh({
  config,
  displacementMap,
  baseColor,
  baseAlpha = 1.0,
  driftEnabled,
  widthPx,
  heightPx,
  spinActive
}: LineFieldMeshProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  const offsetsRef = useLaneScheduler(
    config.numRows,
    config.scheduler,
    driftEnabled,
    spinActive
  );

  const uniforms = useMemo(
    () => ({
      u_resolution: { value: new Vector2(widthPx, heightPx) },
      u_displacementMap: { value: displacementMap },
      u_numRows: { value: config.numRows },
      u_space: { value: config.space },
      u_minWidth: { value: config.minWidth },
      u_maxWidth: { value: config.maxWidth },
      u_baseColor: { value: baseColor },
      u_baseAlpha: { value: baseAlpha },
      u_targetX: { value: 0.5 },
      u_targetPullStrength: { value: 0.0 },
      u_offsetsPx: { value: new Float32Array(MAX_LANES) }
    }),
    // `widthPx`, `heightPx`, `baseColor`, and `baseAlpha` are intentionally
    // omitted from this dep array. Each is patched into the existing
    // uniforms object every frame inside `useFrame` (resolution + offsets)
    // or via direct mutation on a stable Three.js object (baseColor.setRGB
    // from the theme probe). Including them here would force a full
    // material re-creation on every theme/resize tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, displacementMap]
  );

  useFrame(() => {
    // Skip uniform sync when the band is off screen. The shader keeps the
    // last uploaded uniforms until driftEnabled is true again.
    if (!driftEnabled) return;

    const m = materialRef.current;
    if (!m) return;

    const res = m.uniforms.u_resolution.value as Vector2;
    if (res.x !== widthPx || res.y !== heightPx) res.set(widthPx, heightPx);

    const dst = m.uniforms.u_offsetsPx.value as Float32Array;
    const src = offsetsRef.current;
    if (src) {
      const n = Math.min(dst.length, src.length);
      for (let i = 0; i < n; i++) dst[i] = src[i];
    }
  });

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </ScreenQuad>
  );
}
