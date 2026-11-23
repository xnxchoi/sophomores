"use client";

import type { ComponentProps } from "react";
import { ActionButton as ArcActionButton } from "@/components/arc/action-button/action-button";
import { Button as ArcButton } from "@/components/arc/button/button";
import { CopyButton as ArcCopyButton } from "@/components/arc/copy-button/copy-button";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { cn } from "@/lib/utils";

/**
 * Arc's buttons with the site's keyboard focus ring (owner, 23 Nov: rings for keyboard focus only, on the visible
 * shape). Arc ships no ring of its own and the base layer removes the browser's, so these add one through the
 * documented `className` and `children` props only; Arc's internals stay untouched. A filled or bordered root is the
 * visible shape and takes the ring itself. A ghost Button draws nothing at rest inside its 44 px target, so its label
 * takes the ring (FocusShape). A plain CopyButton is an icon inside a 44-48 px target whose icon is internal, so it
 * shows Arc's own hover fill on keyboard focus instead of a ring (important: Arc's unlayered module CSS sets its
 * resting background).
 */
export function Button({ variant = "primary", className, children, ...props }: ComponentProps<typeof ArcButton>) {
  if (variant === "ghost") {
    return (
      <ArcButton {...props} variant={variant} className={cn("group/focus", className)}>
        <FocusShape className="inline-flex items-center gap-[inherit] group-focus-visible/focus:outline-current">{children}</FocusShape>
      </ArcButton>
    );
  }
  return <ArcButton {...props} variant={variant} className={cn("focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground", className)}>{children}</ArcButton>;
}

export function CopyButton({ variant = "outline", className, ...props }: ComponentProps<typeof ArcCopyButton>) {
  return <ArcCopyButton {...props} variant={variant} className={cn(variant === "plain" ? "focus-visible:bg-(--surface-muted)! focus-visible:text-foreground!" : "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground", className)} />;
}

export function ActionButton({ className, ...props }: ComponentProps<typeof ArcActionButton>) {
  return <ArcActionButton {...props} className={cn("focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground", className)} />;
}
