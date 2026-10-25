import type { FlameConfig } from "./config";

export interface ArtworkLayout {
  readonly side: number;
  readonly verticalSide: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly origin: readonly [number, number];
  readonly scale: readonly [number, number];
}

/** One transform for fragment coordinates and pointer input; footer center sits on/below the lower edge. */
export function artworkLayout(
  width: number,
  height: number,
  config: FlameConfig
): ArtworkLayout {
  const footer = config.composition.mode === "footer";
  const side = footer
    ? Math.min(
        (width * config.composition.widthRatio) / 2,
        height * config.composition.heightRatio
      ) / config.visual.ringRadius
    : Math.min(width, height);
  const centerX = width / 2;
  const centerY = footer
    ? height * (1 + config.composition.baselineOffset)
    : height / 2;
  const verticalSide = side * config.composition.verticalScale;
  return {
    side,
    verticalSide,
    centerX,
    centerY,
    origin: [0, side > 0 ? (height / 2 - centerY) / verticalSide : 0],
    scale: side > 0 ? [width / side, height / verticalSide] : [0, 0]
  };
}

/** Coordinates relative to the top-left of the host rectangle; artwork Y points up. */
export function artworkPoint(
  x: number,
  y: number,
  layout: ArtworkLayout
): readonly [number, number] {
  return layout.side > 0
    ? [
        (x - layout.centerX) / layout.side,
        (layout.centerY - y) / layout.verticalSide
      ]
    : [0, 0];
}
