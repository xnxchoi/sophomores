"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/**
 * Shared act-frame for the horizontal Day n Night track.
 *
 * Every act is a `[data-dn-act]` section with the same outer shape:
 *   - GSAP-measured width multiplier via `--act-w`
 *   - tokenized padding / gap from dn.css (`--dn-act-*`)
 *   - 12-column grid + 3-row template (auto / 1fr / auto)
 *
 * Children place themselves with col-start/row-start utilities; the
 * frame stays consistent so the loop reads with a single rhythm.
 */
interface ActProps {
  /** Width multiplier passed to `--act-w`. Use the 3-step rhythm:
   *  hero ≈ 1.55, standard ≈ 1.5, condensed ≈ 1.45. */
  width: number;
  ariaLabel: string;
  ariaHidden?: boolean;
  className?: string;
  children: ReactNode;
}

export function Act({
  width,
  ariaLabel,
  ariaHidden,
  className = "",
  children
}: ActProps) {
  return (
    <section
      data-dn-act
      style={{ "--act-w": width } as CSSProperties}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden || undefined}
      inert={ariaHidden ? true : undefined}
      className={cn(
        `relative flex h-full flex-none items-stretch overflow-hidden max-lg:h-auto max-lg:min-h-svh max-lg:w-full`,
        ariaHidden ? "max-lg:hidden" : "",
        className
      )}
    >
      <div
        className="relative grid h-full w-screen max-w-screen flex-none grid-cols-12 grid-rows-[auto_1fr_auto] max-lg:h-auto max-lg:w-full max-lg:max-w-full max-lg:grid-cols-1"
        style={{
          paddingTop: "var(--dn-act-pt)",
          paddingBottom: "var(--dn-act-pb)",
          paddingLeft: "var(--dn-act-px)",
          paddingRight: "var(--dn-act-px)",
          columnGap: "var(--dn-act-gap-x)",
          rowGap: "var(--dn-act-gap-y)"
        }}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Magazine-style eyebrow. Vintage masthead direction:
 *
 *   ──────────
 *   №  I — Cookout · 18:30 → 19:50
 *
 * Italic serif numeral + label at body scale (not display scale, the
 * previous design's 3.5rem numeral was eating the page). Mono `№` and
 * time strip keep the editorial/tabular feel.
 */
interface ActEyebrowProps {
  numeral: "I" | "II" | "III" | "IV" | "V";
  label: string;
  time?: string;
  align?: "left" | "right";
  className?: string;
}

export function ActEyebrow({
  numeral,
  label,
  time,
  align = "left",
  className = ""
}: ActEyebrowProps) {
  return (
    <div
      className={cn(
        `col-span-12 row-start-1 flex`,
        align === "right" ? "justify-end" : "justify-start",
        className
      )}
    >
      <span
        data-dn-eyebrow
        data-align={align}
        className="gap-[14px] text-(--dn-fg)"
      >
        <span className="font-sans text-[11px] tracking-[0.32em] text-(--dn-fg-faint)">
          №
        </span>
        <span className="font-serif text-[clamp(1.5rem,1.7vw,1.85rem)] font-medium italic">
          {numeral}
        </span>
        <span
          aria-hidden
          className="font-serif text-[clamp(1.5rem,1.7vw,1.85rem)] text-(--dn-fg-faint) italic"
        >
          —
        </span>
        <span className="font-serif text-[clamp(1.5rem,1.7vw,1.85rem)] italic">
          {label}
        </span>
        {time && (
          <>
            <span aria-hidden className="text-[11px] text-(--dn-fg-faint)">
              ·
            </span>
            <span className="text-[clamp(11px,0.9vw,13px)] tracking-[0.18em] text-(--dn-fg-mute) uppercase tabular-nums">
              {time}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

/* ─── Typography tier classes ───────────────────────────────────────────────
 *
 * Three title scales, no more. Use these constants directly inside acts
 * instead of bespoke clamp() values per heading. The loop's pacing
 * depends on titles landing at predictable scales as each act rotates
 * through frame.
 */

export const TITLE_HERO =
  "font-serif text-[clamp(4.5rem,9vw,10rem)] leading-[0.92] font-bold tracking-[-0.025em] text-[var(--dn-fg)]";

export const TITLE_SECTION =
  "font-serif text-[clamp(2.75rem,6.2vw,6rem)] leading-[0.98] font-bold tracking-[-0.02em] text-[var(--dn-fg)]";

export const TITLE_PAIR =
  "font-serif text-[clamp(1.85rem,3.2vw,3.1rem)] leading-[1.05] font-bold tracking-[-0.015em] text-[var(--dn-fg)]";

export const LEDE =
  "text-[clamp(1.4rem,1.6vw,1.75rem)] leading-[1.45] font-light tracking-[-0.005em] text-[var(--dn-fg-mute)]";



export const LABEL_MONO =
  "font-sans text-[10px] tracking-[0.32em] text-[var(--dn-fg-faint)] uppercase";
