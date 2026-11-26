"use client";

import { useEffect, useState } from "react";
import { CanvasTexture, ClampToEdgeWrapping, LinearFilter } from "three";

interface DisplacementOptions {
  /** Texture width in px. Should match the band's actual width. */
  readonly width: number;
  /** Texture height in px. Should match the band's actual height. */
  readonly height: number;
}

/**
 * Procedural displacement texture for the bezel ruler.
 *
 * Two layers, composited in order:
 *
 *   1. **Wide soft Gaussian-shaped ramp** — implemented as a multi-stop
 *      `createLinearGradient` whose stops trace the bell of
 *      `1 - 0.5 × exp(-(x/sigma)²/2)` with `sigma ≈ 0.22 × width`. Peak
 *      luminance reaches ~gray (lum ≈ 0.50) at the horizontal center,
 *      edges stay near-white. The browser's native rasterizer interpolates
 *      between stops, replacing what was previously a per-pixel JS loop.
 *
 *   2. **Sharp center bar** — a narrow pure-black vertical bar at the
 *      horizontal center, full band height. Crisp edges, no blur. Adds a
 *      sharp spike of max displacement at the indicator position so one
 *      line at a time reads as the bezel's reference mark.
 *
 * Luminance drives line width in the shader: black under the bar = max
 * bump, gray under the ramp = mid bump, white at edges = min bump.
 */
export function useBezelDisplacementTexture(
  options: DisplacementOptions
): CanvasTexture | null {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  const { width, height } = options;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(64, Math.round(width * dpr));
    const h = Math.max(32, Math.round(height * dpr));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn(
        "[FooterTickerCrown] 2D canvas context unavailable — bezel " +
          "displacement texture cannot be generated."
      );
      return;
    }

    // ─── Layer 1: Gaussian-shaped horizontal ramp ──────────────────────
    // Stops sample the curve `1 - 0.5 * exp(-((x-cx)/sigma)²/2)` at
    // sigma = 0.22 * w. Browser interpolates between stops natively;
    // visual difference vs. per-pixel computation is imperceptible.
    const grad = ctx.createLinearGradient(0, 0, w, 0);
     // edge, lum 1.0
     // ~1.5σ
     // ~0.5σ
     // center, lum 0.50
    ctx.fillRect(0, 0, w, h);

    // ─── Layer 2: sharp center bar ─────────────────────────────────────
    // Pure black, narrow — the bezel's reference indicator.
    const barWidth = Math.max(3, w * 0.025);
    const barX = (w - barWidth) / 2;
    ctx.fillRect(barX, 0, barWidth, h);

    const tex = new CanvasTexture(canvas);
    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;

    setTexture(tex);

    return () => {
      tex.dispose();
    };
  }, [width, height]);

  return texture;
}
