/**
 * Site stacking scale. Keep the numbers small.
 *
 * 0  in-flow page content
 * 1  shared canvas, above the page and below the header
 * 2  site header
 * 3  a focused portrait. It covers the page, including the header, and stays under dialogs.
 * 5  the shared canvas while the menu is open, so the gradient sits above the page.
 * 6  the menu frame. The window in the middle shows the gradient and the item preview.
 * 11 the Help pill, just above the FXFrame band (z-10) at the window's foot.
 * 28 the touch-phone Controlbar drawer and its backdrop (shell/controlbar), over the page and header.
 * 29 the Controlbar strip, over its drawer's foot. Both stay under the in-app browser help (30).
 * 40 the site cursor. Above the page, under dialogs at 50.
 * 45 the Controlbar's full-screen search sheet, as the header's Search: over the strip, under dialogs.
 *
 * Dialogs, sheets, and popovers already use 50. A preview banner uses 100.
 * This scale stays under both.
 *
 * The open site menu is the exception: the legacy menu body is at 248, above every dialog at 50. So a dialog
 * never coexists with the open menu. Opening the site guide closes the menu (RP_Menu, Rule B of the shell's
 * Escape table). Raising dialogs above 248 instead would change the shared dialog primitive for every sheet
 * and dialog, and re-stack them over the page curtain (250), for one coexistence case the menu can avoid.
 */
export const siteLayer = {
  canvas: 1,
  header: 2,
  focus: 3,
  helpPill: 11,
  menuCanvas: 5,
  menu: 6,
  /**
   * The Hideaway's 238/239/260 sat above everything; here they keep its order (drawer, then strip, then
   * search sheet) under dialogs (50), the open menu (248) and the page curtain (250). The open menu
   * closes the drawer and sheet, and the strip is inert under it.
   */
  controlbarDrawer: 28,
  controlbar: 29,
  cursor: 40,
  searchSheet: 45,
  /**
   * The header while the menu is open. The Hideaway menu body still sits at 248 and the page curtain at 250
   * in legacy CSS (src/styles/sphmrs.scss), so the open header takes Hideaway's 249: above the menu, so its
   * Menu/Close stays reachable, and under the curtain. Moving the menu onto this scale (6) waits for a live
   * z-audit: fixed page elements such as the home teaser's (z-21, z-100) would otherwise cover the open menu.
   */
  headerOpen: 249
} as const;
