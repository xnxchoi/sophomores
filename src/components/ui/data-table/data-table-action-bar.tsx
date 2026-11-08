"use client";

import type { Table } from "@tanstack/react-table";
import { Loader, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as React from "react";
import * as m from "motion/react-m";
import * as ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EASING } from "@/constants/animations";

interface DataTableActionBarProps<TData> extends React.ComponentProps<
  typeof m.div
> {
  table: Table<TData>;
  visible?: boolean;
  container?: Element | DocumentFragment | null;
}

function DataTableActionBar<TData>({
  table,
  visible: visibleProp,
  container: containerProp,
  children,
  className,
  ...props
}: DataTableActionBarProps<TData>) {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        table.toggleAllRowsSelected(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [table]);

  const container =
    containerProp ?? (mounted ? globalThis.document?.body : null);

  if (!container) return null;

  const visible =
    visibleProp ?? table.getFilteredSelectedRowModel().rows.length > 0;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {visible && (
        <m.div
          role="toolbar"
          aria-orientation="horizontal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: EASING.power2.out }}
          className={cn(
            "fixed inset-x-0 bottom-26 z-230 mx-auto flex w-fit flex-wrap items-center justify-center gap-[16px] rounded-xl border bg-background p-[8px] font-sans text-base text-foreground shadow-md",
            className
          )}
          {...props}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>,
    container
  );
}

interface DataTableActionBarActionProps extends React.ComponentProps<
  typeof Button
> {
  tooltip?: string;
  isPending?: boolean;
}

function DataTableActionBarAction({
  size = "sm",
  tooltip,
  isPending,
  disabled,
  className,
  children,
  ...props
}: DataTableActionBarActionProps) {
  const trigger = (
    <Button
      variant="secondary"
      size={size}
      className={cn(
        "gap-[6px] border border-secondary bg-secondary/50 hover:bg-secondary/70 [&>svg]:size-[14px]",
        size === "icon" ? "size-[28px]" : "h-[28px]",
        className
      )}
      disabled={disabled || isPending}
      {...props}
    >
      {isPending ? <Loader className="animate-spin" /> : children}
    </Button>
  );

  if (!tooltip) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger render={() => trigger} />
      <TooltipContent
        sideOffset={6}
        className="border bg-accent font-semibold text-faded-foreground dark:bg-card [&>span]:hidden"
      >
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface DataTableActionBarSelectionProps<TData> {
  table: Table<TData>;
}

function DataTableActionBarSelection<TData>({
  table
}: DataTableActionBarSelectionProps<TData>) {
  const onClearSelection = React.useCallback(() => {
    table.toggleAllRowsSelected(false);
  }, [table]);

  return (
    <div className="flex h-7 items-center rounded-md border pr-1.5 pl-4">
      <span className="text-xs whitespace-nowrap">
        {table.getFilteredSelectedRowModel().rows.length} selected
      </span>
      <Separator
        orientation="vertical"
        className="mr-2 ml-3 data-[orientation=vertical]:h-6.5"
      />
      <Tooltip>
        <TooltipTrigger
          render={() => (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onClearSelection}
            >
              <X className="size-[14px]" />
            </Button>
          )}
        />
        <TooltipContent
          sideOffset={10}
          className="flex items-center gap-3.5 border bg-accent px-3.5 py-1.5 font-semibold text-foreground dark:bg-card [&>span]:hidden"
        >
          <p>Clear selection</p>
          <kbd className="rounded border bg-background px-2.5 py-px font-sans text-[0.7rem] font-normal text-foreground shadow-xs select-none">
            <abbr title="Escape" className="no-underline">
              Esc
            </abbr>
          </kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection
};
