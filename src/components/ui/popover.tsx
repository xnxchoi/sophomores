"use client";

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"
import { cn as HA_cn } from "@/lib/utils";
import { Popover as HA_PopoverPrimitive } from "@base-ui/react";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-none bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-xs", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}

function HA_PopoverRoot({
  ...props
}: React.ComponentProps<typeof HA_PopoverPrimitive.Root>) {
  return <HA_PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function HA_PopoverTrigger({
  ...props
}: React.ComponentProps<typeof HA_PopoverPrimitive.Trigger>) {
  return <HA_PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function HA_PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  side,
  alignOffset,
  ...props
}: React.ComponentProps<typeof HA_PopoverPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof HA_PopoverPrimitive.Positioner>,
    "align" | "sideOffset" | "side" | "alignOffset"
  >) {
  // `--popover` is `var(--button-background) = oklch(.../0.25)`, i.e. ~25%
  // opacity — see globals.css. That's intentional for the floating-glass
  // `<button>` look but unreadable as a popover container (content behind
  // bleeds through). Override locally with an opaque-ish background +
  // backdrop blur, so popovers always read as discrete surfaces.
  return (
    <HA_PopoverPrimitive.Portal>
      <HA_PopoverPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        side={side}
        alignOffset={alignOffset}
      >
        <HA_PopoverPrimitive.Popup
          data-slot="popover-content"
          className={HA_cn(
            "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md p-4 outline-hidden",
            // Opaque-leaning surface (95%) + blur — discrete, readable.
            "bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-xl",
            "text-foreground shadow-[0_8px_28px_-12px_rgba(0,0,0,0.55)] ring-1 ring-foreground/15",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className
          )}
          {...props}
        />
      </HA_PopoverPrimitive.Positioner>
    </HA_PopoverPrimitive.Portal>
  );
}

export { HA_PopoverRoot, HA_PopoverTrigger, HA_PopoverContent };
