import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
import { Label, HA_Label } from "./label";
import { ComponentProps, type InputHTMLAttributes } from "react";
import type * as React from "react";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "border-faded-background/60 flex h-8 w-full min-w-0 border-b border-solid bg-transparent px-2.5 py-3.5 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-background selection:text-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-base placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-faded-background/50 focus-visible:ring-ring/0 focus-visible:ring-offset-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export function InputFile({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="picture">Picture</Label>
      <Input id="picture" type="file" {...props} />
    </div>
  );
}

function HA_Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "flex h-8 w-full min-w-0 border-b border-solid border-faded-bg/60 bg-transparent px-2.5 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-background selection:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-base placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-faded-background/50 focus-visible:ring-ring/0 focus-visible:ring-offset-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export function HA_InputFile({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <HA_Label htmlFor="picture">Picture</HA_Label>
      <HA_Input id="picture" type="file" {...props} />
    </div>
  );
}

export { HA_Input };
/**
 * Hideaway field order: input, then the baseline, then the label.
 * The line and the label are the sibling rules in __inputs.scss.
 */
export function DrawnField({
  label,
  id,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? props.name;
  return (
    <div className="form-field active relative">
      <input
        {...props}
        id={fieldId}
        placeholder=" "
        className="w-input peer block w-full m-0 p-0 pb-[13.6px] border-0 border-b border-[oklch(from_var(--muted-faded-bg)_l_c_h_/_0.5)] rounded-none bg-transparent text-inherit font-[inherit] text-xs font-normal leading-[1.1] tracking-normal uppercase outline-none placeholder:text-[oklch(from_var(--faded-fg)_l_c_h_/_0.001)] not-placeholder-shown:pt-[3.6px] not-placeholder-shown:pb-[3.5px]"
      />
      <div
        data-form="baseline"
        className="absolute right-0 bottom-0 left-0 h-px bg-[var(--faded-fg)] scale-x-0 origin-right transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.32,1)] peer-focus:scale-x-100 peer-focus:origin-[0_50%] peer-not-placeholder-shown:scale-x-100 peer-not-placeholder-shown:origin-[0_50%]"
      />
      <label
        className="input-label absolute top-0 left-0 z-1 m-0 text-[oklch(from_var(--muted-faded-bg)_l_c_h_/_0.75)] text-xs font-medium leading-[1.1] capitalize origin-[0_0] pointer-events-none transition-[color,transform] duration-[600ms] ease-[cubic-bezier(0.16,1,0.32,1)] peer-focus:text-[var(--faded-fg)] peer-focus:-translate-y-1/2 peer-focus:scale-[0.8] peer-not-placeholder-shown:text-[var(--faded-fg)] peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:scale-[0.8]"
        htmlFor={fieldId}
      >
        {label}
      </label>
    </div>
  );
}
