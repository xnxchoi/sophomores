import { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { type ChipLabel, type DispatchKey } from "../copy";
import { NotifyForm } from "../NotifyForm";

interface ComingSoonPanelProps extends ComponentProps<"section"> {
  title: string;
  dispatch?: DispatchKey;
  dispatchBody?: ReactNode;
  statusLabel?: string;
  label?: string;
  preset?: ChipLabel;
  notify?: boolean;
  topic?: string;
  footer?: ReactNode;
}

export function ComingSoonPanel({
  title,
  dispatch = "default",
  dispatchBody,
  statusLabel,
  label,
  preset = "default",
  notify = true,
  topic,
  footer,
  className,
  ...rest
}: ComingSoonPanelProps) {
  const t = useTranslations("ComingSoon");
  const chip = label ?? t(`chips.${preset}`);
  const body = dispatchBody ?? t(`dispatches.${dispatch}`);
  const statusText = statusLabel ?? t("label");

  return (
    <section
      {...rest}
      className={cn(
        "relative flex min-h-[60vh] w-full items-center overflow-hidden",
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-10 font-sans text-[30vw] leading-none font-light text-foreground/[0.03] select-none sm:text-[22vw] lg:text-[16vw]"
      >
        ◌
      </span>
      <div className="relative mx-auto w-full max-w-2xl px-6 py-24 xl:py-32">
        <div className="flex items-center gap-3">
          <span className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-xs">
            {statusText}
          </span>
          <span className="h-px flex-1 bg-border/30" />
          <span className="inline-flex items-center gap-1.5 border border-dashed border-border/40 px-2 py-0.5 font-sans text-[9px] tracking-widest text-muted-foreground/70 uppercase xl:text-[10px]">
            <span
              aria-hidden
              className="size-1 rounded-full bg-muted-foreground/50"
            />
            {chip}
          </span>
        </div>

        <h1 className="mt-6 text-3xl font-light tracking-tight sm:text-4xl md:text-5xl xl:text-6xl">
          {title}
        </h1>

        <p className="mt-6 max-w-xl font-sans text-[11px] leading-relaxed text-muted-foreground/80 xl:text-xs">
          {body}
        </p>

        {notify && (
          <div className="mt-10">
            <NotifyForm topic={topic} />
          </div>
        )}

        {footer && <div className="mt-10">{footer}</div>}
      </div>
    </section>
  );
}
