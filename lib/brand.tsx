import {
  Children,
  cloneElement,
  type ComponentProps,
  type ReactElement
} from "react";
import { cn } from "@/lib/utils";

type BrandMarkProps = ComponentProps<"span"> & { asChild?: boolean };

/** Preserve the mark's semantic element while keeping its typography consistent. */
export function BrandMark({
  asChild = false,
  children,
  className,
  ...props
}: BrandMarkProps) {
  if (asChild) {
    const child = Children.only(children) as ReactElement<{
      className?: string;
    }>;
    return cloneElement(child, {
      ...props,
      className: cn(
        "!font-[Helvetica,Arial,sans-serif]",
        className,
        child.props.className
      )
    });
  }
  return (
    <span
      {...props}
      className={cn("!font-[Helvetica,Arial,sans-serif]", className)}
    >
      {children}
    </span>
  );
}
