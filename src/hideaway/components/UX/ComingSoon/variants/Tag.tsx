"use client";

import { Button } from "@/hideaway/components/core/Button";
import { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { type ChipLabel, type TooltipKey } from "../copy";

interface ComingSoonTagProps {
  label?: string;
  preset?: ChipLabel;
  tooltip?: TooltipKey | false;
  tooltipTitle?: string;
  tone?: "soft" | "firm";
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
}

const chipClass = (
  tone: "soft" | "firm",
  interactive: boolean,
  className?: string
) =>
  cn(
    "inline-flex items-center gap-1.5 border px-2 py-0.5 font-sans tracking-widest uppercase transition-colors",
    "text-[9px] text-muted-foreground/70 xl:text-[10px]",
    tone === "soft"
      ? "border-dashed border-off-background/40 hover:border-off-background/70 hover:text-foreground/80"
      : "border-off-background/20 text-muted-foreground/50",
    className
  );

export function ComingSoonTag({
  label,
  preset = "default",
  tooltip = "inProgress",
  tooltipTitle,
  tone = "soft",
  className,
  onClick
}: ComingSoonTagProps) {
  const t = useTranslations("ComingSoon");
  const text = label ?? t(`chips.${preset}`);
  const hoverTitle =
    tooltipTitle ??
    (tooltip === false
      ? undefined
      : `${t(`tooltips.${tooltip}.line1`)} — ${t(`tooltips.${tooltip}.line2`)}`);

  const Dot = (
    <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
  );

  if (onClick) {
    return (
      <Button
        type="button"
        title={hoverTitle}
        onClick={onClick}
        className={chipClass(tone, true, className)}
      >
        {Dot}
        {text}
      </Button>
    );
  }

  return (
    <span title={hoverTitle} className={chipClass(tone, false, className)}>
      {Dot}
      {text}
    </span>
  );
}
