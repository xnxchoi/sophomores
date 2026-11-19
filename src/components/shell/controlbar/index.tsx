"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Bell, Moon, Search, Sun, UserRound } from "lucide-react";
import { Suspense, use, useEffect, useRef, type ComponentProps, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link } from "@/components/core/Link/Link";
import { useNotificationInbox } from "@/components/notifications/notification-inbox";
import { siteLayer } from "@/constants/site-layers";
import type { Notification } from "@/lib/content/slots";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";
import { useTheme, useThemeLocked } from "@/providers/Theme";
import type { ControlbarView } from "@/stores/RP_Ui";
import { BodyLayer, CheckInButton, type SiteHeaderActions } from "../header-actions";
import { ControlbarDrawer } from "./drawer";
import { SearchSheet } from "./search-sheet";
import { controlbarCentreRef, useControlbarCentreFilled } from "./slot";

/** The header's member state, as the header's account entry reads it. */
type Member = ComponentProps<typeof SiteHeaderActions>["member"];
type SearchPost = { slug: string; title: string; dek: string };
type Select = (next: ControlbarView, event: MouseEvent<HTMLButtonElement>) => void;

/**
 * The Hideaway's touch-phone bottom bar (Shells/Controlbar, UX/SideDrawer, UX/SearchSheet), on touch phones
 * only: the same trigger as The Hideaway's header hand-over (HeaderClient.tsx:99-102), `isMobile && isTouch`
 * from the shared MobileProvider (narrower than 640px, and `hover: none`).
 *
 * Zones, left | centre | right (the full matrix is in the v8c2 handoff):
 *   Left:   the theme button (The Hideaway's no-radio fallback; owner: keep it). Absent on a page that holds
 *           its theme (owner rule), and the row then has two columns, with no empty slot.
 *   Centre: a slot a page can fill with its own control (slot.tsx; the home teaser puts its chapter pill
 *           there). Otherwise the Search pill in the reading view, or nothing.
 *   Right:  as each page's own header does it. Reading view: the bell, then Account when signed in, or
 *           Check-in otherwise (The Hideaway's signed-out branch). Elsewhere: Account, or Log in when
 *           signed out.
 *
 * Tapping a view's button opens the drawer at that view; tapping the active one returns the drawer to its
 * default view, the site's menu links. The strip is fixed to the foot of the screen and the drawer opens
 * behind it, a non-modal drawer placed before the strip (drawer.tsx).
 *
 * Rendered by SiteHeader, which holds the page's posts, notifications and member state (the frame's
 * HeaderMemberContext, so the reading view has it too). All of it goes to the body: the header pill clips
 * and contains fixed children (BodyLayer). Search and the bell need the reading view's posts and
 * notifications, as in the header: ordinary pages pass none and show neither, rather than sample content.
 */
export function Controlbar({
  posts,
  notifications,
  member
}: {
  posts?: SearchPost[];
  notifications?: Notification[];
  member?: Member;
}) {
  const { isMobile, isTouch } = useIsMobile();
  const owns = isMobile && isTouch;
  const menuOpen = useRPStore((state) => state.navIsOpen);
  const pathname = usePathname();
  const setSideDrawerOpen = useRPStore((state) => state.setSideDrawerOpen);
  const setSearchSheetOpen = useRPStore((state) => state.setSearchSheetOpen);
  // The button that opened the drawer or the sheet; focus goes back to it when that closes.
  const drawerTrigger = useRef<HTMLElement | null>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  // The drawer is portalled here, just before the strip.
  const drawerHost = useRef<HTMLDivElement>(null);

  // Opening the site menu closes the drawer and the sheet (Rule A, as for the header panels), and so does
  // leaving touch-phone layout: otherwise the page's sidebar scale (UX/Transition) would apply on a wider
  // screen with no drawer to close.
  useEffect(() => {
    if (owns && !menuOpen) return;
    setSideDrawerOpen(false);
    setSearchSheetOpen(false);
  }, [owns, menuOpen, setSideDrawerOpen, setSearchSheetOpen]);
  // A new page closes them too.
  useEffect(() => {
    setSideDrawerOpen(false);
    setSearchSheetOpen(false);
  }, [pathname, setSideDrawerOpen, setSearchSheetOpen]);

  return (
    <BodyLayer>
      <div ref={drawerHost} />
      {/* Before the strip in the tree too: Base UI's non-modal portal puts its Tab guards where the portal
          sits in the tree, and a guard sends Tab on to the next tabbable after it, the strip's first
          control (FloatingPortal). */}
      {owns ? <ControlbarDrawer notifications={notifications ?? []} returnFocus={drawerTrigger} container={drawerHost} /> : null}
      <AnimatePresence>
        {owns ? (
          <Strip
            key="controlbar"
            notifications={notifications}
            reading={posts !== undefined || notifications !== undefined}
            search={posts !== undefined}
            member={member}
            drawerTrigger={drawerTrigger}
            searchTrigger={searchTrigger}
          />
        ) : null}
      </AnimatePresence>
      {owns && posts ? <SearchSheet posts={posts} returnFocus={searchTrigger} /> : null}
    </BodyLayer>
  );
}

