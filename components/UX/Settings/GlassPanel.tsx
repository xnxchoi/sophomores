import { cn } from "@/lib/utils";
import {
  createElement,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  forwardRef
} from "react";

export type GlassPanelVariant = "subtle" | "default" | "elevated";

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant?: GlassPanelVariant;
  withGrain?: boolean;
  withSheen?: boolean;
  as?: ElementType;
}

/**
 * Tint formula uses `bg-foreground/[X]` so the panel always shifts *toward*
 * the foreground tone — darker in light mode, lighter in dark mode. This
 * gives a predictable lift regardless of whether `--card` differs from
 * `--background`.
 */
// Light mode reads "lifted" via a stronger shadow + slightly heavier tint;
// dark mode reads "lifted" via a brighter foreground tint at low opacity.
// Tints are stepped so elevated > default > subtle is clearly perceivable.
const variantClasses: Record<GlassPanelVariant, string> = {
  subtle: cn(
    // Light
    "bg-foreground/[0.035] backdrop-blur-md",
    "outline outline-1 outline-foreground/15 -outline-offset-1",
    "shadow-[0_1px_0_0_oklch(from_var(--background)_l_c_h/0.7)_inset,_0_2px_8px_-3px_rgba(0,0,0,0.05),_0_8px_24px_-12px_rgba(0,0,0,0.08)]",
    // Dark
    "dark:bg-foreground/[0.035] dark:outline-foreground/[0.10]",
    "dark:shadow-[0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.06)_inset,_0_8px_24px_-12px_rgba(0,0,0,0.5)]"
  ),
  default: cn(
    // Light
    "bg-foreground/[0.06] backdrop-blur-md",
    "outline outline-1 outline-foreground/20 -outline-offset-1",
    "shadow-[0_1px_0_0_oklch(from_var(--background)_l_c_h/0.85)_inset,_0_4px_12px_-3px_rgba(0,0,0,0.08),_0_16px_36px_-14px_rgba(0,0,0,0.12)]",
    // Dark
    "dark:bg-foreground/[0.05] dark:outline-foreground/[0.14]",
    "dark:shadow-[0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.08)_inset,_0_16px_40px_-16px_rgba(0,0,0,0.6),_0_2px_6px_-2px_rgba(0,0,0,0.4)]"
  ),
  elevated: cn(
    // Light
    "bg-foreground/[0.085] backdrop-blur-xl",
    "outline outline-1 outline-foreground/25 -outline-offset-1",
    "shadow-[0_1px_0_0_oklch(from_var(--background)_l_c_h/0.9)_inset,_0_8px_20px_-4px_rgba(0,0,0,0.10),_0_28px_56px_-20px_rgba(0,0,0,0.18)]",
    // Dark
    "dark:bg-foreground/[0.085] dark:outline-foreground/[0.22]",
    "dark:shadow-[0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.12)_inset,_0_28px_60px_-24px_rgba(0,0,0,0.75),_0_4px_12px_-3px_rgba(0,0,0,0.5)]"
  )
};

/**
 * A polished glass surface — subtle tint, lightly blurred, with an inner
 * top sheen and optional grain overlay. Stays inside the project's
 * monochrome + opacity-token palette; only adds depth, not new color.
 *
 * Scoped to administrative surfaces (e.g. /me/settings, /vault).
 */
export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(
  function GlassPanel(
    {
      children,
      className,
      variant = "default",
      withGrain = true,
      withSheen = true,
      as,
      ...rest
    },
    ref
  ) {
    const Tag: ElementType = as ?? "div";
    return createElement(
      Tag,
      {
        ref,
        className: cn(
          "relative isolate rounded-sm",
          variantClasses[variant],
          className
        ),
        ...rest
      },
      withSheen ? (
        <span
          key="sheen"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit]",
            "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-foreground/30 before:to-transparent dark:before:via-foreground/40",
            "after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-b after:from-foreground/[0.06] after:via-transparent after:to-transparent dark:after:from-foreground/[0.08]"
          )}
        />
      ) : null,
      withGrain ? (
        <span
          key="grain"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[url('/assets/noise.png')] bg-[length:45px_45px] opacity-[0.07] mix-blend-overlay dark:opacity-[0.09]"
        />
      ) : null,
      <div key="content" className="relative z-10">
        {children}
      </div>
    );
  }
);
