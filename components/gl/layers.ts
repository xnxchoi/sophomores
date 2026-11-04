/**
 * Site stacking scale. Keep the numbers small.
 *
 * 0  in-flow page content
 * 1  shared canvas, above the page and below the header
 * 2  site header
 * 3  a focused portrait. It covers the page, including the header, and stays under dialogs.
 * 5  the shared canvas while the menu is open, so the gradient sits above the page.
 * 6  the menu frame. The window in the middle shows the gradient and the item preview.
 * 40 the site cursor. Above the page, under dialogs at 50.
 *
 * Dialogs, sheets, and popovers already use 50. A preview banner uses 100.
 * This scale stays under both.
 */
export const siteLayer = {
  canvas: 1,
  header: 2,
  focus: 3,
  menuCanvas: 5,
  menu: 6,
  cursor: 40
} as const;
