"use client";

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { XIcon } from "@phosphor-icons/react"
import * as HA_SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon as HA_XIcon } from "lucide-react"
import { cn as HA_cn } from "@/lib/utils"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 text-xs/relaxed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-sm font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

function HA_Sheet({...props}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Root>) {
	return <HA_SheetPrimitive.Root data-slot="sheet" {...props} />
}

function HA_SheetTrigger({
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Trigger>) {
	return <HA_SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function HA_SheetClose({
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Close>) {
	return <HA_SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function HA_SheetPortal({
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Portal>) {
	return <HA_SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function HA_SheetOverlay({
	className,
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Overlay>) {
	return (
		<HA_SheetPrimitive.Overlay data-slot="sheet-overlay" className={HA_cn(
			"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
			className
		)}
		                        {...props} />
	)
}

function HA_SheetContent({
	className,
	children,
	side = "right",
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Content> & {
	side?: "top" | "right" | "bottom" | "left"
}) {
	return (
		<HA_SheetPortal>
			<HA_SheetOverlay />
			<HA_SheetPrimitive.Content data-slot="sheet-content" className={HA_cn(
				"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
				side === "right" &&
				"data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
				side === "left" &&
				"data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
				side === "top" &&
				"data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
				side === "bottom" &&
				"data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
				className
			)}
			                        {...props}
			>
				{children}
				<HA_SheetPrimitive.Close
					className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
					<HA_XIcon className="size-4" />
					<span className="sr-only">Close</span>
				</HA_SheetPrimitive.Close>
			</HA_SheetPrimitive.Content>
		</HA_SheetPortal>
	)
}

function HA_SheetHeader({className, ...props}: HA_React.ComponentProps<"div">) {
	return (
		<div data-slot="sheet-header" className={HA_cn("flex flex-col gap-1.5 p-4", className)}
		     {...props} />
	)
}

function HA_SheetFooter({className, ...props}: HA_React.ComponentProps<"div">) {
	return (
		<div data-slot="sheet-footer" className={HA_cn("mt-auto flex flex-col gap-2 p-4", className)}
		     {...props} />
	)
}

function HA_SheetTitle({
	className,
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Title>) {
	return (
		<HA_SheetPrimitive.Title data-slot="sheet-title"
		                      className={HA_cn("text-foreground font-medium", className)}
		                      {...props} />
	)
}

function HA_SheetDescription({
	className,
	...props
}: HA_React.ComponentProps<typeof HA_SheetPrimitive.Description>) {
	return (
		<HA_SheetPrimitive.Description data-slot="sheet-description"
		                            className={HA_cn("text-muted-foreground text-sm", className)}
		                            {...props} />
	)
}

export {
	HA_Sheet,
	HA_SheetTrigger,
	HA_SheetClose,
	HA_SheetContent,
	HA_SheetHeader,
	HA_SheetFooter,
	HA_SheetTitle,
	HA_SheetDescription,
}
