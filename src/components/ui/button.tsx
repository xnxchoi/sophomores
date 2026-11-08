"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import * as React from "react";
import * as m from "motion/react-m";
import { cn as HA_cn } from "@/lib/utils";
import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

const HA_buttonVariants = cva(
  "inline-flex items-center justify-center gap-3.5 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-6.5 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-foreground underline-offset-4 hover:underline"
      },
      size: {
        default: "h-14 px-6 py-3.5 has-[>svg]:px-5",
        sm: "h-13 rounded-md gap-2.5 px-5 has-[>svg]:px-4",
        lg: "h-16 rounded-md px-9.5 has-[>svg]:px-6.5",
        icon: "size-14.5",
        "icon-sm": "size-13",
        "icon-lg": "size-16"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface HA_ButtonProps extends Partial<
  VariantProps<typeof HA_buttonVariants>
> {
  asChild?: boolean;
}

export type HA_ButtonTotalProps = HA_ButtonProps;
export const HA_Mutton = m.create(HA_Button);
function HA_Button({
  asChild = false,
  className,
  size,
  variant,
  ref,
  onMouseEnter: onEnter,
  onMouseLeave: onLeave,
  onClick,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> & HA_ButtonTotalProps) {
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    enterCondition: () => (disabled ? null : "FOCUS"),
    onEnter,
    onLeave
  });
  const [child, ...siblings] = asChild && typeof children === "object" && !React.isValidElement(children) && !Array.isArray(children) ? React.Children.toArray(children) : [children];
  const hasContent = siblings.length > 0 || Boolean(child) || child === 0;
  return useRender({
    defaultTagName: "button",
    enabled: !asChild || hasContent,
    render: asChild && hasContent ? React.Children.only(siblings.length ? [child, ...siblings] : child) as React.ReactElement : undefined,
    ref,
    props: {
      "data-slot": "button",
      className: HA_cn(
        (variant && HA_buttonVariants({ className, size, variant })) ?? "",
        className,
        "transition-colors duration-200 ease-out-power2"
      ),
      "data-themed": "background-color,color",
      onClick,
      // Override useRender's default type to retain native implicit submission.
      type: undefined,
      ...props,
      disabled,
      onMouseEnter,
      onMouseLeave,
      children: asChild ? undefined : children
    }
  });
}

function HA_VaultButton({
  asChild = false,
  className,
  size,
  variant,
  ref,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & HA_ButtonProps) {
  const [child, ...siblings] = asChild && typeof children === "object" && !React.isValidElement(children) && !Array.isArray(children) ? React.Children.toArray(children) : [children];
  const hasContent = siblings.length > 0 || Boolean(child) || child === 0;
  return useRender({
    defaultTagName: "button",
    enabled: !asChild || hasContent,
    render: asChild && hasContent ? React.Children.only(siblings.length ? [child, ...siblings] : child) as React.ReactElement : undefined,
    ref,
    props: {
      "data-slot": "button",
      className: HA_cn(
        (variant && HA_buttonVariants({ className, size, variant })) ?? "",
        className,
        "transition-colors duration-300 ease-out-power2"
      ),
      "data-themed": "background-color,color",
      onClick,
      type: undefined,
      ...props,
      children: asChild ? undefined : children
    }
  });
}

export { HA_Button, HA_buttonVariants, HA_VaultButton };
