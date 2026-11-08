import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FieldRowProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
  interactive?: boolean;
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
  align = "inline",
}: FieldRowProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl px-4 py-3.5",
        "bg-white/[0.03] border border-white/5",
        "before:pointer-events-none before:absolute before:inset-x-2 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        interactive &&
          "transition-colors hover:bg-white/[0.06] hover:border-white/10",
        align === "stack" ? "flex flex-col gap-3" : "flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-neutral-400">
            {icon}
          </span>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{label}</span>
            {meta ? (
              <span className="text-xs text-neutral-400">{meta}</span>
            ) : null}
          </div>
          {description ? (
            <p className="text-xs leading-relaxed text-neutral-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
