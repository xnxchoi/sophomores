export const backdropTokens = {
  heroScale: 1.6,
  scrollZoom: 0.58,
  scrollY: 12,
  palette: "gilded-flame",
  paletteTransition: 0,
  footerComposition: { widthRatio: 1.2, heightRatio: 1.9 }
} as const;

/** Page composition only: keep the approved flame material while placing nominal tips at 78% viewport height. */
export function resolveFooterComposition(width: number, height: number) {
  const valid =
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0;
  const viewportWidth = valid ? width : 1440;
  const viewportHeight = valid ? height : 900;
  const composition = backdropTokens.footerComposition;
  const radius = Math.min(
    (viewportWidth * composition.widthRatio) / 2,
    viewportHeight * composition.heightRatio
  );
  // Approved footer: radius .35 and plume height .25. The renderer bounds verticalScale to [.25, 2].
  const verticalScale = Math.max(
    0.25,
    Math.min(2, (viewportHeight * 0.78) / (radius * (1 + 0.25 / 0.35)))
  );
  return { ...composition, verticalScale };
}
