"use client";

import { Suspense, use, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CircleQuestionMark } from "lucide-react";
import { HelpPillLinks } from "@/app/(site)/_commerce/help-pill-links";
import { useControlbarHelp } from "@/components/shell/controlbar/slot";
import { useFooterReveal } from "@/components/shell/Footer/footer-visibility";
import { siteLayer } from "@/constants/site-layers";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";
import { Button } from "@/components/core/Button";

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
 * useFrameState) plus its corner size (22 px; 20 px when isMobile, as Menu's frame corners pick it), so it sits inside the rounded
 * corner. On touch phones it is an item in the bottom bar's row instead (the Controlbar's Help place, slot.tsx), with
 * its list opening above the bar.
 * It sits above the FXFrame band (siteLayer.helpPill), so the band never blurs it.
 *
 * Floating, it steps aside while the footer shows (owner: "Hide it over the footer") and while it would sit over a form
 * (owner, 22 Nov: it covered the checkout's Postcode label); in the row it stays. Both step aside while the menu is open.
 *
 * It is an icon, not a word (owner, 22 Nov: "smaller, shorter, more subtle"): a question-mark circle in the muted ink,
 * named Help for assistive technology, with a 44 px target (in the bar, the bar's 42 px --bar-target). Floating, it sits on a small translucent disc with a
 * hairline so it reads over images; in the bar it has no surface. Its list opens as separate small pills, one per item,
 * rising in turn (Osklen), each on the header panels' translucent, blurred surface (header-panels.tsx).
 *
 * Arc's popover would fit, but it needs @radix-ui/react-popover, which isn't installed; Arc's dropdown-menu is for
 * commands, and this is a navigation list. So it's a plain disclosure button.
 */
export function HelpPill({
  contactEmail
}: {
  contactEmail: Promise<string | null>;
}) {
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

  // On touch phones Help is an item in the bottom bar's row (owner, 21 Nov: "for the mobile, we move it into the
  // bottom bar, but it's going to have to be an in row item"): the strip offers a place for it (slot.tsx) and the pill
  // renders there, opening its list above the bar. In the row it covers nothing, so it stays over the footer too.
  const rowSlot = useControlbarHelp();
  const inRow = rowSlot !== null;
  // Floating only: whether its place is over a form, read from what lies under that place (below).
  const [overForm, setOverForm] = useState(false);
  const shown = inRow ? !navIsOpen : !navIsOpen && !footerShows && !overForm;
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

  // Floating, it never covers a form: on scroll, resize, pointer or page changes and any change to the page's content, it
  // looks under its place for a form control or its label. The place is an always-mounted, non-interactive box at the
  // button's live position (below), so it can look while Help is stepped aside, and always at the current position.
  const place = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inRow) return;
    let frame = 0;
    const look = () => {
      frame = 0;
      const box = place.current?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      const xs = [box.left + 2, box.left + box.width / 2, box.right - 2];
      const ys = [box.top + 2, box.top + box.height / 2, box.bottom - 2];
      const covers = xs.some((x) =>
        ys.some((y) =>
          document
            .elementsFromPoint(x, y)
            .some(
              (element) =>
                !place.current?.contains(element) &&
                element.closest(
                  "form, label, input, select, textarea, fieldset"
                ) !== null
            )
        )
      );
      setOverForm(covers);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(look);
    };
    schedule();
    const layout = new ResizeObserver(schedule);
    layout.observe(document.body);
    // Local reflow (a field appearing, a section opening, a class or style change) need not change the body's size.
    const content = new MutationObserver(schedule);
    content.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "open"]
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      layout.disconnect();
      content.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [inRow, pathname, isMobile, isTouch]);

  const close = () => setOpenOn(null);
  const toggle = () => {
    if (open) return setOpenOn(null);
    setOpenOn(pathname);
    setOpenings((count) => count + 1);
  };

  const pill = (
    <AnimatePresence>
      {shown && (
        <m.div
          key="help-pill"
          ref={root}
          // In the bar it fades in place, so its target never rides down into the safe area; floating, it rises.
          initial={inRow ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={inRow ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={inRow ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          className={cn(
            inRow
              ? "relative flex items-center"
              : "absolute bottom-0 left-0 flex w-max flex-col items-start gap-2"
          )}
        >
          <AnimatePresence>
            {open && (
              <m.div
                key="help-list"
                id={listId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                className={cn(
                  "w-max origin-bottom-left pl-2",
                  inRow && "absolute bottom-[calc(100%+12px)] left-0"
                )}
              >
                <Suspense
                  fallback={
                    <StaggeredHelpLinks
                      contactEmail={null}
                      onClose={close}
                      closeLabel={closeLabel}
                    />
                  }
                >
                  <PublishedHelpLinks
                    contactEmail={contactEmail}
                    onClose={close}
                    closeLabel={closeLabel}
                  />
                </Suspense>
              </m.div>
            )}
          </AnimatePresence>
          <Button
            ref={trigger}
            type="button"
            aria-label={t("help")}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            onClick={toggle}
            className={cn(
              "group group/focus flex touch-manipulation items-center justify-center rounded-full text-foreground/55 transition-[color,opacity] hover:text-foreground",
              inRow
                ? "size-(--bar-target) active:opacity-60 [&>*]:translate-y-[calc((var(--bar-target)_-_var(--frame-bottom))/2)]"
                : "size-11 active:text-foreground",
              open && "text-foreground"
            )}
          >
            {/* In the bar it sits on the frame's black like the other controls: no surface of its own. */}
            <FocusShape
              aria-hidden="true"
              className={cn(
                "flex items-center justify-center rounded-full group-focus-visible/focus:outline-current",
                !inRow &&
                  "size-7 bg-background/70 ring-1 ring-foreground/10 backdrop-blur-md"
              )}
            >
              <CircleQuestionMark
                className={cn(inRow ? "size-[15px]" : "size-4")}
                strokeWidth={1.5}
              />
            </FocusShape>
          </Button>
        </m.div>
      )}
    </AnimatePresence>
  );
  if (rowSlot) return createPortal(pill, rowSlot);
  // Floating: the place is the button's 44 px spot, always mounted and never taking a pointer, so the form check
  // measures the live position; the pill hangs from it, its list growing upward.
  return (
    <div
      ref={place}
      style={{ zIndex: siteLayer.helpPill }}
      className={cn(
        "pointer-events-none fixed size-11 *:pointer-events-auto",
        // The 28 px disc sits where the old pill's edge did; its 44 px target reaches 8 px beyond it.
        isMobile && isTouch
          ? "bottom-[calc(env(safe-area-inset-bottom)+79px)] left-[22px]"
          : isMobile
            ? "bottom-[42px] left-[22px]"
            : "bottom-[44px] left-[24px]"
      )}
    >
      {pill}
    </div>
  );
}

/** Contact appears once the customer-service email is published; until then the list shows without it. */
function PublishedHelpLinks({
  contactEmail,
  ...props
}: {
  contactEmail: Promise<string | null>;
  onClose: () => void;
  closeLabel?: string;
}) {
  return <StaggeredHelpLinks contactEmail={use(contactEmail)} {...props} />;
}

/**
 * Each item is its own small pill (Osklen), on the header panels' translucent, blurred surface in their faded ink, so it
 * reads the same over the page and above the bar. They rise in turn from the button upward: the last item (Close,
 * nearest the button) first. Each pill is 32 px tall; its target reaches 44 px on touch screens, with gaps that keep
 * the targets apart.
 */
function StaggeredHelpLinks(props: {
  contactEmail: string | null;
  onClose: () => void;
  closeLabel?: string;
}) {
  return (
    <HelpPillLinks
      {...props}
      className="items-start gap-1 pointer-coarse:gap-3 [&>li]:animate-in [&>li]:duration-400 [&>li]:fade-in-0 [&>li]:fill-mode-both [&>li]:slide-in-from-bottom-2 [&>li:nth-last-child(1)]:delay-[60ms] [&>li:nth-last-child(2)]:delay-[100ms] [&>li:nth-last-child(3)]:delay-[140ms] [&>li:nth-last-child(4)]:delay-[180ms] [&>li:nth-last-child(5)]:delay-[220ms] [&>li:nth-last-child(6)]:delay-[260ms] [&>li:nth-last-child(7)]:delay-[300ms] [&>li>*]:relative [&>li>*]:min-h-8 [&>li>*]:w-auto [&>li>*]:rounded-lg [&>li>*]:bg-[oklch(from_var(--background)_l_c_h_/_0.8)] [&>li>*]:px-3 [&>li>*]:text-(--foreground) [&>li>*]:shadow-sm [&>li>*]:ring-1 [&>li>*]:shadow-black/5 [&>li>*]:ring-[oklch(from_var(--foreground)_l_c_h_/_0.08)] [&>li>*]:backdrop-blur-md [&>li>*]:after:absolute [&>li>*]:after:inset-x-0 [&>li>*]:after:-inset-y-0.5 [&>li>*]:after:content-[''] pointer-coarse:[&>li>*]:after:-inset-y-1.5"
    />
  );
}
