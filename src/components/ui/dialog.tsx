"use client";

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { XIcon } from "@phosphor-icons/react"
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { cn as HA_cn } from "@/lib/utils";
import { useCursor } from "@/providers/RP_Pro";
import { useTheme } from "@/providers/Theme";
import { Dialog as HA_DialogPrimitive } from "@base-ui/react";
import { useDomCursor } from "@/components/core/cursorWrapper";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-none bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

function HA_DialogRoot({
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Root>) {
  return <HA_DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function HA_DialogTrigger({
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Trigger>) {
  return <HA_DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function HA_DialogPortal({
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Portal>) {
  return <HA_DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function HA_DialogClose({
  onMouseLeave: onLeave,
  onMouseEnter: onEnter,
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Close>) {
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter,
    onLeave
  });
  return (
    <HA_DialogPrimitive.Close
      data-slot="dialog-close"
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}

function HA_DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Backdrop>) {
  return (
    <HA_DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={HA_cn(
        "fixed inset-0 z-[200] bg-transparent backdrop-blur-[2px] backdrop-grayscale-50 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      data-lenis-prevent="true"
      {...props}
    />
  );
}

const OmniaPortal = m.create(HA_DialogPortal);
const OmniaOverlay = m.create(HA_DialogOverlay);
const OmniaViewport = m.create(HA_DialogPrimitive.Viewport);
const OmniaContent = m.create(HA_DialogPrimitive.Popup);
function HA_DialogContent({
  className,
  onMouseEnter: nEnter,
  onMouseLeave: nLeave,
  children,
  open = true,
  ...props
}: HTMLMotionProps<"div"> & {
  open?: boolean;
}) {
  const setCursorTheme = useCursor((l) => l.setCursorTheme);
  const theme = useTheme((l) => l.theme);

  return (
    <OmniaPortal data-slot="dialog-portal" data-lenis-prevent="true">
      <OmniaOverlay />
      <OmniaViewport>
        <OmniaContent
          data-slot="dialog-content"
          data-themed={"background-color,color,height"}
          className={"pointer-events-none"}
          {...props}
        >
          <m.div
            className={HA_cn(
              "pointer-events-auto fixed top-[45%] left-[50%] z-[245] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl bg-faded-background/40 p-6 text-faded-foreground shadow-lg/25 outline-1 outline-muted-faded-foreground/20! backdrop-blur-xs duration-200 ease-out-power2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-[550px] dark:bg-faded-background/80 dark:shadow-xl/40 dark:shadow-gray-900/30 dark:outline-muted-faded-foreground/40!",
              className
            )}
            data-lenis-prevent="true"
          >
            {children}
          </m.div>
          <HA_DialogClose className="absolute top-6 right-10 rounded-sm text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent"></HA_DialogClose>
        </OmniaContent>
      </OmniaViewport>
    </OmniaPortal>
  );
}

function HA_DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={HA_cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    />
  );
}

function HA_DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={HA_cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  );
}

function HA_DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Title>) {
  return (
    <HA_DialogPrimitive.Title
      data-slot="dialog-title"
      className={HA_cn("leading-[1] font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function HA_DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof HA_DialogPrimitive.Description>) {
  return (
    <HA_DialogPrimitive.Description
      data-slot="dialog-description"
      className={HA_cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  HA_DialogRoot,
  HA_DialogClose,
  HA_DialogContent,
  HA_DialogDescription,
  HA_DialogFooter,
  HA_DialogHeader,
  HA_DialogOverlay,
  HA_DialogPortal,
  HA_DialogTitle,
  HA_DialogTrigger
};
