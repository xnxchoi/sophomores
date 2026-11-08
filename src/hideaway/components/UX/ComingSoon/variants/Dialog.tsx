"use client";

import { ReactElement, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { HA_DialogContent as DialogContent, HA_DialogDescription as DialogDescription, HA_DialogRoot as DialogRoot, HA_DialogTitle as DialogTitle, HA_DialogTrigger as DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type ChipLabel, type DispatchKey } from "../copy";
import { NotifyForm } from "../NotifyForm";

interface ComingSoonDialogProps {
  title: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dispatch?: DispatchKey;
  dispatchBody?: ReactNode;
  statusLabel?: string;
  label?: string;
  preset?: ChipLabel;
  notify?: boolean;
  topic?: string;
  className?: string;
}

export function ComingSoonDialog({
  title,
  trigger,
  open,
  onOpenChange,
  dispatch = "default",
  dispatchBody,
  statusLabel,
  label,
  preset = "default",
  notify = true,
  topic,
  className
}: ComingSoonDialogProps) {
  const t = useTranslations("ComingSoon");
  const chip = label ?? t(`chips.${preset}`);
  const body = dispatchBody ?? t(`dispatches.${dispatch}`);
  const statusText = statusLabel ?? t("label");

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger nativeButton={false} render={() => trigger} />
      ) : null}
      <DialogContent className={cn("max-w-[520px]", className)}>
        <div className="flex items-center gap-3">
          <span className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">
            {statusText}
          </span>
          <span className="h-px flex-1 bg-border/30" />
          <span className="inline-flex items-center gap-1.5 border border-dashed border-border/40 px-2 py-0.5 font-sans text-[9px] tracking-widest text-muted-foreground/70 uppercase">
            <span
              aria-hidden
              className="size-1 rounded-full bg-muted-foreground/50"
            />
            {chip}
          </span>
        </div>
        <DialogTitle className="mt-4 text-2xl font-light tracking-tight xl:text-3xl">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground/80 xl:text-xs">
          {body}
        </DialogDescription>
        {notify && (
          <div className="mt-6">
            <NotifyForm topic={topic} />
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  );
}
