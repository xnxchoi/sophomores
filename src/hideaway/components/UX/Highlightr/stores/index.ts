export const HighlightPalette = {
  BLUE: "",
  ORANGE: "",
  YELLOW: "",
  GREEN: ""
} as const;
export type HIGHLIGHT_PALETTE = typeof HighlightPalette;
export type HighlightColors = keyof HIGHLIGHT_PALETTE;
export const Palettes = [
  "BLUE",
  "ORANGE",
  "YELLOW",
  "GREEN"
] as (keyof typeof HighlightPalette)[];
