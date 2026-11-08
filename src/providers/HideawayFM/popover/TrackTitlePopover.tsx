"use client";

/**
 * Click-to-open popover rendered over a track/artist/album title trigger.
 *
 * Consumer shape (plan.md § Task 11):
 *   <TrackTitlePopover kind="artist" entity={{ id, name }}>
 *     <span>{artistName}</span>
 *   </TrackTitlePopover>
 *
 * The caller passes the visible text as `children`; we wrap it in a button
 * that carries the trigger props. This keeps typography decisions at the
 * call site while the popover owns open/close, focus management, and
 * placement.
 *
 * The floating-ui wiring mirrors `components/UX/Highlightr/HighlightMenu.tsx`
 * — same middleware stack, same `FloatingPortal` pattern. The portal
 * target is the `<div id="hideaway-fm-popovers" />` mounted inside the
 * provider at `src/providers/HideawayFM/index.tsx`.
 *
 * Z-index: `z-[260]` sits one tier above the highlight menu (250) and
 * well below the cursor layer (999) and route transition (1000).
 */

import { Button } from "@/components/core/Button";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from "@floating-ui/react";
import * as m from "motion/react-m";
import { type ReactNode, useState } from "react";

import { TWEEN_EASE } from "@/constants/animations";
import { cn } from "@/lib/utils";

import {
  DetailLink,
  type DetailEntity,
  type DetailLinkKind
} from "./DetailLink";

export interface TrackTitlePopoverProps {
  kind: DetailLinkKind;
  entity: DetailEntity & { cover?: string | null };
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TrackTitlePopover({
  kind,
  entity,
  children,
  disabled,
  className
}: TrackTitlePopoverProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  const role = useRole(context, { role: "dialog" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role
  ]);

  return (
    <>
      <Button
        ref={refs.setReference}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline bg-transparent p-0 text-left transition-colors",
          "hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
          className
        )}
        {...getReferenceProps()}
      >
        {children}
      </Button>

      {open ? (
        <FloatingPortal id="hideaway-fm-popovers">
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[260]"
              {...getFloatingProps()}
            >
              <m.div
                initial={{ opacity: 0.001, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{
                  duration: 0.2,
                  ease: TWEEN_EASE.power2.out
                }}
                className={cn(
                  "pointer-events-auto w-[min(22rem,80vw)]",
                  "rounded-sm border border-border/30 bg-background/90 backdrop-blur-md",
                  "p-4 shadow-lg"
                )}
              >
                {entity.cover ? (
                  <div className="mb-3 aspect-square w-16 overflow-hidden rounded-sm bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entity.cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div
                  className={cn(
                    "font-light tracking-tight text-foreground",
                    "text-base leading-snug xl:text-xl"
                  )}
                  style={{ fontFamily: "var(--font-serif, serif)" }}
                >
                  {entity.name}
                </div>

                <div className="mt-3 border-t border-border/20 pt-3">
                  <DetailLink kind={kind} entity={entity} disabled={disabled} />
                </div>
              </m.div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}
