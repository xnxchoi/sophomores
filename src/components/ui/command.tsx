"use client";

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "cn"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, HA_DialogRoot, HA_DialogContent, HA_DialogDescription, HA_DialogHeader, HA_DialogTitle } from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { MagnifyingGlassIcon, CheckIcon } from "@phosphor-icons/react"
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { cn as HA_cn } from "@/lib/utils";
import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-none bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-none p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="border-b pb-0">
      <InputGroup className="h-8 border-none border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-xs outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <MagnifyingGlassIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-0 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-xs", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-none px-2 py-2 text-xs outline-hidden select-none in-data-[slot=dialog-content]:rounded-none! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

const KommandPrimitive = m.create(CommandPrimitive);
function HA_Kommand({
  children,
  ...props
}: React.ComponentProps<typeof KommandPrimitive>) {
  return (
    <KommandPrimitive data-slot="command" {...props}>
      {children}
    </KommandPrimitive>
  );
}
function HA_KMD({ className, ...props }: React.ComponentProps<typeof KommandPrimitive>) {
  return (
    <KommandPrimitive
      data-slot="command"
      className={HA_cn(
        "flex h-full w-full flex-col rounded-xl shadow-lg/30",
        className
      )}
      data-themed={"background-color"}
      {...props}
    />
  );
}
function HA_Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={HA_cn(
        "flex h-full w-full flex-col rounded-xl shadow-lg/30",
        className
      )}
      data-themed={"background-color"}
      {...props}
    />
  );
}

function HA_CommandDialog({
  title = "HA_Command Palette",
  description = "Search for a command to run...",
  children,
  open,
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof HA_DialogRoot>, "children"> &
  React.ComponentProps<typeof HA_DialogContent> & {
    title?: string;
    description?: string;
  }) {
  // Cauterization: useSearchBar is out of pass 1. Hideaway read subMenuOpen here.
  const subMenuOpen = false;
  const lastExpanded = React.useRef(false);
  const [referenceHeight, setReferenceHeight] = React.useState("initial");
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (subMenuOpen) {
      if (!lastExpanded.current) {
        lastExpanded.current = true;
        setReferenceHeight(
          Math.max(contentRef.current?.clientHeight || 350, 350) + "px"
        );
      }
    }
  }, [subMenuOpen]);
  return (
    <HA_DialogRoot
      open={open}
      onOpenChange={onOpenChange}
      modal="trap-focus"
      {...props}
    >
      <HA_DialogHeader className="sr-only">
        <HA_DialogTitle>{title}</HA_DialogTitle>
        <HA_DialogDescription>{description}</HA_DialogDescription>
      </HA_DialogHeader>
      <HA_DialogContent
        ref={contentRef}
        open={open}
        className={HA_cn("p-0", !subMenuOpen && "overflow-hidden")}
        style={{
          minHeight: referenceHeight
        }}
      >
        <HA_KMD
          data-themed={"background-color,height,color"}
          shouldFilter={false}
          className={HA_cn(
            "p-[4px] text-xl [&_[cmdk-group-heading]]:px-[8px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-[4px] [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-8 [&_[cmdk-input-wrapper]_svg]:w-8 [&_[cmdk-input]]:h-[32px] [&_[cmdk-item]]:px-[8px] [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
            { "overflow-hidden": !subMenuOpen }
          )}
        >
          {children}
        </HA_KMD>
      </HA_DialogContent>
    </HA_DialogRoot>
  );
}
const KMDInputPrimitive = m.create(CommandPrimitive.Input);
function HA_KMDInput({
  className,
  ...props
}: React.ComponentProps<typeof KMDInputPrimitive>) {
  return (
    <KMDInputPrimitive
      data-slot="command-input"
      className={HA_cn(className)}
      {...props}
    />
  );
}
function HA_CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      className="z-1 flex w-full items-center p-[8px]"
      cmdk-rp-courier={""}
      data-slot="command-input-wrapper"
    >
      <CommandPrimitive.Input
        data-slot="command-input"
        className={HA_cn(
          "flex h-[44px] w-full rounded-md bg-transparent py-5 text-sm outline-hidden placeholder:text-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        data-themed={"color, background-color,height,placeholder-color"}
        {...props}
      />
    </div>
  );
}

function HA_CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={HA_cn(
        "relative max-h-[500px] scroll-py-1.5 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  );
}

function HA_CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="absolute inset-0 flex items-center justify-center py-6 text-center text-xl text-faded-foreground"
      {...props}
    />
  );
}

function HA_CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={HA_cn(
        "overflow-hidden rounded-[4px] py-[6px] [&_[cmdk-group-heading]]:text-xl [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-faded-foreground",
        className
      )}
      {...props}
    />
  );
}

function HA_CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={HA_cn("-mx-1.5 h-px bg-faded-foreground/10", className)}
      {...props}
    />
  );
}

function HA_CommandItem({
  className,
  onMouseEnter: onEnter,
  onMouseLeave: onLeave,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter,
    onLeave
  });
  return (
    <CommandPrimitive.Item
      className={HA_cn(
        "group relative flex min-h-[2.5rem] items-center gap-3.5 rounded-sm px-3.5 py-2.5 text-base text-faded-foreground outline-hidden transition-colors duration-170 ease-out-power3 select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-off-foreground/50 data-[selected=true]:text-faded-background [&_svg]:pointer-events-none [&_svg]:size-6 [&_svg]:shrink-0",
        className
      )}
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}

function HA_CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={HA_cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

//   <div className={HA_cn('ml-auto flex gap-0.5', className)} {...props}>
//       {shortcut.split(' ').map((key) => {
//         return <kbd key={key}>{key}</kbd>
//       })}
//     </div>
export {
  HA_Command,
  HA_CommandDialog,
  HA_CommandInput,
  HA_KMD,
  HA_KMDInput,
  HA_CommandList,
  HA_CommandEmpty,
  HA_CommandGroup,
  HA_CommandItem,
  HA_CommandShortcut,
  HA_Kommand,
  HA_CommandSeparator
};
