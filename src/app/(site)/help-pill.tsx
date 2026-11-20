"use client";

import { Suspense, use, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { HelpPillLinks } from "./_commerce/help-pill-links";
import { useFooterReveal } from "@/components/shell/footer-visibility";
import { siteLayer } from "@/constants/site-layers";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";

/**
 * The Help pill (Osklen study, owner 20 Nov: "help pill should maybe just become the functional but boring stuff
 * pages? Like customer support etc"). Bottom left on every page, home included, and on phones, as on Osklen (owner,
 * 21 Nov: "do it like Ausklin, but ... consider the frame that we have. We need to maybe inset it a little").
 * ClientLayout mounts it once, outside the keyed page, so it neither remounts per page nor sits under RPage's
 * transformed wrapper (which would make `fixed` position against the page).
 * It unfolds upward into UI-Content's list (HelpPillLinks), nearest item first, with The Hideaway's drawer stagger
 * (Controlbar/views.tsx: 0.06 s in, 0.04 s apart, 8 px rise, 0.4 s per item), and folds back down in one beat
 * (SideDrawer's 0.18 s exit).
 *
 * Its place comes from the viewport frame's own numbers: the frame's inset (left 10, bottom 30; RP_Pro
 * useFrameState) plus its corner size (22 px, 20 px on phones; Menu's frame corners), so it sits inside the rounded
 * corner. On touch phones it stands the frame's side inset (10 px) above the Controlbar (64 px row, 12 px padding,
 * 1 px border, safe area).
 * It sits above the FXFrame band (siteLayer.helpPill), so the band never blurs it.
 *
 * It steps aside while the footer shows (owner: "Hide it over the footer") and while the menu is open.
 *
 * Arc's popover would fit, but it needs @radix-ui/react-popover, which isn't installed; Arc's dropdown-menu is for
 * commands, and this is a navigation list. So it's a plain disclosure button.
 */
export function HelpPill({ contactEmail }: { contactEmail: Promise<string | null> }) {
  const t = useTranslations("Interface.seller");
  const pathname = usePathname() ?? "/";
  const { isMobile, isTouch } = useIsMobile();
  const navIsOpen = useRPStore((state) => state.navIsOpen);
  const footerShows = useFooterReveal((state) => state.revealed);
  // The list belongs to the page it was opened on: a new page, or the pill stepping aside, closes it, without
  // a state reset in an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Easter egg (owner, 21 Nov: "Close says Class dismissed"): from the 5th opening in a visit, Close reads
  // "Class dismissed". Held in memory only; a reload starts over.
  const [openings, setOpenings] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const shown = !navIsOpen && !footerShows;
  const open = shown && openOn === pathname;
  const closeLabel = openings >= 5 ? t("classDismissed") : undefined;

  // Escape closes it and returns focus to the pill; a press outside closes it without moving focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      trigger.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => setOpenOn(null);
  const toggle = () => {
    if (open) return setOpenOn(null);
    setOpenOn(pathname);
    setOpenings((count) => count + 1);
  };

  return (
    <AnimatePresence>
      {shown && (
        <m.div
          key="help-pill"
          ref={root}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          style={{ zIndex: siteLayer.helpPill }}
          className={cn("fixed flex flex-col items-start gap-2", isMobile && isTouch ? "bottom-[calc(env(safe-area-inset-bottom)+87px)] left-[30px]" : "bottom-[52px] left-[32px]")}
        >
          <AnimatePresence>
            {open && (
              <m.div
                key="help-list"
                id={listId}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18 } }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                className="min-w-48 origin-bottom-left rounded-2xl bg-background px-4 py-1 text-foreground shadow-lg ring-1 shadow-black/10 ring-foreground/10"
              >
                <Suspense fallback={<StaggeredHelpLinks contactEmail={null} onClose={close} closeLabel={closeLabel} />}>
                  <PublishedHelpLinks contactEmail={contactEmail} onClose={close} closeLabel={closeLabel} />
                </Suspense>
              </m.div>
            )}
          </AnimatePresence>
          <button
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            onClick={toggle}
            className={cn(
              "flex min-h-11 items-center rounded-full bg-background px-5 text-sm text-foreground shadow-md ring-1 shadow-black/10 ring-foreground/15 outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2",
              open && "ring-foreground/30"
            )}
          >
            {t("help")}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** Contact appears once the customer-service email is published; until then the list shows without it. */
function PublishedHelpLinks({ contactEmail, ...props }: { contactEmail: Promise<string | null>; onClose: () => void; closeLabel?: string }) {
  return <StaggeredHelpLinks contactEmail={use(contactEmail)} {...props} />;
}

/** Each item rises in turn from the pill upward: the last item (Close, nearest the pill) first. */
function StaggeredHelpLinks(props: { contactEmail: string | null; onClose: () => void; closeLabel?: string }) {
  return (
    <HelpPillLinks
      {...props}
      className="[&>li]:animate-in [&>li]:fade-in-0 [&>li]:slide-in-from-bottom-2 [&>li]:fill-mode-both [&>li]:duration-400 [&>li:nth-last-child(1)]:delay-[60ms] [&>li:nth-last-child(2)]:delay-[100ms] [&>li:nth-last-child(3)]:delay-[140ms] [&>li:nth-last-child(4)]:delay-[180ms] [&>li:nth-last-child(5)]:delay-[220ms]"
    />
  );
}
