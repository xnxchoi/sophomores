"use client";

import { Button } from "@/components/core/Button";
import { cn } from "@/lib/utils";
import { CircleNotchIcon as Loader2 } from "@phosphor-icons/react";
import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

type Tone = "default" | "danger" | "ghost";

interface EditorialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  loading?: boolean;
  icon?: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  default: cn(
    "border border-border/40 bg-card/30 text-foreground/85",
    "shadow-[inset_0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.08)]",
    "hover:border-border hover:bg-card/55 hover:text-foreground",
    "hover:shadow-[inset_0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.12),_0_4px_18px_-12px_oklch(from_var(--foreground)_l_c_h/0.3)]",
    "dark:bg-card/40 dark:text-foreground/85 dark:hover:bg-card/60"
  ),
  danger: cn(
    "border border-rouge-700/40 bg-rouge-700/[0.04] text-rouge-700/85",
    "shadow-[inset_0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.06)]",
    "hover:border-rouge-700 hover:bg-rouge-700/10 hover:text-rouge-700",
    "hover:shadow-[inset_0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.10),_0_4px_18px_-12px_oklch(from_var(--rouge-700)_l_c_h/0.4)]",
    "dark:text-rouge-300/85 dark:hover:text-rouge-200"
  ),
  ghost:
    "border border-transparent bg-transparent text-foreground/65 hover:text-foreground hover:bg-card/30"
};

export const EditorialButton = forwardRef<
  HTMLButtonElement,
  EditorialButtonProps
>(function EditorialButton(
  { tone = "default", loading, icon, children, className, disabled, ...rest },
  ref
) {
  return (
    <Button
      ref={ref}
      disabled={loading || disabled}
      className={cn(
        "relative inline-flex items-center gap-2 px-5 py-2.5 font-sans text-[11px] tracking-[0.18em] uppercase transition-all duration-200 disabled:opacity-40",
        toneClasses[tone],
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : icon ? (
        <span aria-hidden="true" className="inline-flex items-center">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </Button>
  );
});
