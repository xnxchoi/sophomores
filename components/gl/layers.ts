/**
 * Site stacking scale. Keep the numbers small.
 *
 * 0  in-flow page content
 * 1  shared canvas, above the page and below the header
 * 2  site header
 *
 * Dialogs, sheets, and popovers already use 50. A preview banner uses 100.
 * This scale stays under both.
 */
export const siteLayer = {
  canvas: 1,
  header: 2
} as const;
