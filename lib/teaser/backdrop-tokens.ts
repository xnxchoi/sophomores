export const backdropTokens = {
  heroScale: 1.6,
  scrollZoom: 0.58,
  scrollY: 12,
  palette: "gilded-flame",
  paletteTransition: 0,
  footerMaterial: "aurora",
  footerEntrySeconds: 3.6,
  footerOpacity: .85,
  footerComposition: { widthRatio: 1.2, heightRatio: 1.9 },
  footerCompact: { maxWidth: 767, verticalScale: 0.6 }
} as const;

export { resolveFooterComposition } from '@/components/flame-backdrop/footer-config';
