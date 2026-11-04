"use client";

import { usePlayState } from "src/providers/HideawayFM/hooks";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { AmbientGradientMesh } from "./AmbientGradientMesh";

// Nearly opaque always — shader itself renders the bg color, not a color overlay

interface AmbientBackgroundProps {}

/**
 * Full-screen ambient background for the Radio page.
 *
 * Standalone Canvas (not shared View) to enable full postprocessing pipeline:
 *   RenderPass → KawaseBlur (folds) → EffectPass (saccadé soft-light grain)
 *
 * Uses orthographic camera + 2×2 plane so UVs map 1:1 to screen pixels.
 *
 * Most callers should use `<AmbientBackgroundAuto />` rather than this
 * directly — it picks the R3F version or the CSS fallback based on the
 * device's perf tier (hardware concurrency / RAM / reduced-motion / WebGL
 * support), not viewport width.
 */
export function AmbientBackground({}: AmbientBackgroundProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] min-h-svh"
      aria-hidden="true"
    >
      <Canvas
        className="absolute inset-0"
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          stencil: true,
          depth: false,
          alpha: true
        }}
        frameloop="always"
        camera={{ position: [0, 0, 1], fov: 45 }}
      >
        <AmbientGradientMesh />
      </Canvas>
    </div>
  );
}

/**
 * CSS-only fallback for low-perf devices (no R3F).
 *
 * Heavy grain + barely-there vignette painted on a fixed viewport layer.
 * Selected automatically via `<AmbientBackgroundAuto />` when the device
 * fails the perf-tier checks (see `detectLowPerf`).
 */
export function AmbientBackgroundFallback() {
  const { optimistic } = usePlayState();
  const playing = optimistic === "playing";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] min-h-svh"
      aria-hidden="true"
    >
      {/* Subtle warm vignette — barely perceptible */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: playing ? 0.15 : 0.3,
          background:
            "radial-gradient(ellipse 90% 80% at 45% 40%, oklch(30% 0.04 60 / 0.12) 0%, transparent 60%)"
        }}
      />
      {/* Heavy grain — triple pass */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/assets/noise.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
          opacity: 0.28,
          mixBlendMode: "overlay"
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/assets/noise.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "120px",
          opacity: 0.12,
          mixBlendMode: "soft-light"
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/assets/noise.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "300px",
          opacity: 0.08,
          mixBlendMode: "multiply"
        }}
      />
    </div>
  );
}

/**
 * Auto-selecting wrapper: renders the R3F `<AmbientBackground />` on capable
 * devices, the CSS `<AmbientBackgroundFallback />` on low-perf devices.
 *
 * The decision is made on the client only — during SSR + first hydration
 * tick this component renders nothing, so we never paint the wrong layer.
 * On low-perf devices this spares the WebGL context cost entirely.
 */
export function AmbientBackgroundAuto() {
  const useFallback = useShouldUseFallback();
  if (useFallback === null) return null;
  return useFallback ? <AmbientBackgroundFallback /> : <AmbientBackground />;
}

/**
 * Decides whether the device should fall back to the CSS-only ambient.
 *
 * Returns `null` on the first render (pre-mount) so the caller can render
 * nothing until we've measured. Returns `true` if any of:
 *
 *   - the user has `prefers-reduced-motion: reduce`
 *   - `navigator.deviceMemory` reports < 4 GB
 *   - `navigator.hardwareConcurrency` reports < 4 cores
 *   - WebGL fails to initialize
 */
function useShouldUseFallback(): boolean | null {
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => {
    setResult(detectLowPerf());
  }, []);
  return result;
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

function detectLowPerf(): boolean {
  if (typeof window === "undefined") return false;

  // 1. User preference wins outright
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  // 2. Hardware heuristics — cheap, sync, work on most devices
  const nav = navigator as NavigatorWithMemory;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) {
    return true;
  }
  if (
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency < 4
  ) {
    return true;
  }

  // 3. WebGL probe — if the browser can't make a context at all, fall back
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return true;
  } catch {
    return true;
  }

  return false;
}
