import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../../lib/utils";

/** `asChild` renders the one child (a link) with these styles instead of a button. */
type AccountControlProps = ComponentProps<"button"> & { asChild?: boolean };

export function AccountButton({
  className,
  asChild = false,
  ...props
}: AccountControlProps) {
  const Control = asChild ? Slot : "button";
  return (
    <Control
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium transition-colors duration-200 ease-out hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
}

export function AccountPrimaryButton({
  className,
  ...props
}: AccountControlProps) {
  return (
    <AccountButton
      className={cn(
        "bg-neutral-100 text-neutral-950 hover:bg-white",
        className
      )}
      {...props}
    />
  );
}

export function AccountTextButton({
  className,
  asChild = false,
  ...props
}: AccountControlProps) {
  const Control = asChild ? Slot : "button";
  return (
    <Control
      className={cn(
        "inline-flex min-h-11 items-center justify-center text-[13px] text-neutral-400 underline decoration-neutral-700 underline-offset-4 transition-colors duration-200 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
}

export function AccountInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "!mt-2 !min-h-13 !w-full !rounded-xl !border !border-solid !border-neutral-700 !bg-neutral-900 !px-4 !py-3 !text-base !font-normal !text-neutral-100 transition-colors duration-200 ease-out !outline-none focus-visible:!border-neutral-200 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-neutral-300 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
