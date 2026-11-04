import type { LayoutSize, TapePlayerVariant } from "./types";

export const SIZES: Record<TapePlayerVariant, LayoutSize> = {
  hero: { reelDiameter: 180, counterHeight: 48, transportHeight: 56 },
  full: { reelDiameter: 120, counterHeight: 36, transportHeight: 48 },
  sidebar: { reelDiameter: 0, counterHeight: 24, transportHeight: 32 },
  drawer: { reelDiameter: 60, counterHeight: 28, transportHeight: 44 }
} as const;

// Seek knob: degrees of rotation per second of seek
export const SEEK_KNOB_SENSITIVITY = 0.5;

// Reel animation
export const REEL_BASE_DURATION = 8; // seconds per full rotation at 1x speed
export const REEL_SPOKE_COUNT = 3;

// Transport icon SVG paths (15x15 viewBox)
export const ICON_PATHS = {
  play: "M3.24182 2.32181C3.3919 2.23132 3.5784 2.22601 3.73338 2.30781L12.7334 7.05781C12.8974 7.14436 13 7.31457 13 7.5C13 7.68543 12.8974 7.85564 12.7334 7.94219L3.73338 12.6922C3.5784 12.774 3.3919 12.7687 3.24182 12.6782C3.09175 12.5877 3 12.4252 3 12.25V2.75C3 2.57476 3.09175 2.4123 3.24182 2.32181ZM4 3.57925V11.4207L11.4288 7.5L4 3.57925Z",
  pause:
    "M6.04995 2.74998C6.04995 2.44623 5.80371 2.19998 5.49995 2.19998C5.19619 2.19998 4.94995 2.44623 4.94995 2.74998V12.25C4.94995 12.5537 5.19619 12.8 5.49995 12.8C5.80371 12.8 6.04995 12.5537 6.04995 12.25V2.74998ZM10.05 2.74998C10.05 2.44623 9.80371 2.19998 9.49995 2.19998C9.19619 2.19998 8.94995 2.44623 8.94995 2.74998V12.25C8.94995 12.5537 9.19619 12.8 9.49995 12.8C9.80371 12.8 10.05 12.5537 10.05 12.25V2.74998Z",
  rewind: "M7.5 3L2 7.5L7.5 12V8L13 12V3L7.5 7V3Z"
} as const;

// Touch target sizes
export const TOUCH_TARGET = {
  min: 44,
  comfortable: 48
} as const;
