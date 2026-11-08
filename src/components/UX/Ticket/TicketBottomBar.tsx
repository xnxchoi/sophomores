"use client";

import { Link } from "@/components/core/Link/Link";
import { cn } from "@/lib/utils";
import * as m from "motion/react-m";

interface TicketBottomBarProps {
  /** Small mono-uppercase label sitting above the title. */
  eyebrow: string;
  /** Page-level h1. */
  title: string;
  /** Optional count rendered inline with the title (mono, tabular). */
  count?: number | null;
  /** Optional right-side nav action, rendered as a quiet text link. */
  rightAction?: { label: string; href: string };
  /** Slot for an extra control on the right (e.g. focused-mode toggle). */
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Bottom-stuck navigation/title chassis used across the ticket pages.
 *
 * Flat, flush, full-width — sits at the very bottom edge of the viewport
 * with a top hairline border, backdrop blur, and `env(safe-area-inset-bottom)`
 * baked into the padding. No rounded chassis card — that read like a
 * floating tooltip and broke the "singular monochassis" feel. This is a
 * proper footer rail.
 *
 * The SideDrawer (z-239) still overlays this when it's docked at bottom
 * on mobile and expanded — that's the right order of importance. The
 * collapsed drawer handle pokes through the safe-area padding without
 * occluding our content.
 */
export function TicketBottomBar({
  eyebrow,
  title,
  count,
  rightAction,
  rightSlot,
  className
}: TicketBottomBarProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border/30 bg-background/82 backdrop-blur-xl",
        className
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-3.5 xl:px-10 xl:py-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-xs">
              {eyebrow}
            </p>
            <h1 className="mt-0.5 truncate text-lg font-light tracking-tight xl:text-xl">
              {title}
              {typeof count === "number" && count > 0 ? (
                <span className="ml-2 font-sans text-sm text-muted-foreground/50 tabular-nums">
                  {count}
                </span>
              ) : null}
            </h1>
          </div>
          <div className="flex shrink-0 items-end gap-3">
            {rightAction ? (
              <Link
                href={rightAction.href}
                className="font-sans text-[11px] tracking-widest text-muted-foreground/60 uppercase transition-colors hover:text-foreground xl:text-xs"
              >
                {rightAction.label}
              </Link>
            ) : null}
            {rightSlot}
          </div>
        </div>
      </div>
    </m.div>
  );
}
