/**
 * Gradient-led, role-aware table of contents.
 *
 * Two visual layouts (vertical rail / horizontal scroller) and two operating
 * modes (route links / in-page anchors with scroll-spy) compose freely.
 *
 * Used by:
 *   - Long-form legal documents (`/terms`, `/privacy`)  — anchor mode
 *   - Settings rail (`/me/settings/*`)                  — route mode
 */

export { TableOfContents } from "./TableOfContents";
export { TableOfContentsMobile } from "./TableOfContentsMobile";
export { useActiveSection } from "./useActiveSection";
export type {
  TocItem,
  TocRouteItem,
  TocAnchorItem,
  TocMode,
  TocLabelStyle,
  TableOfContentsProps,
  TableOfContentsBaseProps,
  TableOfContentsRouteProps,
  TableOfContentsAnchorProps
} from "./types";
