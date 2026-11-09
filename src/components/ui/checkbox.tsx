"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "cn"
import { CheckIcon } from "@phosphor-icons/react"
import * as HA_CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as React from "react";
import { cn as HA_cn } from "@/lib/utils";
import { useDomCursor } from "@/components/core/cursorWrapper";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-none border border-input transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

function HA_Checkbox({
  className,
  onMouseEnter: onEnter,
  onMouseLeave: onLeave,
  children,
  ...props
}: React.ComponentProps<typeof HA_CheckboxPrimitive.Root>) {
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter,
    onLeave
  });

  return (
    <HA_CheckboxPrimitive.Root
      data-slot="checkbox"
      className={HA_cn(
        "peer size-[14px] shrink-0 rounded-[4px] border border-input shadow-sm transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <HA_CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      ></HA_CheckboxPrimitive.Indicator>
    </HA_CheckboxPrimitive.Root>
  );
}

export { HA_Checkbox };
