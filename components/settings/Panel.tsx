import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "aside" | "div";
}

export function Panel({ children, className, as = "section" }: PanelProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "border border-white/10 bg-neutral-900/60 backdrop-blur-md",
        "before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelBento({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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

export function PanelGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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

export function PanelHeader({
  eyebrow,
  title,
  blurb,
  meta,
  className,
}: {
  eyebrow: string;
  title?: string;
  blurb?: string;
  meta?: ReactNode;
  className?: string;
}) {
  const headingOnly = !title && !blurb;

  return (
    <header className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        {headingOnly ? (
          <h2 className="text-base font-medium tracking-tight text-white xl:text-lg">
            {eyebrow}
          </h2>
        ) : (
          <p className="text-xs uppercase tracking-wider text-neutral-400">
            {eyebrow}
          </p>
        )}
        {meta ? (
          <span className="shrink-0 text-xs text-neutral-400">
            {meta}
          </span>
        ) : null}
      </div>
      {title ? (
        <h2 className="text-xl font-light tracking-tight text-white xl:text-2xl">
          {title}
        </h2>
      ) : null}
      {blurb ? (
        <p className="max-w-prose text-sm leading-relaxed text-neutral-300">
          {blurb}
        </p>
      ) : null}
    </header>
  );
}

export function PanelControls({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {children}
    </div>
  );
}
