import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Inset row pill — the visual primitive every field tier sits on.
 *
 * Per CLAUDE.md "Admin surfaces (Fey direction)":
 *  - rounded-lg corners (one step down from the outer Panel's rounded-2xl,
 *    so inner pills don't read as nested cards)
 *  - bg foreground/[0.025] light — bg foreground/[0.03] dark (subtly
 *    darker than the panel, so the pill reads as inset)
 *  - top-edge inner highlight, fainter than the Panel's
 *  - sans typography only; mono is reserved for editorial chrome elsewhere
 */
interface FieldRowProps {
  /** Optional leading 16px icon. */
  icon?: ReactNode;
  /** Row label — sans, body weight. */
  label: string;
  /** Optional secondary description below the label. */
  description?: string;
  /** Trailing slot: value, control, glyph cluster. */
  children: ReactNode;
  /** Optional ambient meta — small text trailing the label area. */
  meta?: ReactNode;
  className?: string;
  /** When true, the row is interactive — adds hover affordance. */
  interactive?: boolean;
  /**
   * `inline` (default) puts label + control on the same row;
   * `stack` puts the control below the label (long-form fields, bio, etc).
   */
  align?: "inline" | "stack";
}

export function FieldRow({
  icon,
  label,
  description,
  children,
  meta,
  className,
  interactive = false,
  align = "inline"
}: FieldRowProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg px-4 py-3",
        "bg-foreground/[0.025] dark:bg-foreground/[0.03]",
        // Top-edge highlight (fainter than Panel's; the pill is inset, not lifted).
        "before:pointer-events-none before:absolute before:inset-x-2 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent",
        "dark:before:via-foreground/12",
        interactive &&
          "transition-colors hover:bg-foreground/[0.035] dark:hover:bg-foreground/[0.045]",
        align === "stack" ? "flex flex-col gap-3" : "",
        className
      )}
    >
      {align === "inline" ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? (
              <span className="flex size-4 shrink-0 items-center justify-center text-foreground/55 dark:text-foreground/50">
                {icon}
              </span>
            ) : null}
            <div className="flex min-w-0 flex-col">
              <span className="text-sm text-foreground">{label}</span>
              {description ? (
                <span className="text-xs text-foreground/65 dark:text-foreground/60">
                  {description}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {meta ? (
              <span className="text-xs text-foreground/60 dark:text-foreground/55">
                {meta}
              </span>
            ) : null}
            {children}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-center gap-3">
              {icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center text-foreground/55 dark:text-foreground/50">
                  {icon}
                </span>
              ) : null}
              <span className="text-sm text-foreground">{label}</span>
            </div>
            {meta ? (
              <span className="text-xs text-foreground/60 dark:text-foreground/55">
                {meta}
              </span>
            ) : null}
          </div>
          {description ? (
            <span className="text-xs text-foreground/65 dark:text-foreground/60">
              {description}
            </span>
          ) : null}
          <div>{children}</div>
        </>
      )}
    </div>
  );
}
