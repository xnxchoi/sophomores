export const backdropTokens = {
  heroScale: 1.6,
  scrollZoom: 0.58,
  scrollY: 12,
  palette: "gilded-flame",
  paletteTransition: 0,
  footerMaterial: "aurora",
  footerEntrySeconds: 3.6,
  // Legacy/inactive token: do not apply an extra scene-opacity multiplier.
  footerOpacity: FLAME_APPEARANCE.legacy.footerOpacity,
  footerVerticalStretch: FLAME_APPEARANCE.presentation.verticalStretch,
  footerComposition: { widthRatio: 1.2, heightRatio: 1.9 },
  footerCompact: { maxWidth: 767, verticalScale: 0.6 }
} as const;

export { resolveFooterComposition } from "@/components/flame-backdrop/footer-config";
import { FLAME_APPEARANCE } from "@/components/flame-backdrop/appearance";
