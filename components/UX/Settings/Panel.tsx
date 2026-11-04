import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Lifted dark panel — the structural unit of admin / settings surfaces.
 *
 * Visual signature (per CLAUDE.md "Admin surfaces (Fey direction)"):
 *  - rounded-2xl outer corners
 *  - bg foreground/[0.04] (light) — bg foreground/[0.05] (dark)
 *  - top-edge inner highlight via :before pseudo-element (the lift)
 *  - soft outer drop-shadow (the float)
 *  - no visible border; separation comes from luminance + shadow
 *
 * Internal composition is up to the consumer; pair with <PanelGrid/> when
 * you want the standard 2-col `description | controls` layout.
 */
interface PanelProps {
  children: ReactNode;
  className?: string;
  /**
   * Render a `<section>` (default), `<aside>`, etc. Use `<aside>` for the
   * companion column on the overview canvas.
   */
  as?: "section" | "aside" | "div";
}

export function Panel({ children, className, as = "section" }: PanelProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "relative overflow-hidden rounded-2xl",
        // Width is controlled by the parent grid (a `<PanelBento/>` or
        // a flex stack), not the panel itself. The previous `max-w-2xl`
        // cap was a band-aid against the 1-col stretch problem; the
        // proper fix is bento — dense, adjacent panels at wide
        // breakpoints. See `PanelBento`.
        "w-full",
        // Surface tint — lighter than the canvas. Slightly stronger in dark
        // mode so the panel reads as a pool of light against near-black.
        "bg-foreground/[0.04] dark:bg-foreground/[0.05]",
        // Top-edge inner highlight: the lift. Spans the full panel width
        // and fades softly toward the edges.
        "before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/25 before:to-transparent",
        "dark:before:via-foreground/30",
        // Soft outer shadow: the float. Slightly stronger in dark mode.
        "shadow-[0_2px_24px_-8px_rgba(0,0,0,0.35)]",
        "dark:shadow-[0_2px_28px_-8px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Multi-panel layout container — bento.
 *
 *   - Below 2xl: single column, panels stack vertically.
 *   - 2xl+:      two columns, panels pack adjacent (top-to-bottom,
 *                left-to-right by source order). Tightens the
 *                "panels-on-the-left, void-on-the-right" feel that the
 *                single-column layout had on wide canvases.
 *
 * `auto-rows-min` keeps each panel sized to its own content so a tall
 * panel in the left column doesn't pad out the row beside a short one
 * — neighbour panels just sit at their natural height.
 *
 * Use this as the outer panel wrapper inside any settings page that
 * has more than one panel. Single-panel pages can use a plain `<div/>`.
 */
interface PanelBentoProps {
  children: ReactNode;
  className?: string;
}

export function PanelBento({ children, className }: PanelBentoProps) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-5 2xl:grid-cols-2 2xl:gap-6",
        "[grid-auto-rows:min-content]",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Vertical composition inside a Panel — header on top, controls below.
 *
 *   ┌──────────── Panel ────────────┐
 *   │  header                       │
 *   │  controls (vertical row stack)│
 *   └───────────────────────────────┘
 *
 * The previous 2-col `description | controls` layout was retired at
 * breakpoint-5: on wide screens it stretched the controls column across
 * 600+px, leaving a single label-left / value-right pair drifting at
 * each end of the row — Apple Settings doesn't do that, and the user
 * called it "stretched" / "ugly". Vertical stacking reads as a tighter
 * Apple-cadence: section heading, then a stack of self-contained rows.
 *
 * Padding scales with breakpoint. The Panel itself is responsible for
 * its outer max-width via the `<Panel/>` component.
 */
interface PanelGridProps {
  children: ReactNode;
  className?: string;
}

export function PanelGrid({ children, className }: PanelGridProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 p-6 xl:gap-7 xl:p-8 2xl:p-9",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Panel section header — minimal Apple-Settings cadence.
 *
 * The previous eyebrow + title + blurb three-tier was breakpoint-5'd: on
 * most sections the title and blurb were filler ("Your real-world name
 * and voice", "Both fields are public"), adding chrome without adding
 * meaning. The new contract is:
 *
 *   - `eyebrow` is the heading — required, sans, light weight. This is
 *     literally just the section name ("Identity", "Sign-in", "Two-factor").
 *   - `title` is OPTIONAL and only used when the section needs a real
 *     descriptive line beyond its name. Most sections won't need it.
 *   - `blurb` is OPTIONAL and only used when there's behaviour the user
 *     genuinely needs explained (a deferred feature, a security
 *     warning, a non-obvious side effect). Cut it otherwise.
 *   - `meta` stays — small status indicator on the right.
 *
 * Backward-compat: callers that still pass `eyebrow + title + blurb`
 * will render with the eyebrow as a small label, then the title, then
 * the blurb — same as before. The recommended pattern for new code is
 * eyebrow-only.
 */
interface PanelHeaderProps {
  /** Section heading — required. Sans, light weight. */
  eyebrow: string;
  /**
   * Optional descriptive title rendered below the eyebrow at a slightly
   * heavier weight. Use only when the eyebrow alone would be ambiguous.
   */
  title?: string;
  /**
   * Optional supporting blurb. Use only when behaviour genuinely needs
   * explaining; not for filler / restating the obvious.
   */
  blurb?: string;
  /** Optional ambient meta (a status, a count). */
  meta?: ReactNode;
  className?: string;
}

export function PanelHeader({
  eyebrow,
  title,
  blurb,
  meta,
  className
}: PanelHeaderProps) {
  // No descriptive title → eyebrow IS the heading. Render it at the
  // heading scale instead of as a small label — that's the dominant
  // shape now.
  const headingOnly = !title && !blurb;

  return (
    <header className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        {headingOnly ? (
          <h2 className="text-base font-medium tracking-tight text-foreground xl:text-lg">
            {eyebrow}
          </h2>
        ) : (
          <p className="text-sm tracking-tight text-foreground/65 dark:text-foreground/60">
            {eyebrow}
          </p>
        )}
        {meta ? (
          <span className="shrink-0 text-xs text-foreground/55 dark:text-foreground/50">
            {meta}
          </span>
        ) : null}
      </div>
      {title ? (
        <h2 className="text-xl font-light tracking-tight text-foreground xl:text-2xl">
          {title}
        </h2>
      ) : null}
      {blurb ? (
        <p className="max-w-prose text-sm leading-relaxed text-foreground/70 dark:text-foreground/65">
          {blurb}
        </p>
      ) : null}
    </header>
  );
}

/**
 * Right column of a PanelGrid — vertical stack of inset row pills.
 *
 * Spacing is tight (gap-1) because each row pill carries its own
 * background and top-edge highlight; rows separate visually without
 * needing dividers.
 */
interface PanelControlsProps {
  children: ReactNode;
  className?: string;
}

export function PanelControls({ children, className }: PanelControlsProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {children}
    </div>
  );
}
