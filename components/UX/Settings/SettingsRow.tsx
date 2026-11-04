import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { GlassPanel, type GlassPanelVariant } from "./GlassPanel";

interface SettingsGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  meta?: ReactNode;
  /**
   * Render inside a glass panel (default), an inline section (false),
   * or a specific GlassPanel variant.
   */
  panel?: boolean | GlassPanelVariant;
}

/**
 * A titled cluster of rows. Default appearance is a glass panel; pass
 * `panel={false}` for an inline section divided by hairline rules.
 */
export const SettingsGroup = ({
  title,
  description,
  children,
  className,
  meta,
  panel = true
}: SettingsGroupProps) => {
  const head = (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-sans text-[10px] tracking-[0.22em] text-foreground/65 uppercase">
          {title}
        </h2>
        {description ? (
          <p className="max-w-prose text-sm leading-relaxed font-light text-foreground/70">
            {description}
          </p>
        ) : null}
      </div>
      {meta ? (
        <div className="shrink-0 font-sans text-[10px] tracking-widest text-foreground/60 tabular-nums dark:text-foreground/55">
          {meta}
        </div>
      ) : null}
    </div>
  );

  const body = <div className="flex flex-col">{children}</div>;

  if (!panel) {
    return (
      <section
        className={cn(
          "flex flex-col gap-6 border-b border-border/20 py-10 first:pt-12 last:border-b-0",
          className
        )}
      >
        {head}
        {body}
      </section>
    );
  }

  const variant: GlassPanelVariant = panel === true ? "default" : panel;
  return (
    <GlassPanel as="section" variant={variant} className={className}>
      <div className="flex flex-col gap-7 p-6 sm:p-8 xl:p-10">
        {head}
        {body}
      </div>
    </GlassPanel>
  );
};

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
  /** stack value below label on narrow screens; row otherwise */
  align?: "row" | "stack";
}

/**
 * A spec-sheet row: [label · description] | [value/control] | [meta?].
 * Hairline divider above; rows stack hairlines via group container.
 */
export const SettingsRow = ({
  label,
  description,
  children,
  meta,
  className,
  align = "row"
}: SettingsRowProps) => {
  return (
    <div
      className={cn(
        "grid items-start gap-x-8 gap-y-3 border-t border-border/15 py-5 first:border-t-0",
        align === "row"
          ? "grid-cols-1 md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto]"
          : "grid-cols-1",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="font-sans text-[10px] tracking-[0.18em] text-foreground/70 uppercase">
          {label}
        </span>
        {description ? (
          <span className="max-w-[20ch] text-[11px] leading-relaxed font-light text-foreground/65">
            {description}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 text-sm leading-relaxed font-light tracking-tight text-foreground/90">
        {children}
      </div>
      {meta ? (
        <div className="font-sans text-[10px] tracking-widest text-foreground/60 tabular-nums md:text-right dark:text-foreground/55">
          {meta}
        </div>
      ) : null}
    </div>
  );
};
