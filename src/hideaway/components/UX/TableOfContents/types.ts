/**
 * Shared types for the gradient-led TableOfContents primitive.
 *
 * Two modes, one component family:
 *
 * - `route`  — items are route links; active state derived from current
 *              pathname (server / client routing). Used by `/me/settings`.
 * - `anchor` — items are in-page anchors; active state derived from
 *              IntersectionObserver scroll-spy. Used by `/terms`, `/privacy`,
 *              and any long-form document with a persistent rail.
 *
 * Per-mode item types eliminate the runtime "#" fallback that a shared,
 * loosely-typed `TocItem` would silently produce when a caller passed
 * anchor-mode items to route mode (or vice versa).
 */

export type TocMode = "route" | "anchor";

/** Visual face for the rail labels. Pick by surface, not by mode. */
export type TocLabelStyle =
  | "sans" // admin / settings rail (default for `mode="route"`)
  | "mono"; // editorial / long-form document rail (default for `mode="anchor"`)

interface TocItemBase {
  /** Visible label. */
  label: string;
  /**
   * Optional pre-formatted number/marker, e.g. "01", "I". Defaults to a
   * zero-padded ordinal derived from the item's index when omitted.
   */
  number?: string;
}

/** Route-mode item. Requires `href`. */
export interface TocRouteItem extends TocItemBase {
  href: string;
}

/** Anchor-mode item. Requires `id`. */
export interface TocAnchorItem extends TocItemBase {
  id: string;
}

/** Convenience union — accepts either shape. Use the per-mode types in props. */
export type TocItem = TocRouteItem | TocAnchorItem;

export interface TableOfContentsBaseProps {
  /** Accessible label for the nav landmark. Defaults to "Contents". */
  ariaLabel?: string;
  className?: string;
  /**
   * Override the label face. By default `mode="route"` uses sans (admin
   * surfaces; matches CLAUDE.md `Admin surfaces (Fey direction)` rules) and
   * `mode="anchor"` uses mono caps (editorial chrome on content surfaces).
   *
   * NB: this primitive is editorial-first — its visual language assumes
   * ordinal markers + gradient pill. Admin rails (Settings) live on a
   * dedicated `<SettingsRail/>` instead; do not reuse this component
   * outside of long-form documents.
   */
  labelStyle?: TocLabelStyle;
}

export interface TableOfContentsRouteProps extends TableOfContentsBaseProps {
  mode: "route";
  items: TocRouteItem[];
  /** Optional: predicate to determine active state for a given href + pathname. */
  isActive?: (pathname: string, href: string) => boolean;
}

export interface TableOfContentsAnchorProps extends TableOfContentsBaseProps {
  mode: "anchor";
  items: TocAnchorItem[];
  /**
   * Top offset (px) used to bias the scroll-spy hit zone — usually equals the
   * sticky header height on the page. Defaults to 96.
   */
  scrollOffsetTop?: number;
}

export type TableOfContentsProps =
  | TableOfContentsRouteProps
  | TableOfContentsAnchorProps;
