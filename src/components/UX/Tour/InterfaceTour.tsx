"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import { Button } from "@/components/arc/button/button";
import { Link } from "@/components/core/Link/Link";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTourStore } from "./TourProvider";

// The opener the guide was last opened from. Set on click, so it is known before the guide or the menu moves focus.
let lastOpener: HTMLElement | null = null;

/** Where focus goes when the guide closes: back to its opener while that is still on the page and usable. The
 *  menu's opener goes with the menu, which closes when the guide opens, so focus goes to the menu button instead.
 *  Opened some other way, the dialog's own default applies. */
export function guideReturnTarget(opener: HTMLElement | null): HTMLElement | true {
  if (!opener) return true;
  if (opener.isConnected && !opener.closest("[inert]")) return opener;
  return opener.ownerDocument.querySelector<HTMLElement>("[aria-controls='site-menu']") ?? true;
}

/** The outgoing step leaves the accessibility tree as soon as it starts to exit, so only one step is ever readable. */
function StepCopy({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return <m.div
    aria-hidden={present ? undefined : true}
    className="col-start-1 row-start-1 space-y-1 py-4"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ type: "spring", stiffness: 360, damping: 34 }}
  >{children}</m.div>;
}

export function InterfaceTour() {
  const t = useTranslations("Interface");
  const open = useTourStore((state) => state.ifActive);
  const index = useTourStore((state) => state.ifIndex);
  const targets = useTourStore((state) => state.ifTargets);
  const next = useTourStore((state) => state.ifNext);
  const previous = useTourStore((state) => state.ifPrev);
  const close = useTourStore((state) => state.closeInterfaceTour);
  const nextButton = useRef<HTMLButtonElement>(null);
  const target = targets[index];

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
      <DialogContent
        showCloseButton={false}
        finalFocus={() => {
          const target = guideReturnTarget(lastOpener);
          lastOpener = null;
          return target;
        }}
        className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-2xl border border-border p-6 text-sm sm:max-w-md"
      >
        <header className="flex items-center justify-between gap-4">
          <DialogTitle className="text-base">{t("tour.siteGuide")}</DialogTitle>
          <span aria-hidden="true" className="tabular-nums text-muted-foreground">{index + 1} / {targets.length}</span>
        </header>
        {/* One stable region announces the step a visitor moved to, never the step that is leaving. */}
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {t("tour.step", { current: index + 1, total: targets.length, label: t(target.label), description: t(target.description) })}
        </p>
        <div className="grid min-h-28 items-center border-y border-border">
          <AnimatePresence initial={false}>
            <StepCopy key={target.id}>
              <p className="text-lg font-medium">{t(target.label)}</p>
              <p className="text-muted-foreground">{t(target.description)}</p>
            </StepCopy>
          </AnimatePresence>
        </div>
        <Link
          href={target.href}
          prefetch={false}
          onClick={(event) => {
            if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) close();
          }}
          className="inline-flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 font-medium hover:bg-muted focus-visible:outline-2"
        >
          {t(target.action)}
          <ArrowRightIcon size={16} aria-hidden="true" />
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <DialogClose render={<Button type="button" variant="ghost" />}>{t("tour.close")}</DialogClose>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={index === 0}
              onClick={() => {
                // Previous is disabled on the first step; hand focus to Next before it would drop to the page.
                if (index === 1) nextButton.current?.focus();
                previous();
              }}
            >
              {t("tour.previous")}
            </Button>
            <Button ref={nextButton} type="button" variant="secondary" onClick={next}>
              {index === targets.length - 1 ? t("tour.done") : t("tour.next")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The way into the guide. There is no global key shortcut (WCAG 2.1.4); the guide opens from this button, on Help and,
 *  with UI-Shell R-TOUR, in the menu. */
export function InterfaceTourOpener() {
  const t = useTranslations("Interface");
  const show = useTourStore((state) => state.openInterfaceTour);
  return <Button type="button" variant="secondary" aria-haspopup="dialog" onClick={(event) => {
    lastOpener = event.currentTarget;
    show();
  }}>{t("tour.open")}</Button>;
}
