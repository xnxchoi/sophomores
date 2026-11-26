"use client";

import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";
import { Drawer } from "@base-ui/react/drawer";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";
import { siteLayer } from "@/constants/site-layers";
import type { Notification } from "@/lib/content/slots";
import { useRPStore } from "@/providers/RP_Pro";
import {
  AccountView,
  DefaultLinks,
  NotificationsView
} from "./views";

/**
 * The Hideaway's SideDrawer as it docks on touch phones: a 65dvh bottom drawer whose middle shows the
 * Controlbar's view (default links, notifications, account) above the strip.
 *
 * On The Hideaway the strip is inside one always-open drawer that rests on a low snap point. Here the strip
 * is fixed to the screen's foot (index.tsx) and this drawer opens and closes behind it, so the strip stays
 * put and usable while the drawer is open. That needs a drawer that is really non-modal: Vaul 1.1.2 keeps
 * `modal={false}` to itself and its Radix dialog still traps focus and hides the strip from assistive
 * technology (Review-B, v8). Base UI's drawer with `modal={false}` neither traps focus nor marks the rest
 * of the page hidden, and `disablePointerDismissal` keeps it open while focus moves to the strip.
 *
 * It is portalled into `container`, a node just before the strip, so the reading and Tab order follow the
 * screen top to bottom: the open view, then the strip. Escape closes it (Base UI listens on the document,
 * so also from the strip), and so do the backdrop, a swipe down, the site menu, a new page and leaving
 * touch-phone layout (index.tsx). Focus goes back to the strip button that opened it.
 */
export function ControlbarDrawer({
  notifications,
  member,
  returnFocus,
  container
}: {
  notifications: Notification[];
  member?: Promise<HeaderMemberState>;
  returnFocus: RefObject<HTMLElement | null>;
  container: RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("Customer.components_shell_site_menu");
  const open = useRPStore((state) => state.sidebarOpen);
  const setSideDrawerOpen = useRPStore((state) => state.setSideDrawerOpen);
  const view = useRPStore((state) => state.controlbarView);
  const setView = useRPStore((state) => state.setControlbarView);
  // Closed because the search sheet or the site menu opened: focus belongs there, not on the strip.
  const focusElsewhere = useRPStore(
    (state) => state.searchSheetOpen || state.navIsOpen
  );
  const focusElsewhereRef = useRef(focusElsewhere);
  useEffect(() => {
    focusElsewhereRef.current = focusElsewhere;
  }, [focusElsewhere]);

  // Closing resets the view, so the next opening starts from the default links.
  useEffect(() => {
    if (!open && view !== "default") setView("default");
  }, [open, view, setView]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => setSideDrawerOpen(next)}
      modal={false}
      disablePointerDismissal
      swipeDirection="down"
    >
      <Drawer.Portal container={container}>
        {/* Our own backdrop: a non-modal drawer has no outside-press dismissal, and this one sits under
            the strip (28 under 29) so the strip stays tappable. */}
        {open && (
          <div
            aria-hidden="true"
            onClick={() => setSideDrawerOpen(false)}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm"
            style={{ zIndex: siteLayer.controlbarDrawer }}
          />
        )}
        <Drawer.Viewport
          className="pointer-events-none fixed inset-0 flex items-end"
          style={{ zIndex: siteLayer.controlbarDrawer }}
        >
          <Drawer.Popup
            finalFocus={() =>
              focusElsewhereRef.current ? false : (returnFocus.current ?? true)
            }
            className="pointer-events-auto flex h-[65dvh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] flex-col rounded-t-[16px] bg-background pt-7 text-foreground transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none"
          >
            <Drawer.Title className="sr-only">{t("menu")}</Drawer.Title>
            <Drawer.Content className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {view === "notifications" ? (
                    <NotificationsView
                      key="v-notif"
                      notifications={notifications}
                    />
                  ) : view === "account" ? (
                    <AccountView key="v-account" member={member} />
                  ) : (
                    <DefaultLinks key="v-default" />
                  )}
                </AnimatePresence>
              </div>
              {/* The strip's place: it sits over the drawer's foot, so the views end above it. Its depth is the bar's
                  44 px row plus the safe area: the frame's foot (index.tsx). */}
              <div
                aria-hidden="true"
                className="h-[calc(max(var(--bar-target),var(--frame-bottom))_+_env(safe-area-inset-bottom))] flex-none"
              />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
