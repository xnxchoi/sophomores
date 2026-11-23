import type { ComponentProps } from "react";
import { cn } from "../../../lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

export function AccountButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors duration-200 ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
}

export function AccountPrimaryButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <AccountButton
      className={cn(
        "bg-foreground text-background hover:bg-foreground/90",
        className
      )}
      {...props}
    />
  );
}

export function AccountTextButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "group/focus inline-flex min-h-11 items-center justify-center text-[13px] text-muted-foreground underline decoration-border underline-offset-4 transition-colors duration-200 hover:text-foreground disabled:opacity-40",
        className
      )}
      {...props}
    >
      <FocusShape className="inline-flex items-center justify-center gap-[inherit] outline-offset-4 group-focus-visible/focus:outline-foreground">{children}</FocusShape>
    </button>
  );
}

export function AccountInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "!mt-2 !min-h-13 !w-full !rounded-xl !border !border-solid !border-border !bg-transparent !px-4 !py-3 !text-base !font-normal !text-foreground transition-colors duration-200 ease-out !outline-none focus-visible:!border-foreground disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