function Strip({
  notifications,
  reading,
  search,
  member,
  drawerTrigger,
  searchTrigger
}: {
  notifications?: Notification[];
  reading: boolean;
  search: boolean;
  member?: Member;
  drawerTrigger: RefObject<HTMLElement | null>;
  searchTrigger: RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("Customer.components_shell_header_actions");
  const menuOpen = useRPStore((state) => state.navIsOpen);
  const view = useRPStore((state) => state.controlbarView);
  const toggleView = useRPStore((state) => state.toggleControlbarView);
  const sidebarOpen = useRPStore((state) => state.sidebarOpen);
  const setSideDrawerOpen = useRPStore((state) => state.setSideDrawerOpen);
  const searchSheetOpen = useRPStore((state) => state.searchSheetOpen);
  const toggleSearchSheetOpen = useRPStore((state) => state.toggleSearchSheetOpen);
  const themeLocked = useThemeLocked();
  const centreFilled = useControlbarCentreFilled();
  // The view showing now: a closed drawer shows none.
  const shown = sidebarOpen ? view : null;

  // Closed: open at the requested view. Open: the active button returns to the default view (and stays
  // open), another button swaps the view.
  const select: Select = (next, event) => {
    drawerTrigger.current = event.currentTarget;
    toggleView(next);
    if (!sidebarOpen) setSideDrawerOpen(true);
  };

  return (
    <m.nav
      aria-label={t("controlbar")}
      // Under the open site menu it takes no focus or taps, like the page behind the menu.
      inert={menuOpen}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
      className="fixed inset-x-0 bottom-0 w-full border-t border-border/20 bg-off-bg/95 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl"
      style={{ zIndex: siteLayer.controlbar }}
    >
      <div
        className={cn(
          "mx-auto grid h-16 max-w-[640px] items-center gap-2 px-3",
          themeLocked ? "grid-cols-[1fr_auto]" : "grid-cols-[auto_1fr_auto]"
        )}
      >
        {themeLocked ? null : <ThemeButton />}

        {/* The centre slot: a page's own control lands here (slot.tsx); otherwise the strip's own. */}
        <div ref={controlbarCentreRef} className="grid min-w-0">
          {!centreFilled && search ? (
            <button
              ref={searchTrigger}
              type="button"
              aria-label={t("search")}
              aria-pressed={searchSheetOpen}
              onClick={() => toggleSearchSheetOpen()}
              className={cn(
                "group inline-flex h-12 items-center gap-3 rounded-full border border-border/30 px-5 touch-manipulation transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current",
                searchSheetOpen
                  ? "bg-foreground/[0.09] text-foreground"
                  : "bg-foreground/[0.04] text-foreground/65 active:bg-foreground/[0.08]"
              )}
            >
              <Search aria-hidden="true" className="size-[18px]" strokeWidth={1.5} />
              <span className="font-sans text-sm font-normal">{t("search")}</span>
            </button>
          ) : null}
        </div>

        {member ? (
          <Suspense fallback={<RightZone reading={reading} notifications={notifications} state={null} view={shown} select={select} />}>
            <MemberRightZone member={member} reading={reading} notifications={notifications} view={shown} select={select} />
          </Suspense>
        ) : (
          <RightZone reading={reading} notifications={notifications} state={null} view={shown} select={select} />
        )}
      </div>
    </m.nav>
  );
}

function MemberRightZone({
  member,
  ...props
}: Omit<ComponentProps<typeof RightZone>, "state"> & { member: NonNullable<Member> }) {
  const state = use(member);
  return <RightZone {...props} state={state.state} />;
}

/**
 * The right zone, as each page's own header does it (Review-B, v8). `state` is the header's member state;
 * null while it is unread (the Suspense fallback) or when there is none.
 *
 * Reading view (its header: Check-in, the bell, Search and the mode switch, whatever the member state):
 *   signed in: the bell and Account (the account view holds Check-in);
 *   otherwise: the bell and Check-in (The Hideaway's signed-out branch).
 * Elsewhere (its header: Cart and Account, or Log in): Log in when signed out, otherwise Account.
 */
function RightZone({
  reading,
  notifications,
  state,
  view,
  select
}: {
  reading: boolean;
  notifications?: Notification[];
  state: "signed-in" | "signed-out" | "unavailable" | null;
  view: ControlbarView | null;
  select: Select;
}) {
  const t = useTranslations("Customer.components_shell_header_actions");
  const account = <AccountTrigger active={view === "account"} onClick={(event) => select("account", event)} />;
  if (!reading) {
    if (state !== "signed-out") return account;
    return (
      <Link
        href="/account"
        aria-label={t("logIn")}
        className="inline-flex size-12 items-center justify-center rounded-full text-foreground/75 touch-manipulation transition-colors active:bg-foreground/[0.06] active:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
      >
        <UserRound aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </Link>
    );
  }
  return (
    <Zone>
      {notifications ? (
        <NotificationsTrigger
          notifications={notifications}
          active={view === "notifications"}
          onClick={(event) => select("notifications", event)}
        />
      ) : null}
      {state === "signed-in" ? (
        account
      ) : (
        <span className="inline-flex size-12 items-center justify-center">
          <CheckInButton />
        </span>
      )}
    </Zone>
  );
}

function Zone({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

/** The Hideaway's 48px zone button. */
function ZoneButton({ active, className, ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full text-foreground/75 touch-manipulation transition-colors active:bg-foreground/[0.06] active:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current",
        active && "bg-foreground/[0.06] text-foreground",
        className
      )}
    />
  );
}

/** Light and dark. Not rendered while the page holds its own theme (owner rule; the Strip drops its column). */
function ThemeButton() {
  const t = useTranslations("Customer.themeControl");
  const theme = useTheme((store) => store.theme);
  const toggleTheme = useTheme((store) => store.toggleTheme);
  return (
    <ZoneButton aria-label={theme === "light" ? t("switchToDarkMode") : t("switchToLightMode")} onClick={() => toggleTheme()}>
      {theme === "dark" ? (
        <Sun aria-hidden="true" className="size-5" strokeWidth={1.5} />
      ) : (
        <Moon aria-hidden="true" className="size-5" strokeWidth={1.5} />
      )}
    </ZoneButton>
  );
}

function NotificationsTrigger({
  notifications,
  active,
  onClick
}: {
  notifications: Notification[];
  active: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const t = useTranslations("Customer.components_shell_header_actions");
  const unread = useNotificationInbox(notifications).unread.length;
  return (
    <ZoneButton aria-label={t("notifications")} aria-pressed={active} active={active} onClick={onClick} className="relative">
      <Bell aria-hidden="true" className="size-5" strokeWidth={1.5} />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 py-0.5 font-sans text-[10px] leading-none text-background tabular-nums"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </ZoneButton>
  );
}

/** No avatar: the header's member state carries no profile (see the account view). */
function AccountTrigger({ active, onClick }: { active: boolean; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  const t = useTranslations("Customer.components_shell_header_actions");
  return (
    <button
      type="button"
      aria-label={t("account")}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full touch-manipulation transition-all active:scale-[0.96] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current",
        active ? "ring-2 ring-foreground/60" : "ring-1 ring-border/40"
      )}
    >
      <UserRound aria-hidden="true" className="size-5 text-foreground/75" strokeWidth={1.5} />
    </button>
  );
}
