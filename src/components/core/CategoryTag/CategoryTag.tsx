import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A small outlined label for a category or tag, as the reading pages once showed above each essay (owner, 24 Nov: take the
 * category tags off reading and "make em their own component"). The outline and text follow the current colour, so it
 * reads on light and dark pages; pass className to tune spacing or tone.
 */
export function CategoryTag({ className, children, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-block w-fit rounded-[20px] border border-current px-[9px] py-[5px] text-center text-[10px] leading-[.95] font-medium tracking-[-.01em] uppercase",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
